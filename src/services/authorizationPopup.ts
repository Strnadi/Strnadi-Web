import { reactive } from 'vue';
import type { Router } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { createAuthorizationUrl } from '@/services/auth';
import { consumeAuthorizationTransaction } from '@/utils/oauth';

const CALLBACK_MESSAGE = 'strnadi:authorization-callback';

// Marks the tab that started a redirect sign-in, so the code coming back is
// recognised as ours and not mistaken for a popup result. Lives in this tab's
// sessionStorage only, and survives the trip to the identity server.
const REDIRECT_FLAG = 'strnadi.authorization.redirect';

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

// Some browsers lay the new window out after `window.open` has already
// returned, so the first `resizeTo` is overwritten and only a later one
// sticks. Rather than guess how much later, retry until the window reports
// the size we asked for; one that honours the feature string gets it right on
// the first attempt and waits for nothing.
const GEOMETRY_RETRY_MS = 40;
const GEOMETRY_TIMEOUT_MS = 600;

// How long a prepared authorization URL may sit unused. The PKCE transaction
// behind it lives for ten minutes, so this stays well inside that.
const PREPARED_TTL_MS = 5 * 60 * 1000;

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
let prepared: { url: string; returnTo: string; createdAt: number } | null =
  null;
let preparing = false;

/** Lets the sign-in return the visitor to a page without importing the app. */
export const setAuthorizationRouter = (instance: Router) => {
  router = instance;
};

/** Remembers the page a guard turned a signed-out visitor away from. */
export const rememberAuthorizationTarget = (fullPath: string) => {
  pendingReturnTo = fullPath;
  pendingReturnToAt = Date.now();
};

const peekAuthorizationTarget = (): string | null =>
  pendingReturnTo && Date.now() - pendingReturnToAt < PENDING_TARGET_TTL_MS
    ? pendingReturnTo
    : null;

const takeAuthorizationTarget = (): string | null => {
  const target = peekAuthorizationTarget();
  pendingReturnTo = null;
  return target;
};

const intendedReturnTo = (): string =>
  peekAuthorizationTarget() ?? router?.currentRoute.value.fullPath ?? '/';

/**
 * Builds the authorization URL before it is needed, so that the click handler
 * can hand it to `window.open` synchronously. Safari only applies the size
 * features to a window it opens on a real URL, and re-lays the window out when
 * it navigates across origins, so opening on about:blank and navigating
 * afterwards costs us the size no matter what we do in between.
 *
 * Called on pointerdown and focus: both come far enough ahead of the click for
 * the PKCE digest, which is the only asynchronous part.
 */
export const prepareAuthorization = (): void => {
  if (preparing) return;

  const returnTo = intendedReturnTo();
  if (
    prepared &&
    prepared.returnTo === returnTo &&
    Date.now() - prepared.createdAt < PREPARED_TTL_MS
  ) {
    return;
  }

  preparing = true;
  void createAuthorizationUrl(returnTo, CALLBACK_PATH)
    .then((url) => {
      prepared = { url, returnTo, createdAt: Date.now() };
    })
    .catch(() => {
      // Leave the click to report it: it has somewhere to show the message.
      prepared = null;
    })
    .finally(() => {
      preparing = false;
    });
};

const takePreparedUrl = (returnTo: string): string | null => {
  const ready =
    prepared &&
    prepared.returnTo === returnTo &&
    Date.now() - prepared.createdAt < PREPARED_TTL_MS
      ? prepared.url
      : null;

  // The transaction behind it is one-use, so it cannot be handed out twice.
  if (ready) prepared = null;
  return ready;
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

/**
 * Safari ignores the size features for scripted windows — on about:blank and
 * on a real URL alike — and re-lays the window out when it navigates across
 * origins, so its popup comes up filling the screen with no way to shrink it
 * from here. Every browser on iOS is Safari underneath and turns the popup
 * into a tab anyway. Those sign in by redirecting the page instead: no window
 * to size, and the code is picked up on the way back in.
 */
const prefersRedirect = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(ua);

  return isIOS || isSafari;
};

const redirectTo = (authorizationUrl: string) => {
  sessionStorage.setItem(REDIRECT_FLAG, '1');
  window.location.assign(authorizationUrl);
};

// A name Safari has never seen, so it cannot restore the geometry of some
// earlier login window instead of using ours.
const popupName = (): string =>
  `strnadi-login-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Resizes the popup until it takes, and resolves once it has. Only works while
 * the window is still on about:blank: `resizeTo` on a window that has reached
 * the identity server is cross-origin and throws, so this has to finish before
 * we navigate it.
 */
const enforceGeometry = (
  target: Window,
  geometry: PopupGeometry
): Promise<void> =>
  new Promise((resolve) => {
    const deadline = Date.now() + GEOMETRY_TIMEOUT_MS;

    const attempt = () => {
      try {
        if (target.closed) return resolve();

        target.resizeTo(geometry.width, geometry.height);
        target.moveTo(geometry.left, geometry.top);

        const settled =
          Math.abs(target.outerWidth - geometry.width) <= 2 &&
          Math.abs(target.outerHeight - geometry.height) <= 2;
        if (settled || Date.now() >= deadline) return resolve();
      } catch {
        // Opened as a tab, or the browser forbids sizing it. Leave it alone.
        return resolve();
      }

      window.setTimeout(attempt, GEOMETRY_RETRY_MS);
    };

    attempt();
  });

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

  const returnTo = intendedReturnTo();
  const authorizationUrl = takePreparedUrl(returnTo);

  if (prefersRedirect()) {
    takeAuthorizationTarget();
    authorizationState.pending = true;

    if (authorizationUrl) {
      redirectTo(authorizationUrl);
      return;
    }

    void createAuthorizationUrl(returnTo, CALLBACK_PATH)
      .then(redirectTo)
      .catch((startError: unknown) => {
        authorizationState.pending = false;
        fail(startError);
      });
    return;
  }

  listen();
  const geometry = popupGeometry();

  // Opening straight on the authorization URL saves the window a trip through
  // about:blank and lets the browser apply the size features to a real page
  // load. Without a prepared URL we fall back to opening blank and navigating.
  popup = window.open(
    authorizationUrl ?? 'about:blank',
    popupName(),
    popupFeatures(geometry)
  );
  if (!popup) {
    authorizationState.error =
      'Prohlížeč zablokoval přihlašovací okno. Povolte vyskakovací okna a zkuste to znovu.';
    return;
  }

  takeAuthorizationTarget();
  authorizationState.pending = true;
  watchPopup();
  popup.focus();

  // Nothing left to do: the window opened on the identity server itself. The
  // next pointerdown on the button prepares the next URL.
  if (authorizationUrl) return;

  void Promise.all([
    createAuthorizationUrl(returnTo, CALLBACK_PATH),
    // Sizing only works while the window is still on about:blank, and Safari
    // undoes it on the navigation below. Other browsers keep it.
    enforceGeometry(popup, geometry)
  ])
    .then(([freshUrl]) => {
      if (!popup) return;
      popup.location.replace(freshUrl);
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
  if (!hasAuthorizationCallbackParams()) return false;

  // This tab sent itself to the identity server, so the result belongs here
  // however it was opened. Without this a tab that happens to have an opener
  // would hand its code to an unrelated window and close itself.
  if (sessionStorage.getItem(REDIRECT_FLAG)) {
    sessionStorage.removeItem(REDIRECT_FLAG);
    return false;
  }

  if (!window.opener || window.opener === window) return false;

  window.opener.postMessage(
    { type: CALLBACK_MESSAGE, search: window.location.search },
    window.location.origin
  );
  window.close();
  return true;
};

/**
 * Finishes a sign-in that came back in this window instead of a popup. Before
 * the app is mounted the router cannot navigate yet, so the address bar is
 * rewritten instead and the app boots straight onto the right page — no
 * flash of the callback URL, which is not a page any more.
 */
export const completeAuthorizationInPlace = async ({
  beforeMount = false
} = {}): Promise<void> => {
  const land = async (target: string) => {
    if (beforeMount) {
      window.history.replaceState(null, '', target);
      return;
    }
    if (router && router.currentRoute.value.fullPath !== target) {
      await router.replace(target);
    }
  };

  try {
    await land(await exchange(new URLSearchParams(window.location.search)));
  } catch (callbackError) {
    fail(callbackError);
    await land('/');
  } finally {
    authorizationState.pending = false;
  }
};
