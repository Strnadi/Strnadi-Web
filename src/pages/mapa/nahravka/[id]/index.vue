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

const { data: filteredRec } = useQuery({
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
  queryFn: () => getUserInfo(accountStore.token!, recording.value?.userId!),
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
    <template v-if="editing"> Upravování: </template>
    <template v-if="recording?.name">
      {{ recording.name }}
    </template>
    <template v-else> Nahrávka #{{ recordingId }} </template>
  </h1>

  <div v-if="editing" class="space-y-2">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700"
        >Název:</label
      >
      <input
        id="name"
        v-model="editedName"
        type="text"
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
    </div>
  </div>

  <template v-if="isError">
    <span class="text-xl text-red-600">Chyba: Nelze získat nahrávku.</span>
  </template>
  <template v-if="isLoading">
    <span class="text-gray-500">Načítání...</span>
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

          <template v-if="recording.byApp"> přes aplikaci </template>
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

      <div v-if="filteredRec">
        <ul>
          <li v-for="fr in filteredRec" :key="fr.id">
            <ul>
              <li v-for="dialect in fr.detectedDialects" :key="dialect.id">
                {{ dialect.userGuessDialect }} {{ dialect.confirmedDialect }}
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <blockquote
        v-if="!editing"
        class="p-3 bg-gray-50 border-l-4 border-gray-300 italic"
      >
        {{ recording.note || 'Žádná poznámka.' }}
      </blockquote>
      <div v-else>
        <textarea
          id="note"
          v-model="editedNote"
          rows="3"
          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <!-- Parts Section -->
      <div>
        <h3 class="text-lg font-medium mb-2">Části nahrávky</h3>
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
                Smazat část
              </button>
            </template>
          </li>
        </ul>
      </div>

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
            Uložit změny
          </button>
          <button
            class="secondary p-2"
            @click="cancelEdit"
          >
            Zrušit
          </button>
        </template>

        <template v-else>
          <button
            v-if="accountStore.user?.role == 'admin' || accountStore.user?.id == recording?.userId"
            class="secondary p-2 ml-4 flex-shrink-0"
            @click="toggleEdit"
          >
            Upravit
          </button>
          <button
            v-if="accountStore.user?.role == 'admin'"
            class="primary p-2"
          >
            Smazat nahrávku
          </button>
          <button
            v-else-if="accountStore.user?.role == 'user' && accountStore.user?.id == recording.userId"
            class="secondary p-2"
          >
            Požádat o smazání
          </button>
        </template>
      </template> -->
    </div>
  </template>
  <template v-else>
    <!-- Fallback if recording is null after loading -->
    <span class="text-gray-500">Nahrávka nebyla nalezena.</span>
  </template>
</template>
