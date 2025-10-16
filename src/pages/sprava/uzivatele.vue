<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { getUsers } from "@/api/account";
import { accountStore } from "@/state/AccountStore";

const { data: users, isLoading } = useQuery({
  queryKey: ["users"],
  queryFn: async () => await getUsers(accountStore.token!),
});
</script>

<template>
  <h1>Seznam uživatelů</h1>

  <template v-if="isLoading">
    Načítání...
  </template>
  <template v-else>
    <ul class="flex flex-col-reverse gap-y-3">
      <PrefetchLink
        v-for="user in users"
        :key="user.id"
        :to="`/uzivatel/${user.id}`"
        class="flex flex-col border-2 border-gray-200 hover:bg-gray-300 p-2 rounded-lg"
      >
        <span>{{ user.firstName }} {{ user.lastName }}</span>
        <div class="flex flex-row justify-between">
          <span>{{ user.email ?? "Neznámý e-mail" }}</span>
 
          <span
            class="text-sm"
            :class="{
              'text-lime-400': user.isEmailVerified,
              'text-red-500': !user.isEmailVerified,
            }"
          >
            {{ user.isEmailVerified ? "Ověřený" : "Neověřený" }}
          </span>
        </div>
      </PrefetchLink>
    </ul>
  </template>
</template>
