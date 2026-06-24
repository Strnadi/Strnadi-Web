import JSZip from '@progress/jszip-esm';
import type { JSZipObject } from '@progress/jszip-esm';
import { preprocessAudio } from './audio';
import type { ProcessedSample } from './dataset';
import { stratifiedSplit } from './dataset';

export interface ZipParseOptions {
  targetSampleRate?: number;
  targetDuration?: number;
  audioExts?: string[];
  onProgress?: (loaded: number, total: number) => void;
}

export interface ParsedZipDataset {
  samples: ProcessedSample[];
  classNames: string[];
}

export async function parseTrainingZip(
  zipFile: File,
  options: ZipParseOptions = {},
): Promise<ParsedZipDataset> {
  const {
    targetSampleRate = 32000,
    targetDuration = 5,
    audioExts = ['.wav', '.mp3', '.flac', '.ogg', '.aiff'],
    onProgress,
  } = options;

  const zip = new JSZip();
  await zip.loadAsync(await zipFile.arrayBuffer());

  const entries: { relPath: string; zipObj: JSZipObject }[] = [];
  const dirClassMap = new Map<string, string>();

  zip.forEach((relPath: string, zipObj: JSZipObject) => {
    if (zipObj.dir) return;
    const ext = relPath.slice(relPath.lastIndexOf('.')).toLowerCase();
    if (audioExts.includes(ext)) {
      entries.push({ relPath, zipObj });
      const parts = relPath.split('/');
      if (parts.length > 1) {
        const className = parts[parts.length - 2]!;
        if (className) {
          dirClassMap.set(className, className);
        }
      }
    }
  });

  if (entries.length === 0) {
    throw new Error('No audio files found in ZIP.');
  }

  let classNames = Array.from(dirClassMap.keys()).sort();

  if (classNames.length === 0) {
    const set = new Set<string>();
    for (const { relPath } of entries) {
      const name = relPath.split('/').pop() ?? '';
      const stem = name.split('_')[0];
      if (stem) set.add(stem);
    }
    classNames = Array.from(set).sort();
  }

  if (classNames.length < 2) {
    throw new Error('Dataset must contain at least 2 classes.');
  }

  const classIndexMap = new Map<string, number>();
  classNames.forEach((n, i) => classIndexMap.set(n, i));

  const samples: ProcessedSample[] = [];
  let loaded = 0;

  for (const { relPath, zipObj } of entries) {
    const blob = await zipObj.async('blob');
    const fileName = relPath.split('/').pop() ?? 'audio';
    const file = new File([blob], fileName, { type: 'audio/wav' });

    const audio = await preprocessAudio(file, targetSampleRate, targetDuration);

    const parts = relPath.split('/');
    let className = parts.length > 1 ? (parts[parts.length - 2] ?? '') : '';
    if (!classIndexMap.has(className)) {
      className = fileName.split('_')[0] ?? '';
    }
    const labelIndex = classIndexMap.get(className) ?? 0;

    samples.push({ audio, labelIndex, className });
    loaded++;
    onProgress?.(loaded, entries.length);

    if (loaded % 3 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  return { samples, classNames };
}

export function buildDatasetFromZip(
  zipFile: File,
  options?: ZipParseOptions,
) {
  return parseTrainingZip(zipFile, options).then(({ samples, classNames }) => {
    const split = stratifiedSplit(samples, 0.3, 0.33);
    split.classNames = classNames;
    return split;
  });
}