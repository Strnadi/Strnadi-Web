<script setup lang="ts">
import { getRecordings } from '@/api/recording';
import { useQuery } from '@tanstack/vue-query';
import JSZip from '@progress/jszip-esm';

const zip = new JSZip();
const zipFileName = "nahravky.zip";

const { data: recordings, isLoading, isError } = useQuery({
  queryKey: ["all-recordings"],
  queryFn: async () => getRecordings({ audio: true})
});

</script>

<template>
  <h1>Všechny nahrávky</h1>

  <template v-if="isLoading">
    <p>Načítání...</p>
  </template>

  <template v-if="isError">
    <h1>Chyba</h1>
    <p>Nelze načíst nahrávky.</p>
  </template>

  <p v-if="recordings?.length == 0">Zatím zde nic není.</p>

  <template v-else>
    <p>Celkový počet nahrávek: {{ recordings?.length }}</p>
    <p>Celkový počet částí: {{ recordings?.reduce((acc, recording) => acc + (recording.parts?.length || 0), 0) }}</p>

    <button class="primary p-2">Stáhnout vybrané</button>

    <ul class="flex flex-row-reverse flex-wrap gap-x-3 gap-y-3">
      <li class="flex flex-col" v-for="recording in recordings" :key="recording.id">
        {{ recording.name }}
        <ul>
          <li v-for="part in recording.parts" :key="part.id" class="flex flex-row gap-x-1 items-center">
            <input type="checkbox" />
            <audio controls autobuffer :src="`data:audio/wav;base64,${part.dataBase64}`" />
          </li>
        </ul>
      </li>
    </ul>
  </template>

</template>
