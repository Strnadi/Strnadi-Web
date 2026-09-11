<route lang="yaml">
meta:
  layout: desktop/popup
</route>

<script setup vapor lang="ts">
import { getResendVerifyEmail } from '@/api/account';
import SegmentedProgress from '@/components/SegmentedProgress.vue';
import { accountStore } from '@/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { useCountdown } from '@vueuse/core';
import { shallowRef } from 'vue';
import TranslatedText from '@/components/TranslatedText.vue';

const countdownMaxSeconds = 30;
const countdownSeconds = shallowRef(countdownMaxSeconds);

const { isActive, remaining, start, stop, reset } = useCountdown(
  countdownSeconds,
  {
    onComplete() {
      stop();
      reset();
    }
  }
);

const { mutate } = useMutation({
  mutationFn: ({ email }: { email: string }) => getResendVerifyEmail(email)
});

const resendEmail = () => {
  if (!accountStore.user?.email) return;
  mutate({ email: accountStore.user.email });
  start();
};
</script>

<template>
  <h1>
    <TranslatedText identifier="account.verification.resend_title" />
  </h1>
  <button
    :disabled="isActive"
    class="button-primary p-2 w-full text-center"
    @click="resendEmail"
  >
    <TranslatedText identifier="buttons.resend_verification" />
  </button>
  <div
    v-if="isActive"
    class="flex flex-row"
  >
    <p>{{ remaining }}s</p>
    <SegmentedProgress
      :progress="remaining"
      :total-segments="countdownMaxSeconds"
    />
  </div>
</template>
