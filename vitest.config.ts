import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: null  // Deaktiviere PostCSS für Tests
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.nyc_output', 'coverage'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/types/**',
        'src/tribeX-types.ts',
        'src/ui/index.js',
        '.eslintrc.cjs',
        'vite.config.ts',
        'vitest.config.ts',
        'vitest.setup.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@core': new URL('./src/core', import.meta.url).pathname,
      '@modules': new URL('./src/modules', import.meta.url).pathname,
      '@ui': new URL('./src/ui', import.meta.url).pathname,
      '@types': new URL('./src/types', import.meta.url).pathname,
      '@utils': new URL('./src/utils', import.meta.url).pathname,
    },
  }
});