import type { Plugin, ViteDevServer } from 'vite';
import { parse, SFCDescriptor, SFCBlock } from '@vue/compiler-sfc';
import process from 'node:process';
import c from 'ansis';

export interface DocsPluginOptions {
  /**
   * The custom block type / tag to look for (default: 'docs')
   */
  rootTag?: string;
  /**
   * Whether to display the docs URL in the status (default: true)
   */
  showInStatus?: boolean;
  /**
   * Automatically open the docs page in the browser (default: false)
   */
  open?: boolean;
}

// Virtual module identifiers
const VIRTUAL_DOCS_ID = 'virtual:docs';
const VIRTUAL_DOCS_PREFIX = '\0' + VIRTUAL_DOCS_ID;
const isCI = !!process.env['CI'];

export function vitePluginDocsRoot(options: DocsPluginOptions = {}): Plugin {
  const {
    rootTag = 'docs',
    showInStatus = true,
    open = false,
  } = options;
  const docsMap = new Map<string, string>();

  // Regex matching Vue's custom block virtual module query
  const docsBlockRE = new RegExp(`(.*)\\?vue&type=${rootTag}&index=\\d+`);

  return {
    name: 'vite-plugin-docs-root',
    enforce: 'pre',
    apply: () => true,

    resolveId(id) {
      if (id === VIRTUAL_DOCS_ID) return VIRTUAL_DOCS_PREFIX;
      const m = docsBlockRE.exec(id);
      if (m) return VIRTUAL_DOCS_PREFIX + id;

      return;
    },

    load(id) {
      if (id === VIRTUAL_DOCS_PREFIX) {
        const entries = Array.from(docsMap.entries()).map(
          ([file, md]) => `${JSON.stringify(file)}: ${JSON.stringify(md)}`
        );
        return `export default { ${entries.join(', ')} };`;
      }
      if (id.startsWith(VIRTUAL_DOCS_PREFIX)) {
        const queryId = id.slice(VIRTUAL_DOCS_PREFIX.length);
        const m = docsBlockRE.exec(queryId);
        if (m) {
          const file = m[1];
          if(file) {
            return `export default ${JSON.stringify(docsMap.get(file) ?? '')};`;
          }
        }
      }
      return null;
    },

    transform(code: string, id: string) {
      const filepath = id.split('?')[0] ?? '';
      if (!filepath.endsWith('.vue')) return null;

      const { descriptor }: { descriptor: SFCDescriptor } = parse(code, { pad: 'space' });
      const block: SFCBlock | undefined = descriptor.customBlocks.find(
        b => b.type === rootTag
      );

      if (block) {
        docsMap.set(filepath, block.content.trim());
        const start = block.loc.start.offset;
        const end = block.loc.end.offset;
        const cleaned = code.slice(0, start) + code.slice(end);
        return { code: cleaned, map: null };
      }
      return null;
    },

    handleHotUpdate({ file, server }) {
      if (typeof file !== 'string') return;
      const filepath = file.split('?')[0] ?? '';
      if (!filepath.endsWith('.vue')) return;

      if (docsMap.has(filepath)) {
        const mod = server.moduleGraph.getModuleById(VIRTUAL_DOCS_PREFIX);
        if (mod) {
          server.moduleGraph.invalidateModule(mod);
          return [mod];
        }
      }

      return;
    },

    configureServer(server: ViteDevServer) {
      // Override printUrls to include __docs link
      if (showInStatus) {
        const _print = server.printUrls;
        server.printUrls = () => {
          _print();
          const base = server.config.base || '/';
          const protocol = server.config.server.https ? 'https' : 'http';
          const host = `localhost:${server.config.server.port}`;
          const docsUrl = `${protocol}://${host}${base}__docs`;
          const colorUrl = (url: string) => c.green(url.replace(/:(\d+)\//, (_, port) => `:${c.bold(port)}/`));
          server.config.logger.info(`  ${c.green('➜')}  ${c.bold('Docs')}: ${colorUrl(docsUrl)}`);
          if (open && !isCI) {
            setTimeout(() => {
              import('open').then(({ default: openBrowser }) => openBrowser(docsUrl));
            }, 500);
          }
        };
      }

      // Dev-only HTML viewer endpoint
      server.middlewares.use((req, res, next) => {
        const preprocess = (markdown: string) => markdown.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        if (req.url === '/__docs') {
          res.setHeader('Content-Type', 'text/html');
          res.write(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>`);
          res.write(`<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>`);
          for (const [file, content] of docsMap) {
            const safeId = file.replace(/[^a-zA-Z0-9]/g, '_');
            res.write(`<pre id="raw-${safeId}" style="display:none">${preprocess(content)}</pre>`);
            res.write(`<details><summary>${file}</summary><div id="${safeId}"></div></details>`);
            res.write(`
              <script>
                document.getElementById('${safeId}').innerHTML = marked.parse(
                  document.getElementById('raw-${safeId}').innerText
                );
              </script>
            `);
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
