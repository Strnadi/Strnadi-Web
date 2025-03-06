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

const ReactCompilerConfig = {  };

const manualChunkMapping = {
  'maps': ['react-leaflet', '@yaga/leaflet-cached-tile-layer', 'leaflet'],
  'react-utils': ['react-dropzone', 'react-use', 'jose', 'zustand'],
  'firebase': ['@firebase'],
  'network': ['http-status', 'axios'],
  'sentry': ['@sentry'],
  'react': ['react-dom', 'react-router', 'react'],
};

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    mdx(),
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig]
        ]
      }
    }),
    tailwindcss(),
    compression(),
    nodePolyfills(),
    VitePWA({
      srcDir: 'src/services/workers',
      filename: 'notifications.ts',
      strategies: 'injectManifest'
    }),
    sentryVitePlugin({
      org: "delta-strnadi",
      project: "strnadi-web",
      telemetry: false
    }),
    visualizer({
      gzipSize: true,
      open: true,
      template: 'flamegraph'
    }),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          for (const [key, values] of Object.entries(manualChunkMapping)) {
            if (values.some(value => id.includes(value))) {
              return key;
            }
          }

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
  }
})
