<script setup lang="ts">
import { QrcodeSvg } from 'qrcode.vue';
import { onMounted } from 'vue';

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

  <div class="flex flex-col items-center gap-y-4">
    <div class="flex flex-col items-center gap-y-4">
      <QrcodeSvg
        :value="location"
        :size="200"
        class="w-fit"
      />

      <span class="font-medium text-justify [text-align-last:center] text-sm">
        Toto je "chytrý" QR kód, který vás přesměruje přímo na ten správný obchod s aplikacemi pro vaši platformu.
      </span>

      <hr />

      <span class="font-medium text-justify italic [text-align-last:center] text-sm">
        Aplikace, stejně jako web, stále prochází velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.
      </span>
    </div>
  </div>

</template>