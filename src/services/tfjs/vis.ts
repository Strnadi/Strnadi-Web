import * as tfvis from '@tensorflow/tfjs-vis';
import type { LayersModel } from '@tensorflow/tfjs';
import type { EpochLog } from '@/services/tfjs/training';

const TAB_TRAINING = 'Training';
const TAB_MODEL = 'Model';
const TAB_EVALUATION = 'Evaluation';

export function openVisor() {
  tfvis.visor().open();
}

export function closeVisor() {
  tfvis.visor().close();
}

export function toggleVisor() {
  tfvis.visor().toggle();
}

export function isVisorOpen() {
  return tfvis.visor().isOpen();
}

export function setActiveTab(tab: string) {
  tfvis.visor().setActiveTab(tab);
}

export async function showModelSummary(model: LayersModel) {
  await tfvis.show.modelSummary(
    { name: 'Model Summary', tab: TAB_MODEL },
    model as any,
  );
}

export async function showLayer(model: LayersModel, layerIndex: number) {
  const layer = (model as any).getLayer(undefined, layerIndex);
  if (layer) {
    await tfvis.show.layer(
      { name: `Layer ${layerIndex}`, tab: TAB_MODEL },
      layer,
    );
  }
}

export async function updateTrainingMetrics(history: EpochLog[]) {
  if (history.length === 0) return;

  const lossSurface = { name: 'Loss', tab: TAB_TRAINING };
  const accSurface = { name: 'Accuracy', tab: TAB_TRAINING };

  const lossData = [
    { name: 'train loss', x: history.map((h) => h.epoch), y: history.map((h) => h.loss) },
    { name: 'val loss', x: history.map((h) => h.epoch), y: history.map((h) => h.valLoss) },
  ];
  const accData = [
    { name: 'train acc', x: history.map((h) => h.epoch), y: history.map((h) => h.acc) },
    { name: 'val acc', x: history.map((h) => h.epoch), y: history.map((h) => h.valAcc) },
  ];

  await tfvis.render.linechart(lossSurface, lossData as any, {
    xLabel: 'Epoch',
    yLabel: 'Loss',
    zoomToFit: true,
  });

  await tfvis.render.linechart(accSurface, accData as any, {
    xLabel: 'Epoch',
    yLabel: 'Accuracy',
    zoomToFit: true,
  });
}

export async function showConfusionMatrix(
  values: number[][],
  classNames: string[],
) {
  const data = { values, tickLabels: classNames };
  await tfvis.render.confusionMatrix(
    { name: 'Confusion Matrix', tab: TAB_EVALUATION },
    data,
    { shadeDiagonal: true },
  );
}

export async function showPerClassAccuracy(
  classAccuracy: Array<{ accuracy: number; count: number }>,
  classNames: string[],
) {
  await tfvis.show.perClassAccuracy(
    { name: 'Per-class Accuracy', tab: TAB_EVALUATION },
    classAccuracy,
    classNames,
  );
}

export async function showTrainingConfig(config: Record<string, unknown>) {
  const rows = Object.entries(config).map(([key, value]) => ({
    key,
    value: String(value),
  }));
  await tfvis.render.table(
    { name: 'Training Config', tab: TAB_TRAINING },
    { headers: ['Parameter', 'Value'], values: rows.map((r) => [r.key, r.value]) },
  );
}

export async function showDatasetInfo(info: {
  totalSamples: number;
  trainCount: number;
  valCount: number;
  testCount: number;
  classNames: string[];
  classWeights: Record<number, number>;
}) {
  const { classWeights, classNames, ...rest } = info;
  const rows = Object.entries(rest).map(([key, value]) => ({
    key,
    value: String(value),
  }));
  rows.push({ key: 'classes', value: classNames.join(', ') });
  rows.push({
    key: 'class_weights',
    value: Object.entries(classWeights)
      .map(([k, v]) => `${classNames[Number(k)] ?? k}: ${v.toFixed(2)}`)
      .join(', '),
  });

  await tfvis.render.table(
    { name: 'Dataset Info', tab: TAB_TRAINING },
    { headers: ['Property', 'Value'], values: rows.map((r) => [r.key, r.value]) },
  );
}