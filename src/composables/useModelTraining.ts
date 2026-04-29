import { ref, computed, shallowRef } from 'vue';
import * as tf from '@tensorflow/tfjs';
import {
  createEmbeddingExtractor,
  buildAndTrainHead,
  buildCombinedModel,
  oneHot,
  type EpochLog,
  type TrainConfig,
} from '@/services/tfjs/training';
import {
  openVisor,
  updateTrainingMetrics,
  showModelSummary,
  showConfusionMatrix,
  showPerClassAccuracy,
  showTrainingConfig,
  showDatasetInfo,
} from '@/services/tfjs/vis';
import { buildDatasetFromZip } from '@/utils/training/zipLoader';
import type { DatasetSplit, ProcessedSample } from '@/utils/training/dataset';

export type TrainingPhase =
  | 'idle'
  | 'loading-dataset'
  | 'extracting'
  | 'training'
  | 'done'
  | 'evaluating'
  | 'error';

export interface DatasetMeta {
  totalSamples: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  classNames: string[];
}

let trainTensors: { xs: tf.Tensor2D; ys: tf.Tensor2D } | null = null;
let valTensors: { xs: tf.Tensor2D; ys: tf.Tensor2D } | null = null;
let perchModelRef: tf.LayersModel | null = null;
let testSamples: ProcessedSample[] = [];

let visUpdateCounter = 0;

export function useModelTraining() {
  const phase = ref<TrainingPhase>('idle');
  const progressPct = ref(0);
  const statusMessage = ref('');
  const epochHistory = ref<EpochLog[]>([]);
  const currentEpoch = ref(0);
  const totalEpochs = ref(100);
  const error = ref<string | null>(null);
  const datasetInfo = ref<DatasetMeta | null>(null);
  const trainedModel = shallowRef<tf.LayersModel | null>(null);
  const classNames = ref<string[]>([]);
  const classWeights = ref<Record<number, number>>({});
  const evaluationDone = ref(false);

  const isBusy = computed(
    () =>
      phase.value !== 'idle' &&
      phase.value !== 'done' &&
      phase.value !== 'evaluating' &&
      phase.value !== 'error',
  );

  function reset() {
    phase.value = 'idle';
    progressPct.value = 0;
    statusMessage.value = '';
    epochHistory.value = [];
    currentEpoch.value = 0;
    error.value = null;
    datasetInfo.value = null;
    trainedModel.value = null;
    classNames.value = [];
    classWeights.value = {};
    evaluationDone.value = false;
    testSamples = [];
    disposeTensors();
  }

  function disposeTensors() {
    trainTensors?.xs.dispose();
    trainTensors?.ys.dispose();
    valTensors?.xs.dispose();
    valTensors?.ys.dispose();
    trainTensors = null;
    valTensors = null;
  }

  async function loadDataset(zipFile: File) {
    reset();
    phase.value = 'loading-dataset';
    statusMessage.value = 'Načítání datasetu…';
    progressPct.value = 0;

    try {
      const split: DatasetSplit = await buildDatasetFromZip(zipFile, {
        onProgress: (loaded, total) => {
          progressPct.value = Math.round((loaded / total) * 100);
          statusMessage.value = `Načítání souborů ${loaded} / ${total}`;
        },
      });

      classNames.value = split.classNames;
      classWeights.value = split.classWeights;
      testSamples = split.test;
      datasetInfo.value = {
        totalSamples:
          split.train.length + split.val.length + split.test.length,
        trainCount: split.train.length,
        valCount: split.val.length,
        testCount: split.test.length,
        classNames: split.classNames,
      };

      await showDatasetInfo({
        ...datasetInfo.value,
        classWeights: classWeights.value,
      });

      statusMessage.value = 'Příprava modelu Perch v2…';
      phase.value = 'extracting';
      progressPct.value = 0;

      const { extractor, perchModel } = await createEmbeddingExtractor();
      perchModelRef = perchModel;

      const { xs: trainX, ys: trainY } = await extractEmbeddings(
        extractor,
        split.train,
        split.classNames.length,
      );
      const { xs: valX, ys: valY } = await extractEmbeddings(
        extractor,
        split.val,
        split.classNames.length,
      );

      trainTensors = { xs: trainX, ys: trainY };
      valTensors = { xs: valX, ys: valY };

      statusMessage.value = 'Extrakce hotová. Připraveno k tréninku.';
      phase.value = 'idle';
      progressPct.value = 100;
    } catch (e: unknown) {
      phase.value = 'error';
      error.value =
        e instanceof Error ? e.message : typeof e === 'string' ? e : String(e);
      throw e;
    }
  }

  async function extractEmbeddings(
    extractor: (audios: Float32Array[]) => Promise<tf.Tensor2D>,
    samples: ProcessedSample[],
    numClasses: number,
  ) {
    const batchSize = 8;
    const embeds: tf.Tensor2D[] = [];
    const labelIdx: number[] = [];

    for (let i = 0; i < samples.length; i += batchSize) {
      const batch = samples.slice(i, i + batchSize);
      const audios = batch.map((s) => s.audio);
      const em = await extractor(audios);
      embeds.push(em);
      labelIdx.push(...batch.map((s) => s.labelIndex));

      progressPct.value = Math.round(
        ((i + audios.length) / samples.length) * 100,
      );
      statusMessage.value = `Extrakce embeddingů ${Math.min(
        i + batchSize,
        samples.length,
      )} / ${samples.length}`;
      await new Promise<void>((r) => setTimeout(r, 0));
    }

    const xs = tf.concat(embeds, 0) as tf.Tensor2D;
    embeds.forEach((t) => t.dispose());
    const ys = oneHot(labelIdx, numClasses);
    return { xs, ys };
  }

  async function startTraining(config: TrainConfig) {
    if (!trainTensors || !valTensors) {
      throw new Error('Dataset not loaded.');
    }
    phase.value = 'training';
    totalEpochs.value = config.epochs ?? 100;
    epochHistory.value = [];
    statusMessage.value = 'Trénink probíhá…';
    visUpdateCounter = 0;

    openVisor();

    await showTrainingConfig({
      learningRate: config.learningRate,
      epochs: config.epochs,
      batchSize: config.batchSize,
      denseUnits: config.denseUnits ?? 512,
      dropoutRate: config.dropoutRate ?? 0.3,
      patience: config.patience ?? 20,
    });

    const trainingConfig = { ...config };
    if (Object.keys(classWeights.value).length > 0) {
      trainingConfig.classWeights = classWeights.value;
    }

    try {
      const { headModel } = await buildAndTrainHead(
        trainTensors.xs,
        trainTensors.ys,
        valTensors.xs,
        valTensors.ys,
        classNames.value.length,
        trainingConfig,
        (log) => {
          epochHistory.value = [...epochHistory.value, log];
          currentEpoch.value = log.epoch + 1;
          progressPct.value = Math.round(
            (log.epoch / (config.epochs ?? 100)) * 100,
          );

          visUpdateCounter++;
          if (visUpdateCounter % 2 === 0 || log.epoch === 0) {
            updateTrainingMetrics(epochHistory.value);
          }
        },
      );

      await updateTrainingMetrics(epochHistory.value);

      trainedModel.value = headModel;
      phase.value = 'done';
      statusMessage.value = 'Trénink dokončen!';
      progressPct.value = 100;

      await showModelSummary(headModel);

      disposeTensors();

      await runEvaluation();
    } catch (e: unknown) {
      phase.value = 'error';
      error.value =
        e instanceof Error ? e.message : typeof e === 'string' ? e : String(e);
      throw e;
    }
  }

  async function runEvaluation() {
    if (!trainedModel.value || testSamples.length === 0) return;

    phase.value = 'evaluating';
    statusMessage.value = 'Hodnocení na testovacích datech…';

    try {
      const { extractor } = await createEmbeddingExtractor();
      const batchSize = 8;
      const allLabelIdx: number[] = [];
      const allPredIdx: number[] = [];
      let processed = 0;

      for (let i = 0; i < testSamples.length; i += batchSize) {
        const batch = testSamples.slice(i, i + batchSize);
        const audios = batch.map((s) => s.audio);
        const embeddings = await extractor(audios);
        const preds = trainedModel.value.predict(embeddings) as tf.Tensor2D;
        const predIndices = preds.argMax(1).dataSync();
        for (let j = 0; j < batch.length; j++) {
          allLabelIdx.push(batch[j]!.labelIndex);
          allPredIdx.push(predIndices[j]!);
        }
        embeddings.dispose();
        preds.dispose();
        processed += batch.length;
        progressPct.value = Math.round((processed / testSamples.length) * 100);
        await new Promise<void>((r) => setTimeout(r, 0));
      }

      const numClasses = classNames.value.length;
      const cmValues: number[][] = Array.from({ length: numClasses }, () =>
        new Array(numClasses).fill(0),
      );
      const classCorrect: number[] = new Array(numClasses).fill(0);
      const classTotal: number[] = new Array(numClasses).fill(0);

      for (let i = 0; i < allLabelIdx.length; i++) {
        const trueLabel = allLabelIdx[i]!;
        const predLabel = allPredIdx[i]!;
        classTotal[trueLabel]!++;
        if (trueLabel === predLabel) {
          classCorrect[trueLabel]!++;
        }
        cmValues[trueLabel]![predLabel]!++;
      }

      await showConfusionMatrix(cmValues, classNames.value);

      const perClassAcc = classNames.value.map((_name, idx) => ({
        accuracy: classTotal[idx]! > 0 ? classCorrect[idx]! / classTotal[idx]! : 0,
        count: classTotal[idx]!,
      }));
      await showPerClassAccuracy(perClassAcc, classNames.value);

      evaluationDone.value = true;
      statusMessage.value = 'Trénink a hodnocení dokončeno!';
    } catch (e: unknown) {
      console.warn('Evaluation failed:', e);
      evaluationDone.value = false;
    }

    phase.value = 'done';
  }

  async function downloadModel(name = 'perch_v2_custom') {
    if (!trainedModel.value || !perchModelRef) {
      throw new Error('No trained model available.');
    }

    try {
      const combined = await buildCombinedModel(perchModelRef, trainedModel.value);
      await combined.save(`downloads://${name}`);
    } catch (e) {
      console.warn('Could not build combined model, saving head only:', e);
      await trainedModel.value.save(`downloads://${name}_head_only`);
    }
  }

  return {
    phase,
    progressPct,
    statusMessage,
    epochHistory,
    currentEpoch,
    totalEpochs,
    error,
    datasetInfo,
    trainedModel,
    classNames,
    classWeights,
    evaluationDone,
    isBusy,
    reset,
    loadDataset,
    startTraining,
    downloadModel,
    openVisor,
  };
}