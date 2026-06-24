import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { loadLiteRt, getGlobalLiteRtPromise, loadAndCompile, type CompiledModel } from '@litertjs/core';
import { runWithTfjsTensors } from '@litertjs/tfjs-interop';

export type EmbeddingExtractor = (audios: Float32Array[]) => Promise<tf.Tensor2D>;

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
  const model = await loadAndCompile(PERCH_MODEL_URL, { accelerator: 'wasm' });
  cachedPerchModel = model;
  return model;
}

export async function createEmbeddingExtractor(): Promise<{
  extractor: EmbeddingExtractor;
  perchModel: CompiledModel;
}> {
  const perch = await loadPerchBackbone();
  const outputDetails = perch.getOutputDetails();

  let embeddingKey: string | number = 0;
  for (let i = 0; i < outputDetails.length; i++) {
    if (outputDetails[i]?.name?.toLowerCase().includes('embedding')) {
      embeddingKey = i;
      break;
    }
  }

  const extractor: EmbeddingExtractor = async (audios: Float32Array[]) => {
    const inputTensor = audiosToTensor(audios);
    const results = await runWithTfjsTensors(perch, inputTensor);
    inputTensor.dispose();

    let embedding: tf.Tensor;
    if (Array.isArray(results)) {
      embedding = results[embeddingKey as number]!;
      for (let i = 0; i < results.length; i++) {
        if (i !== (embeddingKey as number)) results[i]!.dispose();
      }
    } else {
      const record = results as Record<string, tf.Tensor>;
      const keys = Object.keys(record);
      const useKey = typeof embeddingKey === 'number' ? keys[embeddingKey as number]! : embeddingKey;
      embedding = record[useKey]!;
      for (const key of keys) {
        if (key !== useKey) record[key]!.dispose();
      }
    }
    return embedding as tf.Tensor2D;
  };
  return { extractor, perchModel: perch };
}

function audiosToTensor(audios: Float32Array[]): tf.Tensor2D {
  const batchSize = audios.length;
  const sampleCount = audios[0]?.length ?? 0;
  const flat = new Float32Array(batchSize * sampleCount);
  for (let i = 0; i < batchSize; i++) {
    const arr = audios[i];
    if (arr) flat.set(arr, i * sampleCount);
  }
  return tf.tensor2d(flat, [batchSize, sampleCount]);
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

export type ProgressCallback = (log: EpochLog) => void;

function weightedCategoricalCrossentropy(classWeights: Float32Array) {
  return (yTrue: tf.Tensor, yPred: tf.Tensor) => {
    const weights = tf.tensor1d(classWeights);
    const weightedYTrue = yTrue.mul(weights.expandDims(0));
    const clipYPred = yPred.clipByValue(1e-7, 1 - 1e-7);
    const loss = weightedYTrue.mul(clipYPred.log().neg()).sum(-1);
    return loss.mean();
  };
}

export async function buildAndTrainHead(
  embeddings: tf.Tensor2D,
  labels: tf.Tensor2D,
  valEmbeddings: tf.Tensor2D,
  valLabels: tf.Tensor2D,
  numClasses: number,
  config: TrainConfig,
  onProgress?: ProgressCallback,
): Promise<{ headModel: tf.LayersModel; history: EpochLog[] }> {
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
      minLr: 1e-6,
    },
    config,
  );

  const inputDim = embeddings.shape[1]!;

  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      units: cfg.denseUnits,
      activation: 'relu',
      inputShape: [inputDim],
    }),
  );
  model.add(tf.layers.dropout({ rate: cfg.dropoutRate }));
  model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));

  const optimizer = tf.train.adam(cfg.learningRate);

  const lossFn = cfg.classWeights
    ? weightedCategoricalCrossentropy(weightsRecordToTensor(cfg.classWeights, numClasses))
    : 'categoricalCrossentropy';

  model.compile({
    optimizer,
    loss: lossFn,
    metrics: ['accuracy'],
  });

  const history: EpochLog[] = [];
  let bestValLoss = Infinity;
  let bestWeights: tf.Tensor[] | null = null;
  let wait = 0;
  let lrWait = 0;
  let currentLr = cfg.learningRate;

  const totalEpochs = cfg.epochs;
  let stopped = false;

  for (let epochStart = 0; epochStart < totalEpochs && !stopped; epochStart += 1) {
    const fitResult = await model.fit(embeddings, labels, {
      epochs: epochStart + 1,
      batchSize: cfg.batchSize,
      validationData: [valEmbeddings, valLabels],
      initialEpoch: epochStart,
      callbacks: [],
      verbose: 0,
    });

    const historyObj = fitResult.history as Record<string, (number | tf.Tensor)[]>;
    const lossVal = historyObj['loss']?.[0];
    const accVal = historyObj['acc']?.[0] ?? historyObj['accuracy']?.[0];
    const valLossVal = historyObj['val_loss']?.[0];
    const valAccVal = historyObj['val_acc']?.[0] ?? historyObj['val_accuracy']?.[0];

    const toNum = (v: number | tf.Tensor | undefined): number => {
      if (v == null) return NaN;
      if (typeof v === 'number') return v;
      return v.dataSync()[0] as number;
    };

    const loss = toNum(lossVal);
    const acc = toNum(accVal);
    const valLoss = toNum(valLossVal);
    const valAcc = toNum(valAccVal);

    const log: EpochLog = { epoch: epochStart, loss, acc, valLoss, valAcc, lr: currentLr };
    history.push(log);

    if (onProgress) {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      onProgress(log);
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
        (optimizer as any).setLearningRate(currentLr);
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

function weightsRecordToTensor(weights: Record<number, number>, numClasses: number): Float32Array {
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