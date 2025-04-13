<script setup lang="ts">
import { patchUser } from '@/api/account';
import type { UserUpdateRequest } from '@/api/types/auth';
import LocationSearch from '@/components/map/LocationSearch.vue';
import { accountStore } from '@/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { ref } from 'vue';

const name = ref(accountStore.user?.firstName || '');
const surname = ref(accountStore.user?.lastName || '');
const nickname = ref(accountStore.user?.nickname || '');
const zipcode = ref(accountStore.user?.postCode || 0);
const town = ref(accountStore.user?.city || '');

const { mutate, isPending, error } = useMutation({
  mutationFn: ({ userInfo, token, email }: { userInfo: UserUpdateRequest; token: string; email: string }) =>
    patchUser(token, email, userInfo),

  onSuccess: (data) => {
    accountStore.user!.firstName = data.firstName,
    accountStore.user!.lastName = data.lastName,
    accountStore.user!.nickname = data.nickname,
    accountStore.user!.postCode = data.postCode,
    accountStore.user!.city = data.city
  },
});

const save = () => {
  const token = accountStore.token!;
  const email = accountStore.user!.email;
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
      email
    }
  );
}

</script>

<template>
  <h1 class="flex flex-row justify-between">
    <span>Osobní údaje</span>
    <button class="secondary py-1 px-2 text-sm" @click="save">Uložit</button>
  </h1>
  <template v-if="isPending">
    <p>Ukládání...</p>
  </template>
  <template v-if="error">
    <h1>Chyba</h1>
    <p>{{ error!.message }}</p>
    <button @click="save" class="secondary p-2 w-full">Zkusit znovu</button>
  </template>
  <div>
    <label for="name" class="block text-sm font-medium mb-1">Jméno</label>
    <input
      id="name"
      v-model="name"
      name="name"
      type="text"
      placeholder="Jméno"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="surname" class="block text-sm font-medium mb-1">Příjmení</label>
    <input
      id="surname"
      v-model="surname"
      name="surname"
      type="text"
      placeholder="Příjmení"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="nickname" class="block text-sm font-medium mb-1">Přezdívka</label>
    <input
      id="nickname"
      v-model="nickname"
      name="nickname"
      type="text"
      placeholder="Přezdívka"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="zipcode" class="block text-sm font-medium mb-1">PSČ</label>
    <input
      id="zipcode"
      v-model="zipcode"
      name="zipcode"
      type="number"
      placeholder="PSČ"
      class="w-full p-2 border rounded"
    />
  </div>
  <LocationSearch 
    v-model="town"
    class="w-full"
    :placeholder="'Obec, město'"
    v-model:text="town"
  />
  <prefetch-link to="/ucet/smazat" class="text-red-500">
    Smazat účet
  </prefetch-link>
</template>
