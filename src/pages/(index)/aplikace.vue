<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup vapor lang="ts">
import { QrcodeSvg } from 'qrcode.vue';
import { onMounted } from 'vue';

import AppleIcon from '@/icons/apple.svg';
import AndroidIcon from '@/icons/android.svg';
import TranslatedText from '@/components/TranslatedText.vue';

const env = import.meta.env;

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
    <!-- <img src="/WIP.png" width="50px" /> -->
    <h1>
      <TranslatedText identifier="pages.application.title" />
    </h1>
  </div>

  <div class="flex flex-col items-center gap-y-4">
    <div class="flex flex-col items-center gap-y-4">
      <div class="flex flex-col items-center gap-x-4 w-3/4 gap-y-2">
        <QrcodeSvg
          :value="location"
          :size="200"
          class="w-fit"
          background="transparent"
          :image-settings="{
            src: `${env.VITE_PUBLIC_URL}/WIP.png`,
            width: 48,
            height: 48,
            excavate: true
          }"
        />

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
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="flex flex-row gap-x-2">
        <a href="https://www.instagram.com/p/DKzadiSK_OP">
          <div class="flex flex-col items-center">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg"
              width="40px"
            />
            <span>
              <TranslatedText identifier="pages.application.how_to_download" />
            </span>
          </div>
        </a>
      </div>

      <hr />

      <span
        class="font-medium text-justify italic [text-align-last:center] text-sm text-red-600"
      >
        <TranslatedText identifier="app.development" />
      </span>
    </div>
  </div>
</template>
