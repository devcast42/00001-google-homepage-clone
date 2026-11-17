import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { conditions: ['source'] },
  server: {
    port: 5173,
    // En desarrollo la API corre aparte (npm run dev la arranca a la vez).
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: { sourcemap: true },
});
