const fs = require('fs');
const path = require('path');

// Patch: disable html-inline-proxy by turning it into a no-op plugin.
// This script is meant for debugging. It modifies vite's internal plugin registry at runtime.
// Not executed by default.

console.log('[patch-vite-inline-proxy] Debug patch stub.');

