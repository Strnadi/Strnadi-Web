export function kebabize(str: string): string {
  return (
    str
      // 1. Decompose accented characters into base + combining marks
      .normalize('NFD')
      // 2. Remove all combining diacritical marks (U+0300–U+036F)
      .replace(/[\u0300-\u036f]/g, '')
      // 3. Insert hyphens between lowercase/number → uppercase transitions (camelCase)
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      // 4. Lowercase everything
      .toLowerCase()
      // 5. Replace any non-alphanumeric runs with a single hyphen
      .replace(/[^a-z0-9]+/g, '-')
      // 6. Trim hyphens from start/end
      .replace(/^-+|-+$/g, '')
  );
}
