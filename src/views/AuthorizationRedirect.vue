<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { createAuthorizationUrl } from '@/services/auth';
import { consumeAuthorizationTransaction } from '@/utils/oauth';

const CALLBACK_MESSAGE = 'strnadi:authorization-callback';

const props = defineProps<{
  callbackPath: string;
  registration?: boolean;
}>();

type Phase = 'ready' | 'waiting' | 'finishing' | 'callback';

const route = useRoute();
const router = useRouter();
const error = ref('');
const returnTo = ref('/');
const phase = ref<Phase>('ready');
let authorizationPopup: Window | null = null;
let popupWatcher: number | null = null;

const requestedReturnTo = (): string => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' ? redirect : '/';
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
    if (!authorizationPopup?.closed) return;
    clearPopupWatcher();
    authorizationPopup = null;
    if (phase.value === 'waiting') phase.value = 'ready';
  }, 400);
};

const popupFeatures = (): string => {
  const width = 560;
  const height = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);
  return [
    'popup=yes',
    `width=${width}`,
    `height=${height}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
    'resizable=yes',
    'scrollbars=yes'
  ].join(',');
};

const complete = async (params: URLSearchParams) => {
  const state = params.get('state');
  if (!state) throw new Error('V odpovědi chybí parametr state.');

  const transaction = consumeAuthorizationTransaction(state);
  returnTo.value = transaction.returnTo;
  if (params.has('error')) throw new Error(getOAuthError(params));

  const code = params.get('code');
  if (!code) throw new Error('V odpovědi chybí autorizační kód.');

  await accountStore.loginWithAuthorizationCode(
    code,
    transaction.codeVerifier,
    transaction.redirectUri
  );
  await router.replace(transaction.returnTo);
};

const fail = (authorizationError: unknown) => {
  accountStore.logout();
  phase.value = 'ready';
  error.value =
    authorizationError instanceof Error
      ? authorizationError.message
      : 'Přihlášení se nepodařilo dokončit.';
};

const start = async () => {
  error.value = '';
  returnTo.value = requestedReturnTo();

  // This must happen synchronously inside the click handler. Otherwise the
  // browser considers the authorization popup unsolicited and blocks it.
  authorizationPopup = window.open(
    'about:blank',
    props.registration ? 'strnadi-registration' : 'strnadi-login',
    popupFeatures()
  );
  if (!authorizationPopup) {
    error.value =
      'Prohlížeč zablokoval přihlašovací okno. Povolte vyskakovací okna a zkuste to znovu.';
    return;
  }

  phase.value = 'waiting';
  watchPopup();
  try {
    const authorizationUrl = await createAuthorizationUrl(
      returnTo.value,
      props.callbackPath,
      props.registration
    );
    authorizationPopup.location.replace(authorizationUrl);
    authorizationPopup.focus();
  } catch (startError) {
    authorizationPopup.close();
    authorizationPopup = null;
    clearPopupWatcher();
    fail(startError);
  }
};

const receiveCallback = async (event: MessageEvent) => {
  if (
    event.origin !== window.location.origin ||
    event.source !== authorizationPopup ||
    typeof event.data !== 'object' ||
    event.data === null ||
    event.data.type !== CALLBACK_MESSAGE ||
    typeof event.data.search !== 'string'
  ) {
    return;
  }

  phase.value = 'finishing';
  clearPopupWatcher();
  try {
    await complete(new URLSearchParams(event.data.search));
    authorizationPopup?.close();
    authorizationPopup = null;
  } catch (callbackError) {
    authorizationPopup?.close();
    authorizationPopup = null;
    fail(callbackError);
  }
};

const run = async () => {
  const params = new URLSearchParams(window.location.search);
  const isCallback =
    params.has('code') || params.has('error') || params.has('state');

  if (isCallback && window.opener && window.opener !== window) {
    phase.value = 'callback';
    window.opener.postMessage(
      { type: CALLBACK_MESSAGE, search: window.location.search },
      window.location.origin
    );
    window.setTimeout(() => window.close(), 1000);
    return;
  }

  returnTo.value = requestedReturnTo();
  if (!isCallback) return;

  phase.value = 'finishing';
  try {
    await complete(params);
  } catch (callbackError) {
    fail(callbackError);
  }
};

onMounted(() => {
  window.addEventListener('message', receiveCallback);
  void run();
});

onBeforeUnmount(() => {
  window.removeEventListener('message', receiveCallback);
  clearPopupWatcher();
  authorizationPopup?.close();
});
</script>

<template>
  <div
    class="auth-transition"
    aria-live="polite"
  >
    <img
      src="/logo-no-text.svg"
      alt="Strnadi"
      class="auth-transition__logo"
    />

    <template
      v-if="
        phase === 'waiting' || phase === 'finishing' || phase === 'callback'
      "
    >
      <span
        class="auth-transition__spinner"
        aria-hidden="true"
      />
      <h1>
        {{
          phase === 'waiting' ? 'Dokončete přihlášení' : 'Dokončuji přihlášení'
        }}
      </h1>
      <p
        role="status"
        class="auth-transition__message"
      >
        {{
          phase === 'waiting'
            ? 'Přihlášení probíhá v otevřeném okně.'
            : 'Ověřuji přihlášení a připravuji váš účet…'
        }}
      </p>
      <button
        v-if="phase === 'waiting'"
        type="button"
        class="auth-transition__link"
        @click="authorizationPopup?.focus()"
      >
        Znovu zobrazit přihlašovací okno
      </button>
    </template>

    <template v-else>
      <div
        v-if="error"
        class="auth-transition__status auth-transition__status--error"
        aria-hidden="true"
      >
        !
      </div>
      <h1>{{ registration ? 'Vytvořit účet' : 'Přihlásit se' }}</h1>
      <p
        v-if="error"
        role="alert"
        class="auth-transition__message text-red-700"
      >
        {{ error }}
      </p>
      <p
        v-else
        class="auth-transition__message"
      >
        Přihlášení se otevře v samostatném zabezpečeném okně.
      </p>
      <div class="auth-transition__actions">
        <button
          class="button-primary px-5 py-3"
          type="button"
          @click="start"
        >
          {{
            registration ? 'Pokračovat k registraci' : 'Pokračovat k přihlášení'
          }}
        </button>
        <RouterLink
          to="/"
          class="button-secondary px-5 py-3"
        >
          Zpět na úvod
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

.auth-transition {
  @apply mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center;
}

.auth-transition__logo {
  @apply mb-2 h-20 w-20;
}

.auth-transition h1 {
  @apply text-2xl font-bold;
}

.auth-transition__message {
  @apply text-base text-gray-700;
}

.auth-transition__actions {
  @apply mt-2 flex w-full flex-col gap-2 sm:flex-row;
}

.auth-transition__actions > * {
  @apply flex-1 text-center;
}

.auth-transition__link {
  @apply text-sm font-medium underline underline-offset-4;
  color: var(--mobile-ink, #252319);
}

.auth-transition__spinner {
  @apply h-10 w-10 rounded-full border-4 border-gray-200 border-t-yellow-400;
  animation: auth-spin 0.8s linear infinite;
}

.auth-transition__status {
  @apply flex h-10 w-10 items-center justify-center rounded-full text-xl font-bold;
}

.auth-transition__status--error {
  @apply bg-red-100 text-red-700;
}

@keyframes auth-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-transition__spinner {
    animation: none;
    border-color: #facc15;
  }
}
</style>
