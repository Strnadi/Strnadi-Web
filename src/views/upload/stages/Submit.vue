<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation } from '@tanstack/vue-query';
import { accountStore } from "@/state/AccountStore";
import { uploadStore } from "@/state/UploadStore";
import { postRecording } from '@/api/recording';
import type { RecordingUploadReq, RecordingPartUploadReq } from "@/api/types/recording";

const router = useRouter();

const error = ref(null);

const onClick = () => {
  router.back();
  uploadStore.resetStage();
};

const toBase64 = (content: ArrayBuffer) =>
  btoa(new Uint8Array(content).reduce((data, byte) => data + String.fromCharCode(byte), ""));

const mutation = useMutation({
  mutationFn: ({ token, recording, parts }: { token: string, recording: RecordingUploadReq, parts: RecordingPartUploadReq[] }) => postRecording(token, recording, parts),
});

onMounted(() => {

  const recording = {
    createdAt: new Date().toISOString(),
    estimatedBirdsCount: 0,
    device: uploadStore.device || "",
    byApp: false,
    note: uploadStore.note
  };

  // Each file is treated as a separate recording part
  const recordingParts = uploadStore.recordings!.map(({ content }) => ({
    recordingId: 0, // Will get overridden
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    latitudeStart: uploadStore.location!.lat,
    latitudeEnd: uploadStore.location!.lat,
    longitudeStart: uploadStore.location!.lng,
    longitudeEnd: uploadStore.location!.lng,
    data: toBase64(content),
  } as RecordingPartUploadReq));

  mutation.mutate({
    token: accountStore.token!,
    recording: recording,
    parts: recordingParts
  });
});
</script>

<template>
  <div v-if="mutation.isPending && !mutation.isIdle">
    <p>Nahrávání vaší nahrávky...</p>
  </div>

  <div v-else-if="error">
    <h1>Chyba</h1>
    <!-- <p>{{ error.message }}</p> -->
    <!-- <button @click="upload">Opakovat</button> -->
  </div>

  <div v-else>
    <h1>Úspěch</h1>
    <h2>Vaše nahrávka byla uložena.</h2>
    <button @click="onClick">Pokračovat zpět</button>
  </div>
</template>
