import { describe, expect, it } from 'vitest';
import { draftPartToModel } from './draft-part-to-model';
import type { DraftFilteredPart } from '@/state/UploadDraftStore';

const part: DraftFilteredPart = {
  id: 3, parentId: 0, recordingId: 0, state: 0,
  startDate: '2026-09-08T12:00:00Z', endDate: '2026-09-08T12:00:01Z',
  dialectCode: 'BE', representantFlag: true,
  detectedDialects: [{ id: 7, filteredPartId: 3, userGuessDialectId: 2, confirmedDialectId: null }]
};

describe('draftPartToModel', () => {
  it('maps the draft parent field while preserving dialect selections and segment data', () => {
    const result = draftPartToModel(part);
    expect(result.detectedDialects).toEqual([
      { id: 7, filteredRecordingPartId: 3, userGuessDialectId: 2, confirmedDialectId: null }
    ]);
    expect(result.startDate).toBe(part.startDate);
    expect(result.endDate).toBe(part.endDate);
    expect(result.representantFlag).toBe(true);
    expect(part.detectedDialects[0]).toHaveProperty('filteredPartId', 3);
    expect(part.detectedDialects[0]).not.toHaveProperty('filteredRecordingPartId');
  });

  it('accepts a draft segment with no detections', () => {
    expect(draftPartToModel({ ...part, detectedDialects: [] }).detectedDialects).toEqual([]);
  });
});
