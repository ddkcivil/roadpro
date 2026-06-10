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
      // Workaround for: vite:html-inline-proxy failing on production builds.
      // This flag exists in some Vite versions; if unsupported it will be ignored.
      // @ts-ignore
      htmlInlineProxy: false,

      // FIX: Completely disable manual chunk splitting to prevent forwardRef errors
      // The previous manualChunks function was causing React namespace resolution issues
      // where React.forwardRef wasn't properly accessible in separate chunks.
      // Let Vite handle all chunking naturally to ensure correct module loading.
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'recharts'],
          },
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
