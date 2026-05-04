import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './utils/errorHandler.ts';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { provider, model, messages, temperature } = req.body;

  if (provider === 'openai') {
    const apiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API Key not configured on server.' });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages,
          temperature: temperature || 0.7
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: 'Failed to connect to OpenAI', details: error.message });
    }
  }

  return res.status(400).json({ error: 'Invalid AI provider' });
};

export default withErrorHandler(handler);

