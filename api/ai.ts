import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './utils/errorHandler.js';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { provider, model, messages, temperature } = req.body;

  // Additional providers can be added here (e.g., huggingface, gemini)

  return res.status(400).json({ error: 'Invalid or unsupported AI provider' });
};

export default withErrorHandler(handler);
