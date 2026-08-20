import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'  // Vite's official React plugin
import tailwindcss from "@tailwindcss/vite";   // Tailwind v4's Vite plugin
import path from "path";
// see tutorial on https://tailwindcss.com/docs/installation/using-vite


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
})
