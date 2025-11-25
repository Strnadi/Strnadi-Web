<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup vapor lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRouteParams } from '@vueuse/router';
import { useQuery } from '@tanstack/vue-query';
import { getRecording, patchRecording } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import type { Numeric } from '@/types/basic';
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

const name = ref('');
const note = ref('');

watch(
  recording,
  (rec) => {
    if (rec) {
      name.value = rec.name ?? '';
      note.value = rec.note ?? '';
    }
  },
  { immediate: true }
);

const saving = ref(false);
async function save() {
  if (!accountStore.token) {
    // alert(t('errors.auth.not_logged_in'));
    return;
  }
  try {
    saving.value = true;
    await patchRecording(accountStore.token, recordingId.value, {
      byApp: recording.value?.byApp ?? false,
      device: recording.value?.device ?? '',
      estimatedBirdsCount: recording.value?.estimatedBirdsCount ?? 0,
      name: name.value,
      note: note.value
    });
    // alert(t('recordings.messages.updated'));
    router.back();
  } catch (e) {
    console.error(e);
    // alert(t('errors.recordings.update_failed'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <h1 class="text-2xl font-semibold mb-4">
    <TranslatedText identifier="recordings.detail.edit_recording_title" />
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
    <div class="space-y-4 max-w-lg">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700">
          <TranslatedText identifier="labels.title" />
        </label>
        <input
          id="name"
          v-model="name"
          type="text"
          class="mt-1 block w-full border px-3 py-2 rounded"
        />
      </div>
      <div>
        <label for="note" class="block text-sm font-medium text-gray-700">
          <TranslatedText identifier="labels.note" />
        </label>
        <textarea
          id="note"
          v-model="note"
          rows="4"
          class="mt-1 block w-full border px-3 py-2 rounded"
        />
      </div>
      <div class="space-x-2">
        <button class="success" :disabled="saving" @click="save">
          {{ saving ? t('states.saving') : t('buttons.save') }}
        </button>
        <button class="secondary" :disabled="saving" @click="router.back()">
          <TranslatedText identifier="buttons.cancel" />
        </button>
      </div>
    </div>
  </template>
</template>
