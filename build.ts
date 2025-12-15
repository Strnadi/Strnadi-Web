import { purgePolyfills } from 'unplugin-purge-polyfills';
import Router from 'unplugin-vue-router/esbuild';
import Tailwind from 'bun-plugin-tailwind';
import Layouts from './plugins/layouts';
import Vue from './plugins/vue';

Bun.build({
  entrypoints: ['index.html'],
  compile: {
    outfile: 'app.bin'
  },
  bytecode: true,
  minify: true,
  sourcemap: true,
  publicPath: 'public',
  plugins: [
    Tailwind,
    purgePolyfills.esbuild({
      logLevel: 'verbose'
    }),
    Router({ importMode: 'sync', routeBlockLang: 'yaml' }),
    Vue(),
    Layouts()
  ]
});
