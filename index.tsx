// Ensure React and ReactDOM are properly loaded first
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/core/ErrorBoundary';
import './index.css';

// Configure PDF.js worker globally at application startup
// This ensures all PDF.js instances use the local worker instead of CDN
async function initializePdfJs() {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-worker/pdf.worker.min.mjs';
      console.log('PDF.js worker configured to use local file');
    }
  } catch (error) {
    console.warn('Failed to initialize PDF.js worker:', error);
  }
}

// Initialize and render
initializePdfJs().then(() => {
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
}).catch((error) => {
  console.error('Failed to initialize app:', error);
});

