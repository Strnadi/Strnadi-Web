<script setup lang="ts">
import { patchPasswordChange, patchUser, type UserUpdateRequest } from '@/api/account';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue';
import LocationSearch from '@/components/map/LocationSearch.vue';
import { accountStore } from '@/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { ref } from 'vue';

const name = ref(accountStore.user?.firstName ?? '');
const surname = ref(accountStore.user?.lastName ?? '');
const nickname = ref(accountStore.user?.nickname ?? '');
const zipcode = ref(accountStore.user?.postCode ?? 0);
const town = ref(accountStore.user?.city ?? '');

const form = ref<HTMLFormElement | null>(null);

const password = ref("");
const passwordAgain = ref("");

const { mutate, isPending, error } = useMutation({
  mutationFn: ({ userInfo, token, userId }: { userInfo: UserUpdateRequest; token: string; userId: string }) =>
    patchUser(token, userId, userInfo),

  onSuccess: (data) => {
    accountStore.user!.firstName = name.value;
    accountStore.user!.lastName = surname.value;
    accountStore.user!.nickname = nickname.value;
    accountStore.user!.postCode = zipcode.value;
    accountStore.user!.city = town.value;
  },
});

const { mutate: passwordChangeMutate } = useMutation({
  mutationFn: ({ token, userId, newPassword }: {token: string, userId: string, newPassword: string}) =>
    patchPasswordChange(token, userId, newPassword)
})

const submitPasswordChange = () => {
  passwordChangeMutate({ token: accountStore.token!, email: accountStore.user!.email, newPassword: password.value })
}

const submit = () => {
  const token = accountStore.token!;
  mutate(
    {
      userInfo: {
        firstName: name.value,
        lastName: surname.value,
        nickname: nickname.value,
        postCode: zipcode.value,
        city: town.value
      },
      token,
      userId: accountStore.user!.id
    }
  );
}

</script>

<template>
  <h1>
    Osobní údaje
  </h1>
  <template v-if="isPending">
    <p>Ukládání...</p>
  </template>
  <template v-if="error">
    <p>Chyba: {{ error!.message }}</p>
  </template>
  <!-- <template v-if="error">
    <h1>Chyba</h1>
    <p>{{ error!.message }}</p>
    <button @click="save" class="secondary p-2 w-full">Zkusit znovu</button>
  </template> -->
  <h2>Osobní údaje</h2>
  <form
    ref="form"
    class="flex flex-col gap-y-2"
    @submit.prevent="submit"
  >
    <div>
      <label
        for="name"
        class="block text-sm font-medium mb-1"
      >Jméno</label>
      <input
        id="name"
        v-model="name"
        name="name"
        type="text"
        placeholder="Jméno"
        class="w-full p-2 border rounded"
        required
      >
    </div>
    <div>
      <label
        for="surname"
        class="block text-sm font-medium mb-1"
      >Příjmení</label>
      <input
        id="surname"
        v-model="surname"
        name="surname"
        type="text"
        placeholder="Příjmení"
        class="w-full p-2 border rounded"
        required
      >
    </div>
    <div>
      <label
        for="nickname"
        class="block text-sm font-medium mb-1"
      >Přezdívka</label>
      <input
        id="nickname"
        v-model="nickname"
        name="nickname"
        type="text"
        placeholder="Přezdívka"
        class="w-full p-2 border rounded"
      >
    </div>
    <div>
      <label
        for="zipcode"
        class="block text-sm font-medium mb-1"
      >PSČ</label>
      <input
        id="zipcode"
        v-model="zipcode"
        name="zipcode"
        type="number"
        placeholder="PSČ"
        class="w-full p-2 border rounded"
      >
    </div>
    <LocationSearch
      v-model="town"
      v-model:text="town"
      class="w-full"
      :placeholder="'Obec, město'"
    />
    <button class="secondary py-1 px-2 text-sm">
      Uložit
    </button>
  </form>

  <hr class="my-4 px-8">

  <h2>Heslo</h2>
  <div class="flex flex-col gap-y-2">
    <RevealablePasswordInput v-model="password">
      Heslo
    </RevealablePasswordInput>
    <RevealablePasswordInput v-model="passwordAgain">
      Heslo znovu
    </RevealablePasswordInput>
    <button
      class="primary p-2 w-full"
      :disabled="!passwordAgain || passwordAgain !== password"
      @click="submitPasswordChange"
    >
      Změnit heslo
    </button>
  </div>
</template>
