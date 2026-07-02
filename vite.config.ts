import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During `vercel dev`, the Vercel CLI runs the serverless functions in /api
// and proxies the frontend. During plain `vite dev` you can point the proxy at
// a local functions server if needed. The app fetches /api/* relatively.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  define: {
    // react-rnd's dependency chain (re-resizable) reads process.env.NODE_ENV directly.
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
  },
})
