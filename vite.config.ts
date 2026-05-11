import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['VITE_', 'NEXT_PUBLIC_']);
  return {
    server: {
      host: 'localhost',
      logLevel: 'info',
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
        overlay: false
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      cors: true
    },
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
      'process.env': {},
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '~': path.resolve(__dirname, '.'),
        'lib': path.resolve(__dirname, './lib'),
        'pdfjs-dist/build/pdf.worker.min.mjs': 'pdfjs-worker/pdf.worker.min.mjs',
        'warning': path.resolve(__dirname, 'node_modules/warning/warning.js'),
      }
    },
    // Ensure React and React-DOM are pre-bundled correctly
    optimizeDeps: {
      exclude: ['sql.js', 'react-pdf', 'pdfjs-dist', 'tesseract.js'],
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
    },
    build: {
      // Ensure React is bundled as a shared vendor chunk
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      }
    },
  };
});
