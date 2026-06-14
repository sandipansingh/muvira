import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In development, proxy all /api/* requests to the backend server.
      // Set VITE_API_URL='' (empty) to use the proxy; set it to the deployed
      // backend URL in production.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
