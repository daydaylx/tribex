import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Leere dist-Verzeichnis vor Build
    sourcemap: true, // Für Debugging
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        // Code-Splitting für bessere Ladeleistung
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'audio-engine': ['./src/core/audio-engine/AudioEngineV2.ts'],
          'sequencer': ['./src/core/sequencer/Sequencer.ts'],
          'common-modules': ['./src/modules/sampler/SampleEngine.ts', './src/modules/synthesizer/SynthEngine.ts']
        }
      }
    },
    target: 'es2020', // Unterstütze moderne JavaScript-Features
    minify: 'terser', // Fortgeschrittene Minifizierung
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@modules': resolve(__dirname, './src/modules'),
      '@ui': resolve(__dirname, './src/ui'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 3000,
    open: true, // Öffne Browser beim Start
  },
  esbuild: {
    target: 'es2020', // Stelle sicher, dass ES2020 Features unterstützt werden
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], // Optimiere Dependencies
  }
});
