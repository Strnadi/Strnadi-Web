import { defineConfig } from 'vitest/config';

// Unit tests do not need the application's routing, PWA, or file-watching plugins.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { environment: 'node' }
});
