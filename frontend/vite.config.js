import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/bouquets': 'http://localhost:8000',
      '/flowers': 'http://localhost:8000',
      '/hero': 'http://localhost:8000',
    },
  },
})
