import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', ['VITE_', 'NEXT_PUBLIC_']);

  // Workaround for: vite:html-inline-proxy failing on production builds.
  // Disabling the plugin prevents build-time failure related to inline CSS proxying.
  // (vite v6 html inline proxy is an experimental optimization)
  const plugins = [react()];

  return {
    server: {
      host: 'localhost',
      logLevel: 'info',
      port: 3000,
      strictPort: false,
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
      cors: true,
      fs: {
        allow: ['..'],
      },
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
        'warning': path.resolve(__dirname, 'node_modules/warning/warning.js'),
      }
    },
    // Ensure React and React-DOM are pre-bundled correctly
    // Include ALL React-related packages to prevent forwardRef undefined errors
    optimizeDeps: {
      exclude: ['sql.js', 'react-pdf', 'pdfjs-dist', 'tesseract.js'],
      include: [
        'react',
        'react-dom', 
        'react/jsx-runtime', 
        'react/jsx-dev-runtime', 
        'scheduler',
        'object-assign',
        'loose-envify',
        'js-tokens',
      ],
    },
    build: {
      // Workaround for: vite:html-inline-proxy failing on production builds.
      // This flag exists in some Vite versions; if unsupported it will be ignored.
      // @ts-ignore
      htmlInlineProxy: false,

      // NOTE: Removed manual chunk splitting for React to prevent 
      // forwardRef undefined errors in production builds.
      // The manualChunks function was causing React namespace resolution issues
      // where React.forwardRef wasn't properly accessible.
      // Let Vite handle chunking naturally to ensure correct module loading.
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Only split third-party non-React libraries
            if (id.includes('node_modules') && !id.includes('node_modules/react')) {
              // Group large libraries into separate chunks
              if (id.includes('node_modules/@radix-ui')) {
                return 'radix-ui';
              }
              if (id.includes('node_modules/@supabase')) {
                return 'supabase';
              }
              if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
                return 'charts';
              }
              if (id.includes('node_modules/@tanstack')) {
                return 'table';
              }
              if (id.includes('node_modules/framer-motion')) {
                return 'motion';
              }
              if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
                return 'maps';
              }
              if (id.includes('node_modules/lucide-react')) {
                return 'icons';
              }
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
