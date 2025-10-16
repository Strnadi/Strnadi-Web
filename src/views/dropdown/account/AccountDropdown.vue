<script setup lang="ts">
import ProfileIcon from "@/icons/interface/icon-profile.svg"
import DropdownIcon from '@/icons/interface/dropdown.svg';
import { accountStore } from '@/state/AccountStore';
import Dropdown from '@/components/Dropdown.vue';
// import List from '@/icons/interface/icon-list.svg';

const user = accountStore.user!;
</script>

<template>
  <Dropdown>
    <template
      #title
    >
      <div class="flex flex-row items-center">
        <ProfileIcon v-if="!user.profilePicture" />
        <img
          v-else
          :src="user.profilePicture"
        >

        {{ user.firstName }} {{ user.lastName }}
        <DropdownIcon />
      </div>
    </template>
    <li>
      <PrefetchLink to="/ucet/muj-ucet">
        <div class="dropdown-item">
          Profil
        </div>
      </PrefetchLink>
    </li> 
    <li>
      <PrefetchLink
        to="/ucet/sprava/moje-nahravky"
        class="dropdown-item"
      >
        <!-- <List /> -->
        Moje záznamy
      </PrefetchLink>
    </li>
    <li v-if="accountStore.user?.role === 'admin'">
      <PrefetchLink to="/sprava">
        <div class="dropdown-item">
          Admin
        </div>
      </PrefetchLink>
    </li>
    <li
      class="cursor-pointer"
      @click="accountStore.logout"
    >
      <div class="dropdown-item">
        Odhlásit se
      </div>
    </li>
  </Dropdown>
</template>
