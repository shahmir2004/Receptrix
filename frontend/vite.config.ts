import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/stats': 'http://localhost:8000',
      '/appointments': 'http://localhost:8000',
      '/calls': 'http://localhost:8000',
      '/chat': 'http://localhost:8000',
      '/business': 'http://localhost:8000',
      '/services': 'http://localhost:8000',
      '/voice': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/book': 'http://localhost:8000',
      '/config': 'http://localhost:8000',
    },
  },
})
