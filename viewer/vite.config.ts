import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

function emitViewerHtmlPlugin(): Plugin {
  return {
    name: 'archray-emit-viewer-html',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist');
      const indexPath = resolve(distDir, 'index.html');
      const viewerPath = resolve(distDir, 'viewer.html');
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, viewerPath);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), emitViewerHtmlPlugin()],
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
