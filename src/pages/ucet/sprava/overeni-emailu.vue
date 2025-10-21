<route lang="yaml">
meta:
  layout: desktop/popup
</route>

<script setup lang="ts">
import { getResendVerifyEmail } from '@/api/account';
import SegmentedProgress from '@/components/SegmentedProgress.vue';
import { accountStore } from '@/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { useCountdown } from '@vueuse/core';
import { shallowRef } from 'vue';

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
  mutationFn: ({ userId }: { userId: number }) => getResendVerifyEmail(userId)
});

const resendEmail = () => {
  mutate({ userId: accountStore.user!.id });
  start();
};
</script>

<template>
  <h1>Znovuodeslání ověřovacího e-mailu</h1>
  <button
    :disabled="isActive"
    class="button-primary p-2 w-full text-center"
    @click="resendEmail"
  >
    Odeslat ověřovací e-mail
  </button>
  <div v-if="isActive" class="flex flex-row">
    <p>{{ remaining }}s</p>
    <SegmentedProgress
      :progress="remaining"
      :total-segments="countdownMaxSeconds"
    />
  </div>
</template>
