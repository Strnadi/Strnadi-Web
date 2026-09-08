import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import {
  loadLiteRt,
  getGlobalLiteRtPromise,
  loadAndCompile,
  type CompiledModel
} from '@litertjs/core';
import { runWithTfjsTensors } from '@litertjs/tfjs-interop';
import { concretizeTfliteIoShapes } from '@/utils/training/tflite';

export type EmbeddingExtractor = (
  audios: Float32Array[]
) => Promise<tf.Tensor2D>;

const PERCH_MODEL_URL = '/models/perch_v2.tflite';
const LITERT_WASM_PATH = '/wasm/litert';

/* ------------------------------------------------------------------ */
/*  1. Model loading                                                   */
/* ------------------------------------------------------------------ */

let litertLoadPromise: Promise<unknown> | null = null;
let cachedPerchModel: CompiledModel | null = null;

async function ensureLiteRt() {
  if (getGlobalLiteRtPromise()) {
    await getGlobalLiteRtPromise();
    return;
  }
  if (!litertLoadPromise) {
    litertLoadPromise = loadLiteRt(LITERT_WASM_PATH).catch((err) => {
      litertLoadPromise = null;
      throw err;
    });
  }
  await litertLoadPromise;
}

export async function loadPerchBackbone(): Promise<CompiledModel> {
  if (cachedPerchModel) return cachedPerchModel;
  await tf.setBackend('webgl');
  await tf.ready();
  await ensureLiteRt();

  const response = await fetch(PERCH_MODEL_URL);
  if (!response.ok) {
    throw new Error(
      `Model Perch v2 se nepodařilo načíst (${response.status} ${response.statusText}).`
    );
  }

  const modelBytes = new Uint8Array(await response.arrayBuffer());
  concretizeTfliteIoShapes(modelBytes);
  const model = await loadAndCompile(modelBytes, { accelerator: 'webgpu' });

  const inputDetails = model.getInputDetails();
  if (
    inputDetails.length !== 1 ||
    inputDetails[0]!.shape.length !== 2 ||
    Array.from(inputDetails[0]!.shape).some((dimension) => dimension <= 0)
  ) {
    model.delete();
    throw new Error(
      'Model Perch v2 nemá podporovaný pevný vstupní tvar [dávka, vzorky].'
    );
  }

  cachedPerchModel = model;
  return model;
}

export async function createEmbeddingExtractor(): Promise<{
  extractor: EmbeddingExtractor;
  perchModel: CompiledModel;
}> {
  const perch = await loadPerchBackbone();
  const inputDetails = perch.getInputDetails()[0]!;
  const outputDetails = perch.getOutputDetails();
  const modelBatchSize = inputDetails.shape[0]!;
  const modelSampleCount = inputDetails.shape[1]!;

  let embeddingIndex = 0;
  for (let i = 0; i < outputDetails.length; i++) {
    if (outputDetails[i]?.name?.toLowerCase().includes('embedding')) {
      embeddingIndex = i;
      break;
    }
  }

  const extractor: EmbeddingExtractor = async (audios: Float32Array[]) => {
    if (audios.length === 0) {
      throw new Error('Pro extrakci embeddingů nebylo předáno žádné audio.');
    }

    const embeddings: tf.Tensor2D[] = [];
    try {
      for (let offset = 0; offset < audios.length; offset += modelBatchSize) {
        const chunk = audios.slice(offset, offset + modelBatchSize);
        const paddedAudios = chunk.slice();
        while (paddedAudios.length < modelBatchSize) {
          paddedAudios.push(new Float32Array(modelSampleCount));
        }

        const inputTensor = audiosToTensor(paddedAudios, modelSampleCount);
        let results: tf.Tensor[];
        try {
          results = await runWithTfjsTensors(perch, inputTensor);
        } finally {
          inputTensor.dispose();
        }

        const selected = results[embeddingIndex];
        for (let i = 0; i < results.length; i++) {
          if (i !== embeddingIndex) results[i]!.dispose();
        }
        if (!selected || selected.shape.length !== 2) {
          selected?.dispose();
          throw new Error('Model Perch v2 nevrátil očekávaný embedding.');
        }

        if (chunk.length === modelBatchSize) {
          embeddings.push(selected as tf.Tensor2D);
        } else {
          const sliced = selected.slice(
            [0, 0],
            [chunk.length, selected.shape[1]!]
          ) as tf.Tensor2D;
          selected.dispose();
          embeddings.push(sliced);
        }
      }

      if (embeddings.length === 1) return embeddings[0]!;
      const combined = tf.concat(embeddings, 0) as tf.Tensor2D;
      embeddings.forEach((tensor) => tensor.dispose());
      return combined;
    } catch (error) {
      embeddings.forEach((tensor) => tensor.dispose());
      throw error;
    }
  };
  return { extractor, perchModel: perch };
}

function audiosToTensor(
  audios: Float32Array[],
  expectedSampleCount: number
): tf.Tensor2D {
  const batchSize = audios.length;
  if (batchSize === 0) {
    throw new Error('Audio batch nesmí být prázdný.');
  }

  const flat = new Float32Array(batchSize * expectedSampleCount);
  for (let i = 0; i < batchSize; i++) {
    const arr = audios[i];
    if (!arr || arr.length !== expectedSampleCount) {
      throw new Error(
        `Audio vzorek ${i + 1} má ${arr?.length ?? 0} hodnot, ` +
          `model očekává ${expectedSampleCount}.`
      );
    }
    flat.set(arr, i * expectedSampleCount);
  }
  return tf.tensor2d(flat, [batchSize, expectedSampleCount]);
}

/* ------------------------------------------------------------------ */
/*  2. Head model                                                      */
/* ------------------------------------------------------------------ */

export interface TrainConfig {
  learningRate: number;
  epochs: number;
  batchSize: number;
  classWeights?: Record<number, number>;
  denseUnits?: number;
  dropoutRate?: number;
  patience?: number;
  reduceLrFactor?: number;
  reduceLrPatience?: number;
  minLr?: number;
}

export interface EpochLog {
  epoch: number;
  loss: number;
  acc: number;
  valLoss: number;
  valAcc: number;
  lr: number;
}

export type ProgressCallback = (log: EpochLog) => void | Promise<void>;

function validateTrainConfig(config: TrainConfig) {
  const positiveValues: Array<[string, number]> = [
    ['learning rate', config.learningRate],
    ['počet epoch', config.epochs],
    ['velikost dávky', config.batchSize]
  ];
  for (const [name, value] of positiveValues) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Neplatná hodnota pro ${name}.`);
    }
  }

  if (!Number.isInteger(config.epochs) || !Number.isInteger(config.batchSize)) {
    throw new Error('Počet epoch a velikost dávky musí být celá čísla.');
  }
  if (
    config.dropoutRate !== undefined &&
    (!Number.isFinite(config.dropoutRate) ||
      config.dropoutRate < 0 ||
      config.dropoutRate >= 1)
  ) {
    throw new Error('Dropout musí být číslo od 0 (včetně) do 1 (bez 1).');
  }
}

function weightedCategoricalCrossentropy(classWeights: Float32Array) {
  const weights = tf.tensor1d(classWeights);
  return (yTrue: tf.Tensor, yPred: tf.Tensor) =>
    tf.tidy(() => {
      const weightedYTrue = yTrue.mul(weights.expandDims(0));
      const clipYPred = yPred.clipByValue(1e-7, 1 - 1e-7);
      const loss = weightedYTrue.mul(clipYPred.log().neg()).sum(-1);
      return loss.mean();
    });
}

export async function buildAndTrainHead(
  embeddings: tf.Tensor2D,
  labels: tf.Tensor2D,
  valEmbeddings: tf.Tensor2D,
  valLabels: tf.Tensor2D,
  numClasses: number,
  config: TrainConfig,
  onProgress?: ProgressCallback,
  shouldStop?: () => boolean
): Promise<{ headModel: tf.LayersModel; history: EpochLog[] }> {
  validateTrainConfig(config);

  const cfg = Object.assign(
    {
      learningRate: 1e-4,
      epochs: 100,
      batchSize: 32,
      classWeights: undefined as Record<number, number> | undefined,
      denseUnits: 512,
      dropoutRate: 0.3,
      patience: 20,
      reduceLrFactor: 0.1,
      reduceLrPatience: 5,
      minLr: 1e-6
    },
    config
  );

  const inputDim = embeddings.shape[1]!;

  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      units: cfg.denseUnits,
      activation: 'relu',
      inputShape: [inputDim]
    })
  );
  model.add(tf.layers.dropout({ rate: cfg.dropoutRate }));
  model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));

  const optimizer = tf.train.adam(cfg.learningRate);

  const lossFn = cfg.classWeights
    ? weightedCategoricalCrossentropy(
        weightsRecordToTensor(cfg.classWeights, numClasses)
      )
    : 'categoricalCrossentropy';

  model.compile({
    optimizer,
    loss: lossFn,
    metrics: ['accuracy']
  });

  const history: EpochLog[] = [];
  let bestValLoss = Infinity;
  let bestWeights: tf.Tensor[] | null = null;
  let wait = 0;
  let lrWait = 0;
  let currentLr = cfg.learningRate;

  const totalEpochs = cfg.epochs;
  let stopped = false;

  for (
    let epochStart = 0;
    epochStart < totalEpochs && !stopped;
    epochStart += 1
  ) {
    if (shouldStop?.()) {
      bestWeights?.forEach((weight) => weight.dispose());
      model.dispose();
      throw new Error('Training cancelled');
    }
    const fitResult = await model.fit(embeddings, labels, {
      epochs: epochStart + 1,
      batchSize: cfg.batchSize,
      validationData: [valEmbeddings, valLabels],
      initialEpoch: epochStart,
      callbacks: [],
      verbose: 0
    });
    if (shouldStop?.()) {
      bestWeights?.forEach((weight) => weight.dispose());
      model.dispose();
      throw new Error('Training cancelled');
    }

    const historyObj = fitResult.history as Record<
      string,
      (number | tf.Tensor)[]
    >;
    const lossVal = historyObj['loss']?.[0];
    const accVal = historyObj['acc']?.[0] ?? historyObj['accuracy']?.[0];
    const valLossVal = historyObj['val_loss']?.[0];
    const valAccVal =
      historyObj['val_acc']?.[0] ?? historyObj['val_accuracy']?.[0];

    const toNum = (v: number | tf.Tensor | undefined): number => {
      if (v == null) return NaN;
      if (typeof v === 'number') return v;
      return v.dataSync()[0] as number;
    };

    const loss = toNum(lossVal);
    const acc = toNum(accVal);
    const valLoss = toNum(valLossVal);
    const valAcc = toNum(valAccVal);

    const log: EpochLog = {
      epoch: epochStart,
      loss,
      acc,
      valLoss,
      valAcc,
      lr: currentLr
    };
    history.push(log);

    if (onProgress) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await onProgress(log);
    }

    if (!Number.isFinite(valLoss)) continue;

    if (valLoss < bestValLoss) {
      bestValLoss = valLoss;
      if (bestWeights) {
        for (const w of bestWeights) w.dispose();
      }
      bestWeights = model.getWeights().map((w) => w.clone()) as tf.Tensor[];
      wait = 0;
      lrWait = 0;
    } else {
      wait++;
      lrWait++;
      if (lrWait >= cfg.reduceLrPatience && currentLr > cfg.minLr) {
        currentLr = Math.max(currentLr * cfg.reduceLrFactor, cfg.minLr);
        (
          optimizer as unknown as {
            learningRate: number;
          }
        ).learningRate = currentLr;
        lrWait = 0;
      }
    }

    if (wait >= cfg.patience) {
      stopped = true;
    }
  }

  if (Array.isArray(bestWeights) && bestWeights.length > 0) {
    const clone = [...bestWeights];
    model.setWeights(clone);
    for (const w of clone) {
      w.dispose();
    }
  }

  return { headModel: model, history };
}

function weightsRecordToTensor(
  weights: Record<number, number>,
  numClasses: number
): Float32Array {
  const arr = new Float32Array(numClasses);
  for (let i = 0; i < numClasses; i++) {
    arr[i] = weights[i] ?? 1;
  }
  return arr;
}

/* ------------------------------------------------------------------ */
/*  3. Head-only download                                              */
/* ------------------------------------------------------------------ */

export async function saveHeadModel(headModel: tf.LayersModel, name: string) {
  await headModel.save(`downloads://${name}`);
}

export function getEmbeddingDim(): number {
  return 1280;
}

/* ------------------------------------------------------------------ */
/*  4. Helpers                                                         */
/* ------------------------------------------------------------------ */

export function oneHot(labels: number[], numClasses: number): tf.Tensor2D {
  return tf.oneHot(labels, numClasses) as tf.Tensor2D;
}

export async function saveModel(model: tf.LayersModel, name: string) {
  await model.save(`downloads://${name}`);
}
