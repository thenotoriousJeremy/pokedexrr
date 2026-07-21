import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  // Demo build is served from https://<user>.github.io/bindarr/, so assets need
  // that sub-path prefix. Every other build (web/mobile) stays root-relative.
  base: process.env.VITE_DEMO ? '/bindarr/' : '/',
  plugins: [react(), basicSsl()],
  // Ship source maps so a minified production error (e.g. a device-only crash in
  // the Android WebView) maps back to real file:line via chrome://inspect. Repo
  // is public, so exposing sources costs nothing.
  build: {
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
