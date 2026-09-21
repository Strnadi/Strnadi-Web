import { describe, expect, it } from 'vitest';
import { draftPartToModel } from './draft-part-to-model';
import type { RecordingResponse } from '@/api/recordings';
import type { DraftFilteredPart } from '@/state/UploadDraftStore';

const recording: RecordingResponse = {
  id: 0,
  createdAt: '2026-09-08T12:00:00Z',
  estimatedBirdsCount: 1,
  byApp: false,
  name: 'Draft',
  note: null,
  notePost: null,
  device: null,
  userId: null,
  expectedPartsCount: null,
  uploadConfirmed: false,
  parts: []
};

const dialectCodeById = { 2: 'BE', 5: 'XB' };

const part: DraftFilteredPart = {
  id: 3, parentId: 0, recordingId: 0, state: 0,
  startDate: '2026-09-08T12:00:00Z', endDate: '2026-09-08T12:00:01Z',
  dialectCode: 'BE', representantFlag: true,
  detectedDialects: [{ id: 7, filteredPartId: 3, userGuessDialectId: 2, confirmedDialectId: null }]
};

describe('draftPartToModel', () => {
  it('resolves draft dialect ids to the codes the API returns', () => {
    const result = draftPartToModel(part, dialectCodeById, recording);
    expect(result.detectedDialects).toEqual([
      {
        id: 7,
        filteredRecordingPartId: 3,
        userGuessDialect: 'BE',
        confirmedDialect: null,
        predictedDialect: null
      }
    ]);
    expect(result.startDate).toBe(part.startDate);
    expect(result.endDate).toBe(part.endDate);
    expect(result.representantFlag).toBe(true);
    expect(result.recording).toBe(recording);
    expect(part.detectedDialects[0]).toHaveProperty('filteredPartId', 3);
  });

  it('leaves unknown dialect ids unresolved rather than guessing', () => {
    const result = draftPartToModel(
      { ...part, detectedDialects: [{ id: 7, filteredPartId: 3, confirmedDialectId: 99 }] },
      dialectCodeById,
      recording
    );
    expect(result.detectedDialects[0]!.confirmedDialect).toBeNull();
  });

  it('accepts a draft segment with no detections', () => {
    expect(
      draftPartToModel({ ...part, detectedDialects: [] }, dialectCodeById, recording)
        .detectedDialects
    ).toEqual([]);
  });
});
