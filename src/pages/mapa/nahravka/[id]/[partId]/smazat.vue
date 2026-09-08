<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouteParams } from '@vueuse/router';
import { useQueryClient } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import { deleteRecordingPart } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';

import type { Numeric } from '@/types/basic';

const recordingId = useRouteParams<Numeric>('id');
const partId = useRouteParams<Numeric>('partId');
const router = useRouter();
const queryClient = useQueryClient();
const isDeleting = ref(false);
const error = ref<string | null>(null);

const removePart = async () => {
  if (!accountStore.token || isDeleting.value) return;
  isDeleting.value = true;
  error.value = null;
  try {
    await deleteRecordingPart(accountStore.token, recordingId.value, partId.value);
    await queryClient.invalidateQueries({
      queryKey: ['recording', recordingId.value],
      exact: true
    });
    await router.replace(`/mapa/nahravka/${recordingId.value}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Část se nepodařilo smazat.';
  } finally {
    isDeleting.value = false;
  }
};
</script>

<template>
  <h1 class="text-xl font-semibold">Smazat část nahrávky?</h1>
  <p>Část #{{ partId }} bude trvale odstraněna.</p>
  <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
  <div class="flex gap-2">
    <button type="button" class="button-danger p-2" :disabled="isDeleting" @click="removePart">
      Smazat
    </button>
    <button type="button" class="button-secondary p-2" :disabled="isDeleting" @click="router.back()">
      Zrušit
    </button>
  </div>
</template>
