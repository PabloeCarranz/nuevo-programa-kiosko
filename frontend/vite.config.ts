import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// El frontend llama siempre a /api en su mismo origen y Vite lo reenvia al
// backend. Asi funciona igual desde la PC del local, otra PC o un celular de
// la red, sin configurar CORS ni IPs.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8100',
    },
  },
})
