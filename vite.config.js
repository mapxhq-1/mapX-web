import { defineConfig,loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// Removed Cesium plugin as it's not used

// https://vite.dev/config/

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/embed": {
          target: "http://localhost:8061",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/embed/, ""),
        },
      },
    },
  }
})