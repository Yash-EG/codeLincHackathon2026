import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Spring Boot backend (Bedrock calls, Neon queries) — see README.
    proxy: { '/api': 'http://localhost:8080' },
  },
})
