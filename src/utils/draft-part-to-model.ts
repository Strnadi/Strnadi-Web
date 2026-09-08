import type { FilteredPartModel } from '@/api/recordings';
import type { DraftFilteredPart } from '@/state/UploadDraftStore';

export function draftPartToModel(part: DraftFilteredPart): FilteredPartModel {
  return {
    ...part,
    detectedDialects: part.detectedDialects.map(({ filteredPartId, ...detection }) => ({
      ...detection,
      filteredRecordingPartId: filteredPartId
    }))
  };
}
