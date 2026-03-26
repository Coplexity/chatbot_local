import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const envDir = "./env";
  const env = loadEnv(mode, envDir);
  const backendUrl = env.VITE_BACKEND_URL;

  if (!backendUrl) {
    throw new Error("Missing VITE_BACKEND_URL in frontend env configuration");
  }

  return {
    plugins: [
      react(),
      tsconfigPaths(), 
      tailwindcss(),
      svgr(),
    ],
    envDir,
    server: {
      port: Number(env.VITE_APP_PORT) || 5173,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts",
    },
  };
});
