import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const taskDir = '/var/task';
  const apiDir = path.join(taskDir, 'api');
  const libDir = path.join(taskDir, 'lib');
  
  const results = {
    task: fs.existsSync(taskDir) ? fs.readdirSync(taskDir) : 'not found',
    api: fs.existsSync(apiDir) ? fs.readdirSync(apiDir) : 'not found',
    lib: fs.existsSync(libDir) ? fs.readdirSync(libDir) : 'not found',
    env: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY'))
  };
  
  res.status(200).json(results);
}
