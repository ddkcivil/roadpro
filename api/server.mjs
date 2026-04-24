/**
 * Local dev server for API functions (port 3001).
 * Wraps Vercel serverless handlers as Express routes.
 * Run with: node api/server.mjs
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

// Load env from api/.env first, then api/.env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Manually load api/.env vars into process.env
function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
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
  });
}

loadDotEnv(path.join(__dirname, '.env'));
loadDotEnv(path.join(__dirname, '.env.local'));
// Also load root .env for fallback
loadDotEnv(path.join(__dirname, '..', '.env'));

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/debug-env', (req, res) => {
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY_START: process.env.SUPABASE_ANON_KEY?.substring(0, 10),
    NEXT_PUBLIC_SUPABASE_ANON_KEY_START: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10),
    NODE_ENV: process.env.NODE_ENV
  };
  res.json(env);
});

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

// Dynamically import and register all API route files
const apiFiles = [
  { path: './messages.js', route: '/api/messages' },
  { path: './users.js', route: '/api/users' },
  { path: './audit.js', route: '/api/audit' },
  { path: './projects.js', route: '/api/projects' },
  { path: './registrations.js', route: '/api/registrations' },
  { path: './roads.js', route: '/api/roads' },
  { path: './health.js', route: '/api/health' },
  { path: './files.js', route: '/api/files' },
  { path: './ai.js', route: '/api/ai' },
];

async function registerRoutes() {
  for (const { path: filePath, route } of apiFiles) {
    const absPath = path.join(__dirname, filePath);
    // Try .js first (compiled), fallback to .ts via tsx
    if (fs.existsSync(absPath)) {
      try {
        const mod = await import(pathToFileURL(absPath).href);
        const handler = mod.default || mod;
        app.all(route, vercelToExpress({ default: handler }));
        console.log(`  ✓ Registered ${route}`);
      } catch (e) {
        console.warn(`  ✗ Failed to load ${route}: ${e.message}`);
      }
    } else {
      console.warn(`  ⚠ Skipped ${route} (${absPath} not found)`);
    }
  }
}

// Also register staff sub-routes
async function registerStaffRoutes() {
  const staffDir = path.join(__dirname, 'staff');
  if (!fs.existsSync(staffDir)) return;
  const files = fs.readdirSync(staffDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const name = file.replace('.js', '');
    const route = `/api/staff/${name}`;
    const absPath = path.join(staffDir, file);
    try {
      const mod = await import(pathToFileURL(absPath).href);
      const handler = mod.default || mod;
      app.all(route, vercelToExpress({ default: handler }));
      console.log(`  ✓ Registered ${route}`);
    } catch (e) {
      console.warn(`  ✗ Failed to load ${route}: ${e.message}`);
    }
  }
}

registerRoutes().then(() => registerStaffRoutes()).then(() => {
  const PORT = process.env.API_PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n🚀 API dev server running at http://localhost:${PORT}/api\n`);
  });
});
