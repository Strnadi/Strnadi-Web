<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  notVerified?: boolean
}>();

console.log(props.notVerified)

const isMobile = computed(() => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|iPad|iPhone/i.test(userAgent);
})

</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <div class="flex flex-col items-center gap-y-3">
      <img src="/logo-no-text.svg" />
      <h2>Nářečí českých strnadů</h2>
    </div>
    <span class="text-xl text-center">
      E-Mail
      <template v-if="props.notVerified">bohužel nebyl ověřen.</template>
      <template v-else>byl ověřen.</template>
    </span>
    <a v-if="isMobile" class="button-primary p-2 w-full text-center" href="com.delta.strnadi://">Zpět do aplikace</a>
    <PrefetchLink v-else class="button-primary p-2 w-full text-center" :replace="true" to="/">Dokončit registraci</PrefetchLink>
  </div>
</template>
