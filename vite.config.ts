/**
 * @file vite.config.ts
 * @description 발품 앱용 Vite + React + Tailwind v4 설정.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
