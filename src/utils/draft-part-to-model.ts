import type { FilteredPartModel, RecordingResponse } from '@/api/recordings';
import { FilteredRecordingPartState } from '@/api/recordings';
import type { DraftFilteredPart } from '@/state/UploadDraftStore';

/**
 * Renders a local draft segment in the same shape the API returns, so the
 * dialect editor can drive both from one code path.
 *
 * Drafts track dialects by id (that is what the upload calls take), while
 * `FilteredRecordingPartResponse` exposes only the codes - hence the lookup.
 */
export function draftPartToModel(
  part: DraftFilteredPart,
  dialectCodeById: Record<number, string>,
  recording: RecordingResponse
): FilteredPartModel {
  const codeOf = (id?: number | null) =>
    id == null ? null : (dialectCodeById[id] ?? null);

  return {
    id: part.id,
    startDate: part.startDate,
    endDate: part.endDate,
    state: (part.state as FilteredRecordingPartState) || null,
    representantFlag: part.representantFlag ?? false,
    recordingId: part.recordingId,
    recording,
    detectedDialects: part.detectedDialects.map((detection) => ({
      id: detection.id,
      filteredRecordingPartId: part.id,
      userGuessDialect: codeOf(detection.userGuessDialectId),
      confirmedDialect: codeOf(detection.confirmedDialectId),
      predictedDialect: codeOf(detection.predictedDialectId)
    }))
  };
}
