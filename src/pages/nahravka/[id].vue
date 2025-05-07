<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { onBeforeRouteUpdate } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router'
import { getRecording } from '@/api/recordings';
import { getUserInfo } from '@/api/account';
import { ref, computed, type Ref, onUnmounted, watch } from 'vue';
import { accountStore } from '@/state/AccountStore';
import { mapStore } from '@/state/MapStore';
import Spectrogram from '@/components/Spectrogram.vue';
import ToggleShow from '@/components/ToggleShow.vue';

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = useRouteParams('id') as Ref<string>;

const env = import.meta.env;

const editing = ref(false);
const editedName = ref('');
const editedNote = ref('');

const { data: recording, isError, isLoading } = useQuery({
  queryKey: ['recording', recordingId.value],
  queryFn: () => getRecording(recordingId.value, false)
})

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
  enabled, // Use the computed enabled value
})

const queryClient = useQueryClient();

onUnmounted(() => {
  mapStore.selectedRecordingLocation = null;
})

onBeforeRouteUpdate(async (to) => {
  recordingId.value = to.params.id as string;
  await queryClient.invalidateQueries({ queryKey: ['recording'] });
  await queryClient.invalidateQueries({ queryKey: ['user'] });
})

// Watch for changes in the recording data to reset edited values if needed
watch(recording, (newRecording) => {
  if (newRecording) {
    editedName.value = newRecording.name || '';
    editedNote.value = newRecording.note || '';
  }
}, { immediate: true });

const toggleEdit = () => {
  if (!editing.value && recording.value) {
    // Reset edited values to current recording values when starting edit
    editedName.value = recording.value.name || '';
    editedNote.value = recording.value.note || '';
  }
  editing.value = !editing.value;
};

const saveChanges = async () => {
  // TODO: Implement API call to save changes
  console.log('Saving changes:', { name: editedName.value, note: editedNote.value });
  // Example: await updateRecording(recordingId.value, { name: editedName.value, note: editedNote.value });
  // After successful save:
  await queryClient.invalidateQueries({ queryKey: ['recording', recordingId.value] });
  editing.value = false;
};

const cancelEdit = () => {
  editing.value = false;
  // Optionally reset fields if needed, though toggleEdit already does this when starting
};

</script>

<template>
  <h1 class="text-2xl font-semibold">
    <template v-if="editing">Upravování: </template>
    Nahrávka {{ recording?.name }}
  </h1>

  <div v-if="editing" class="space-y-2">
    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Název:</label>
      <input id="name" type="text" v-model="editedName" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
    </div>
  </div>

  <template v-if="isError"><span class="text-xl text-red-600">Chyba: Nelze získat nahrávku.</span></template>
  <template v-if="isLoading"><span class="text-gray-500">Načítání...</span></template>
  <template v-else-if="recording">
    <div class="space-y-4">
      <!-- Metadata Section -->
      <div class="text-sm text-gray-600 space-y-1">
        <p><span class="font-medium">Vytvořeno:</span> {{ new Date(recording.createdAt!).toLocaleString() }}</p>
        <p><span class="font-medium">Zařízení:</span>
          <template v-if="recording.device">{{ recording.device }}</template>
          <template v-else>neznámé</template>
          <template v-if="recording.byApp"> (přes aplikaci)</template>
        </p>
      </div>

      <!-- Note Section -->
      <div>
        <h3 class="text-lg font-medium mb-1">Poznámka</h3>
        <blockquote v-if="!editing" class="p-3 bg-gray-50 border-l-4 border-gray-300 italic">{{ recording.note || 'Žádná poznámka.' }}</blockquote>
        <div v-else>
          <textarea id="note" v-model="editedNote" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
        </div>
      </div>

      <!-- Parts Section -->
      <div>
        <h3 class="text-lg font-medium mb-2">Části nahrávky</h3>
        <ul class="space-y-4">
          <li v-for="part in recording.parts" :key="part.id" class="p-3 border rounded-md space-y-3">
            <audio :src="`${env.VITE_API_URL}/recordings/part/${recording.id}/${part.id}/sound`" controls class="w-full" />

            <div class="flex items-center w-full">
              <ToggleShow class="w-full">
                <template v-slot:toggle-button>
                  <button class="secondary text-sm p-1 px-2">Zobrazit spektrogram</button>
                </template>
                <KeepAlive>
                  <Spectrogram
                    :key="part.id"
                    :audio-url="`${env.VITE_API_URL}/recordings/part/${recording.id}/${part.id}/sound`"
                    :height="150"
                  />
                </KeepAlive>
              </ToggleShow>

              <template v-if="accountStore.user?.role == 'admin'">
                <button class="primary text-sm p-1 px-2" :disabled="editing">Smazat část</button>
              </template>
            </div>
          </li>
        </ul>
      </div>

      <!-- User Section -->
      <div>
        <h3 class="text-lg font-medium mb-1">Uživatel</h3>
        <div class="text-gray-700">
          <template v-if="isUploaderLoading">Načítání...</template>
          <template v-else-if="isUploaderError">Chyba: Nelze získat informace.</template>
          <template v-else-if="uploader">
            <span>
              <template v-if="uploader.nickname">{{ uploader.nickname }}</template>
              <template v-else>{{ uploader.firstName }} {{ uploader.lastName }}</template>
              {{ uploader.city ? `(${uploader.city})` : '' }}
            </span>
          </template>
          <template v-else>
            <span>Informace o uživateli nejsou k dispozici.</span>
          </template>
        </div>
      </div>

      <template v-if="accountStore.user?.role === 'admin' || accountStore.user?.id === recording.userId">
        <template v-if="editing">
          <button @click="saveChanges" class="success p-2">Uložit změny</button>
          <button @click="cancelEdit" class="secondary p-2">Zrušit</button>
        </template>

        <template v-else>
          <button
            v-if="accountStore.user?.role == 'admin' || accountStore.user?.id == recording?.userId"
            @click="toggleEdit"
            class="secondary p-2 ml-4 flex-shrink-0"
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
      </template>
    </div>
  </template>
  <template v-else>
    <!-- Fallback if recording is null after loading -->
    <span class="text-gray-500">Nahrávka nebyla nalezena.</span>
  </template>
</template>
