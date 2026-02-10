import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: 'localhost',
      port: 3000,
      strictPort: false,
      hmr: {
        overlay: true,
        host: 'localhost',
        protocol: 'ws',
        port: 3000,
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
          target: 'http://localhost:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
        '@emotion/react': path.resolve(__dirname, './node_modules/@emotion/react'),
        '@emotion/styled': path.resolve(__dirname, './node_modules/@emotion/styled'),
      }
    },
    // optimizeDeps: {
    //   exclude: [
    //     'sql.js',
    //     'pdfjs-dist',
    //     'react-pdf'
    //   ],
    //   include: []
    // },
    css: {
      modules: {
        localsConvention: 'camelCase',
      }
    },
    // assetsInclude: [/\.css$/, /\.scss$/, /\.sass$/, /\.less$/],
  };
});
