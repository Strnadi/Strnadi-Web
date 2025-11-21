export interface SpectrogramCachedData {
  audioBuffer?: AudioBuffer;
  palette?: Uint8ClampedArray; // 256*4 RGBA colors
  melBinToFreqBin?: [number, number][]; // mapping used for mel aggregation
}

// Simple in-memory cache – resets on page refresh. Map key is hash of audioUrls array joined by '|' plus relevant props (min/max freq, colorScheme length)
const cache = new Map<string, SpectrogramCachedData>();

export function getSpectrogramCache(
  key: string
): SpectrogramCachedData | undefined {
  return cache.get(key);
}

export function setSpectrogramCache(
  key: string,
  data: SpectrogramCachedData
): void {
  const existing = cache.get(key) ?? {};
  cache.set(key, { ...existing, ...data });
}
