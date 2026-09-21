import { describe, expect, it } from 'vitest';
import { computeUploadHash, toRoundtripUtc } from './recordings';
import { md5Hex } from '@/utils/md5';

const part = (startDate: string, endDate: string, bytes: number[]) => ({
  startDate,
  endDate,
  gpsLatitudeStart: 50.1,
  gpsLatitudeEnd: 50.2,
  gpsLongitudeStart: 14.3,
  gpsLongitudeEnd: 14.4,
  data: new File([new Uint8Array(bytes)], 'part.wav')
});

describe('toRoundtripUtc', () => {
  it('pads to the seven fractional digits DateTime.ToString("O") emits', () => {
    expect(toRoundtripUtc('2026-05-01T12:34:56.123Z')).toBe(
      '2026-05-01T12:34:56.1230000Z'
    );
    expect(toRoundtripUtc(new Date(Date.UTC(2026, 0, 2, 3, 4, 5)))).toBe(
      '2026-01-02T03:04:05.0000000Z'
    );
  });
});

describe('computeUploadHash', () => {
  it('concatenates each part the way CompleteUploadAsync does', async () => {
    const parts = [part('2026-05-01T00:00:00Z', '2026-05-01T00:00:01Z', [1, 2, 3])];

    const expected = md5Hex(
      '2026-05-01T00:00:00.0000000Z' +
        '2026-05-01T00:00:01.0000000Z' +
        '50.1' +
        '14.3' +
        '50.2' +
        '14.4' +
        btoa('\x01\x02\x03')
    );

    expect(await computeUploadHash(parts)).toBe(expected);
  });

  it('orders parts by start date, not by the order they were passed', async () => {
    const first = part('2026-05-01T00:00:00Z', '2026-05-01T00:00:01Z', [1]);
    const second = part('2026-05-01T00:01:00Z', '2026-05-01T00:01:01Z', [2]);

    expect(await computeUploadHash([second, first])).toBe(
      await computeUploadHash([first, second])
    );
  });
});
