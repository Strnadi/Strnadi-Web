<script setup lang="ts">
import { MapIcons } from '@/components/map/MapIcons';
</script>

<template>
  <h1>Legenda nářečí</h1>

  <div
    class="flex flex-row flex-wrap desktop:max-w-2/3"
  >
    <div v-for="(icon, name) in MapIcons" :key="name" class="flex flex-col items-center flex-[1_0_25%]">
      <img :src="icon" :alt="`Map Icon ${name}`" class="w-16 h-16 m-2" />
      <span>{{ name }}</span>
    </div>
  </div>

</template>
