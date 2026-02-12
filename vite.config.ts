// vite.config.ts
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSourceLocator } from "@metagptx/vite-plugin-source-locator";

const viteSourceLocatorPlugin = viteSourceLocator({ prefix: "gbs" }) as unknown as PluginOption;

export default defineConfig({
  plugins: [
    viteSourceLocatorPlugin,
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    target: 'es2020',
  },
});
