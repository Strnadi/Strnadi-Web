<script setup lang="ts">
import DropdownIcon from '@/icons/interface/dropdown.svg';
import { accountStore } from '@/state/AccountStore';
import Dropdown from '@/components/Dropdown.vue';
import ProfilePhoto from '@/components/ProfilePhoto.vue';
// import List from '@/icons/interface/icon-list.svg';

const user = accountStore.user!;
</script>

<template>
  <Dropdown>
    <template #title>
      <div class="flex flex-row items-center">
        <div class="h-8 w-8 overflow-hidden rounded-full">
          <ProfilePhoto
            :user-id="user.id"
            :fallback-text="
              (user.userName || user.firstName || '?').slice(0, 1)
            "
          />
        </div>

        <template v-if="user.userName && !user.firstName && !user.lastName">
          @{{ user.userName }}
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
      @click="accountStore.logoutFromIdentityProvider"
    >
      Odhlásit se
    </li>
  </Dropdown>
</template>
