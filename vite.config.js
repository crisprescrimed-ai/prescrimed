import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // Controla a base via variável de ambiente ou pelo modo de build
  const envBase = process.env.VITE_BASE;
  let base;
  if (command === 'serve') {
    base = '/';
  } else if (envBase) {
    base = envBase;
  } else if (mode === 'railway') {
    base = '/';
  } else if (mode === 'github') {
    base = '/prescrimed/';
  } else {
    base = './';
  }

  // Proxy para desenvolvimento: permite usar VITE_API_URL=/api e/ou health check na mesma origem
  // (sem depender de CORS), mantendo o backend local como target.
  const devProxyTarget = (env.VITE_BACKEND_ROOT && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.VITE_BACKEND_ROOT))
    ? env.VITE_BACKEND_ROOT
    : 'http://localhost:8000';

  return {
    plugins: [react()],
    base,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', 'react-hot-toast'],
          },
          // Externalize exceljs to rely on CDN in production builds to reduce bundle size
          globals: {
            exceljs: 'ExcelJS'
          }
        },
        // Mark exceljs as external so it's not bundled into the large chunk
        external: ['exceljs']
      },
      chunkSizeWarningLimit: 1000,
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        },
        '/health': {
          target: devProxyTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path
        },
      },
    },
    preview: {
      port: process.env.PORT || 3000,
      host: '0.0.0.0',
      strictPort: false,
    }
  };
});