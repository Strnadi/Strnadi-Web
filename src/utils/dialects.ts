import type { FilteredPartModel } from '@/api/recordings';

export const getDialectStrings = (filteredPart: FilteredPartModel) => {
  if (!filteredPart.detectedDialects) return [];

  if (filteredPart.detectedDialects.some((dd) => dd.confirmedDialect)) {
    return filteredPart.detectedDialects
      .map((dd) => dd.confirmedDialect)
      .filter(Boolean);
  }

  const dialects = [
    ...filteredPart.detectedDialects
      .map((dd) => dd.predictedDialect)
      .filter(Boolean),
    ...filteredPart.detectedDialects
      .map((dd) => dd.userGuessDialect)
      .filter(Boolean)
  ];

  return dialects;
};
