const fs = require('fs');
const path = require('path');

const viteChunk = path.join(
  __dirname,
  'node_modules',
  'vite',
  'dist',
  'node',
  'chunks',
  'dep-Dq2t6Dq0.js'
);

if (!fs.existsSync(viteChunk)) {
  console.error('[patch] vite chunk not found:', viteChunk);
  process.exit(1);
}

let code = fs.readFileSync(viteChunk, 'utf8');

// Replace the plugin export name from vite:html-inline-proxy to a no-op name
// so Vite's internal loading step that uses this exact id won't execute.
// The build error originates from that plugin being invoked.
const before = 'name: "vite:html-inline-proxy"';
const after = 'name: "vite:html-inline-proxy__disabled__"';

if (!code.includes(before)) {
  console.log('[patch] target string not found; no change made');
  process.exit(0);
}

code = code.replace(before, after);

// Also patch the resolveId marker used in the build pipeline.
// The failing URL contains `?html-proxy&inline-css...`. We tweak the marker so
// Vite will not be able to match it to the expected proxy module.
code = code.replace(/html-proxy&inline-css/g, 'html-proxy__disabled__&inline-css');

fs.writeFileSync(viteChunk, code, 'utf8');
console.log('[patch] updated:', viteChunk);


