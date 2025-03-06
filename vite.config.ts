import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import mdx from '@mdx-js/rollup';
import compression from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    mdx(),
    react(),
    tailwindcss(),
    //compression({deleteOriginalAssets: true})
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          maps: ['leaflet', 'react-leaflet'],
          libs: ['react-dropzone', 'react-use'],
          web: ['http-status', 'axios']
        }
      }
    }
  }
})
