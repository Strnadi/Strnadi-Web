<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { QrcodeSvg } from 'qrcode.vue';
import { onMounted } from 'vue';

import AppleIcon from '@/icons/apple.svg';
import AndroidIcon from '@/icons/android.svg';
import TranslatedText from '@/components/TranslatedText.vue';

const isApple = (): boolean => {
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone/i.test(userAgent);
};

const isAndroid = (): boolean => {
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent);
};

onMounted(() => {
  if (isApple()) {
    window.location.href = 'https://apps.apple.com/us/app/strnadi/id6740916079';
  } else if (isAndroid()) {
    window.location.href =
      'https://play.google.com/store/apps/details?id=com.delta.strnadi';
  }
});

const location = window.location.href;
</script>

<template>
  <div class="flex flex-row gap-x-2 content-center">
    <img src="/WIP.png" width="50px" />
    <h1>Stažení aplikace</h1>
  </div>

  <div class="flex flex-col items-center gap-y-4">
    <div class="flex flex-col items-center gap-y-4">
      <div class="flex flex-col items-center gap-x-4 w-3/4 gap-y-2">
        <QrcodeSvg :value="location" :size="200" class="w-fit" />

        <span class="font-medium text-justify [text-align-last:center] text-sm">
          <TranslatedText identifier="app.qr_code" />
        </span>
      </div>

      <table>
        <tbody>
          <tr>
            <td><AndroidIcon /></td>
            <td>
              <span>
                <TranslatedText identifier="app.google_play" />
              </span>
            </td>
          </tr>
          <tr>
            <td><AppleIcon /></td>
            <td>
              <span>
                <TranslatedText identifier="app.apple" />
                <a href="https://developer.apple.com/testflight" external="true"
                  >TestFlight</a
                >.
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <span
        class="font-medium text-justify italic [text-align-last:center] text-sm text-red-600"
      >
        <TranslatedText identifier="app.development" />
      </span>
    </div>
  </div>
</template>
