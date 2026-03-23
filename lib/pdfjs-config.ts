/**
 * PDF.js worker configuration for Vite + react-pdf
 * Fixes "installHook.js" worker loading errors
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';

// Set worker source to public asset
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  '/pdfjs-worker/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default pdfjs;
