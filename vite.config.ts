import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appsScriptUrl = env.APPS_SCRIPT_URL
  const appsScriptToken = env.APPS_SCRIPT_TOKEN

  return {
    plugins: [react()],
    server: {
      middlewareMode: false,
      proxy: {
        '/api/sheet': {
          target: appsScriptUrl || 'https://script.google.com/macros/s/DUMMY/exec',
          changeOrigin: true,
          rewrite: () => '',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Add token to query string
              const originalUrl = req.url || ''
              const separator = originalUrl.includes('?') ? '&' : '?'
              proxyReq.path = `${originalUrl}${separator}token=${encodeURIComponent(appsScriptToken || '')}`

              // Ensure POST requests use text/plain content type
              if (req.method === 'POST') {
                proxyReq.setHeader('Content-Type', 'text/plain;charset=utf-8')
              }
            })
          },
        },
      },
    },
  }
})
