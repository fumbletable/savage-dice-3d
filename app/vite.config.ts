import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    headers: {
      // Allow Rapier WASM to use eval in dev mode
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; worker-src blob:; connect-src *;",
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        popover: resolve(__dirname, 'popover.html'),
        background: resolve(__dirname, 'background.html'),
      },
    },
  },
})
