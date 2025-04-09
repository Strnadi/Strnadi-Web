<script setup lang="ts">
import { MapIcons } from '@/components/map/MapIcons';
</script>

<template>
  <h1>Legenda nářečí</h1>

  <div
    class="flex flex-row flex-wrap"
  >
    <div v-for="(data, _) in MapIcons" :key="data.fileName" class="flex flex-col items-center flex-[1_0_25%]">
      <img :src="data.fileName" :alt="`Map Icon ${data.friendlyName}`" class="w-16 h-16 m-2" />
      <span>{{ data.friendlyName }}</span>
    </div>
  </div>

</template>
