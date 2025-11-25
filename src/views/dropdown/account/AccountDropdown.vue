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
        >

        <template v-if="user.nickname && !user.firstName && !user.lastName">
          @{{ user.nickname }}
        </template>
        <template v-else>
          {{ user.firstName }} {{ user.lastName }}
        </template>
        <DropdownIcon />
      </div>
    </template>
    <li>
      <PrefetchLink
        v-wave
        to="/ucet/muj-ucet"
        class="dropdown-item"
      >
        Můj profil
      </PrefetchLink>
    </li>
    <li>
      <PrefetchLink
        v-wave
        to="/ucet/sprava/oznameni"
        class="dropdown-item"
      >
        Oznámení
      </PrefetchLink>
    </li>
    <li>
      <PrefetchLink
        v-wave
        to="/nastaveni"
        class="dropdown-item"
      >
        Nastavení webové aplikace
      </PrefetchLink>
    </li>
    <li v-if="accountStore.user?.role === 'admin'">
      <PrefetchLink
        v-wave
        to="/sprava"
        class="dropdown-item"
      >
        Administrace systému
      </PrefetchLink>
    </li>
    <li
      v-wave
      class="cursor-pointer dropdown-item"
      @click="accountStore.logout"
    >
      Odhlásit se
    </li>
  </Dropdown>
</template>
