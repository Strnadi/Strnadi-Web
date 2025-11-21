<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script lang="ts">
import { reactive } from 'vue';

export const registerStore = reactive({
  name: '',
  surname: '',
  nickname: '',
  email: '',
  password: '',
  passwordConfirm: '',
  postCode: 0,
  city: '',
  dataAgreement: false,
  marketingAgreement: false,
  isExternalSignup: false,
  appleId: null as string | null,
  jwt: null as string | null,
  userExists: false,
  checkingEmail: false,

  reset() {
    this.name = '';
    this.surname = '';
    this.nickname = '';
    this.email = '';
    this.password = '';
    this.postCode = 0;
    this.city = '';
    this.appleId = '';
    this.dataAgreement = false;
    this.isExternalSignup = false;
    this.passwordConfirm = '';
    this.marketingAgreement = false;
    this.jwt = null;
    this.userExists = false;
    this.checkingEmail = false;
  }
});
</script>

<script setup lang="ts">
import * as jose from 'jose';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation } from '@tanstack/vue-query';
import { getUserExists, postRegister, type SignUpRequest } from '@/api/account';
import { accountStore } from '@/state/AccountStore';
import {
  postGoogleSignup,
  type JWTObject,
  type OAuth2SignUpResponse
} from '@/api/account';
import { useStepper } from '@vueuse/core';
import AuthButtons from '@/views/AuthButtons.vue';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import LocationSearch from '@/components/map/LocationSearch.vue';
import DigitInput from '@/components/DigitInput.vue';
import type { TranslationIdentifier } from '@/constants/Translations';

const router = useRouter();
const emailElement = ref<HTMLInputElement | null>(null);

// 1) Pre‐fetch whether the email exists whenever email or agreement changes
watch(
  () => [registerStore.email, registerStore.dataAgreement],
  async ([email, agreed]) => {
    if (email && agreed) {
      registerStore.checkingEmail = true;
      registerStore.userExists = await getUserExists(email);
      registerStore.checkingEmail = false;
    } else {
      registerStore.userExists = false;
    }
  }
);

const {
  mutate: googleSignupMutate,
  isPending,
  isError,
  error
} = useMutation({
  mutationFn: ({ idToken }: { idToken: string }) =>
    postGoogleSignup({ idToken }),

  onSuccess: (signupJWT: OAuth2SignUpResponse) => {
    const userJWT: JWTObject = jose.decodeJwt(signupJWT.jwt);

    if (!userJWT.sub) return;

    if (signupJWT.firstName) registerStore.name = signupJWT.firstName;
    if (signupJWT.lastName) registerStore.surname = signupJWT.lastName;
    registerStore.email = userJWT.sub;
    registerStore.isExternalSignup = true;
    stepper.goToNext();
  },

  onError: (err) => {
    error.value = err.message;
  }
});

// set up the final registration mutation
const {
  mutate: registerMutate,
  isPending: isRegPending,
  isError: isRegError,
  data: regData,
  error: regError
} = useMutation({
  mutationFn: (data: SignUpRequest) =>
    postRegister(data, registerStore.jwt ?? undefined),

  onSuccess: (jwt: string) => {
    accountStore.login(jwt);
    registerStore.reset();
    stepper.goToNext();
  }
});

const stepper = useStepper<
  Record<string, { title: TranslationIdentifier; isValid: () => boolean }>
>({
  email: {
    title: 'auth.register.steps.email',
    isValid: () =>
      emailElement.value &&
      !!registerStore.email &&
      registerStore.dataAgreement &&
      !registerStore.userExists &&
      !registerStore.checkingEmail &&
      emailElement.value.checkValidity()
  },

  'personal-info': {
    title: 'auth.register.steps.personal_info',
    isValid: () => registerStore.nickname.trim() !== ''
  },

  location: {
    title: 'auth.register.steps.location',
    isValid: () => true
  },

  password: {
    title: 'auth.register.steps.password',
    isValid: () => {
      const { password, passwordConfirm } = registerStore;
      return (
        password &&
        passwordConfirm &&
        password === passwordConfirm &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password)
      );
    }
  },

  'final-confirm': {
    title: 'auth.register.steps.confirmation',
    isValid: () => true
  },

  'creating-account': {
    title: 'auth.register.steps.creating_account',
    isValid: () => true
  },

  done: {
    title: 'auth.register.steps.done',
    isValid: () => true
  }
});

const googleSignup = (idToken: string) => {
  googleSignupMutate({ idToken });
};

function submit() {
  if (stepper.isLast.value) {
    router.push('/');
    return;
  }

  if (stepper.current.value.isValid()) {
    stepper.goToNext();
  }

  if (stepper.current.value === stepper.steps.value['creating-account'])
    register();
}

function allStepsBeforeAreValid(index: number): boolean {
  return !Array.from({ length: index }, () => null).some(
    (_, i) => !stepper.at(i)?.isValid()
  );
}

const register = () => {
  registerMutate({
    email: registerStore.email,
    firstName: registerStore.name,
    lastName: registerStore.surname,
    nickname:
      registerStore.nickname && registerStore.nickname != ''
        ? registerStore.nickname
        : null,
    password: registerStore.password,
    postCode: registerStore.postCode,
    city: registerStore.city,
    appleId: registerStore.appleId,
    consent: false
  });
};

watch(
  () => stepper.current.value,
  (newValue) => {
    if (
      registerStore.isExternalSignup &&
      newValue === stepper.steps.value.password
    ) {
      stepper.goToNext();
    }
  }
);
</script>

<template>
  <h1 class="text-lg font-bold">
    <TranslatedText :identifier="stepper.current.value.title" />
  </h1>

  <form @submit.prevent="submit">
    <div class="flex flex-col justify-center gap-2 mt-2">
      <div>
        <div v-if="stepper.isCurrent('email')">
          <div class="flex flex-col gap-y-4">
            <template v-if="registerStore.userExists">
              <p class="text-red-600">
                <TranslatedText
                  identifier="auth.register.email_exists.prefix"
                />
                <PrefetchLink to="/ucet/zapomenute-heslo" class="underline">
                  <TranslatedText
                    identifier="auth.register.email_exists.link"
                  />
                </PrefetchLink>
                <TranslatedText
                  identifier="auth.register.email_exists.suffix"
                />
              </p>
            </template>

            <div class="flex flex-col w-full">
              <label for="email">
                <div
                  class="text-sm font-medium mb-1 flex flex-row justify-between"
                >
                  <span>
                    <TranslatedText identifier="labels.email" />
                  </span>
                  <PrefetchLink to="/ucet/zapomenute-heslo">
                    <TranslatedText identifier="buttons.forgotten_password" />?
                  </PrefetchLink>
                </div>
              </label>
              <input
                v-model="registerStore.email"
                ref="emailElement"
                name="email"
                type="email"
                class="p-2"
                required
                :placeholder="t('placeholders.email')"
              />
            </div>
            <div class="flex flex-row items-center gap-x-2 m-4">
              <input
                id="agreement"
                v-model="registerStore.dataAgreement"
                type="checkbox"
              />
              <label for="agreement">
                <span class="text-sm">
                  <TranslatedText identifier="auth.register.agreement.prefix" />
                  <span class="mx-1">
                    <TranslatedText identifier="project_name" />
                  </span>
                  <PrefetchLink to="/podminky-pouziti" class="underline">
                    <TranslatedText identifier="auth.register.agreement.link" />
                  </PrefetchLink>
                  <TranslatedText identifier="auth.register.agreement.suffix" />
                </span>
              </label>
            </div>
            <AuthButtons
              :disabled="isPending || !registerStore.dataAgreement"
              @success="googleSignup"
            />
          </div>
        </div>

        <!-- personal-info -->
        <div
          v-if="stepper.isCurrent('personal-info')"
          class="flex flex-col gap-y-4"
        >
          <div class="flex flex-col gap-y-1">
            <label for="name">
              <TranslatedText identifier="labels.name" />
            </label>
            <input
              id="name"
              class="p-2"
              v-model="registerStore.name"
              type="text"
              required
            />
          </div>
          <div class="flex flex-col gap-y-1">
            <label for="surname">
              <TranslatedText identifier="labels.surname" />
            </label>
            <input
              id="surname"
              class="p-2"
              v-model="registerStore.surname"
              type="text"
              required
            />
          </div>
          <div class="flex flex-col gap-y-1">
            <label for="nickname">
              <TranslatedText identifier="labels.nickname_optional" />
            </label>
            <input
              id="nickname"
              class="p-2"
              v-model="registerStore.nickname"
              type="text"
            />
            <p class="text-gray-600 text-sm">
              <TranslatedText identifier="auth.register.nickname_hint" />
            </p>
          </div>
        </div>

        <!-- location -->
        <div v-if="stepper.isCurrent('location')" class="flex flex-col gap-y-4">
          <div class="flex flex-col gap-y-1">
            <h2>
              <TranslatedText identifier="labels.postal_code" />
            </h2>
            <DigitInput v-model="registerStore.postCode" :digits="5" />
            <p class="text-gray-600">
              <TranslatedText identifier="auth.register.postal_code_hint" />
            </p>
          </div>
          <div class="flex flex-col gap-y-1">
            <label for="city">
              <TranslatedText identifier="labels.city" />
            </label>
            <LocationSearch
              id="city"
              class="p-2"
              v-model:text="registerStore.city"
            />
            <p class="text-gray-600">
              <TranslatedText identifier="auth.register.city_hint" />
            </p>
          </div>
        </div>

        <!-- password -->
        <div v-if="stepper.isCurrent('password')" class="flex flex-col gap-y-4">
          <p class="text-gray-600">
            <TranslatedText identifier="auth.register.password_hint" />
          </p>
          <template
            v-if="
              !stepper.current.value.isValid() &&
              registerStore.password !== '' &&
              registerStore.passwordConfirm === registerStore.password
            "
          >
            <span>
              <TranslatedText identifier="auth.register.password_invalid" />
            </span>
          </template>
          <template
            v-if="
              registerStore.password !== registerStore.passwordConfirm &&
              registerStore.passwordConfirm !== ''
            "
          >
            <span>
              <TranslatedText identifier="auth.register.password_mismatch" />
            </span>
          </template>
          <RevealablePasswordInput
            v-model="registerStore.password"
            :label="t('labels.password')"
            class="p-2"
          />
          <RevealablePasswordInput
            v-model="registerStore.passwordConfirm"
            :label="t('labels.password_confirm')"
            class="p-2"
          />
        </div>

        <!-- final-confirm -->
        <div
          v-if="stepper.isCurrent('final-confirm')"
          class="flex flex-col gap-y-2"
        >
          <h2>
            <TranslatedText identifier="auth.register.summary.title" />
          </h2>
          <span>
            <TranslatedText identifier="auth.register.summary.email" />
            {{ registerStore.email }}
          </span>
          <span>
            <TranslatedText identifier="auth.register.summary.name" />
            {{ registerStore.name }}
          </span>
          <span>
            <TranslatedText identifier="auth.register.summary.surname" />
            {{ registerStore.surname }}
          </span>
          <span>
            <TranslatedText identifier="auth.register.summary.nickname" />
            {{ registerStore.nickname }}
          </span>
          <span>
            <TranslatedText identifier="auth.register.summary.postal_code" />
            {{ registerStore.postCode }}
          </span>
          <span>
            <TranslatedText identifier="auth.register.summary.city" />
            {{ registerStore.city }}
          </span>
          <span>
            <TranslatedText identifier="auth.register.summary.terms" />
          </span>
        </div>

        <div v-if="stepper.isCurrent('creating-account')">
          <p v-if="isPending || isRegPending">
            <TranslatedText
              identifier="auth.register.status.creating_account_wait"
            />
          </p>
          <template v-else-if="isRegError || isError">
            <p>{{ (error ?? regError)!.message }}</p>
            <button class="secondary p-2 w-full" @click="register">
              <TranslatedText identifier="buttons.retry" />
            </button>
          </template>
        </div>

        <!-- done -->
        <div v-if="stepper.isCurrent('done')" class="flex flex-col gap-y-4">
          <template v-if="isRegPending">
            <p>
              <TranslatedText
                identifier="auth.register.status.creating_account"
              />
            </p>
          </template>
          <template v-else-if="isRegError">
            <p>{{ regError!.message }}</p>
            <button class="secondary p-2 w-full" @click="register">
              <TranslatedText identifier="buttons.retry" />
            </button>
          </template>
          <template v-else>
            <h2>
              <TranslatedText identifier="auth.register.status.success_title" />
            </h2>
            <span class="font-medium">
              <TranslatedText
                identifier="auth.register.status.success_message"
              />
            </span>
          </template>
        </div>
      </div>

      <div>
        <button
          :disabled="!stepper.current.value.isValid()"
          class="primary p-2 my-2 w-full"
          type="submit"
        >
          <template v-if="!stepper.isLast.value">
            <TranslatedText identifier="buttons.next" />
          </template>
          <template v-else>
            <TranslatedText identifier="buttons.close" />
          </template>
        </button>
      </div>
    </div>
  </form>

  <div class="flex gap-2 my-4 justify-center">
    <div v-for="(step, id, i) in stepper.steps.value" :key="id" class="">
      <button
        :disabled="!allStepsBeforeAreValid(i) && stepper.isBefore(id)"
        class="text-sm text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed"
        :class="{
          'text-gray-900 font-bold': stepper.isCurrent(id),
          'text-yellow-500': stepper.isAfter(id)
        }"
        @click="stepper.goTo(id)"
      >
        <TranslatedText :identifier="step.title" />
      </button>
    </div>
  </div>
</template>
