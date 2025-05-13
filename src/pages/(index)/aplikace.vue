<route>
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { QrcodeSvg } from 'qrcode.vue';
import { onMounted } from 'vue';

import AppleIcon from '@/icons/apple.svg';
import AndroidIcon from '@/icons/android.svg';

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
    window.location.href = 'https://ios.strnadi.cz';
  } else if (isAndroid()) {
    window.location.href = 'https://apk.strnadi.cz';
  }
});

const location = window.location.href;
</script>

<template>
  <h1>Stažení aplikace</h1>

  <div class="flex flex-col items-center gap-y-4">
    <div class="flex flex-col items-center gap-y-4">
      <div class="flex flex-row items-center gap-x-4">
        <QrcodeSvg
          :value="location"
          :size="200"
          class="w-fit"
        />

        <span class="font-medium text-justify [text-align-last:center] text-sm w-1/2">
          Toto je "chytrý" QR kód, který vás přesměruje přímo na ten správný obchod s aplikacemi pro vaši platformu.
        </span>
      </div>

      <table>
        <tbody>
          <tr>
            <td><AndroidIcon /></td>
            <td>
              <span>
                Na obchodě Google Play se aplikace jmenuje Strnadi a je v předběžném přístupu.
              </span>
            </td>
          </tr>
          <tr>
            <td><AppleIcon /></td>
            <td>
              <span>
                Vlastníci telefonů značky Apple si musí aplikaci stáhnout přes beta testovací aplikaci
                <a href="https://developer.apple.com/testflight" external="true">TestFlight</a>.
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <hr />

      <span class="font-medium text-justify italic [text-align-last:center] text-sm">
        Aplikace, stejně jako web, stále prochází velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.
      </span>
    </div>
  </div>

</template>