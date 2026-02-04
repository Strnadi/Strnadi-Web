<script setup lang="ts">
import ProfileIcon from '@/icons/interface/icon-profile.svg';
import DropdownIcon from '@/icons/interface/dropdown.svg';
import { accountStore } from '@/state/AccountStore';
import Dropdown from '@/components/Dropdown.vue';
// import List from '@/icons/interface/icon-list.svg';

const user = accountStore.user!;
</script>

<template>
  <Dropdown>
    <template #title>
      <div class="flex flex-row items-center">
        <ProfileIcon v-if="!user.profilePicture" />
        <img
          v-else
          :src="user.profilePicture"
        />

        <template v-if="user.nickname && !user.firstName && !user.lastName">
          @{{ user.nickname }}
        </template>
        <template v-else> {{ user.firstName }} {{ user.lastName }} </template>
        <DropdownIcon />
      </div>
    </template>
    <li>
      <RouterLink
        to="/ucet/muj-ucet"
        class="dropdown-item"
      >
        Můj profil
      </RouterLink>
    </li>
    <li>
      <RouterLink
        to="/ucet/sprava/oznameni"
        class="dropdown-item"
      >
        Oznámení
      </RouterLink>
    </li>
    <li>
      <RouterLink
        to="/nastaveni"
        class="dropdown-item"
      >
        Nastavení webové aplikace
      </RouterLink>
    </li>
    <li v-if="accountStore.user?.role === 'admin'">
      <RouterLink
        to="/sprava"
        class="dropdown-item"
      >
        Administrace systému
      </RouterLink>
    </li>
    <li
      class="cursor-pointer dropdown-item"
      @click="accountStore.logout"
    >
      Odhlásit se
    </li>
  </Dropdown>
</template>
