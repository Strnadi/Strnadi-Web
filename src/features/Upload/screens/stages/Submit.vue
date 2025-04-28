<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRouter } from "vue-router";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { accountStore } from "@/features/Account/state/AccountStore";
import { uploadStore } from "@/features/Upload/state/UploadStore";
import { postRecording } from "@/api/recording";
import type {
  RecordingUploadReq,
  RecordingPartUploadParams,
} from "@/api/types/recording";
import { mapStore } from "@/features/Map/state/MapStore";

const router = useRouter();
const queryClient = useQueryClient();

const onClick = () => {
  router.back();
  mapStore.selectedLocation = null;
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

const beforeWindowUnmount = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = true;
};

onMounted(() => {
  const recording = {
    createdAt: new Date().toISOString(),
    estimatedBirdsCount: uploadStore.birdCount,
    device: uploadStore.device || "",
    name: uploadStore.title,
    byApp: false,
    note: uploadStore.note,
  };

  // Each file is treated as a separate recording part
  const recordingParts = uploadStore.parts!.map(
    ({ file, location }) =>
      ({
        startDate: uploadStore.dateTime,
        endDate: uploadStore.dateTime,
        gpsLatitudeStart: location!.lat,
        gpsLatitudeEnd: location!.lat,
        gpsLongitudeStart: location!.lng,
        gpsLongitudeEnd: location!.lng,
        data: file,
      } as RecordingPartUploadParams)
  );

  submitRecording({
    token: accountStore.token!,
    recording: recording,
    parts: recordingParts,
    photos: uploadStore.photos ?? []
  });

  window.addEventListener("beforeunload", beforeWindowUnmount);
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", beforeWindowUnmount);
  mapStore.selectedLocation = null;
  uploadStore.resetStage();
  queryClient.invalidateQueries({ queryKey: ["all-recordings"] });
});

onBeforeRouteUpdate(() => {
  if(isPending.value == true) {
    alert("Nahrávání stále probíhá. Nezavírejte stránku.");
    return false;
  }
});

onBeforeRouteLeave(() => {
  if(isPending.value == true) {
    alert("Nahrávání stále probíhá. Nezavírejte stránku.");
    return false;
  }
});
</script>

<template>
  <template v-if="isPending">
    <p class="font-bold">Nahrávání vaší nahrávky. Nezavírejte stránku, jinak se nahrávka nepošle!</p>
  </template>

  <template v-else-if="error">
    <h1>Chyba</h1>
    <p>{{ error.message }}</p>
  </template>

  <template v-else>
    <h1>Úspěch</h1>
    <h2>Vaše nahrávka byla uložena.</h2>
    <button @click="onClick" class="primary p-2 w-full">Pokračovat zpět</button>
  </template>
</template>
