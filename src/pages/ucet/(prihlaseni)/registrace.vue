<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script lang="ts">

import {reactive} from "vue";

export const registerStore = reactive({
  name: "",
  surname: "",
  nickname: "",
  email: "",
  password: "",
  passwordConfirm: "",
  postCode: 0,
  city: "",
  dataAgreement: false,
  marketingAgreement: false,
  isExternalSignup: false,
  appleId: null as string | null,
  jwt: null as string | null,
  userExists: false,
  checkingEmail: false,

  reset() {
    this.name = "";
    this.surname = "";
    this.nickname = "";
    this.email = "";
    this.password = "";
    this.postCode = 0;
    this.city = "";
    this.appleId = "";
    this.dataAgreement = false;
    this.isExternalSignup = false;
    this.passwordConfirm = "";
    this.marketingAgreement = false;
    this.jwt = null;
    this.userExists = false;
    this.checkingEmail = false;
  }

});

</script>

<script setup lang="ts">
import * as jose from 'jose';
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { getUserExists, postRegister, type SignUpRequest } from '@/api/account'
import { accountStore } from '@/state/AccountStore'
import { postGoogleSignup, type JWTObject, type OAuth2SignUpResponse } from '@/api/account';
import { useStepper } from '@vueuse/core';
import AuthButtons from '@/views/AuthButtons.vue';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue'
import TranslatedText from '@/components/TranslatedText.vue';
import LocationSearch from '@/components/map/LocationSearch.vue';
import DigitInput from '@/components/DigitInput.vue';

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

const stepper = useStepper({
  'email': {
    title: 'E-mail',
    isValid: () =>
      emailElement.value &&
      !!registerStore.email &&
      registerStore.dataAgreement &&
      !registerStore.userExists &&
      !registerStore.checkingEmail &&
      emailElement.value.checkValidity()
  },

  'personal-info': {
    title: 'Osobní údaje',
    isValid: () => registerStore.name.trim() !== '' && registerStore.surname.trim() !== '',
  },

  'location': {
    title: 'Umístění',
    isValid: () => true,
  },

  'password': {
    title: 'Heslo',
    isValid: () => {
      const { password, passwordConfirm } = registerStore
      return (
        password &&
        passwordConfirm &&
        password === passwordConfirm &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password)
      )
    },
  },

  'final-confirm': {
    title: 'Potvrzení',
    isValid: () => true,
  },

  'done': {
    title: 'Hotovo',
    isValid: () => true
  }
})


const { mutate: googleSignupMutate, isPending, error } = useMutation({
  mutationFn: ({ idToken }: { idToken: string }) => postGoogleSignup({ idToken }),

  onSuccess: (signupJWT: OAuth2SignUpResponse) => {
    const userJWT: JWTObject = jose.decodeJwt(signupJWT.jwt);

    if(!userJWT.sub) return;

    if(signupJWT.firstName) registerStore.name = signupJWT.firstName;
    if(signupJWT.lastName) registerStore.surname = signupJWT.lastName;
    registerStore.email = userJWT.sub;
    registerStore.isExternalSignup = true;
    stepper.goToNext();
  },

  onError: (err) => {
    error.value = err.message;
  },
})


const googleSignup = (idToken: string) => {
  googleSignupMutate({ idToken })
}

function submit() {
  if (stepper.current.value.isValid()) {
    stepper.goToNext()
  }

  if (stepper.current.value === stepper.steps.value.done) register()

}

function allStepsBeforeAreValid(index: number): boolean {
  return (
    !Array
      .from({ length: index }, () => null)
      .some((_, i) => !stepper.at(i)?.isValid())
  )
}

// set up the final registration mutation
const router = useRouter()
const { mutate: registerMutate, isPending: isRegPending, isError: isRegError, data: regData, error: regError } = useMutation({
  mutationFn: (data: SignUpRequest) => postRegister(data, registerStore.jwt ?? undefined),
  onSuccess: (jwt: string) => {
    accountStore.login(jwt)
    registerStore.reset()
  },
})

const register = () => {
  registerMutate({
    email: registerStore.email,
    firstName: registerStore.name,
    lastName: registerStore.surname,
    nickname: (registerStore.nickname && registerStore.nickname != '') ? registerStore.nickname : null,
    password: registerStore.password,
    postCode: registerStore.postCode,
    city: registerStore.city,
    appleId: registerStore.appleId,
    consent: false,
  })
}

watch(() => stepper.current.value, (newValue) => {
  if (registerStore.isExternalSignup &&
      newValue === stepper.steps.value.password
  ) {
    stepper.goToNext();
  }
});
</script>

<template>
  <h1
    class="text-lg font-bold"
    v-text="stepper.current.value.title"
  />

  <form @submit.prevent="submit">
    <div class="flex flex-col justify-center gap-2 mt-2">
      <div>
        <div v-if="stepper.isCurrent('email')">
          <div class="flex flex-col gap-y-4">
            <template v-if="registerStore.userExists">
              <p class="text-red-600">
                Tento e-mail je již registrován. Pokud si nepamatujete své heslo, můžete si ho <PrefetchLink
                  to="/ucet/zapomenute-heslo"
                  class="underline"
                >obnovit zde</PrefetchLink>.
              </p>
            </template>

            <div class="flex flex-col w-full">
              <label for="email">
                <div class="text-sm font-medium mb-1 flex flex-row justify-between">
                  <span>E-mail</span>
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
                placeholder="E-Mail"
              >
            </div>
            <div class="flex flex-row items-center gap-x-2 m-4">
              <input
                id="agreement"
                v-model="registerStore.dataAgreement"
                type="checkbox"
              >
              <label for="agreement">
                <span class="text-sm">Zapojením do projektu občanské vědy Nářečí českých strnadů <PrefetchLink
                  to="/podminky-pouziti"
                  class="underline"
                >souhlasím s podmínkami</PrefetchLink></span>
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
            <label for="name">Jméno</label>
            <input
              id="name"
              class="p-2"
              v-model="registerStore.name"
              type="text"
              required
            >
          </div>
          <div class="flex flex-col gap-y-1">
            <label for="surname">Příjmení</label>
            <input
              id="surname"
              class="p-2"
              v-model="registerStore.surname"
              type="text"
              required
            >
          </div>
          <div class="flex flex-col gap-y-1">
            <label for="nickname">Přezdívka (nepovinné)</label>
            <input
              id="nickname"
              class="p-2"
              v-model="registerStore.nickname"
              type="text"
            >
            <p class="text-gray-600 text-sm">
              Pokud nevyplníte, na webu bude zobrazováno Vaše celé jméno.
            </p>
          </div>
        </div>

        <!-- location -->
        <div
          v-if="stepper.isCurrent('location')"
          class="flex flex-col gap-y-4"
        >
          <div class="flex flex-col gap-y-1">
            <DigitInput
              v-model="registerStore.postCode"
              :digits="5"
            />
            <!-- <label for="postalCode">PSČ</label>
            <input
              id="postalCode"
              v-model="registerStore.postCode"
              type="number"
              min="0"
              max="99999"
            > -->
            <p class="text-gray-600">
              Nepovinné; pokus vyplníte, budete dostávat aktuality z vaší lokality.
            </p>
          </div>
          <div class="flex flex-col gap-y-1">
            <label for="city">Město</label>
            <LocationSearch
              id="city"
              class="p-2"
              v-model:text="registerStore.city"
            />
            <p class="text-gray-600">
              Nepovinné, bude zobrazováno na vašem profilu.
            </p>
          </div>
        </div>

        <!-- password -->
        <div
          v-if="stepper.isCurrent('password')"
          class="flex flex-col gap-y-4"
        >
          <p class="text-gray-600">
            Heslo musí mít minimálně 8 znaků, 1 velké písmeno a 1 číslici.
          </p>
          <template v-if="!stepper.current.value.isValid() && registerStore.password !== '' && registerStore.passwordConfirm === registerStore.password">
            <span>Heslo nesplňuje požadavky</span>
          </template>
          <template v-if="registerStore.password !== registerStore.passwordConfirm && registerStore.passwordConfirm !== ''">
            <span>Hesla nejsou stejná</span>
          </template>
          <RevealablePasswordInput
            v-model="registerStore.password"
            label="Heslo"
            class="p-2"
          />
          <RevealablePasswordInput
            v-model="registerStore.passwordConfirm"
            label="Heslo znovu"
            class="p-2"
          />
        </div>

        <!-- final-confirm -->
        <div
          v-if="stepper.isCurrent('final-confirm')"
          class="flex flex-col gap-y-2"
        >
          <h2>Je takto všechno správně?</h2>
          <span>E-mail: {{ registerStore.email }}</span>
          <span>Jméno: {{ registerStore.name }}</span>
          <span>Příjmení: {{ registerStore.surname }}</span>
          <span>Přezdívka: {{ registerStore.nickname }}</span>
          <span>PSČ: {{ registerStore.postCode }}</span>
          <span>Město: {{ registerStore.city }}</span>
          <span>S podmínkami použití souhlasím.</span>
        </div>

        <!-- done -->
        <div
          v-if="stepper.isCurrent('done')"
          class="flex flex-col gap-y-4"
        >
          <template v-if="isRegPending">
            <p>Vytváření účtu…</p>
          </template>
          <template v-else-if="isRegError">
            <p>{{ regError!.message }}</p>
            <button
              class="secondary p-2 w-full"
              @click="register"
            >
              Zkusit znovu
            </button>
          </template>
          <template v-else>
            <h2>Gratulace! Váš účet byl založen.</h2>
            <span class="font-medium">Na vaši e-mailovou adresu vám krátce přijde odkaz, pomocí kterého<br> si ověříte váš účet.</span>
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
            Další
          </template>
          <template v-else>
            Zavřít
          </template>
        </button>
      </div>
    </div>
  </form>

  <div class="flex gap-2 my-4 justify-center">
    <div
      v-for="(step, id, i) in stepper.steps.value"
      :key="id"
      class=""
    >
      <button
        :disabled="!allStepsBeforeAreValid(i) && stepper.isBefore(id)"
        class="text-sm text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed"
        :class="{
          'text-gray-900 font-bold': stepper.isCurrent(id),
          'text-yellow-500': stepper.isAfter(id),
        }"
        @click="stepper.goTo(id)"
        v-text="step.title"
      />
    </div>
  </div>
</template>
