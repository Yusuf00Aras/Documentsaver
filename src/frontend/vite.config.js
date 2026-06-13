import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


const BACKEND_PORT = process.env.PORT || 3000
const BACKEND_TARGET = `http://127.0.0.1:${BACKEND_PORT}`

export default defineConfig({
  root: 'src/frontend',
  plugins: [vue()],
  build: {
    outDir: '../../dist'
  },
  server: {
    proxy: {
      '^/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      },
      '^/storage': {
        target: BACKEND_TARGET,
        changeOrigin: true,
      }
    }
  }
})