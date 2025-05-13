<route>
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { DialectIcons } from '@/views/Map.vue';
</script>

<template>
  <h1>Nápověda k mapě</h1>

  <div
    class="flex flex-row gap-x-2 gap-y-2 flex-wrap"
  >
    <div
      v-for="(data, _) in DialectIcons"
      :key="data.fileName"
      class="flex min-w-fit flex-row p-2 items-center border-1 border-gray-200 bg-white rounded-2xl flex-[1_0_20%]"
    >
      <img
        :src="data.fileName"
        :alt="`Map Icon ${data.friendlyName}`"
        class="w-8 h-8 m-1"
      >
      <span class="text-sm font-medium">{{ data.friendlyName }}</span>
    </div>
  </div>
</template>
