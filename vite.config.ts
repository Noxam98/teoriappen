import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`        → dist/        (обычная сборка для хостинга)
// `npm run build:single` → dist-single/ (один HTML-файл, открывается двойным щелчком без интернета)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  // the question bank and dictionary (~450 KB of JSON) are bundled on purpose, so the app works offline
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', emptyOutDir: true, chunkSizeWarningLimit: 1200 },
}));
