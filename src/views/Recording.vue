<script setup lang="ts">
import { onBeforeRouteUpdate } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router'
import { getRecording } from '@/api/recording';
import { getUserInfo } from '@/api/account';
import { ref, computed, type Ref, onMounted, onUnmounted } from 'vue';
import { accountStore } from '@/state/AccountStore';
import { mapStore } from '@/state/MapStore';

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = useRouteParams('id') as Ref<string>;

const { data: recording, isError, isLoading } = useQuery({
  queryKey: ['recording', recordingId.value],
  queryFn: () => getRecording(recordingId.value, true)
})

const uploaderEmail = computed(() => recording.value?.userEmail);
const enabled = computed(() => !!uploaderEmail.value);


// todo select location in the map

// Dependent query - only runs when we have an uploaderEmail from the recording
const {
  data: uploader, 
  isLoading: isUploaderLoading, 
  isError: isUploaderError
} = useQuery({
  queryKey: ['user', uploaderEmail.value],
  queryFn: () => getUserInfo(accountStore.token!, uploaderEmail.value!),
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

</script>

<template>
  <h1>Nahrávka {{ recording?.name }}</h1>

  <template v-if="isError"><span class="text-xl">Chyba: Nelze získat nahrávku.</span></template>
  <template v-if="isLoading">Načítání...</template>
  <template v-else>
    <div>
      <p>ID: {{ recordingId }}</p>
      <p>Vytvořeno: {{ new Date(recording?.createdAt).toLocaleString() }}</p>
      <p>Zařízení: {{ recording?.device }} {{ recording?.byApp && '(přes aplikaci)' }}</p>
      <blockquote>{{ recording?.note }}</blockquote>

      <button v-if="accountStore.user?.role == 'admin'" class="primary p-2">
        Smazat nahrávku
      </button>

      <div>
        <ul>
          <li v-for="part in recording?.parts" :key="part.id">
            <audio controls autobuffer :src="`data:audio/wav;base64,${part.dataBase64}`" />

            <template v-if="accountStore.user?.role == 'admin'">
              <button class="primary p-2">Smazat část</button>
            </template>
          </li>
        </ul>
      </div>

      <!-- Display uploader information -->
      <div>
        <h3>Uživatel</h3>
        <template v-if="isUploaderLoading">Načítání informací o uživateli...</template>
        <template v-else-if="isUploaderError">Chyba: Nelze získat informace o uživateli</template>
        <template v-else-if="uploader">
          <span>
            <template v-if="uploader.nickname">{{ uploader.nickname }}</template>
            <template v-else>{{ uploader.firstName }} {{ uploader.lastName }}</template>
            {{ uploader.city ? `(${uploader.city})` : '' }}
          </span>
        </template>
      </div>

      <template v-if="accountStore.user?.role == 'admin'">
        <h3>Admin Actions</h3>
      </template>
    </div>
  </template>
</template>
