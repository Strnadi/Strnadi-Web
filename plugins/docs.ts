import { Plugin } from 'vite';
import { parse, SFCDescriptor, SFCBlock } from '@vue/compiler-sfc';

export interface DocsPluginOptions {
  /**
   * The custom block type / tag to look for (default: 'docs')
   */
  rootTag?: string;
}

export function vitePluginDocsRoot(options: DocsPluginOptions = {}): Plugin {
  const { rootTag = 'docs' } = options;
  const docsMap = new Map<string, string>();

  return {
    name: 'vite-plugin-docs-root',
    enforce: 'pre',
    apply: () => true,

    transform(code: string, id: string) {
      // Strip query to match raw .vue files
      const [filepath] = id.split('?');
      if (!filepath.endsWith('.vue')) return null;

      // Parse SFC with padding to get correct locations
      const { descriptor }: { descriptor: SFCDescriptor } = parse(code, { pad: 'space' });
      const block: SFCBlock | undefined = descriptor.customBlocks.find(b => b.type === rootTag);
      if (!block) return null;

      // Store trimmed markdown content by file key
      docsMap.set(filepath, block.content.trim());

      // Remove the custom block from the component code
      const start = block.loc.start.offset;
      const end = block.loc.end.offset;
      return {
        code: code.slice(0, start) + code.slice(end),
        map: null,
      };
    },

    load(id: string) {
      // Intercept virtual module for docs block
      const match = id.match(/(.*)\?vue&type=docs&index=\d+&lang\.docs/);
      if (match) {
        const filepath = match[1];
        const md = docsMap.get(filepath) || '';
        // Export markdown as JS string
        return ``;
      }
      return null;
    },

    configureServer(server) {
      // Dev-only HTML viewer endpoint
      server.middlewares.use((req, res, next) => {
        if (req.url === '/__docs') {
          res.setHeader('Content-Type', 'text/html');
          res.write(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>`);
          res.write(`<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`);
          for (const [file, content] of docsMap) {
            const safeId = file.replace(/[^a-zA-Z0-9]/g, '_');
            res.write(`<pre id="raw-${safeId}" style="display:none">${content}</pre>`);
            res.write(`<details><summary>${file}</summary><div id="${safeId}"></div></details>`);
            res.write(`<script>document.getElementById('${safeId}').innerHTML = marked.parse(document.getElementById('raw-${safeId}').innerText);</script>`);
          }
          res.write(`</body></html>`);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default vitePluginDocsRoot;
