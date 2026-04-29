import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export type EmbeddingExtractor = (audios: Float32Array[]) => Promise<tf.Tensor2D>;

const PERCH_MODEL_URL = '/models/perch_v2_js/model.json';

/* ------------------------------------------------------------------ */
/*  1. Model loading                                                   */
/* ------------------------------------------------------------------ */

let cachedPerchModel: tf.LayersModel | null = null;

export async function loadPerchBackbone(): Promise<tf.LayersModel> {
  if (cachedPerchModel) return cachedPerchModel;
  await tf.setBackend('webgl');
  await tf.ready();
  const model = (await tf.loadLayersModel(PERCH_MODEL_URL)) as tf.LayersModel;
  model.trainable = false;
  cachedPerchModel = model;
  return model;
}

export async function createEmbeddingExtractor(): Promise<{
  extractor: EmbeddingExtractor;
  perchModel: tf.LayersModel;
}> {
  const perch = await loadPerchBackbone();
  const extractor: EmbeddingExtractor = async (audios: Float32Array[]) => {
    const inputTensor = audiosToTensor(audios);
    let output = perch.predict(inputTensor) as tf.Tensor | tf.NamedTensorMap;
    let embedding: tf.Tensor;
    if (output instanceof tf.Tensor) {
      embedding = output;
    } else if (output && typeof output === 'object' && 'embedding' in output) {
      embedding = (output as Record<string, tf.Tensor>)['embedding'] as tf.Tensor;
    } else {
      const values = Object.values(output as Record<string, tf.Tensor>);
      embedding = values[0] as tf.Tensor;
    }
    const result = embedding as tf.Tensor2D;
    inputTensor.dispose();
    return result;
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
  model.compile({
    optimizer,
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  const history: EpochLog[] = [];
  let bestValLoss = Infinity;
  let bestWeights: tf.Tensor[] | null = null;
  let wait = 0;
  let lrWait = 0;
  let currentLr = cfg.learningRate;

  // We implement manual epoch loop to support early stopping and LR reduction,
  // since TF.js model.fit doesn't properly support stopping mid-fit.
  const totalEpochs = cfg.epochs;
  let stopped = false;

  for (let epochStart = 0; epochStart < totalEpochs && !stopped; epochStart += 1) {
    const fitResult = await model.fit(embeddings, labels, {
      epochs: epochStart + 1,
      batchSize: cfg.batchSize,
      validationData: [valEmbeddings, valLabels],
      initialEpoch: epochStart,
      callbacks: cfg.classWeights
        ? []
        : [],
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

  // Restore best weights
  if (Array.isArray(bestWeights) && bestWeights.length > 0) {
    const clone = [...bestWeights];
    model.setWeights(clone);
    for (const w of clone) {
      w.dispose();
    }
  }

  return { headModel: model, history };
}

/* ------------------------------------------------------------------ */
/*  3. Combined model (Perch + head) for download                     */
/* ------------------------------------------------------------------ */

export async function buildCombinedModel(
  perchModel: tf.LayersModel,
  headModel: tf.LayersModel,
): Promise<tf.LayersModel> {
  const audioInput = tf.input({ shape: [160000], dtype: 'float32', name: 'audio_input' });

  // Run through Perch backbone (frozen) - use apply with SymbolicTensor input
  const perchOutput = perchModel.apply(audioInput);

  // Determine the embedding tensor from the output
  let embedding: tf.SymbolicTensor;
  if (Array.isArray(perchOutput)) {
    embedding = perchOutput[0] as tf.SymbolicTensor;
  } else if (perchOutput instanceof tf.SymbolicTensor) {
    embedding = perchOutput;
  } else {
    // NamedTensorMap case - extract 'embedding' or first key
    const map = perchOutput as unknown as Record<string, tf.SymbolicTensor>;
    if ('embedding' in map) {
      embedding = map['embedding'];
    } else {
      const firstKey = Object.keys(map)[0]!;
      embedding = map[firstKey]!;
    }
  }

  // Run through head model
  const headOutput = headModel.apply(embedding) as tf.SymbolicTensor;

  const combined = tf.model({ inputs: audioInput, outputs: headOutput, name: 'perch_v2_custom' });
  return combined;
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