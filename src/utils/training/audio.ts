let sharedAudioContext: AudioContext | null = null;

async function getAudioContext(sampleRate: number): Promise<AudioContext> {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ sampleRate });
  } else if (sharedAudioContext.sampleRate !== sampleRate) {
    await sharedAudioContext.close();
    sharedAudioContext = new AudioContext({ sampleRate });
  }
  if (sharedAudioContext.state === 'suspended') {
    await sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

export async function decodeAndResample(
  file: File | Blob,
  targetSampleRate = 32000,
  targetDuration = 5
): Promise<Float32Array> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = await getAudioContext(targetSampleRate);
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch) as Float32Array;
      sum += channelData[i]!;
    }
    mono[i] = sum / numChannels;
  }

  const targetSamples = targetSampleRate * targetDuration;
  if (mono.length === targetSamples) return mono;
  if (mono.length > targetSamples) {
    return mono.slice(0, targetSamples);
  }
  const padded = new Float32Array(targetSamples);
  padded.set(mono);
  return padded;
}

export function peakNormalize(audio: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < audio.length; i++) {
    const abs = Math.abs(audio[i]!);
    if (abs > max) max = abs;
  }
  if (max === 0) return audio;
  const out = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    out[i] = audio[i]! / max;
  }
  return out;
}

export async function preprocessAudio(
  file: File | Blob,
  targetSampleRate = 32000,
  targetDuration = 5
): Promise<Float32Array> {
  const decoded = await decodeAndResample(file, targetSampleRate, targetDuration);
  return peakNormalize(decoded);
}
