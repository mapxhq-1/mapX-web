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
        secure: false,
      },
      "/geo-json-service": {
        target: "https://api.mapx.in/geo-json-service",
        changeOrigin: true,
        secure: false,
      },
      "/auth-service": {
        target: "http://localhost:8081",
        changeOrigin: true,
        secure: false,
      },
      "/embed": {
        target: "http://localhost:8061",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/embed/, ""),
      },
    },
  },
})
