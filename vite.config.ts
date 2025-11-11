import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 👇 ensures assets load relative to the repo sub-path on GitHub Pages
  base: "./",
  plugins: [react()],
  build: { outDir: "dist" }
});
