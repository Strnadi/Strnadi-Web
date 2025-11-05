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
        <img v-else :src="user.profilePicture" />

        {{ user.firstName }} {{ user.lastName }}
        <DropdownIcon />
      </div>
    </template>
    <li>
      <PrefetchLink to="/ucet/muj-ucet" class="dropdown-item" v-wave>
        Můj profil
      </PrefetchLink>
    </li>
    <li>
      <PrefetchLink to="/ucet/sprava/moje-nahravky" class="dropdown-item" v-wave>
        Moje záznamy
      </PrefetchLink>
    </li>
    <li v-if="accountStore.user?.role === 'admin'">
      <PrefetchLink to="/sprava" class="dropdown-item" v-wave>
        Administrace systému
      </PrefetchLink>
    </li>
    <li class="cursor-pointer dropdown-item" @click="accountStore.logout" v-wave>
      Odhlásit se
    </li>
  </Dropdown>
</template>
