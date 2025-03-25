<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { accountStore } from "@/state/AccountStore";
import { uploadStore } from "@/state/UploadStore";
import { postRecording } from "@/api/recording";
import type {
  RecordingUploadReq,
  RecordingPartUploadParams,
} from "@/api/types/recording";
import { mapStore } from "@/state/MapStore";

const router = useRouter();
const queryClient = useQueryClient();

const onClick = () => {
  queryClient.invalidateQueries({ queryKey: ["all-recordings"] });
  mapStore.selectedLocation = null;
  router.back();
  uploadStore.resetStage();
};

const {
  mutate: submitRecording,
  error,
  isPending,
} = useMutation({
  mutationFn: ({
    token,
    recording,
    parts,
    photos
  }: {
    token: string;
    recording: RecordingUploadReq;
    parts: RecordingPartUploadParams[];
    photos?: File[];
  }) => postRecording(token, recording, parts, photos),
});

onMounted(() => {
  const recording = {
    createdAt: new Date().toISOString(),
    estimatedBirdsCount: 0,
    device: uploadStore.device || "",
    byApp: false,
    note: uploadStore.note,
  };

  // Each file is treated as a separate recording part
  const recordingParts = uploadStore.parts!.map(
    ({ content }) =>
      ({
        startDate: uploadStore.dateTime,
        endDate: uploadStore.dateTime,
        gpsLatitudeStart: uploadStore.location!.lat,
        gpsLatitudeEnd: uploadStore.location!.lat,
        gpsLongitudeStart: uploadStore.location!.lng,
        gpsLongitudeEnd: uploadStore.location!.lng,
        data: content,
      } as RecordingPartUploadParams)
  );

  submitRecording({
    token: accountStore.token!,
    recording: recording,
    parts: recordingParts,
    photos: uploadStore.photos ?? []
  });
});
</script>

<template>
  <div v-if="isPending">
    <p>Nahrávání vaší nahrávky...</p>
  </div>

  <div v-else-if="error">
    <h1>Chyba</h1>
    <p>{{ error.message }}</p>
  </div>

  <div v-else>
    <h1>Úspěch</h1>
    <h2>Vaše nahrávka byla uložena.</h2>
    <button @click="onClick" class="primary p-2 w-full">Pokračovat zpět</button>
  </div>
</template>
