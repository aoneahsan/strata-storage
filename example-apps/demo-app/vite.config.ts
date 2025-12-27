import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'www',
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.message?.includes('dynamically imported') && warning.message?.includes('statically imported')) return;
        if (warning.message?.includes('externalized for browser compatibility')) return;
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message?.includes('node_modules')) return;
        warn(warning);
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  logLevel: 'error',
  server: {
    port: 5947,
  },
});
