<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import JSZip from '@progress/jszip-esm';

import {
  getFilteredRecording,
  getFilteredRecordings,
  getRecordings
} from '@/api/recordings';
import TextualCoords from '@/components/map/TextualCoords.vue';
import type { RecordingModel, FilteredPartModel } from '@/api/recordings';
import { getUserInfo } from '@/api/account';
import { accountStore } from '@/state/AccountStore';
import MultiColorSquare from '@/components/MultiColorSquare.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';

// Helper to format a millisecond duration as "mm:ss,SSS"
function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const millis = durationMs % 1000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

function getDialectMetadata(fr: FilteredPartModel) {
  const confirmed: string[] = [];
  const predicted: string[] = [];
  const userGuess: string[] = [];

  if (fr.detectedDialects) {
    for (const d of fr.detectedDialects) {
      if (d.confirmedDialect) confirmed.push(d.confirmedDialect);
      if (d.predictedDialect) predicted.push(d.predictedDialect);
      if (d.userGuessDialect) userGuess.push(d.userGuessDialect);
    }
  }

  if (confirmed.length > 0) {
    return {
      colors: confirmed.map((c: string) => DialectColors.value?.[c] ?? '#000000'),
      dot: 'false',
      questionmark: 'false',
      text: confirmed.join(', ')
    };
  }
  if (predicted.length > 0) {
    return {
      colors: predicted.map((c: string) => DialectColors.value?.[c] ?? '#000000'),
      dot: 'true',
      questionmark: 'false',
      text: `${predicted.join(', ')} (model)`
    };
  }
  if (userGuess.length > 0) {
    return {
      colors: userGuess.map((c: string) => DialectColors.value?.[c] ?? '#000000'),
      dot: 'false',
      questionmark: 'true',
      text: `${userGuess.join(', ')} (vlastní)`
    };
  }

  return {
    colors: [],
    dot: 'false',
    questionmark: 'false',
    text: '?'
  };
}

const zipFileName = `strnadi-${new Date().toUTCString()}.zip`;

const {
  data: recordings,
  isLoading,
  isError
} = useQuery<RecordingModel[]>({
  queryKey: ['recordings'],
  queryFn: async () => getRecordings({ parts: true })
});

const { data: filteredRecordings } = useQuery({
  queryKey: ['filtered-recordings'],
  queryFn: () => getFilteredRecordings()
});

const selectedItems = ref<{ recordingId: number; partId: number }[]>([]);
const isDownloading = ref(false);

const hasSelectedItems = computed(() => selectedItems.value.length > 0);

function togglePartSelection(recordingId: number, partId: number) {
  const index = selectedItems.value.findIndex(
    (item) => item.recordingId === recordingId && item.partId === partId
  );
  if (index > -1) {
    selectedItems.value.splice(index, 1); // Remove if exists
  } else {
    selectedItems.value.push({ recordingId, partId }); // Add if not exists
  }
}

function isPartSelected(recordingId: number, partId: number): boolean {
  return selectedItems.value.some(
    (item) => item.recordingId === recordingId && item.partId === partId
  );
}

async function downloadSelectedRecordings() {
  if (!hasSelectedItems.value) {
    alert(t('admin.recordings.alerts.no_part_selected'));
    return;
  }

  isDownloading.value = true;
  const zip = new JSZip(); // Create a new JSZip instance for each download

  // Group selected items by recordingId for efficient processing
  const groupedByRecording: Record<number, { partId: number }[]> = {};
  for (const item of selectedItems.value) {
    groupedByRecording[item.recordingId] ??= [];
    groupedByRecording[item.recordingId].push({ partId: item.partId });
  }

  try {
    for (const recIdStr in groupedByRecording) {
      const recordingId = parseInt(recIdStr, 10);
      const partsToDownload = groupedByRecording[recordingId];

      const recording = recordings.value?.find((r) => r.id === recordingId);
      if (!recording) {
        console.warn(
          `Recording with ID ${recordingId} not found in local data. Skipping.`
        );
        continue;
      }

      const recordingFolder = zip.folder(String(recording.id));
      if (!recordingFolder) {
        console.error(
          `Could not create folder in zip for recording ${recording.id}. Skipping.`
        );
        continue;
      }

      // Create meta.txt for the recording
      let recordingMetaContent = `ID: ${recording.id}\n`;
      recordingMetaContent += `Name: ${recording.name ?? 'N/A'}\n`;
      recordingMetaContent += `Created At: ${recording.createdAt ?? 'N/A'}\n`;
      recordingMetaContent += `Estimated Birds Count: ${recording.estimatedBirdsCount ?? 'N/A'}\n`;
      recordingMetaContent += `Device: ${recording.device ?? 'N/A'}\n`;
      recordingMetaContent += `By App: ${recording.byApp ?? 'N/A'}\n`;
      recordingMetaContent += `Note: ${recording.note ?? 'N/A'}\n`;
      recordingFolder.file('meta.txt', recordingMetaContent);

      for (const { partId } of partsToDownload ?? []) {
        const part = recording.parts?.find((p) => p.id === partId);
        if (!part) {
          console.warn(
            `Part with ID ${partId} for recording ${recordingId} not found. Skipping.`
          );
          continue;
        }

        const partFolder = recordingFolder.folder(String(part.id));
        if (!partFolder) {
          console.error(
            `Could not create part folder in zip for part ${part.id}. Skipping.`
          );
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
        partFolder.file('meta.txt', partMetaContent);

        // Fetch and add sound file
        try {
          const soundResponse = await axios.get(
            `/recordings/part/${recording.id}/${part.id}/sound`,
            {
              responseType: 'arraybuffer' // Fetch as ArrayBuffer
            }
          );
          // Assuming the sound file is a WAV file.
          // You might need to adjust the extension based on the actual Content-Type
          // or if the API guarantees a specific format.
          partFolder.file('sound.wav', soundResponse.data, { binary: true });
        } catch (error) {
          console.error(
            `Failed to download sound for recording ${recording.id}, part ${part.id}:`,
            error
          );
          partFolder.file(
            'download_error.txt',
            `Failed to download sound file. Error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    // Generate zip file and trigger download
    const zipContentBlob = await zip.generateAsync({ type: 'blob' });
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
    console.error('Error creating or downloading zip file:', error);
    alert(t('admin.recordings.alerts.zip_failed'));
  } finally {
    isDownloading.value = false;
  }
}
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.recordings.title" />
  </h1>

  <template v-if="isLoading">
    <p>
      <TranslatedText identifier="states.loading" />
    </p>
  </template>

  <template v-else-if="isError">
    <h1>
      <TranslatedText identifier="common.error_prefix" />
    </h1>
    <p>
      <TranslatedText identifier="errors.recordings.loading" />
    </p>
  </template>

  <p v-else-if="!recordings || recordings.length === 0">
    <TranslatedText identifier="empty" />
  </p>

  <template v-else>
    <p>
      <TranslatedText identifier="admin.recordings.total_recordings_label" />
      {{ recordings.length }}
    </p>
    <p>
      <TranslatedText identifier="admin.recordings.total_parts_label" />
      {{
        recordings.reduce(
          (acc, recording) => acc + (recording.parts?.length || 0),
          0
        )
      }}
    </p>

    <button
      class="primary p-2 my-4"
      :disabled="!hasSelectedItems || isDownloading"
      @click="downloadSelectedRecordings"
    >
      <TranslatedText
        :identifier="
          isDownloading
            ? 'admin.recordings.downloading'
            : 'admin.recordings.download_selected'
        "
      />
    </button>

    <ul class="flex flex-col-reverse flex-wrap gap-x-3 gap-y-3">
      <li
        v-for="recording in recordings"
        :key="recording.id"
        class="button-secondary flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <RouterLink :to="`/mapa/nahravka/${recording.id}`">
          <div
            @click.stop
            @mouseup.stop
            @mouseenter.stop
          >
            <div class="flex flex-row justify-between items-center">
              <div class="flex flex-row gap-x-2 items-center">
                <input
                  type="checkbox"
                  class="form-checkbox h-5 w-5 text-blue-600"
                  :checked="
                    recordings
                      .filter((r) => r.id === recording.id)
                      .every(
                        (r) =>
                          r.parts &&
                          r.parts.length > 0 &&
                          r.parts?.every((p) => isPartSelected(r.id, p.id))
                      )
                  "
                  @change="
                    recordings
                      .filter((r) => r.id === recording.id)
                      .forEach((r) =>
                        r.parts?.forEach((p) => togglePartSelection(r.id, p.id))
                      )
                  "
                />
                <h2 class="text-lg font-semibold mb-1">
                  {{
                    recording.name ||
                    `${t('recordings.id_prefix')} ${recording.id}`
                  }}
                </h2>
              </div>
              <RouterLink
                :to="`/mapa/nahravka/${recording.id}/upravit-dialekt`"
                class="button-secondary p-2 px-4"
              >
                <TranslatedText identifier="admin.recordings.edit_dialects" />
              </RouterLink>
              <RouterLink
                :to="`/uzivatel/${recording.userId}`"
                class="button-secondary p-2 px-4"
              >
                <TranslatedText identifier="buttons.view" />
              </RouterLink>
            </div>
            <div class="flex flex-row justify-between">
              <!-- <small class="mb-2 text-gray-600">ID: {{ (await getUserInfo(accountStore.user!.id, recording.userId)) }}</small> -->
              <small class="mb-2 text-gray-600">ID: {{ recording.id }}</small>
            </div>
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
                />
                <span class="text-sm">
                  {{ t('admin.recordings.part_prefix') }}{{ part.id }}
                </span>
                <TextualCoords
                  v-if="
                    part.gpsLatitudeStart !== undefined &&
                    part.gpsLongitudeStart !== undefined
                  "
                  :lat="part.gpsLatitudeStart"
                  :lng="part.gpsLongitudeStart"
                  type="municipality_part"
                  class="text-xs text-gray-500"
                />
                <span
                  v-else
                  class="text-xs text-gray-400"
                >
                  <TranslatedText identifier="admin.recordings.no_gps_data" />
                </span>
              </li>
            </ul>
            <p
              v-else
              class="text-sm text-gray-500"
            >
              <TranslatedText identifier="admin.recordings.no_parts" />
            </p>
            <hr />
            <ul>
              <li
                v-for="fr in filteredRecordings?.filter(
                  (fr) => fr.recordingId === recording.id
                )"
                :key="fr.id"
                class="flex flex-row gap-x-2 items-center py-1 border-t border-gray-200 first:border-t-0"
              >
                <MultiColorSquare
                  size="16px"
                  v-bind="getDialectMetadata(fr)"
                />
                <span class="text-sm">
                  {{
                    formatDuration(
                      new Date(fr.startDate).getTime() -
                        new Date(recording.parts?.[0]?.startDate ?? 0).getTime()
                    )
                  }}
                  -
                  {{
                    formatDuration(
                      new Date(fr.endDate).getTime() -
                        new Date(recording.parts?.[0]?.startDate ?? 0).getTime()
                    )
                  }}
                </span>
                <div class="flex flex-row-reverse content-between">
                  <span class="text-sm">
                    {{ fr.representantFlag ? 'Reprezentant' : 'Nereprezentant' }}
                  </span>

                  <span class="text-sm">
                    {{ getDialectMetadata(fr).text }}
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </RouterLink>
      </li>
    </ul>
  </template>
</template>
