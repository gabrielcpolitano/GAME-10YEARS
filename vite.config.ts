import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
  },
});