import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'api')

/**
 * Serve the api/ folder during `vite dev`.
 *
 * Vercel runs those files as serverless functions in production, but the Vite
 * dev server knows nothing about them, so /api/* used to return index.html and
 * every AI call failed with a JSON parse error.
 */
function apiRoutes() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const route = req.url.split('?')[0].slice('/api/'.length)
        if (!/^[a-z0-9-]+$/i.test(route)) return next()

        const file = path.join(apiDir, `${route}.js`)
        if (!fs.existsSync(file)) return next()

        // Cache-bust so handler edits are picked up without a restart.
        import(`${pathToFileURL(file).href}?t=${Date.now()}`)
          .then((mod) => mod.default(req, res))
          .catch((err) => {
            server.config.logger.error(`[api] ${route}: ${err.stack || err}`)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err?.message || String(err) }))
          })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiRoutes()],
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist']
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
})
