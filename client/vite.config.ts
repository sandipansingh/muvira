import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Dev-only proxy: all /api/* requests are forwarded to the backend.
      // Keep VITE_API_URL empty (or unset) in dev so the client uses relative
      // URLs like "/api/..." which get proxied.
      // In production builds, set VITE_API_URL=https://api.yourdomain.com
      // (the API origin only — do not include /api).
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
