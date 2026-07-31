import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const localBackendUrl = env.LOCAL_BACKEND_URL || 'http://localhost:3000';

  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(localBackendUrl)) {
    throw new Error('LOCAL_BACKEND_URL deve apontar para localhost ou 127.0.0.1.');
  }

  const base = command === 'serve' ? '/' : mode === 'github' ? '/prescrimed/' : '/';

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
          globals: {
            exceljs: 'ExcelJS',
          },
        },
        external: ['exceljs'],
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
          target: localBackendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: localBackendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      port: process.env.PORT || 3000,
      host: '0.0.0.0',
      strictPort: false,
    },
  };
});
