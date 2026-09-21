<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script lang="ts" setup>
import { useQuery } from '@tanstack/vue-query';
import { getIncompleteRecordings, getRecordings } from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import { computed } from 'vue';
import TranslatedText from '@/components/TranslatedText.vue';
import type { TranslationIdentifier } from '@/constants/Translations';

const {
  data: recordings,
  isError,
  isLoading
} = useQuery({
  queryKey: ['my-recordings', accountStore.user?.id],
  queryFn: () => getRecordings({ userId: accountStore.user!.id })
});

// Recordings whose parts never all arrived; the API tracks this separately so
// a half-finished upload does not silently look complete.
const { data: incomplete } = useQuery({
  queryKey: ['my-recordings', 'incomplete', accountStore.user?.id],
  queryFn: () => getIncompleteRecordings(accountStore.token!),
  enabled: computed(() => Boolean(accountStore.token))
});

const incompleteIds = computed(
  () => new Set((incomplete.value ?? []).map((recording) => recording.id))
);

const statusFor = (recording: {
  id: number;
  uploadConfirmed: boolean;
}): { identifier: TranslationIdentifier; class: string } => {
  if (incompleteIds.value.has(recording.id))
    return { identifier: 'recordings.status.incomplete', class: 'text-red-600' };
  if (!recording.uploadConfirmed)
    return {
      identifier: 'recordings.status.unconfirmed',
      class: 'text-amber-600'
    };
  return { identifier: 'recordings.status.uploaded', class: 'text-lime-500' };
};

const recordingsLength = computed(() => recordings.value?.length || 0);

</script>

<template>
  <div class="w-full">
    <h1>
      <TranslatedText identifier="account.my_recordings.title" />
    </h1>
    <template v-if="isLoading">
      <TranslatedText identifier="loading" />...
    </template>
    <template v-else-if="isError">
      <TranslatedText identifier="errors.recordings.loading" />
    </template>
    <template v-else>
      <ul
        v-if="recordingsLength > 0"
        class="flex flex-col-reverse gap-y-3"
      >
        <li
          v-for="rec in recordings"
          :key="rec.id"
        >
          <router-link
            :to="`/mapa/nahravka/${rec.id}`"
            class="flex flex-col justify-around bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:bg-gray-50 transition duration-200"
          >
            <div class="flex flex-row justify-between">
              <span class="text-lg font-bold">{{ rec.name }}</span>
              <span :class="statusFor(rec).class">
                <TranslatedText :identifier="statusFor(rec).identifier" />
              </span>
            </div>
            <div class="flex flex-row justify-between">
              <span />
              <span>{{ new Date(rec.createdAt).toLocaleString() }}</span>
            </div>
          </router-link>
        </li>
      </ul>
      <p v-else>
        <translated-text identifier="empty" />
      </p>
    </template>
  </div>
</template>
