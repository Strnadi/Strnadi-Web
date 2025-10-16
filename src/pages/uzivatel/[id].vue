<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useRouteParams } from "@vueuse/router";
import type { Numeric} from "@/types/basic";
import { getUserInfo } from "@/api/account";
import { accountStore } from "@/state/AccountStore";
import { useQuery } from "@tanstack/vue-query";

const id = useRouteParams<Numeric>("id");

const { data: user } = useQuery({
  queryKey: ["user", id],
  queryFn: () => getUserInfo(accountStore.token!, id.value)
});
</script>

<template>
  <h1>
    <template v-if="user && user.firstName && user.lastName">
      {{ user.firstName }} {{ user.lastName }}
    </template>
    <template v-else> Uživatel @{{ user?.nickname }} </template>
  </h1>
</template>
