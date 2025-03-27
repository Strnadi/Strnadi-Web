<script lang="ts" setup>

import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recording';
import { accountStore } from '@/state/AccountStore';
import { computed } from 'vue';

const { data: recordings, isError, isLoading } = useQuery({
  queryKey: ['my-recordings'],
  queryFn: () => getRecordings(accountStore.user!.email)
})

const recordingsLength = computed(() => recordings.value?.length || 0);

</script>

<template>
  <template v-if="isLoading">Loading...</template>
  <template v-if="isError">Error loading recordings.</template>
  <template v-else>
    <ul v-if="recordingsLength > 0" class="flex flex-col-reverse gap-y-3">
      <li v-for="rec in recordings" :key="rec.id">
        <router-link :to="`/nahravka/${rec.id}`" class="flex flex-col justify-around p-2 bg-gray-200 hover:bg-gray-300 h-20 rounded-lg">
          <div class="flex flex-row justify-between">
            <span>{{ rec.name }}</span>
            <span>{{ rec.createdAt}} </span>
          </div>
          <div>

          </div>
        </router-link>
      </li>
    </ul>
    <p v-else>Zatím zde nic není.</p>
  </template>
</template>
