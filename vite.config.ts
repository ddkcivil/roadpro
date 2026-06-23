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
      // Add fallbacks for backend compatibility (SUPABASE_URL → VITE_SUPABASE_URL)
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY),
      'process.env': {},
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '~': path.resolve(__dirname, '.'),
        'lib': path.resolve(__dirname, './lib'),
        'warning': path.resolve(__dirname, 'node_modules/warning/warning.js'),
        // CRITICAL: Force React to resolve to the same instance to prevent useRef undefined errors
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        'react-dom/client': path.resolve(__dirname, 'node_modules/react-dom/client'),
      }
    },
    // Ensure React and React-DOM are pre-bundled correctly
    // Include ALL React-related packages to prevent forwardRef undefined errors
    // CRITICAL: Include recharts and its dependencies to prevent forwardRef errors
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
        // Include recharts and its D3 dependencies to prevent forwardRef undefined errors
        'recharts',
        'd3-array',
        'd3-color',
        'd3-scale',
        'd3-shape',
        'd3-time',
        'd3-time-format',
      ],
    },
build: {
      chunkSizeWarningLimit: 1000,
      // Performance: Manual chunking for better caching and parallel loading
      rollupOptions: {
        output: {
          manualChunks: {
            // React core - loaded first
            'react-vendor': ['react', 'react-dom'],
            // Data visualization - heavy, loaded on demand
            'charts': ['recharts', 'd3-array', 'd3-color', 'd3-scale', 'd3-shape', 'd3-time', 'd3-time-format'],
            // Maps and GIS - heaviest, only when needed
            'gis': ['leaflet', 'react-leaflet', '@turf/turf'],
            // PDF handling - lazy load only when needed
            'pdf': ['pdfjs-dist', 'react-pdf'],
            // OCR - lazy load only when needed
            'ocr': ['tesseract.js'],
            // UI components - shared across modules
            'ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              'sonner',
              'framer-motion'
            ],
            // Supabase - loaded separately
            'supabase': ['@supabase/supabase-js'],
            // Utilities
            'utils': ['date-fns', 'uuid', 'crypto-js', 'xlsx', 'xml2js', 'jspdf']
          }
        }
      },
// Performance: Generate sourcemaps only in dev
      sourcemap: process.env.NODE_ENV === 'development',
      // Performance: Use esbuild for minification (default, no extra install needed)
      minify: 'esbuild',
      // Skip manual terser - using esbuild instead for better compatibility
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
      }
    },
  };
});
