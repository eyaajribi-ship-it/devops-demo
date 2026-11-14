import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En développement, les appels /api sont envoyés vers le back-end (port 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
