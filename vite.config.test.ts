import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/utils/aiCommandProcessor.test.ts',
      formats: ['es'],
      fileName: () => 'test-bundle.js',
    },
    outDir: 'dist-test',
    emptyOutDir: true,
  },
});
