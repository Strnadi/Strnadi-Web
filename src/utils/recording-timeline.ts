import type { RecordingPartModel } from '@/api/recordings';

/** Parses an API date; dates without a timezone are UTC. */
export function parseApiDate(value?: string | null): number | null {
  if (!value) return null;
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const ts = Date.parse(hasTimezone ? value : `${value}Z`);
  return Number.isFinite(ts) ? ts : null;
}

export interface TimelinePart {
  /** Real start time of the part, ms since epoch. */
  startMs: number;
  /** Where the part begins in the joined audio, seconds. */
  offset: number;
  /** Length of the part's audio, seconds. */
  duration: number;
}

/**
 * Filtered part dates are real clock times, but the spectrogram plays the
 * recording's parts back to back, skipping the gaps between them. The
 * timeline maps between the two.
 *
 * `audioDurations` are the measured lengths of the part audio files, in the
 * same order as `parts`; without them the part dates are used. Returns an
 * empty timeline when a part has no usable dates.
 */
export function buildRecordingTimeline(
  parts: readonly Pick<RecordingPartModel, 'startDate' | 'endDate'>[],
  audioDurations?: readonly number[] | null
): TimelinePart[] {
  const timeline: TimelinePart[] = [];
  let offset = 0;
  for (const [index, part] of parts.entries()) {
    const startMs = parseApiDate(part.startDate);
    const endMs = parseApiDate(part.endDate);
    const measured = audioDurations?.[index];
    let duration: number | null = null;
    if (measured !== undefined && Number.isFinite(measured) && measured > 0) {
      duration = measured;
    } else if (startMs !== null && endMs !== null) {
      duration = Math.max(0, (endMs - startMs) / 1000);
    }
    if (startMs === null || duration === null) return [];
    timeline.push({ startMs, offset, duration });
    offset += duration;
  }
  return timeline;
}

/**
 * Converts a real time to seconds into the joined audio. Times in a gap
 * between parts map to the end of the earlier part; times before the first
 * part or after the last one extend linearly.
 */
export function realTimeToOffset(
  timeline: readonly TimelinePart[],
  ms: number
): number | null {
  if (!timeline.length || !Number.isFinite(ms)) return null;
  // Audio order isn't guaranteed to be chronological.
  let earliest = timeline[0]!;
  let latest = timeline[0]!;
  let containing: TimelinePart | null = null;
  for (const part of timeline) {
    if (part.startMs < earliest.startMs) earliest = part;
    if (part.startMs > latest.startMs) latest = part;
    if (
      part.startMs <= ms &&
      (!containing || part.startMs > containing.startMs)
    ) {
      containing = part;
    }
  }
  if (!containing) {
    return earliest.offset + (ms - earliest.startMs) / 1000;
  }
  const into = (ms - containing.startMs) / 1000;
  return (
    containing.offset +
    (containing === latest ? into : Math.min(into, containing.duration))
  );
}

/**
 * Converts seconds into the joined audio to a real time. At a boundary
 * between two parts, a segment start belongs to the later part and a
 * segment end to the earlier one.
 */
export function offsetToRealTime(
  timeline: readonly TimelinePart[],
  seconds: number,
  edge: 'start' | 'end'
): number | null {
  if (!timeline.length || !Number.isFinite(seconds)) return null;
  const part =
    timeline.find((p) =>
      edge === 'start'
        ? seconds < p.offset + p.duration
        : seconds <= p.offset + p.duration
    ) ?? timeline[timeline.length - 1]!;
  return part.startMs + (seconds - part.offset) * 1000;
}
