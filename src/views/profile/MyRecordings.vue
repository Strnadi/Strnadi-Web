<script lang="ts" setup>

import { useQuery } from '@tanstack/vue-query';
import { getRecording } from '@/api/recording';
import { ref, computed } from 'vue';

const { data: recordings, isError, isLoading, refetch } = useQuery({
  queryKey: ['recording', recordingId],
  queryFn: ({ queryKey }) => getRecording(queryKey[1] as string)
})

</script>

<template>
  <template v-if="!recordings"></template>
  <template v-else>
    <ul>
      <li v-for="rec in recordings"></li>
    </ul>
  </template>
</template>
