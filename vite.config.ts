
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['VITE_', 'NEXT_PUBLIC_']); // Added NEXT_PUBLIC_ to envPrefix
  return {
    server: {
      host: 'localhost',
      logLevel: 'silent',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: process.env.VERCEL ? false : {
        overlay: true
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      cors: true
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // The following lines are redundant if NEXT_PUBLIC_ is exposed via import.meta.env
      // but kept for now to ensure consistency with existing logic if needed elsewhere.
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY)
    },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '~': path.resolve(__dirname, '.'),
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
