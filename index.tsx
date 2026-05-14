// Ensure React and ReactDOM are properly loaded first
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/core/ErrorBoundary';
import './index.css';

// Configure PDF.js worker.
// Use CDN worker for reliable loading - avoids MIME type issues with local files
import { GlobalWorkerOptions, version } from 'pdfjs-dist';

// Use the reliable CDN version to prevent MIME type errors
// The CDN worker is served from unpkg with proper MIME types
GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

console.log(`PDF.js version ${version} initialized with CDN worker: ${GlobalWorkerOptions.workerSrc}`);

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
