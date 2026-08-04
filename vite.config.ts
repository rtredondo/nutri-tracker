import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appsScriptUrl = env.APPS_SCRIPT_URL
  const appsScriptToken = env.APPS_SCRIPT_TOKEN

  // Parse Apps Script URL to extract origin and pathname
  let scriptOrigin = 'https://script.google.com'
  let scriptPathname = '/macros/s/DUMMY/exec'

  if (appsScriptUrl) {
    try {
      const url = new URL(appsScriptUrl)
      scriptOrigin = url.origin
      scriptPathname = url.pathname
    } catch (e) {
      console.warn('Invalid APPS_SCRIPT_URL:', e)
    }
  }

  return {
    plugins: [react()],
    server: {
      middlewareMode: false,
      proxy: {
        '/api/sheet': {
          target: scriptOrigin,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Build path: Apps Script pathname + original query string + token
              const queryString = req.url?.split('?')[1] || ''
              const separator = queryString ? '&' : '?'
              proxyReq.path = `${scriptPathname}${queryString ? `?${queryString}` : ''}${separator}token=${encodeURIComponent(appsScriptToken || '')}`

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
