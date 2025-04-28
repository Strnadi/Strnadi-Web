<script setup lang="ts">
import { ref } from 'vue';
import { accountStore } from '@/features/Account/state/AccountStore';

import Dropdown from '@/features/Dropdown/components/Dropdown.vue'
import AccountDropdown from '@/features/Account/components/AccountDropdown.vue';

import Upload from '@/icons/icon-upload.svg';
import Notifications from '@/icons/icon-notifications-empty.svg';
import List from '@/icons/icon-list.svg';
import Info from '@/icons/icon-info.svg';
import Rights from './Rights.vue';
import InfoDropdownItems from '@/features/Navbar/components/InfoDropdownItems.vue';
import InfoDropdown from '@/features/Navbar/components/InfoDropdown.vue';

import DropdownIcon from '@/icons/dropdown.svg'

const isMenuOpen = ref(false);


</script>

<template>
  <div class="flex justify-between gap-x-4 items-center h-16 bg-white rounded-4xl m-2 desktop:m-5 pr-4">
    <!-- Logo -->
    <div class="h-full flex flex-row items-center p-4 font-semibold rounded-4xl bg-[#fdfcdc] border-[#fdfcdc]">
      <PrefetchLink to="/vitejte">
        <img src="/logo.svg" alt="Logo" />
      </PrefetchLink>
    </div>

    <div class="desktop:hidden flex flex-row items-center gap-x-2">
      <PrefetchLink to="/aplikace" class='button-primary py-2 px-4 desktop:hidden text-center'>
        Stáhnout aplikaci
      </PrefetchLink>
      <!-- Mobile menu toggle -->
      <button
        class="p-2"
        aria-label="Toggle menu"
        v-on:click="isMenuOpen = !isMenuOpen"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" :d="isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'" />
        </svg>
      </button>
    </div>

    <!-- Desktop navigation - shown only on lg screens -->
    <div class="hidden desktop:flex justify-between items-center w-full">
      <ul class='flex flex-row gap-x-4 items-center'>
        <template v-if="accountStore.user">
          <li>
            <PrefetchLink to="/nahrat" class='dropdown-item'>
              <img :src="Upload" alt="Upload" />
              Nahrát
            </PrefetchLink>
          </li>
          <li>
            <PrefetchLink to="/ucet/moje-nahravky" class='dropdown-item'>
              <img :src="List" alt="List" />
              Moje záznamy
            </PrefetchLink>
          </li>
          <li class='font-semibold'>
            <InfoDropdown />
          </li>
        </template>

        <div v-else class="flex flex-row gap-x-4 items-center">
          <InfoDropdownItems />
          <Dropdown>
            <template v-slot:title class="flex flex-row items-center">
              Formality
              <img :src="DropdownIcon" width="16" />
            </template>
            <Rights />
          </Dropdown>
        </div>
      </ul>

      <ul class="flex flex-row gap-x-4 items-center">
        <PrefetchLink to="/aplikace" class='button-primary py-2 px-4 max-sm:text-sm'>
          Stáhnout aplikaci
        </PrefetchLink>
        <li>
          <AccountDropdown v-if="accountStore.user" />
          <PrefetchLink v-else to="/ucet/splash" class="button-secondary py-2 px-4">Přihlásit se</PrefetchLink>
        </li>
      </ul>
    </div>
  </div>

  <!-- Mobile menu - collapsible (shown on screens below lg) -->
  <div
    v-if="isMenuOpen"
    class="desktop:hidden bg-white py-4 px-2 mx-2 rounded-lg"
    @click="isMenuOpen = !isMenuOpen"
  >
    <ul class='flex flex-col gap-y-4  p-4'>
      <div v-if="accountStore.user">
        <li>
          <PrefetchLink to="/nahrat" class='dropdown-item'>
            <img :src="Upload" alt="Upload" />
            Nahrát
          </PrefetchLink>
        </li>
        <li>
          <PrefetchLink to="/ucet/moje-nahravky" class='dropdown-item'>
            <img :src="List" alt="List" />
            Moje záznamy
          </PrefetchLink>
        </li>
        <!-- <li>
          <PrefetchLink to="/account/notifications" class='dropdown-item'>
            <img :src="Notifications" alt="Notifications" />
            Oznámení
          </PrefetchLink>
        </li> -->
        <InfoDropdown />
      </div>
      <InfoDropdownItems v-else />
      <Rights />

      <li class="pt-2">
        <AccountDropdown v-if="accountStore.user"/>
        <PrefetchLink v-else to="/ucet/splash" class="button-secondary py-2 px-4 block w-full text-center">Přihlásit se</PrefetchLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>

@reference "../../../styles/main.css";

:deep(.dropdown-item) {
  @apply font-semibold flex flex-row items-center gap-x-1 px-5 py-2 hover:bg-gray-100 hover:border-0 rounded-xl;
}

</style>
