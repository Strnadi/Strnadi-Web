import type { BunPlugin } from 'bun';
import path from 'path';

export default function AssetsPlugin(): BunPlugin {
  return {
    name: 'assets-plugin',
    setup(build) {
      build.onResolve({ filter: /^\/.*\.(svg|png|jpg|jpeg|gif|webp)$/ }, (args) => {
        const root = process.cwd();
        // Assume / refers to public or root. 
        // If the file exists in public, use that.
        // Otherwise try root.
        // But for now, let's map / to <root>/public/ if it exists, or <root>/
        
        // The user has `public/` folder.
        // `/logo-no-text.svg` -> `public/logo-no-text.svg`
        
        const relativePath = args.path.slice(1);
        const publicPath = path.join(root, 'public', relativePath);
        
        return { path: publicPath };
      });
    }
  };
}
