import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/indicators': {
        target: 'http://localhost:8002',
        rewrite: (path) => path.replace(/^\/api\/indicators/, '/indicators'),
      },
      '/api/ticker': {
        target: 'http://localhost:8001',
        rewrite: (path) => path.replace(/^\/api\/ticker/, '/ticker'),
      },
    },
  },
})
