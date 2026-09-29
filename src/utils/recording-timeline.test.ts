import { describe, expect, it } from 'vitest';
import {
  buildRecordingTimeline,
  offsetToRealTime,
  parseApiDate,
  realTimeToOffset
} from './recording-timeline';

// Recording 9073: 33 s part, 2 min 23 s gap, 264 s part.
const parts = [
  { startDate: '2026-07-15T18:30:43', endDate: '2026-07-15T18:31:16' },
  { startDate: '2026-07-15T18:33:39', endDate: '2026-07-15T18:38:03' }
];
const at = (time: string) => parseApiDate(`2026-07-15T${time}`)!;

describe('buildRecordingTimeline', () => {
  it('places parts back to back using their dates', () => {
    expect(buildRecordingTimeline(parts)).toEqual([
      { startMs: at('18:30:43'), offset: 0, duration: 33 },
      { startMs: at('18:33:39'), offset: 33, duration: 264 }
    ]);
  });

  it('prefers measured audio lengths', () => {
    const timeline = buildRecordingTimeline(parts, [32.5, 263]);
    expect(timeline.map((p) => [p.offset, p.duration])).toEqual([
      [0, 32.5],
      [32.5, 263]
    ]);
  });

  it('is empty when a part has no usable dates', () => {
    expect(
      buildRecordingTimeline([...parts, { startDate: '', endDate: '' }])
    ).toEqual([]);
  });
});

describe('realTimeToOffset', () => {
  const timeline = buildRecordingTimeline(parts);

  it('skips the gap for times in later parts', () => {
    expect(realTimeToOffset(timeline, at('18:30:53'))).toBe(10);
    expect(realTimeToOffset(timeline, at('18:34:03'))).toBe(57);
  });

  it('maps times in a gap to the end of the earlier part', () => {
    expect(realTimeToOffset(timeline, at('18:32:00'))).toBe(33);
  });

  it('extends linearly outside the recording', () => {
    expect(realTimeToOffset(timeline, at('18:30:40'))).toBe(-3);
    expect(realTimeToOffset(timeline, at('18:38:05'))).toBe(299);
  });

  it('handles parts that are not in chronological order', () => {
    const reversed = buildRecordingTimeline([parts[1]!, parts[0]!]);
    expect(realTimeToOffset(reversed, at('18:30:53'))).toBe(274);
    expect(realTimeToOffset(reversed, at('18:34:03'))).toBe(24);
  });

  it('returns null without a timeline', () => {
    expect(realTimeToOffset([], at('18:30:53'))).toBeNull();
  });
});

describe('offsetToRealTime', () => {
  const timeline = buildRecordingTimeline(parts);

  it('adds the gap back for offsets in later parts', () => {
    expect(offsetToRealTime(timeline, 57, 'start')).toBe(at('18:34:03'));
    expect(offsetToRealTime(timeline, 10, 'end')).toBe(at('18:30:53'));
  });

  it('assigns a boundary to the later part for starts, earlier for ends', () => {
    expect(offsetToRealTime(timeline, 33, 'start')).toBe(at('18:33:39'));
    expect(offsetToRealTime(timeline, 33, 'end')).toBe(at('18:31:16'));
  });

  it('round-trips real times inside parts', () => {
    for (const time of ['18:30:43', '18:31:00', '18:33:39', '18:37:59']) {
      const offset = realTimeToOffset(timeline, at(time))!;
      expect(offsetToRealTime(timeline, offset, 'start')).toBe(at(time));
    }
  });
});
