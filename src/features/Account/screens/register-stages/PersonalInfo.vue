<script setup lang="ts">
import { registerStore } from '@/features/Account/state/RegisterStore'

</script>

<template>
  <h1>Osobní informace</h1>
  <form class="flex flex-col gap-y-4" @submit.prevent="registerStore.nextStage">
    <div class="flex flex-col gap-y-1">
      <label for="name" class="block text-sm font-medium">Jméno</label>
      <input id="name" v-model="registerStore.name" type="text" required />
    </div>
    <div class="flex flex-col gap-y-1">
      <label for="surname" class="block text-sm font-medium">Příjmení</label>
      <input id="surname" v-model="registerStore.surname" type="text" required />
    </div>
    <div class="flex flex-col gap-y-1">
      <label for="nickname" class="block text-sm font-medium">Přezdívka (nepovinné)</label>
      <input id="nickname" v-model="registerStore.nickname" type="text" />
      <label for="nickname" class="text-wrap text-gray-600">Pokud nevyplníte přezdívku, na webu bude zobrazováno Vaše celé jméno.</label>
    </div>
    <button class="primary p-2 m-2" type="submit">Pokračovat</button>
  </form>
</template>
