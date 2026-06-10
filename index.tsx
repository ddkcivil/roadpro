// Ensure React and ReactDOM are properly loaded first
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/core/ErrorBoundary';
import './index.css';

// Configure PDF.js worker.
// Use locally served worker from the public/ directory for reliable loading
import { GlobalWorkerOptions, version } from 'pdfjs-dist';

// Serve the worker locally from /pdfjs-worker/ directory
// This avoids CDN dependency and ensures consistent MIME types
GlobalWorkerOptions.workerSrc = `/pdfjs-worker/pdf.worker.min.mjs`;

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
