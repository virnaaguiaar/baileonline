import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite substitui o react-scripts (Create React App, descontinuado em 2025).
// `npm run dev` abre em http://localhost:5173 e recarrega a cada arquivo salvo.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, host: true },   // host: true deixa abrir pelo celular na mesma rede
  build: { outDir: 'dist' },
});
