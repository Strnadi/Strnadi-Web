<script setup lang="ts">
import ProfileIcon from "@/icons/icon-profile.svg"
import { accountStore } from '@/features/Account/state/AccountStore';
import Dropdown from '@/features/Dropdown/components/Dropdown.vue';

const user = accountStore.user!;
</script>

<template>
  <Dropdown>
    <template v-slot:title class='flex flex-row items-center'>
      <img v-if="!user.profilePicture" :src="ProfileIcon" />
      <img v-else :src="user.profilePicture" />

      {{ user.firstName }} {{ user.lastName }}
      <svg
        class="ml-1 h-4 w-4 fill-current text-gray-500 hover:text-gray-600"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" />
      </svg>
    </template>
    <li>
      <PrefetchLink to="/ucet">
        <div class="dropdown-item">Profil</div>
      </PrefetchLink>
    </li>
    <li v-if="accountStore.user?.role === 'admin'">
      <PrefetchLink to="/admin">
        <div class="dropdown-item">Admin</div>
      </PrefetchLink>
    </li>
    <li class="cursor-pointer" @click="accountStore.logout">
      <div class="dropdown-item">Odhlásit se</div>
    </li>
  </Dropdown>
</template>
