import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_PROXY_TARGET || "http://localhost:5800",
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const moduleId = id.replace(/\\/g, '/');
            if (!moduleId.includes('/node_modules/')) return undefined;
            if (/\/node_modules\/(?:react|react-dom|react-is|scheduler)\//.test(moduleId)) return 'react-vendor';
            if (/\/node_modules\/(?:recharts|react-smooth|victory-vendor|decimal.js-light|tiny-invariant)\//.test(moduleId)) return 'charts-vendor';
            if (/\/node_modules\/(?:d3|d3-[^/]+)\//.test(moduleId)) return 'd3-vendor';
            if (moduleId.includes('/node_modules/motion/')) return 'motion-vendor';
            if (moduleId.includes('/node_modules/lucide-react/')) return 'icons-vendor';
            return undefined;
          },
        },
      },
    },
  };
});
