<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup vapor lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRouteParams } from '@vueuse/router';
import { deleteRecording, getRecording } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import type { Numeric } from '@/types/basic';
import { useQuery } from '@tanstack/vue-query';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const router = useRouter();
const recordingId = useRouteParams<Numeric>('id');

const {
  data: recording,
  isLoading,
  isError
} = useQuery({
  queryKey: ['recording', recordingId.value],
  queryFn: () => getRecording(recordingId.value)
});

const isDeleting = ref(false);
async function confirmDelete() {
  try {
    isDeleting.value = true;
    await deleteRecording(accountStore.token!, recordingId.value);
    // alert(t('recordings.messages.deleted'));
    router.push('/mapa');
  } catch (e) {
    console.error(e);
    // alert(t('errors.recordings.delete_failed'));
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold mb-4">
    <TranslatedText identifier="recordings.detail.delete_recording_title" />
  </h1>
  <template v-if="isLoading">
    <TranslatedText identifier="states.loading" />
  </template>
  <template v-else-if="isError || !recording">
    <p class="text-red-600">
      <TranslatedText identifier="errors.recordings.loading_single" />
    </p>
  </template>
  <template v-else>
    <p>
      <TranslatedText identifier="recordings.confirm.delete_prompt" />
      <strong class="ml-1">{{ recording.name || `#${recordingId}` }}</strong>
      ?
      <span class="ml-1">
        <TranslatedText identifier="common.irreversible_action" />
      </span>
    </p>
    <div class="mt-4 space-x-2 flex flex-row">
      <button
        class="primary p-2 w-full"
        :disabled="isDeleting"
        @click="confirmDelete"
      >
        {{ isDeleting ? t('states.deleting') : t('buttons.delete') }}
      </button>
      <button
        class="secondary p-2 w-full"
        :disabled="isDeleting"
        @click="router.back()"
      >
        <TranslatedText identifier="buttons.cancel" />
      </button>
    </div>
  </template>
</template>
