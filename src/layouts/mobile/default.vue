<script setup lang="ts">
import MobileNav from '@/views/nav/MobileNav.vue';
</script>

<template>
  <div class="flex flex-col w-svw min-h-svh">
    <div class="flex flex-1">
      <router-view />
    </div>
    <MobileNav />
  </div>
</template>
