/**
 * Local dev server for API functions (port 3001).
 * Wraps Vercel serverless handlers as Express routes.
 * Run with: npx tsx api/server.mjs
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Load env from api/.env first, then api/.env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manually load API .env vars into process.env
function loadDotEnv(filePath) {
  console.log(`[API Server] Current __dirname: ${__dirname}`); // Log current directory
  console.log(`[API Server] Attempting to load .env from: ${filePath}`); // Add logging
  if (!fs.existsSync(filePath)) {
    console.log(`[API Server] .env file not found at: ${filePath}`); // Add logging
    return;
  }
  console.log(`[API Server] Loading .env file from: ${filePath}`); // Add logging
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // ALWAYS set/overwrite to ensure local dev values take precedence
    process.env[key] = val;
    console.log(`[API Server] Set env var: ${key}`); // Log setting env var
  });
}

// Load root .env first to ensure it's picked up reliably
loadDotEnv(path.join(__dirname, '..', '.env')); 
// Then load API-Bspecific ones, potentially overwriting root ones if needed
loadDotEnv(path.join(__dirname, '.env'));
loadDotEnv(path.join(__dirname, '.env.local'));

// Helper: convert a Vercel handler to Express middleware
function vercelToExpress(handlerModule) {
  const handler = handlerModule.default || handlerModule;
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('[API Server] Unhandled error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
      }
    }
  };
}

// Dynamically import and register all API route files (using .ts directly)
const apiFiles = [
  { path: './messages.ts', route: '/api/messages' },
  { path: './users.ts', route: '/api/users' },
  { path: './audit.ts', route: '/api/audit' },
  { path: './projects.ts', route: '/api/projects' },
  { path: './registrations.ts', route: '/api/registrations' },
  { path: './roads.ts', route: '/api/roads' },
  { path: './health.ts', route: '/api/health' },
  { path: './files.ts', route: '/api/files' },
  { path: './ai.ts', route: '/api/ai' },
];

async function registerRoutes() {
  console.log('Registering routes...');
  for (const { path: filePath, route } of apiFiles) {
    const absPath = path.join(__dirname, filePath);
    
    if (fs.existsSync(absPath)) {
      try {
        // When running via npx tsx, import() handles .ts files correctly with file:// URLs
        const mod = await import(pathToFileURL(absPath).href);
        const handler = mod.default || mod;
        app.all(route, vercelToExpress({ default: handler }));
        console.log(`  ✓ Registered ${route} from ${filePath}`);
      } catch (e) {
        console.error(`  ✗ Failed to load ${route} (${filePath}):`, e);
      }
    } else {
      console.warn(`  ⚠ Skipped ${route} (File not found: ${filePath})`);
    }
  }
}

// Also register staff sub-routes
async function registerStaffRoutes() {
  const staffDir = path.join(__dirname, 'staff');
  if (!fs.existsSync(staffDir)) return;
  const files = fs.readdirSync(staffDir).filter(f => f.endsWith('.ts'));
  for (const file of files) {
    const name = file.replace('.ts', '');
    const route = `/api/staff/${name}`;
    const absPath = path.join(staffDir, file);
    try {
      const mod = await import(pathToFileURL(absPath).href);
      const handler = mod.default || mod;
      app.all(route, vercelToExpress({ default: handler }));
      console.log(`  ✓ Registered ${route} from staff/${file}`);
    } catch (e) {
      console.error(`  ✗ Failed to load ${route} (staff/${file}):`, e);
    }
  }
}

registerRoutes().then(() => registerStaffRoutes()).then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
🚀 API dev server (TS) running at http://localhost:${PORT}/api
`);
  });
}).catch(err => {
  console.error('Failed to start API server:', err);
});
