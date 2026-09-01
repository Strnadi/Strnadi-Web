import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = path.join(
  repositoryRoot,
  'node_modules',
  '@litertjs',
  'core',
  'wasm'
);
const destinationDirectory = path.join(
  repositoryRoot,
  'public',
  'wasm',
  'litert'
);

await mkdir(destinationDirectory, { recursive: true });

const files = await readdir(sourceDirectory);
await Promise.all(
  files
    .filter((file) => file.endsWith('.js') || file.endsWith('.wasm'))
    .map((file) =>
      copyFile(
        path.join(sourceDirectory, file),
        path.join(destinationDirectory, file)
      )
    )
);
