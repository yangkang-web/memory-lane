import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Blender working files under .local and output renders are large; watching them exhausts the dev server heap.
  server: { watch: { ignored: ['**/.local/**', '**/output/**', '**/dist*/**'] } },
  build: {
    outDir: 'dist-bloodbound',
    rollupOptions: { input: fileURLToPath(new URL('./bloodbound.html', import.meta.url)) },
  },
});
