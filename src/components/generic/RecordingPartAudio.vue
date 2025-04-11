<script setup lang="ts">
import { getRecording } from '@/api/recording';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';

const props = defineProps<{
  recordingID: string | number,
  recordingPartID: string | number
}>();

const { data: partBase64, isLoading, isError } = useQuery({
  queryKey: ['recording', props.recordingPartID],
  queryFn: async () => {
    return (
      (await getRecording(props.recordingID, true))
        .parts?.find(part => part.id === props.recordingPartID)?.dataBase64
    );
  }
});

const audio = computed(() => {
  return `data:audio/wav;base64,${partBase64.value}`
});

</script>

<template>

  <template v-if="isLoading">Načítání...</template>
  <template v-else-if="isError">Chyba: Nelze získat zvuk.</template>
  <template v-else>

    <audio controls autobuffer :src="audio" />

  </template>

</template>