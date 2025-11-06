// Basic WAV header helpers used by Spectrogram.vue when downloadOnlySelected option is enabled.
// NOTE: These helpers only support uncompressed PCM WAVE files (the same format the backend serves).
// If the backend starts serving compressed/ADPCM etc. this logic must be updated.

export interface WavHeaderInfo {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataOffset: number; // absolute byte offset where PCM payload starts
  dataSize: number;   // payload size in bytes
}

/**
 * Parse the minimal information we need from the first ~256 bytes of a WAV file.
 * The buffer MUST start at byte 0 of the file (because we look for the RIFF header).
 * Throws an Error if the header looks invalid or unsupported.
 */
export function parseWavHeader(buffer: ArrayBuffer): WavHeaderInfo {
  const view = new DataView(buffer);
  // "RIFF" (0-3), size (4-7, little-endian), "WAVE" (8-11)
  if (view.getUint32(0, false) !== 0x52494646 /* "RIFF" */) {
    throw new Error('Not a RIFF file');
  }
  if (view.getUint32(8, false) !== 0x57415645 /* "WAVE" */) {
    throw new Error('Not a WAVE file');
  }

  // The structure afterwards is a series of chunks. We walk until we find
  // the "fmt " chunk (mandatory) and the "data" chunk (mandatory).
  let pos = 12;
  let fmtFound = false;
  let dataOffset = 0;
  let dataSize = 0;
  let audioFormat = 0;
  let numChannels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;

  while (pos + 8 <= buffer.byteLength) {
    const chunkId = view.getUint32(pos, false);
    const size = view.getUint32(pos + 4, true); // little-endian size
    pos += 8;

    switch (chunkId) {
      case 0x666d7420: // "fmt "
        audioFormat = view.getUint16(pos, true);
        numChannels = view.getUint16(pos + 2, true);
        sampleRate = view.getUint32(pos + 4, true);
        bitsPerSample = view.getUint16(pos + 14, true);
        fmtFound = true;
        break;
      case 0x64617461: // "data"
        dataOffset = pos;
        dataSize = size;
        // we may break only if we already saw fmt, otherwise keep reading
        if (fmtFound) {
          pos = buffer.byteLength; // force exit
        }
        break;
      default:
        // skip other chunks
        break;
    }
    pos += size + (size & 1); // pad to even boundary
  }

  if (!fmtFound || dataOffset === 0) {
    throw new Error('Unsupported WAV header – fmt or data chunk missing');
  }
  if (audioFormat !== 1) {
    throw new Error(`Unsupported WAV format code ${audioFormat} (only PCM=1)`);
  }

  return {
    numChannels,
    sampleRate,
    bitsPerSample,
    dataOffset,
    dataSize,
  };
}

/** Helper – bytes per one second of audio for this header */
export function bytesPerSecond(h: WavHeaderInfo): number {
  return (h.sampleRate * h.numChannels * h.bitsPerSample) / 8;
}

/**
 * Build a minimal 44-byte PCM-WAVE header for a payload of `pcmByteLength` bytes.
 * Returns a Uint8Array.
 */
export function buildWavHeader(h: WavHeaderInfo, pcmByteLength: number): Uint8Array {
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);
  // "RIFF" id + overall size (4 bytes) = 36 + data
  view.setUint32(0, 0x52494646, false); // RIFF
  view.setUint32(4, 36 + pcmByteLength, true); // file size minus 8
  view.setUint32(8, 0x57415645, false); // WAVE

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format PCM
  view.setUint16(22, h.numChannels, true);
  view.setUint32(24, h.sampleRate, true);
  const byteRate = (h.sampleRate * h.numChannels * h.bitsPerSample) / 8;
  view.setUint32(28, byteRate, true);
  const blockAlign = (h.numChannels * h.bitsPerSample) / 8;
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, h.bitsPerSample, true);

  // data chunk header
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmByteLength, true);

  return header;
}
