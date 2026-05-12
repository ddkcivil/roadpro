// Ensure React and ReactDOM are properly loaded first
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/core/ErrorBoundary';
import './index.css';

// Configure PDF.js worker globally at application startup BEFORE any pdfjs code runs.
// This must be synchronous to prevent the internal CDN fallback from being used.
import { GlobalWorkerOptions, version } from 'pdfjs-dist';

// Use the CDN worker because Vite dev server does not serve .mjs files
// from the public/ directory with the correct JavaScript MIME type.
// The CDN worker is served from unpkg with proper MIME types.
// For offline use, copy pdf.worker.min.mjs to public/pdfjs-worker/pdf.worker.min.js
// and change workerSrc to '/pdfjs-worker/pdf.worker.min.js'
GlobalWorkerOptions.workerSrc = `/pdfjs-worker/pdf.worker.min.js`;

console.log(`PDF.js version ${version} initialized with local worker: ${GlobalWorkerOptions.workerSrc}`);

// Initialize and render
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Create root with error boundary
const root = ReactDOM.createRoot(rootElement);
root.render(
  // NOTE: StrictMode intentionally double-invokes effects/state in dev, which causes
  // cascading re-renders with async hydration (useAsyncPersistedReducer, useProjects,
  // useMessages). Production builds strip StrictMode automatically.
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

console.log('App entry point: React root rendered.');
