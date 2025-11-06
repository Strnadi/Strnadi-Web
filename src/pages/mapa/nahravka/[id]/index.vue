<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { onBeforeRouteUpdate } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { getRecording, getFilteredRecording } from '@/api/recordings';
import { getUserInfo } from '@/api/account';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { accountStore } from '@/state/AccountStore';
import type { Numeric } from '@/types/basic';
import Spectrogram from '@/components/Spectrogram.vue';
import ToggleShow from '@/components/ToggleShow.vue';
import { MapStore } from '@/views/map/RecordingsMap.vue';
import MultiColorSquare from '@/components/MultiColorSquare.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import type { FilteredPartModel } from '@/api/recordings';
import UserCard from '@/views/UserCard.vue';

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = useRouteParams<Numeric>('id');

const env = import.meta.env;

const selected = ref([]);
const audio = ref<HTMLAudioElement | null>(null);

const editing = ref(false);
const editedName = ref('');
const editedNote = ref('');

const {
  data: recording,
  isError,
  isLoading
} = useQuery({
  queryKey: ['recordings', recordingId.value],
  queryFn: () => getRecording(recordingId.value, false)
});

const { data: filteredRec, isLoading: isFilteredRecLoading } = useQuery({
  queryKey: ['filtered-recordings', recordingId.value],
  queryFn: () => getFilteredRecording(recordingId.value)
});

const enabled = computed(() => !!recording.value?.userId);

// todo select location in the map

// Dependent query - only runs when we have an uploaderEmail from the recording
const {
  data: uploader,
  isLoading: isUploaderLoading,
  isError: isUploaderError
} = useQuery({
  queryKey: ['user', recording.value?.userId],
  queryFn: () => getUserInfo(recording.value?.userId!, accountStore.token ?? undefined),
  enabled // Use the computed enabled value
});

const queryClient = useQueryClient();

onBeforeRouteUpdate(async (to) => {
  recordingId.value = to.params.id as string;
  await queryClient.invalidateQueries({ queryKey: ['recordings'] });
  await queryClient.invalidateQueries({ queryKey: ['filtered-recordings'] });
  await queryClient.invalidateQueries({ queryKey: ['user'] });
});

// Watch for changes in the recording data to reset edited values if needed
watch(
  recording,
  (newRecording) => {
    if (newRecording) {
      editedName.value = newRecording.name || '';
      editedNote.value = newRecording.note || '';
    }
  },
  { immediate: true }
);

const toggleEdit = () => {
  if (!editing.value && recording.value) {
    // Reset edited values to current recording values when starting edit
    editedName.value = recording.value.name || '';
    editedNote.value = recording.value.note || '';
  }
  editing.value = !editing.value;
};

const saveChanges = async () => {
  // editRecording({

  // })

  await queryClient.invalidateQueries({
    queryKey: ['recording', recordingId.value]
  });
  editing.value = false;
};

const cancelEdit = () => {
  editing.value = false;
  // Optionally reset fields if needed, though toggleEdit already does this when starting
};

const segments = ref<{
  id: number;
  start: number;
  end: number;
  color: string;
}[]>([]);

watch(filteredRec, (newFilteredRec?: FilteredPartModel[]) => {
  if (newFilteredRec) {
    const firstPart = recording.value?.parts?.[0];

    if (!firstPart) return;

    let i = 0;

    segments.value = newFilteredRec.map((fr) => ({
      id: fr.id * 1000 + i++,
      start:  Number((new Date(fr.startDate).getTime() - new Date(firstPart.startDate).getTime()) / 1000),
      end: Number((new Date(fr.endDate).getTime() - new Date(firstPart.startDate).getTime()) / 1000),
      color: DialectColors.value?.[
        (fr.detectedDialects?.[0]?.confirmedDialect ?? fr.detectedDialects?.[0]?.predictedDialect ?? fr.detectedDialects?.[0]?.userGuessDialect) as keyof typeof DialectColors.value
      ] ?? '#000000'
    }));
  }
});


// onMounted(() => {
//   MapStore.move([ recordingPart.gpsLatitudeStart, recordingPart.gpsLongitudeStart ], 17);
// })

// onUnmounted(MapStore.unmove);

// watch(recording, (currentValue) => {
//   if(currentValue) {
//     MapStore.move([
//       currentValue.parts?.[0].gpsLatitudeStart,
//       currentValue.parts?.[0].gpsLongitudeStart
//     ], 17);
//   }
// }, { immediate: true });

// todo move when selecting diff recordings (onBeforeRouteUpdate)
</script>

<template>
  <h1 class="text-2xl font-semibold">
    <span v-if="editing" class="mr-1">
      <TranslatedText identifier="recordings.detail.editing_prefix" />
    </span>
    <!-- <template v-if="filteredRec">
      <template v-for="fr in filteredRec">
        <MultiColorSquare size="20px" :colors="fr.detectedDialects?.map(dd => {
          let color = null;
          if (dd.confirmedDialect && dd.confirmedDialect in DialectColors) {
            color = DialectColors.valuedd.confirmedDialect as keyof typeof DialectColors];
          }
          return color;
        }).filter(c => c !== null) ?? []" />
      </template>
    </template> -->
    <template v-if="recording?.name">
      {{ recording.name }}
    </template>
    <template v-else>
      {{ t('recordings.detail.fallback_prefix') }}{{ recordingId }}
    </template>
  </h1>

  <div v-if="editing" class="space-y-2">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">
        <TranslatedText identifier="labels.title" />:
      </label>
      <input
        id="name"
        v-model="editedName"
        type="text"
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
    </div>
  </div>

  <template v-if="isError">
    <span class="text-xl text-red-600">
      <TranslatedText identifier="common.error_prefix" />
      <span class="ml-1">
        <TranslatedText identifier="errors.recordings.loading_single" />
      </span>
    </span>
  </template>
  <template v-if="isLoading">
    <span class="text-gray-500">
      <TranslatedText identifier="states.loading" />
    </span>
  </template>
  <template v-else-if="recording">
    <div class="space-y-4">
      <!-- Metadata Section -->
      <div
        class="flex flex-row justify-between w-full text-sm text-gray-600 space-y-1"
      >
        <span v-if="uploader">
          <template v-if="uploader.nickname">{{ uploader.nickname }}</template>
          <template v-else
            >{{ uploader.firstName }} {{ uploader.lastName }}</template
          >
          {{ uploader.city ? `(${uploader.city})` : '' }}

          <template v-if="recording.byApp">
            <TranslatedText identifier="recordings.detail.by_app_suffix" />
          </template>
        </span>
        <template v-if="recording.device">
          {{ recording.device }}
        </template>
        <span>{{
          new Date(
            recording.parts?.[0]?.startDate ?? recording.createdAt!
          ).toLocaleString()
        }}</span>
      </div>

      <prefetch-link v-if="uploader" :to="`/uzivatel/${uploader.id}`">
        <UserCard :user="uploader" />
      </prefetch-link>

      <blockquote
        v-if="!editing"
        class="p-3 bg-gray-50 border-l-4 border-gray-300 italic"
      >
        {{ recording.note || t('recordings.detail.no_note') }}
      </blockquote>
      <div v-else>
        <textarea
          id="note"
          v-model="editedNote"
          rows="3"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <Spectrogram
        v-if="recording && !isFilteredRecLoading"
        :audio-urls="recording.parts?.map(p => `${env.VITE_API_URL}/recordings/part/${recording.id}/${p.id}/sound`) ?? []"
        :height="300"
        :readonly="true"
        :no-controls="true"
        :selected="segments"
      />

      <!-- Parts Section -->
      <div>
        <h3 class="text-lg font-medium mb-2">
          <TranslatedText identifier="recordings.detail.parts_heading" />
        </h3>
        <ul class="space-y-4">
          <li
            v-for="part in recording.parts"
            :key="part.id"
            class="p-3 space-y-3 flex flex-row"
          >
            <audio
              ref="audio"
              :src="`${env.VITE_API_URL}/recordings/part/${recording.id}/${part.id}/sound`"
              controls
              class="w-full"
            />

            <template v-if="accountStore.user?.role == 'admin'">
              <button class="primary text-sm p-1 px-2" :disabled="editing">
                <TranslatedText identifier="recordings.detail.delete_part" />
              </button>
            </template>
          </li>
        </ul>
      </div>

      <prefetch-link
        v-if="accountStore.user?.role === 'admin' || accountStore.user?.id === recording.userId"
        :to="`./${recordingId}/upravit-dialekt`"
        class="button-secondary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="admin.recordings.edit_dialects" />
      </prefetch-link>

      <prefetch-link
        v-if="accountStore.user?.role == 'admin' || accountStore.user?.id == recording?.userId"
        :to="`./${recordingId}/upravit`"
        class="button-secondary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="buttons.edit" />
      </prefetch-link>
      <prefetch-link
        v-if="accountStore.user?.role == 'admin'"
        :to="`./${recordingId}/smazat`"
        class="button-primary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="recordings.detail.delete_recording" />
      </prefetch-link>
      <prefetch-link
        v-else-if="accountStore.user?.role == 'user' && accountStore.user?.id == recording.userId"
        :to="`./${recordingId}/smazat`"
        class="button-secondary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="recordings.detail.request_delete" />
      </prefetch-link>

      <!-- <ToggleShow class="w-full">
        <template #toggle-button>
          <button class="secondary text-sm p-1 px-2">
            Zobrazit spektrogram
          </button>
        </template>
        <KeepAlive>
          <Spectrogram
            v-if="recording"
            :audio-urls="recording.parts?.map(p => `${env.VITE_API_URL}/recordings/part/${recording.id}/${p.id}/sound`) ?? []"
            :height="300"
            :readonly="true"
            :selected="[
              {
                id: 1,
                start: 1,
                end: 3,
                color: 'red'
              }
            ]"
          >
            <template #range-tooltip="{ range, close }">
              <div class="p-2 bg-blue-100 border border-blue-300 rounded shadow-md">
                <h4 class="font-bold">
                  Custom Tooltip!
                </h4>
                <p>Range ID: {{ range.id }}</p>
                <p>Starts at: {{ range.start.toFixed(2) }}s</p>
                <p>Ends at: {{ range.end.toFixed(2) }}s</p>
                <button
                  class="text-blue-500 hover:underline mt-1"
                  @click="close"
                >
                  Dismiss
                </button>
              </div>
            </template>
          </Spectrogram>
        </KeepAlive>
      </ToggleShow> -->

      <!-- <template v-if="accountStore.user?.role === 'admin' || accountStore.user?.id === recording.userId">
        <template v-if="editing">
          <button
            class="success p-2"
            @click="saveChanges"
          >
            Save changes
          </button>
          <button
            class="secondary p-2"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </template>

        <template v-else>
          <button
            v-if="accountStore.user?.role == 'admin' || accountStore.user?.id == recording?.userId"
            class="secondary p-2 ml-4 flex-shrink-0"
            @click="toggleEdit"
          >
            Edit
          </button>
          <button
            v-if="accountStore.user?.role == 'admin'"
            class="primary p-2"
          >
            Delete recording
          </button>
          <button
            v-else-if="accountStore.user?.role == 'user' && accountStore.user?.id == recording.userId"
            class="secondary p-2"
          >
            Request deletion
          </button>
        </template>
      </template> -->
    </div>
  </template>
  <template v-else>
    <!-- Fallback if recording is null after loading -->
    <span class="text-gray-500">
      <TranslatedText identifier="recordings.detail.not_found" />
    </span>
  </template>
</template>
