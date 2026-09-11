<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup vapor lang="ts">
import {
  patchPasswordChange,
  patchUser,
  type UserUpdateRequest
} from '@/api/account';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue';
import LocationSearch from '@/components/map/LocationSearch.vue';
import { accountStore } from '@/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { ref } from 'vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const name = ref(accountStore.user?.firstName ?? '');
const surname = ref(accountStore.user?.lastName ?? '');
const nickname = ref(accountStore.user?.nickname ?? '');
const zipcode = ref(accountStore.user?.postCode?.toString() ?? '');
const town = ref(accountStore.user?.city ?? '');

const currentPassword = ref('');
const password = ref('');
const passwordAgain = ref('');

const { mutate, isPending, isSuccess, error } = useMutation({
  mutationFn: ({
    userInfo,
    token,
    userId
  }: {
    userInfo: UserUpdateRequest;
    token: string;
    userId: string | number;
  }) => patchUser(token, userId, userInfo),

  onSuccess: (user) => {
    accountStore.user = user;
  }
});

const {
  mutate: passwordChangeMutate,
  isPending: isPasswordPending,
  isSuccess: isPasswordSuccess,
  error: passwordError
} = useMutation({
  mutationFn: ({
    token,
    userId,
    newPassword,
    currentPassword
  }: {
    token: string;
    userId: string | number;
    newPassword: string;
    currentPassword: string;
  }) => patchPasswordChange(token, userId, newPassword, currentPassword),
  onSuccess: () => {
    currentPassword.value = '';
    password.value = '';
    passwordAgain.value = '';
  }
});

const submitPasswordChange = () => {
  passwordChangeMutate({
    token: accountStore.token!,
    userId: accountStore.user!.id,
    newPassword: password.value,
    currentPassword: currentPassword.value
  });
};

const submit = () => {
  const token = accountStore.token!;
  mutate({
    userInfo: {
      firstName: name.value,
      lastName: surname.value,
      nickname: nickname.value,
      postCode: zipcode.value ? Number.parseInt(zipcode.value, 10) : null,
      city: town.value
    },
    token,
    userId: accountStore.user!.id
  });
};
</script>

<template>
  <h1>
    <TranslatedText identifier="account.personal_data.title" />
  </h1>
  <template v-if="isPending">
    <p>
      <TranslatedText identifier="states.saving" />
    </p>
  </template>
  <template v-if="error">
    <p>
      <TranslatedText identifier="common.error_prefix" />
      <span class="ml-1">{{ error!.message }}</span>
    </p>
  </template>
  <p
    v-else-if="isSuccess"
    role="status"
    class="text-green-700"
  >
    Osobní údaje byly uloženy.
  </p>
  <!-- <template v-if="error">
    <h1>Chyba</h1>
    <p>{{ error!.message }}</p>
    <button @click="save" class="secondary p-2 w-full">Zkusit znovu</button>
  </template> -->
  <h2>
    <TranslatedText identifier="account.personal_data.title" />
  </h2>
  <form
    class="flex flex-col gap-y-2"
    @submit.prevent="submit"
  >
    <div>
      <label
        for="name"
        class="block text-sm font-medium mb-1"
      >
        <TranslatedText identifier="labels.name" />
      </label>
      <input
        id="name"
        v-model="name"
        name="name"
        type="text"
        :placeholder="t('placeholders.name')"
        class="w-full p-2 border rounded"
      />
    </div>
    <div>
      <label
        for="surname"
        class="block text-sm font-medium mb-1"
      >
        <TranslatedText identifier="labels.surname" />
      </label>
      <input
        id="surname"
        v-model="surname"
        name="surname"
        type="text"
        :placeholder="t('placeholders.surname')"
        class="w-full p-2 border rounded"
      />
    </div>
    <div>
      <label
        for="nickname"
        class="block text-sm font-medium mb-1"
      >
        <TranslatedText identifier="labels.nickname" />
      </label>
      <input
        id="nickname"
        v-model="nickname"
        name="nickname"
        type="text"
        :placeholder="t('placeholders.nickname')"
        class="w-full p-2 border rounded"
      />
    </div>
    <div>
      <label
        for="zipcode"
        class="block text-sm font-medium mb-1"
      >
        <TranslatedText identifier="labels.postal_code" />
      </label>
      <input
        id="zipcode"
        v-model="zipcode"
        name="zipcode"
        type="number"
        :placeholder="t('placeholders.postal_code')"
        class="w-full p-2 border rounded"
      />
    </div>
    <LocationSearch
      v-model="town"
      v-model:text="town"
      class="w-full"
      :placeholder="t('placeholders.city')"
    />
    <button class="secondary py-1 px-2 text-sm">
      <TranslatedText identifier="buttons.save" />
    </button>
  </form>

  <hr class="my-4 px-8" />

  <h2>
    <TranslatedText identifier="account.personal_data.password_section_title" />
  </h2>
  <div class="flex flex-col gap-y-2 w-full">
    <p
      v-if="passwordError"
      role="alert"
      class="text-red-700"
    >
      {{ passwordError.message }}
    </p>
    <p
      v-else-if="isPasswordSuccess"
      role="status"
      class="text-green-700"
    >
      Heslo bylo změněno.
    </p>
    <RevealablePasswordInput
      v-model="currentPassword"
      class="p-2"
      autocomplete="current-password"
    >
      Současné heslo
    </RevealablePasswordInput>
    <RevealablePasswordInput
      v-model="password"
      class="p-2"
      autocomplete="new-password"
    >
      <TranslatedText identifier="labels.password" />
    </RevealablePasswordInput>
    <RevealablePasswordInput
      v-model="passwordAgain"
      class="p-2"
      autocomplete="new-password"
    >
      <TranslatedText identifier="labels.password_confirm" />
    </RevealablePasswordInput>
    <button
      class="primary p-2 w-full"
      :disabled="
        isPasswordPending ||
        !currentPassword ||
        !passwordAgain ||
        passwordAgain !== password
      "
      @click="submitPasswordChange"
    >
      <TranslatedText identifier="buttons.change_password" />
    </button>
  </div>
</template>
