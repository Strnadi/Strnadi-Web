<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import JSZip from '@progress/jszip-esm';

import { getRecordings } from '@/api/recordings';
import TextualCoords from '@/components/map/TextualCoords.vue';
import type { RecordingModel } from '@/api/recordings';

const zipFileName = `strnadi-${new Date().toUTCString()}.zip`;

const { data: recordings, isLoading, isError } = useQuery<RecordingModel[]>({
  queryKey: ["all-recordings"],
  queryFn: async () => getRecordings({ parts: true }),
});

const selectedItems = ref<{ recordingId: number; partId: number }[]>([]);
const isDownloading = ref(false);

const hasSelectedItems = computed(() => selectedItems.value.length > 0);

function togglePartSelection(recordingId: number, partId: number) {
  const index = selectedItems.value.findIndex(item => item.recordingId === recordingId && item.partId === partId);
  if (index > -1) {
    selectedItems.value.splice(index, 1); // Remove if exists
  } else {
    selectedItems.value.push({ recordingId, partId }); // Add if not exists
  }
}

function isPartSelected(recordingId: number, partId: number): boolean {
  return selectedItems.value.some(item => item.recordingId === recordingId && item.partId === partId);
}

async function downloadSelectedRecordings() {
  if (!hasSelectedItems.value) {
    alert("Nebyla vybrána žádná část nahrávky.");
    return;
  }

  isDownloading.value = true;
  const zip = new JSZip(); // Create a new JSZip instance for each download

  // Group selected items by recordingId for efficient processing
  const groupedByRecording: Record<number, { partId: number }[]> = {};
  for (const item of selectedItems.value) {
    if (!groupedByRecording[item.recordingId]) {
      groupedByRecording[item.recordingId] = [];
    }
    groupedByRecording[item.recordingId].push({ partId: item.partId });
  }

  try {
    for (const recIdStr in groupedByRecording) {
      const recordingId = parseInt(recIdStr, 10);
      const partsToDownload = groupedByRecording[recordingId];

      const recording = recordings.value?.find(r => r.id === recordingId);
      if (!recording) {
        console.warn(`Recording with ID ${recordingId} not found in local data. Skipping.`);
        continue;
      }

      const recordingFolder = zip.folder(String(recording.id));
      if (!recordingFolder) {
        console.error(`Could not create folder in zip for recording ${recording.id}. Skipping.`);
        continue;
      }

      // Create meta.txt for the recording
      let recordingMetaContent = `ID: ${recording.id}\n`;
      recordingMetaContent += `Name: ${recording.name ?? 'N/A'}\n`;
      recordingMetaContent += `Created At: ${recording.createdAt ?? 'N/A'}\n`;
      recordingMetaContent += `Estimated Birds Count: ${recording.estimatedBirdsCount ?? 'N/A'}\n`;
      recordingMetaContent += `Device: ${recording.device ?? 'N/A'}\n`;
      recordingMetaContent += `By App: ${recording.byApp !== undefined ? recording.byApp : 'N/A'}\n`;
      recordingMetaContent += `Note: ${recording.note ?? 'N/A'}\n`;
      recordingFolder.file("meta.txt", recordingMetaContent);

      for (const { partId } of partsToDownload) {
        const part = recording.parts?.find(p => p.id === partId);
        if (!part) {
          console.warn(`Part with ID ${partId} for recording ${recordingId} not found. Skipping.`);
          continue;
        }

        const partFolder = recordingFolder.folder(String(part.id));
        if (!partFolder) {
          console.error(`Could not create part folder in zip for part ${part.id}. Skipping.`);
          continue;
        }

        // Create meta.txt for the part
        let partMetaContent = `Part ID: ${part.id}\n`;
        partMetaContent += `Recording ID: ${recording.id}\n`;
        partMetaContent += `Start Date: ${part.startDate ?? 'N/A'}\n`;
        partMetaContent += `End Date: ${part.endDate ?? 'N/A'}\n`;
        partMetaContent += `GPS Latitude Start: ${part.gpsLatitudeStart ?? 'N/A'}\n`;
        partMetaContent += `GPS Longitude Start: ${part.gpsLongitudeStart ?? 'N/A'}\n`;
        partMetaContent += `GPS Latitude End: ${part.gpsLatitudeEnd ?? 'N/A'}\n`;
        partMetaContent += `GPS Longitude End: ${part.gpsLongitudeEnd ?? 'N/A'}\n`;
        partFolder.file("meta.txt", partMetaContent);

        // Fetch and add sound file
        try {
          const soundResponse = await axios.get(`/recordings/part/${recording.id}/${part.id}/sound`, {
            responseType: 'arraybuffer' // Fetch as ArrayBuffer
          });
          // Assuming the sound file is a WAV file.
          // You might need to adjust the extension based on the actual Content-Type
          // or if the API guarantees a specific format.
          partFolder.file("sound.wav", soundResponse.data, { binary: true });
        } catch (error) {
          console.error(`Failed to download sound for recording ${recording.id}, part ${part.id}:`, error);
          partFolder.file("download_error.txt", `Failed to download sound file. Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Generate zip file and trigger download
    const zipContentBlob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = URL.createObjectURL(zipContentBlob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = zipFileName;
    anchor.style.display = 'none';
    anchor.style.position = 'fixed';
    anchor.style.top = '0';
    anchor.style.left = '0';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    console.error("Error creating or downloading zip file:", error);
    alert("Došlo k chybě při vytváření ZIP souboru.");
  } finally {
    isDownloading.value = false;
  }
}

</script>

<template>
  <h1>Všechny nahrávky</h1>

  <template v-if="isLoading">
    <p>Načítání...</p>
  </template>

  <template v-else-if="isError">
    <h1>Chyba</h1>
    <p>Nelze načíst nahrávky.</p>
  </template>

  <p v-else-if="!recordings || recordings.length === 0">
    Zatím zde nic není.
  </p>

  <template v-else>
    <p>Celkový počet nahrávek: {{ recordings.length }}</p>
    <p>Celkový počet částí: {{ recordings.reduce((acc, recording) => acc + (recording.parts?.length || 0), 0) }}</p>

    <button
      class="primary p-2 my-4"
      :disabled="!hasSelectedItems || isDownloading"
      @click="downloadSelectedRecordings"
    >
      {{ isDownloading ? 'Stahování...' : 'Stáhnout vybrané' }}
    </button>

    <ul class="flex flex-col-reverse flex-wrap gap-x-3 gap-y-3">
      <li
        v-for="recording in recordings"
        :key="recording.id"
        class="flex flex-col border p-3 rounded-md shadow-sm"
      >
        <h2 class="text-lg font-semibold mb-1">
          {{ recording.name || `Nahrávka ID: ${recording.id}` }}
        </h2>
        <small class="mb-2 text-gray-600">ID: {{ recording.id }}</small>
        <ul v-if="recording.parts && recording.parts.length > 0">
          <li
            v-for="part in recording.parts"
            :key="part.id"
            class="flex flex-row gap-x-2 items-center py-1 border-t border-gray-200 first:border-t-0"
          >
            <input
              type="checkbox"
              :checked="isPartSelected(recording.id, part.id)"
              class="form-checkbox h-5 w-5 text-blue-600"
              @change="togglePartSelection(recording.id, part.id)"
            >
            <span class="text-sm">Část ID: {{ part.id }}</span>
            <TextualCoords
              v-if="part.gpsLatitudeStart !== undefined && part.gpsLongitudeStart !== undefined"
              :lat="part.gpsLatitudeStart"
              :lng="part.gpsLongitudeStart"
              type="municipality_part"
              class="text-xs text-gray-500"
            />
            <span
              v-else
              class="text-xs text-gray-400"
            >(GPS data chybí)</span>
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-gray-500"
        >
          Tato nahrávka nemá žádné části.
        </p>
      </li>
    </ul>
  </template>
</template>
