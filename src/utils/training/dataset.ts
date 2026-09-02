export interface ProcessedSample {
  audio: Float32Array;
  labelIndex: number;
  className: string;
}

export interface DatasetSplit {
  train: ProcessedSample[];
  val: ProcessedSample[];
  test: ProcessedSample[];
  classNames: string[];
  classWeights: Record<number, number>;
}

export function shuffle<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i];
    const b = arr[j];
    if (a !== undefined && b !== undefined) {
      arr[i] = b;
      arr[j] = a;
    }
  }
  return arr;
}

export function stratifiedSplit(
  samples: ProcessedSample[],
  valRatio: number,
  testRatio: number
): DatasetSplit {
  if (
    !Number.isFinite(valRatio) ||
    !Number.isFinite(testRatio) ||
    valRatio <= 0 ||
    testRatio < 0 ||
    valRatio + testRatio >= 1
  ) {
    throw new Error(
      'Validační poměr musí být větší než 0, testovací poměr nesmí být záporný a jejich součet musí být menší než 1.'
    );
  }

  const byClass = new Map<string, ProcessedSample[]>();
  for (const s of samples) {
    const list = byClass.get(s.className) || [];
    list.push(s);
    byClass.set(s.className, list);
  }

  const classNames = Array.from(byClass.keys()).sort();
  const classIndexMap = new Map<string, number>();
  classNames.forEach((name, i) => classIndexMap.set(name, i));

  const train: ProcessedSample[] = [];
  const val: ProcessedSample[] = [];
  const test: ProcessedSample[] = [];
  const classWeights: Record<number, number> = {};
  const numClasses = classNames.length;
  const totalSamples = samples.length;

  for (const [className, list] of byClass) {
    const shuffled = shuffle(list);
    const labelIndex = classIndexMap.get(className)!;
    const total = shuffled.length;

    let valCount: number;
    let testCount: number;
    let trainCount: number;

    if (total < 3) {
      trainCount = 1;
      valCount = total >= 2 ? 1 : 0;
      testCount = 0;
    } else {
      valCount = Math.max(1, Math.floor(total * valRatio));
      testCount =
        testRatio === 0 ? 0 : Math.max(1, Math.floor(total * testRatio));

      // Rounding and per-class minimums must never consume the last training
      // sample. Reduce the larger holdout first when necessary.
      while (valCount + testCount > total - 1) {
        if (testCount > valCount && testCount > 0) testCount--;
        else valCount--;
      }
      trainCount = total - valCount - testCount;
    }

    const trainSlice = shuffled.slice(0, trainCount);
    const valSlice = shuffled.slice(trainCount, trainCount + valCount);
    const testSlice = shuffled.slice(trainCount + valCount);

    for (const s of trainSlice) s.labelIndex = labelIndex;
    for (const s of valSlice) s.labelIndex = labelIndex;
    for (const s of testSlice) s.labelIndex = labelIndex;

    train.push(...trainSlice);
    val.push(...valSlice);
    test.push(...testSlice);

    classWeights[labelIndex] = totalSamples / (numClasses * total);
  }

  return {
    train: shuffle(train),
    val: shuffle(val),
    test: shuffle(test),
    classNames,
    classWeights
  };
}
