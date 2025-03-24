<script lang="ts" setup>

import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recording';
import { accountStore } from '@/state/AccountStore';

const { data: recordings, isError, isLoading } = useQuery({
  queryKey: ['my-recordings'],
  queryFn: () => getRecordings(accountStore.user!.email)
})

</script>

<template>
  <template v-if="isLoading">Loading...</template>
  <template v-if="isError">Error loading recordings.</template>
  <template v-else>
    <ul>
      <li v-for="rec in recordings" :key="rec.id">{{ rec.name }}</li>
    </ul>
  </template>
</template>
