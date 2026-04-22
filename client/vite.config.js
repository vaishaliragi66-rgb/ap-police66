import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-dev',
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Proxy API calls to the backend during local development
      '/master-data-api': {
        target: 'http://localhost:6100',
        changeOrigin: true,
        secure: false
      },
      '/employee-api': {
        target: 'http://localhost:6100',
        changeOrigin: true,
        secure: false
      },
      '/xray-api': {
        target: 'http://localhost:6100',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
