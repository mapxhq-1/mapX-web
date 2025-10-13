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
        "/project-management-service": {
          target: env.VITE_URL_PROJECT,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('origin', 'https://app.mapx.in');
            proxyReq.setHeader('referer', 'https://app.mapx.in/');
          });
        }
        },
        "/geo-json-service": {
          target: env.VITE_URL_GEO,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('origin', 'https://app.mapx.in');
            proxyReq.setHeader('referer', 'https://app.mapx.in/');
          });
        }
        },
        "/auth-service": {
          target: env.VITE_URL_AUTH,
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('origin', 'https://app.mapx.in');
            proxyReq.setHeader('referer', 'https://app.mapx.in/');
          });
        }
        },
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