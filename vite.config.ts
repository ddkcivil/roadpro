
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: 'localhost',
      port: 3003,
      strictPort: false,
      hmr: {
        overlay: true,
        protocol: 'ws',
        path: '/__vite_hmr',
        timeout: 30000,
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      cors: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '~': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        'pdfjs-dist/build/pdf.worker.min.mjs': 'pdfjs-worker/pdf.worker.min.mjs',
      }
    },
    optimizeDeps: {
      exclude: [
        'sql.js',
        'pdfjs-dist',
        'react-pdf'
      ]
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      }
    },
  };
});
