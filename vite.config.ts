import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Servidor do próprio app (renderer). O servidor de preview dos projetos do
// usuário (Etapa 3) será uma instância separada de Vite, em outra porta.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist-renderer', emptyOutDir: true },
})
