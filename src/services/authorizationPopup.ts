import { reactive } from 'vue';
import type { Router } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { createAuthorizationUrl } from '@/services/auth';
import { consumeAuthorizationTransaction } from '@/utils/oauth';

const CALLBACK_MESSAGE = 'strnadi:authorization-callback';

// The identity server only redirects back to URIs it has registered, so the
// popup still returns to this path even though no page lives there any more.
// `deliverAuthorizationCallback` takes the result before the app boots.
const CALLBACK_PATH = '/ucet/prihlaseni';

// Roughly the size of Google's sign-in window: room for the provider's form,
// small enough that the page behind it stays visible.
const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 800;

// Long enough to cover a visitor who signs in right after a guard turns them
// away, short enough that a much later sign-in does not teleport them.
const PENDING_TARGET_TTL_MS = 5 * 60 * 1000;

export const authorizationState = reactive({
  pending: false,
  error: ''
});

let popup: Window | null = null;
let popupWatcher: number | null = null;
let listening = false;
let router: Router | null = null;
let pendingReturnTo: string | null = null;
let pendingReturnToAt = 0;

/** Lets the sign-in return the visitor to a page without importing the app. */
export const setAuthorizationRouter = (instance: Router) => {
  router = instance;
};

/** Remembers the page a guard turned a signed-out visitor away from. */
export const rememberAuthorizationTarget = (fullPath: string) => {
  pendingReturnTo = fullPath;
  pendingReturnToAt = Date.now();
};

const takeAuthorizationTarget = (): string | null => {
  const target = pendingReturnTo;
  const rememberedAt = pendingReturnToAt;
  pendingReturnTo = null;

  return target && Date.now() - rememberedAt < PENDING_TARGET_TTL_MS
    ? target
    : null;
};

export const dismissAuthorizationError = () => {
  authorizationState.error = '';
};

export const focusAuthorizationPopup = () => {
  popup?.focus();
};

const getOAuthError = (params: URLSearchParams): string =>
  params.get('error_description') ||
  params.get('error') ||
  'Autorizační server přihlášení odmítl.';

const clearPopupWatcher = () => {
  if (popupWatcher !== null) window.clearInterval(popupWatcher);
  popupWatcher = null;
};

const watchPopup = () => {
  clearPopupWatcher();
  popupWatcher = window.setInterval(() => {
    if (!popup?.closed) return;
    clearPopupWatcher();
    popup = null;
    authorizationState.pending = false;
  }, 400);
};

const closePopup = () => {
  clearPopupWatcher();
  popup?.close();
  popup = null;
  authorizationState.pending = false;
};

const fail = (authorizationError: unknown) => {
  accountStore.logout();
  authorizationState.error =
    authorizationError instanceof Error
      ? authorizationError.message
      : 'Přihlášení se nepodařilo dokončit.';
};

type PopupGeometry = {
  width: number;
  height: number;
  left: number;
  top: number;
};

const popupGeometry = (): PopupGeometry => {
  // screenX/screenY are desktop coordinates, so centering against the opener
  // keeps the window on the monitor the user is actually looking at.
  const openerLeft = window.screenX;
  const openerTop = window.screenY;
  const openerWidth = window.outerWidth || window.screen.availWidth;
  const openerHeight = window.outerHeight || window.screen.availHeight;

  const width = Math.min(POPUP_WIDTH, window.screen.availWidth);
  const height = Math.min(
    POPUP_HEIGHT,
    Math.round(window.screen.availHeight * 0.9)
  );

  return {
    width,
    height,
    left: Math.round(openerLeft + (openerWidth - width) / 2),
    top: Math.round(openerTop + (openerHeight - height) / 2)
  };
};

const popupFeatures = ({ width, height, left, top }: PopupGeometry): string =>
  [
    // `popup` asks for a separate window. The explicit no's below are what
    // browsers that predate it look at, and without them they open a full
    // browser tab instead.
    'popup=yes',
    'toolbar=no',
    'menubar=no',
    'location=no',
    'status=no',
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'resizable=yes',
    'scrollbars=yes'
  ].join(',');

/** Trades the authorization code for tokens and returns where to go next. */
const exchange = async (params: URLSearchParams): Promise<string> => {
  const state = params.get('state');
  if (!state) throw new Error('V odpovědi chybí parametr state.');

  const transaction = consumeAuthorizationTransaction(state);
  if (params.has('error')) throw new Error(getOAuthError(params));

  const code = params.get('code');
  if (!code) throw new Error('V odpovědi chybí autorizační kód.');

  await accountStore.loginWithAuthorizationCode(
    code,
    transaction.codeVerifier,
    transaction.redirectUri
  );

  return transaction.returnTo;
};

const settle = async (params: URLSearchParams) => {
  const target = await exchange(params);
  if (router && router.currentRoute.value.fullPath !== target) {
    await router.replace(target);
  }
};

const receiveCallback = async (event: MessageEvent) => {
  if (
    event.origin !== window.location.origin ||
    event.source !== popup ||
    typeof event.data !== 'object' ||
    event.data === null ||
    event.data.type !== CALLBACK_MESSAGE ||
    typeof event.data.search !== 'string'
  ) {
    return;
  }

  clearPopupWatcher();
  try {
    await settle(new URLSearchParams(event.data.search));
    closePopup();
  } catch (callbackError) {
    closePopup();
    fail(callbackError);
  }
};

const listen = () => {
  if (listening) return;
  window.addEventListener('message', receiveCallback);
  listening = true;
};

/**
 * Opens the identity server in a popup. Must be called straight from a click
 * handler: a `window.open` the browser cannot tie to a gesture gets blocked.
 */
export const startAuthorization = (): void => {
  if (authorizationState.pending) {
    popup?.focus();
    return;
  }

  authorizationState.error = '';
  listen();

  const geometry = popupGeometry();
  popup = window.open('about:blank', 'strnadi-login', popupFeatures(geometry));
  if (!popup) {
    authorizationState.error =
      'Prohlížeč zablokoval přihlašovací okno. Povolte vyskakovací okna a zkuste to znovu.';
    return;
  }

  // A browser that reuses an existing window with the same name ignores the
  // size features above and we get a full-sized window. It is still on
  // about:blank here, so it is same-origin and we can size it ourselves.
  try {
    popup.resizeTo(geometry.width, geometry.height);
    popup.moveTo(geometry.left, geometry.top);
  } catch {
    // Opened as a tab, or the browser forbids moving it. Leave it alone.
  }

  authorizationState.pending = true;
  watchPopup();

  const returnTo =
    takeAuthorizationTarget() ?? router?.currentRoute.value.fullPath ?? '/';

  void createAuthorizationUrl(returnTo, CALLBACK_PATH)
    .then((authorizationUrl) => {
      if (!popup) return;
      popup.location.replace(authorizationUrl);
      popup.focus();
    })
    .catch((startError: unknown) => {
      closePopup();
      fail(startError);
    });
};

export const hasAuthorizationCallbackParams = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.has('code') || params.has('error') || params.has('state');
};

/**
 * Runs in the popup itself: hands the result to the window that opened it and
 * closes. Returns whether this window was such a popup, in which case the app
 * has nothing to render and should not boot.
 */
export const deliverAuthorizationCallback = (): boolean => {
  if (!window.opener || window.opener === window) return false;
  if (!hasAuthorizationCallbackParams()) return false;

  window.opener.postMessage(
    { type: CALLBACK_MESSAGE, search: window.location.search },
    window.location.origin
  );
  window.close();
  return true;
};

/** Finishes a sign-in that came back in this window instead of a popup. */
export const completeAuthorizationInPlace = async (): Promise<void> => {
  try {
    await settle(new URLSearchParams(window.location.search));
  } catch (callbackError) {
    fail(callbackError);
    await router?.replace('/');
  }
};
