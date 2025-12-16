import { purgePolyfills } from 'unplugin-purge-polyfills';
import Router from 'unplugin-vue-router/esbuild';
// import Tailwind from 'bun-plugin-tailwind';
import Layouts from './plugins/layouts';
import Vue from './plugins/vue';
import Tailwind from './plugins/tailwind';
import Assets from './plugins/assets';
import SVGLoader from './plugins/svg-loader';

await Bun.build({
  entrypoints: ['index.html'],
  outdir: 'dist',
  env: "inline",
  // compile: {
  //   outfile: 'app.bin'
  // },
  // bytecode: true,
  // minify: true,
  sourcemap: "linked",
  // sourcemap: false,
  // publicPath: 'public',
  plugins: [
    Assets(),
    Tailwind({ optimize: true }),
    purgePolyfills.esbuild({ logLevel: 'verbose' }),
    Router({ importMode: 'async', routeBlockLang: 'yaml' }),
    Vue({ isProduction: process.env.NODE_ENV === 'production' }),
    Layouts({
      importMode: 'async',
      target: 'src/layouts',
      defaultLayout: 'default',
      skipTopLevelRouteLayout: false
    }),
    // SVGLoader()
  ]
});
