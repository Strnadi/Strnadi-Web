import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { visualizer } from 'rollup-plugin-visualizer';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import mdx from '@mdx-js/rollup';
import compression from 'vite-plugin-compression2';
import MillionLint from "@million/lint";
import unplugin from "@beqa/unplugin-transform-react-slots";


const ReactCompilerConfig = {
  noEmit: process.env.MODE !== 'production'
};

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    unplugin.vite(), // Slots
    tailwindcss(),
    nodePolyfills(),
    mdx(),
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig]
        ]
      }
    }),
    VitePWA({
      srcDir: 'src/services',
      filename: 'worker.ts',
      strategies: 'injectManifest',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10*1024*1024
      }
    }),
    sentryVitePlugin({
      org: "delta-strnadi",
      project: "strnadi-web",
      telemetry: false
    }),
    compression(),
    visualizer({
      gzipSize: true,
      open: true,
      template: 'flamegraph'
    }),
    // MillionLint.vite() // Million.JS doesn't fully support React 19
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // if (id.includes('react')) {
          //   return 'react';
          // }

          if (id.includes('node_modules') || id.includes('src/vendor/')) {
            return 'vendor';
          }
        }
      },
    },

    sourcemap: true
  },

  resolve: {
    alias: [
      {
        find: /leaflet\/dist\/leaflet-src\.js(\?commonjs-es-import)?$/,
        replacement: 'leaflet/dist/leaflet.js'
      },
      {
        find: /^leaflet$/,
        replacement: 'leaflet/dist/leaflet.js'
      }
    ],

    dedupe: ['bn.js']
  },

  dev: {
    sourcemap: true
  },

  server: {
    headers: {
      "content-security-policy": "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;"
    }
  }
})
