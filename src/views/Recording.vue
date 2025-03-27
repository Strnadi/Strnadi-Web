<script setup lang="ts">
import { onBeforeRouteUpdate } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router'
import { getRecording } from '@/api/recording';
import { getUserInfo } from '@/api/account';
import { ref, computed, type Ref } from 'vue';
import { accountStore } from '@/state/AccountStore';

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = useRouteParams('id') as Ref<string>;

const { data: recording, isError, isLoading, refetch: recordingRefetch } = useQuery({
  queryKey: ['recording', recordingId.value],
  queryFn: () => getRecording(recordingId.value)
})

const uploaderEmail = computed(() => recording.value?.userEmail);
const enabled = computed(() => !!uploaderEmail.value);

// Dependent query - only runs when we have an uploaderEmail from the recording
const { 
  data: uploader, 
  isLoading: isUploaderLoading, 
  isError: isUploaderError,
  refetch: uploaderRefetch
} = useQuery({
  queryKey: ['user', uploaderEmail.value],
  queryFn: () => getUserInfo(accountStore.token!, uploaderEmail.value!),
  enabled, // Use the computed enabled value
})

const queryClient = useQueryClient();

onBeforeRouteUpdate(async (to) => {
  recordingId.value = to.params.id as string;
  await queryClient.invalidateQueries({ queryKey: ['recording'] });
  await queryClient.invalidateQueries({ queryKey: ['user'] });
})

</script>

<template>
  <h1>Nahrávka</h1>

  <template v-if="isError"><span class="text-xl">Chyba: Nelze získat nahrávku.</span></template>
  <template v-if="isLoading">Načítání...</template>
  <template v-else>
    <div>
      <p>ID: {{ recordingId }}</p>
      <p>Created At: {{ recording?.createdAt }}</p>

      <!-- Display uploader information -->
      <div>
        <h3>Uploader Information</h3>
        <template v-if="isUploaderLoading">Načítání informací o uživateli...</template>
        <template v-else-if="isUploaderError">Chyba: Nelze získat informace o uživateli</template>
        <template v-else-if="uploader">
          <p>Name: {{ uploader.firstName }} {{ uploader.lastName }}</p>
          <p>Email: {{ uploader.email }}</p>
        </template>
      </div>

      <template v-if="accountStore.user?.role == 'admin'">
        <h3>Admin Actions</h3>
      </template>
    </div>
  </template>
</template>
