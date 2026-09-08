import * as tfvis from '@tensorflow/tfjs-vis';
import type { LayersModel } from '@tensorflow/tfjs';
import type { EpochLog } from '@/services/tfjs/training';

const TAB_TRAINING = 'Training';
const TAB_MODEL = 'Model';
const TAB_EVALUATION = 'Evaluation';

const METRIC_SURFACE_STYLES = {
  width: '100%',
  maxWidth: '100%',
  height: '320px',
  maxHeight: '320px'
};

function metricChartData(
  history: EpochLog[],
  trainValue: (log: EpochLog) => number,
  validationValue: (log: EpochLog) => number
) {
  const finiteHistory = history.filter(
    (log) =>
      Number.isFinite(trainValue(log)) && Number.isFinite(validationValue(log))
  );

  return {
    values: [
      finiteHistory.map((log) => ({
        x: log.epoch + 1,
        y: trainValue(log)
      })),
      finiteHistory.map((log) => ({
        x: log.epoch + 1,
        y: validationValue(log)
      }))
    ],
    series: ['Training', 'Validation']
  };
}

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
    model as any
  );
}

export async function showLayer(model: LayersModel, layerIndex: number) {
  const layer = (model as any).getLayer(undefined, layerIndex);
  if (layer) {
    await tfvis.show.layer(
      { name: `Layer ${layerIndex}`, tab: TAB_MODEL },
      layer
    );
  }
}

export async function updateTrainingMetrics(history: EpochLog[]) {
  if (history.length === 0) return;

  const lossData = metricChartData(
    history,
    (log) => log.loss,
    (log) => log.valLoss
  );
  const accuracyData = metricChartData(
    history,
    (log) => log.acc,
    (log) => log.valAcc
  );

  const renders: Promise<void>[] = [];
  if (lossData.values[0]!.length > 0) {
    renders.push(
      tfvis.render.linechart(
        {
          name: 'Loss',
          tab: TAB_TRAINING,
          styles: METRIC_SURFACE_STYLES
        },
        lossData,
        {
          xLabel: 'Epoch',
          yLabel: 'Loss',
          zoomToFit: true
        }
      )
    );
  }

  if (accuracyData.values[0]!.length > 0) {
    renders.push(
      tfvis.render.linechart(
        {
          name: 'Accuracy',
          tab: TAB_TRAINING,
          styles: METRIC_SURFACE_STYLES
        },
        accuracyData,
        {
          xLabel: 'Epoch',
          yLabel: 'Accuracy',
          yAxisDomain: [0, 1]
        }
      )
    );
  }

  await Promise.all(renders);
}

export async function showConfusionMatrix(
  values: number[][],
  classNames: string[]
) {
  const data = { values, tickLabels: classNames };
  await tfvis.render.confusionMatrix(
    { name: 'Confusion Matrix', tab: TAB_EVALUATION },
    data,
    { shadeDiagonal: true }
  );
}

export async function showPerClassAccuracy(
  classAccuracy: Array<{ accuracy: number; count: number }>,
  classNames: string[]
) {
  await tfvis.show.perClassAccuracy(
    { name: 'Per-class Accuracy', tab: TAB_EVALUATION },
    classAccuracy,
    classNames
  );
}

export async function showTrainingConfig(config: Record<string, unknown>) {
  const rows = Object.entries(config).map(([key, value]) => ({
    key,
    value: String(value)
  }));
  await tfvis.render.table(
    { name: 'Training Config', tab: TAB_TRAINING },
    {
      headers: ['Parameter', 'Value'],
      values: rows.map((r) => [r.key, r.value])
    }
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
    value: String(value)
  }));
  rows.push({ key: 'classes', value: classNames.join(', ') });
  rows.push({
    key: 'class_weights',
    value: Object.entries(classWeights)
      .map(([k, v]) => `${classNames[Number(k)] ?? k}: ${v.toFixed(2)}`)
      .join(', ')
  });

  await tfvis.render.table(
    { name: 'Dataset Info', tab: TAB_TRAINING },
    {
      headers: ['Property', 'Value'],
      values: rows.map((r) => [r.key, r.value])
    }
  );
}
