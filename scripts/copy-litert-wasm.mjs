import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile
} from 'node:fs/promises';
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
const copiedFiles = files.filter(
  (file) => file.endsWith('.js') || file.endsWith('.wasm')
);

await Promise.all(
  copiedFiles.map((file) =>
    copyFile(
      path.join(sourceDirectory, file),
      path.join(destinationDirectory, file)
    )
  )
);

// LiteRT's UMD loaders declare ModuleFactory with a top-level `var`. Depending
// on how the browser executes an injected loader script, that declaration is
// not guaranteed to become a property of `self`, while @litertjs/wasm-utils
// explicitly reads `self.ModuleFactory`. Make that contract explicit.
await Promise.all(
  copiedFiles
    .filter((file) => file.endsWith('.js'))
    .map(async (file) => {
      const destination = path.join(destinationDirectory, file);
      const source = await readFile(destination, 'utf8');
      await writeFile(
        destination,
        `${source}\n;globalThis.ModuleFactory = ModuleFactory;\n`,
        'utf8'
      );
    })
);
