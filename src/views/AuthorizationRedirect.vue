<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { beginAuthorization } from '@/services/auth';
import { consumeAuthorizationTransaction } from '@/utils/oauth';

const props = defineProps<{
  callbackPath: string;
  registration?: boolean;
}>();

const route = useRoute();
const router = useRouter();
const error = ref('');
const returnTo = ref('/');

const requestedReturnTo = (): string => {
  const redirect = route.query.redirect;
  return typeof redirect === 'string' ? redirect : '/';
};

const getOAuthError = (params: URLSearchParams): string =>
  params.get('error_description') ||
  params.get('error') ||
  'Autorizační server přihlášení odmítl.';

const start = async () => {
  error.value = '';
  try {
    await beginAuthorization(
      returnTo.value,
      props.callbackPath,
      props.registration
    );
  } catch (startError) {
    error.value =
      startError instanceof Error
        ? startError.message
        : 'Přihlášení se nepodařilo spustit.';
  }
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

const run = async () => {
  error.value = '';
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('code') || params.has('error') || params.has('state')) {
      await complete(params);
      return;
    }

    returnTo.value = requestedReturnTo();
    await beginAuthorization(
      returnTo.value,
      props.callbackPath,
      props.registration
    );
  } catch (authorizationError) {
    accountStore.logout();
    error.value =
      authorizationError instanceof Error
        ? authorizationError.message
        : 'Přihlášení se nepodařilo dokončit.';
  }
};

onMounted(run);
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

    <template v-if="error">
      <div
        class="auth-transition__status auth-transition__status--error"
        aria-hidden="true"
      >
        !
      </div>
      <h1>Přihlášení se nezdařilo</h1>
      <p
        role="alert"
        class="auth-transition__message"
      >
        {{ error }}
      </p>
      <div class="auth-transition__actions">
        <button
          class="button-primary px-5 py-3"
          type="button"
          @click="start"
        >
          Zkusit znovu
        </button>
        <RouterLink
          to="/"
          class="button-secondary px-5 py-3"
        >
          Zpět na úvod
        </RouterLink>
      </div>
    </template>

    <template v-else>
      <span
        class="auth-transition__spinner"
        aria-hidden="true"
      />
      <h1>{{ registration ? 'Otevírám registraci' : 'Přihlašování' }}</h1>
      <p
        role="status"
        class="auth-transition__message"
      >
        {{
          registration
            ? 'Přesměrovávám vás na bezpečné vytvoření účtu…'
            : 'Přesměrovávám vás na bezpečné přihlášení…'
        }}
      </p>
      <p class="auth-transition__hint">
        Po dokončení se automaticky vrátíte zpět do Strnadů.
      </p>
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

.auth-transition__hint {
  @apply text-sm text-gray-500;
}

.auth-transition__actions {
  @apply mt-2 flex w-full flex-col gap-2 sm:flex-row;
}

.auth-transition__actions > * {
  @apply flex-1 text-center;
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
