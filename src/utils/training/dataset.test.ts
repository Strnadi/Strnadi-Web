import { describe, expect, it } from 'vitest';
import { stratifiedSplit, type ProcessedSample } from './dataset';

function samplesPerClass(count: number): ProcessedSample[] {
  return ['a', 'b'].flatMap((className, labelIndex) =>
    Array.from({ length: count }, () => ({
      audio: new Float32Array(1),
      className,
      labelIndex
    }))
  );
}

describe('stratifiedSplit', () => {
  it('uses independent validation and test ratios', () => {
    const split = stratifiedSplit(samplesPerClass(10), 0.2, 0.1);

    expect(split.train).toHaveLength(14);
    expect(split.val).toHaveLength(4);
    expect(split.test).toHaveLength(2);
  });

  it('allows a zero-sized test split', () => {
    const split = stratifiedSplit(samplesPerClass(10), 0.2, 0);

    expect(split.train).toHaveLength(16);
    expect(split.val).toHaveLength(4);
    expect(split.test).toHaveLength(0);
  });

  it('always preserves a training sample for small classes', () => {
    const split = stratifiedSplit(samplesPerClass(3), 0.49, 0.49);

    expect(split.train).toHaveLength(2);
    expect(split.val.length + split.test.length).toBe(4);
  });

  it('rejects ratios that leave no training split', () => {
    expect(() => stratifiedSplit(samplesPerClass(10), 0.6, 0.4)).toThrow(
      'součet musí být menší než 1'
    );
  });
});
