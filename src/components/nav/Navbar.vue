<script setup lang="ts">
import { ref } from 'vue';
import { accountStore } from '@/state/AccountStore';

import Dropdown from '@/components/generic/Dropdown.vue'

import Upload from '@/assets/icon-upload.svg';
import Notifications from '@/assets/icon-notifications-empty.svg';
import List from '@/assets/icon-list.svg';
import Info from '@/assets/icon-info.svg';
import Rights from './Rights.vue';
import InfoDropdownItems from './InfoDropdownItems.vue';

const isMenuOpen = ref(false);
const session = accountStore.user;

</script>

<template>
  <div class="flex justify-between items-center h-16 bg-white rounded-4xl m-2 2xl:m-5 pr-4">
    <!-- Logo -->
    <div class="h-full flex flex-row items-center p-4 font-semibold rounded-4xl bg-[#fdfcdc] border-[#fdfcdc]">
      <RouterLink to="/">
        <img src="/logo.svg" alt="Logo" />
      </RouterLink>
    </div>

    <!-- Mobile menu toggle -->
    <button 
      class="2xl:hidden p-2" 
      aria-label="Toggle menu"
      v-on:click="isMenuOpen = !isMenuOpen"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" :d="isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'" />
      </svg>
    </button>

    <!-- Desktop navigation - shown only on 2xl screens -->
    <div class="hidden 2xl:flex justify-between items-center w-full ml-4">
      <ul class='flex flex-row gap-x-8 items-center'>
        <div v-if="session">
          <li>
            <RouterLink to="/add-recording" class='font-semibold flex flex-row gap-x-1 items-center'>
              <img :src="Upload" alt="Upload" />
              Nahrát
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/account/my-recordings" class='font-semibold flex flex-row gap-x-1 items-center'>
              <img :src="List" alt="List" />
              Moje záznamy
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/account/notifications" class='font-semibold flex flex-row gap-x-1 items-center'>
              <img :src="Notifications" alt="Notifications" />
              Oznámení
            </RouterLink>
          </li>
          <li class='font-semibold'>
            <InfoDropdown />
          </li>
        </div>

        <div v-else class="flex flex-row gap-x-4 items-center">
          <InfoDropdownItems />
          <Dropdown>
            <template v-slot:title class="flex flex-row items-center">
              <img :src="Info" />
              Formality
            </template>
            <Rights />
          </Dropdown>
        </div>
      </ul>

      <ul class="flex flex-row gap-x-4 items-center">
        <RouterLink to="/application" class='button-primary py-2 px-4'>
          Stáhnout aplikaci
        </RouterLink>
        <li>
          <AccountDropdown v-if="session" />
          <RouterLink v-else to="/auth/login" class="button-secondary py-2 px-4">Přihlásit se</RouterLink>
        </li>
      </ul>
    </div>
  </div>

  <!-- Mobile menu - collapsible (shown on screens below 2xl) -->
  <div
    v-if="isMenuOpen"
    class="2xl:hidden bg-white py-4 px-2 mx-2 rounded-2xl"
    @click="isMenuOpen = !isMenuOpen"
  >
    <ul class='flex flex-col gap-y-4  p-4'>
      <div v-if="session">
        <li>
          <RouterLink to="/add-recording" class='font-semibold flex flex-row gap-x-1 items-center'>
            <img :src="Upload" alt="Upload" />
            Nahrát
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/account/my-recordings" class='font-semibold flex flex-row gap-x-1 items-center'>
            <img :src="List" alt="List" />
            Moje záznamy
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/account/notifications" class='font-semibold flex flex-row gap-x-1 items-center'>
            <img :src="Notifications" alt="Notifications" />
            Oznámení
          </RouterLink>
        </li>
        <li class='font-semibold'>
          <InfoDropdown />
        </li>
      </div>
      <InfoDropdownItems v-else />

      <li class="pt-4">
        <RouterLink to="/application" class='button-primary py-2 px-4 block w-full text-center'>
          Stáhnout aplikaci
        </RouterLink>
      </li>
      <li class="pt-2">
        <AccountDropdown v-if="session"/>
        <RouterLink v-else to="/auth/login" class="button-secondary py-2 px-4 block w-full text-center">Přihlásit se</RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>

@reference "../../main.css";

:deep(.dropdown-item) {
  @apply font-semibold block px-4 py-2 hover:bg-gray-100 hover:border-0 rounded-xl;
}

</style>
