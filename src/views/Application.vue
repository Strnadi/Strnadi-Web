<script setup lang="ts">
import { QrcodeSvg } from 'qrcode.vue';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const isApple = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone/i.test(userAgent);
};

const isAndroid = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent);
};

onMounted(() => {
  if (isApple()) {
    window.location.href = 'https://testflight.apple.com/join/gN6SV5Dm';
  } else if (isAndroid()) {
    window.location.href = 'https://play.google.com/store/apps/details?id=com.delta.strnadi';
  }
});

const location = window.location.href;
</script>

<template>

  <h1>Stažení aplikace</h1>

  <div class="flex flex-col w-full items-center">
    <QrcodeSvg
      :value="location"
      :size="300"
    />
  </div>

</template>