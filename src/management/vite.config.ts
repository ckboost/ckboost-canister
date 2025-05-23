import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite';
import dotenv from "dotenv";
import environment from "vite-plugin-environment";

dotenv.config({ path: "../../.env" });

// https://vite.dev/config/
export default defineConfig({
  root: 'src/management',
  build: {
    outDir: 'dist'
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
    port: 3001
  },
  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    tailwindcss()
  ],
});



