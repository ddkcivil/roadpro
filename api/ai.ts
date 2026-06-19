import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withErrorHandler } from './_utils/errorHandler.js';
import { getAIResponse, AIProvider } from '../services/ai/universalAIService';

const handler = async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { provider, model, messages, temperature } = req.body;

  // Validate required fields
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Extract the latest user message
  const latestUserMessage = messages
    .filter((msg: any) => msg.role === 'user')
    .pop();

  if (!latestUserMessage || !latestUserMessage.content) {
    return res.status(400).json({ error: 'No user message found' });
  }

  try {
    // Determine provider - default to auto if not specified
    const aiProvider: AIProvider = (provider as AIProvider) || 'auto';
    
    // Call the universal AI service
    const response = await getAIResponse(
      latestUserMessage.content,
      messages, // Pass full history
      {}, // projectContext - we can enhance this later
      undefined, // attachment - we can add this later
      aiProvider,
      false // isFastMode
    );

    return res.status(200).json({
      text: response.text,
      metadata: response.metadata,
      provider: aiProvider
    });
  } catch (error: any) {
    console.error('AI service error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get AI response',
      type: error.type || 'AI_SERVICE_ERROR'
    });
  }
};

export default withErrorHandler(handler);
