<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Dropzone from '@/components/Dropzone.vue';
import SegmentedProgress from '@/components/SegmentedProgress.vue';
import TrainingChart from '@/components/TrainingChart.vue';
import { useModelTraining } from '@/composables/useModelTraining';
import { toggleVisor, isVisorOpen } from '@/services/tfjs/vis';

const training = useModelTraining();
const zipFile = ref<File | null>(null);
const config = ref({
  learningRate: 1e-4,
  epochs: 100,
  batchSize: 32,
  denseUnits: 512,
  dropoutRate: 0.3,
  patience: 20,
});

async function handleDrop(files: File[]) {
  const file = files[0];
  if (!file || !file.name.endsWith('.zip')) return;
  zipFile.value = file;
  try {
    await training.loadDataset(file);
  } catch (e: any) {
    console.error('Dataset loading failed:', e);
  }
}

async function startTraining() {
  try {
    await training.startTraining(config.value);
  } catch (e: any) {
    console.error('Training failed:', e);
  }
}

async function downloadModel() {
  try {
    await training.downloadModel('perch_v2_custom');
  } catch (e: any) {
    console.error('Download failed:', e);
  }
}

function handleToggleVisor() {
  toggleVisor();
}

const canTrain = computed(
  () =>
    training.phase.value === 'idle' && training.datasetInfo.value !== null,
);

const isTraining = computed(() => training.phase.value === 'training');
const isDone = computed(() => training.phase.value === 'done');
const hasError = computed(() => training.phase.value === 'error');
const isExtracting = computed(
  () => training.phase.value === 'extracting' || training.phase.value === 'loading-dataset',
);
const isEvaluating = computed(() => training.phase.value === 'evaluating');
const showVisControls = computed(
  () => training.phase.value === 'training' || training.phase.value === 'done',
);

function resetTraining() {
  training.reset();
  zipFile.value = null;
}
</script>

<template>
  <div class="w-full space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Trénink modelu na míru</h1>
      <button
        v-if="showVisControls"
        class="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        @click="handleToggleVisor"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Vizualizace (~)
      </button>
    </div>

    <p class="text-gray-600">
      Nahrajte ZIP soubor s označenými audio nahrávkami pro trénink klasifikátoru založeného na modelu Perch v2.
      Výsledný model bude obsahovat Perch backbone i vlastní klasifikační hlavu.
      <span v-if="showVisControls" class="block mt-1 text-xs text-gray-400">
        Stiskněte klávesu ~ pro zobrazení pokročilé vizualizace (tfjs-vis).
      </span>
    </p>

    <!-- Dataset Upload -->
    <section v-if="!training.datasetInfo.value" class="space-y-2">
      <Dropzone accept=".zip" @drop="handleDrop">
        <div class="flex flex-col items-center justify-center py-8 text-center">
          <p class="text-lg font-medium mb-1">Přetáhněte ZIP soubor s tréninkovými daty</p>
          <p class="text-sm text-gray-500 max-w-md">
            ZIP musí obsahovat složky podle tříd. Každá složka = jedna třída.
            Podporované formáty: WAV, MP3, FLAC, OGG, AIFF.
          </p>
        </div>
      </Dropzone>
    </section>

    <!-- Progress during loading/extraction -->
    <div
      v-if="isExtracting"
      class="space-y-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">{{ training.statusMessage.value }}</span>
        <span class="text-sm font-mono text-gray-600">{{ training.progressPct.value }}%</span>
      </div>
      <SegmentedProgress
        :progress="training.progressPct.value / 100"
        :total-segments="6"
      />
    </div>

    <!-- Progress during training -->
    <div
      v-if="isTraining || isEvaluating"
      class="space-y-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-600">{{ training.statusMessage.value }}</span>
        <span v-if="isTraining" class="text-sm font-mono text-gray-600">Epocha {{ training.currentEpoch.value }} / {{ training.totalEpochs.value }}</span>
        <span v-else class="text-sm font-mono text-gray-600">{{ training.progressPct.value }}%</span>
      </div>
      <SegmentedProgress
        :progress="training.progressPct.value / 100"
        :total-segments="6"
      />
    </div>

    <!-- Dataset Info -->
    <section v-if="training.datasetInfo.value" class="bg-gray-50 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="font-semibold">Dataset</h2>
        <button class="text-sm text-red-600 hover:underline" @click="resetTraining">
          Reset
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>Celkem vzorků: <span class="font-medium">{{ training.datasetInfo.value.totalSamples }}</span></div>
        <div>Třídy: <span class="font-medium">{{ training.classNames.value.join(', ') }}</span></div>
        <div>Trénink: <span class="font-medium">{{ training.datasetInfo.value.trainCount }}</span></div>
        <div>Validace: <span class="font-medium">{{ training.datasetInfo.value.valCount }}</span></div>
        <div>Test: <span class="font-medium">{{ training.datasetInfo.value.testCount }}</span></div>
      </div>
    </section>

    <!-- Training Config -->
    <section v-if="canTrain || isTraining || isDone" class="space-y-3">
      <h2 class="font-semibold">Nastavení tréninku</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col">
          <label class="text-xs text-gray-500">Learning Rate</label>
          <input v-model.number="config.learningRate" type="number" step="0.0001" class="border rounded-md px-2 py-1 text-sm" :disabled="isTraining || isEvaluating" />
        </div>
        <div class="flex flex-col">
          <label class="text-xs text-gray-500">Epochs</label>
          <input v-model.number="config.epochs" type="number" class="border rounded-md px-2 py-1 text-sm" :disabled="isTraining || isEvaluating" />
        </div>
        <div class="flex flex-col">
          <label class="text-xs text-gray-500">Batch Size</label>
          <input v-model.number="config.batchSize" type="number" class="border rounded-md px-2 py-1 text-sm" :disabled="isTraining || isEvaluating" />
        </div>
        <div class="flex flex-col">
          <label class="text-xs text-gray-500">Dense Units</label>
          <input v-model.number="config.denseUnits" type="number" class="border rounded-md px-2 py-1 text-sm" :disabled="isTraining || isEvaluating" />
        </div>
        <div class="flex flex-col">
          <label class="text-xs text-gray-500">Dropout</label>
          <input v-model.number="config.dropoutRate" type="number" step="0.1" class="border rounded-md px-2 py-1 text-sm" :disabled="isTraining || isEvaluating" />
        </div>
        <div class="flex flex-col">
          <label class="text-xs text-gray-500">Patience</label>
          <input v-model.number="config.patience" type="number" class="border rounded-md px-2 py-1 text-sm" :disabled="isTraining || isEvaluating" />
        </div>
      </div>

      <div class="flex gap-2">
        <button
          class="flex-1 bg-blue-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          :disabled="!canTrain && !isTraining"
          @click="startTraining"
        >
          <span v-if="isTraining">Trénink probíhá ({{ training.currentEpoch.value }} / {{ training.totalEpochs.value }})…</span>
          <span v-else-if="isEvaluating">Hodnocení modelu…</span>
          <span v-else-if="isDone">Trénink dokončen</span>
          <span v-else>Spustit trénink</span>
        </button>

        <button
          v-if="isDone"
          class="flex-1 bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700"
          @click="downloadModel"
        >
          Stáhnout model (Perch + klasifikátor)
        </button>
      </div>
    </section>

    <!-- Inline Visualization (keep for quick in-page view) -->
    <section v-if="isTraining || isDone" class="space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Průběh tréninku</h2>
        <button
          class="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
          @click="handleToggleVisor"
        >
          Podrobná vizualizace
        </button>
      </div>
      <div class="border rounded-lg p-2 bg-white" style="height: 300px;">
        <TrainingChart :history="training.epochHistory.value" />
      </div>
    </section>

    <!-- Evaluation Results Summary -->
    <section v-if="isDone && training.evaluationDone.value" class="bg-green-50 rounded-lg p-4">
      <h2 class="font-semibold text-green-800 mb-1">Hodnocení dokončeno</h2>
      <p class="text-sm text-green-700">
        Matice záměn a přesnost podle tříd jsou k dispozici v panelu vizualizace.
        Klikněte na <em>Podrobná vizualizace</em> nebo stiskněte klávesu <kbd class="px-1 py-0.5 bg-green-100 rounded text-xs">~</kbd>.
      </p>
    </section>

    <!-- Error -->
    <div v-if="hasError" class="bg-red-50 text-red-700 rounded-lg p-4">
      <p class="font-medium">Chyba: {{ training.error.value }}</p>
      <button class="mt-2 text-sm underline" @click="resetTraining">Zkusit znovu</button>
    </div>
  </div>
</template>

<style scoped>
@reference "../../../styles/main.css";
</style>