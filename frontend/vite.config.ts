import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Dev proxy target. Default to localhost:4000 (the backend `npm run dev`
// port) but allow override via VITE_DEV_PROXY_TARGET so a developer running
// the backend in Docker / on a remote host doesn't have to edit this file.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:4000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    // Bundle-size hygiene: warn early when a chunk creeps up. The current
    // worst chunk (pdfGenerator) is ~420 KB so we set the warning above that
    // and stop the bleed before someone lands a 600 KB page.
    build: {
      chunkSizeWarningLimit: 500,
    },
  };
});
