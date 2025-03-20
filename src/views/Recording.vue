<script setup lang="ts">
import { onBeforeRouteUpdate, useRoute } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { getRecording } from '@/api/recording';
import { getUserInfo } from '@/api/account';
import { ref, computed } from 'vue';
import { accountStore } from '@/state/AccountStore';

const route = useRoute();

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = ref(route.params.id as string);

const { data: recording, isError, isLoading, refetch } = useQuery({
  queryKey: ['recording', recordingId],
  queryFn: ({ queryKey }) => getRecording(queryKey[1] as string)
})

// TODO: this is bullshit
// API only supports querying by email but here we get the id

const uploaderId = computed(() => `${recording.value?.userId}`);

// Dependent query - only runs when we have an uploaderId from the recording
const { 
  data: uploader, 
  isLoading: isUploaderLoading, 
  isError: isUploaderError 
} = useQuery({
  queryKey: ['user', uploaderId],
  queryFn: ({ queryKey }) => getUserInfo(accountStore.token!, queryKey[1]),
  enabled: ({ queryKey }) => !!queryKey[1], // Only run this query when uploaderId is available
})

onBeforeRouteUpdate(async (to) => {
  recordingId.value = to.params.id as string;
  await refetch();
})

</script>

<template>
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
          <!-- Add more uploader details as needed -->
        </template>
      </div>
    </div>
  </template>
</template>
