// Ensure React and ReactDOM are properly loaded first
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './App';
import ErrorBoundary from './components/core/ErrorBoundary';
import './index.css';

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

