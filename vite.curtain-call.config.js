import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: { watch: { ignored: ['**/.local/**', '**/output/**', '**/dist*/**'] } },
  build: {
    outDir: 'dist-curtain-call',
    rollupOptions: { input: fileURLToPath(new URL('./curtain-call.html', import.meta.url)) },
  },
});
