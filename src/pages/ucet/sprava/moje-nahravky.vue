<route>
meta:
  layout: desktop/side
</route>

<script lang="ts" setup>

import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import { computed } from 'vue';
import TranslatedText from '@/components/TranslatedText.vue';

const { data: recordings, isError, isLoading } = useQuery({
  queryKey: ['my-recordings'],
  queryFn: () => getRecordings({userId: accountStore.user!.id})
})

const recordingsLength = computed(() => recordings.value?.length || 0);

</script>

<template>
  <h1><TranslatedText identifier="recordings.mine" /></h1>
  <template v-if="isLoading">
    <TranslatedText identifier="loading" />...
  </template>
  <template v-if="isError">
    <TranslatedText identifier="errors.recordings.loading" />
  </template>
  <template v-else>
    <ul
      v-if="recordingsLength > 0"
      class="flex flex-col-reverse gap-y-3"
    >
      <li
        v-for="rec in recordings"
        :key="rec.id"
      >
        <router-link
          :to="`/nahravka/${rec.id}`"
          class="flex flex-col justify-around p-2 border-2 border-gray-200 hover:bg-gray-300 h-20 rounded-lg"
        >
          <div class="flex flex-row justify-between">
            <span class="text-lg font-bold">{{ rec.name }}</span>
            <span class="text-lime-400"><TranslatedText identifier="recordings.recorded" /></span>
          </div>
          <div class="flex flex-row justify-between">
            <span />
            <span>{{ new Date(rec.createdAt).toLocaleString() }} </span>
          </div>
        </router-link>
      </li>
    </ul>
    <p v-else>
      <translated-text identifier="empty" />
    </p>
  </template>
</template>
