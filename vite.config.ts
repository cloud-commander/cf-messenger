import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/room": {
        target: "ws://localhost:8787",
        ws: true,
        changeOrigin: true,
      },
      "/api/global-presence": {
        target: "ws://localhost:8787",
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
