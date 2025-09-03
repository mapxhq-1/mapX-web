import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Removed Cesium plugin as it's not used

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    proxy: {
      "/project-management-service": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
})
