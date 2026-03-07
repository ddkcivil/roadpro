import { ChatMessage } from './geminiService';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey || trimmedApiKey === 'your_deepseek_api_key_here') return null;
  return trimmedApiKey;
};

export const isDeepSeekAvailable = (): boolean => {
  const apiKey = getApiKey();
  return !!apiKey;
};

export const chatWithDeepSeek = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  isFastMode: boolean = false
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Please configure your DeepSeek API Key in the environment settings.";

  try {
    const model = isFastMode ? 'deepseek-chat' : 'deepseek-reasoner'; // deepseek-reasoner is their "pro" model (DeepSeek-V3 or R1)
    
    const systemInstruction = `You are RoadMaster AI, a professional infrastructure project assistant for project: ${projectContext.name}. 
    Provide technical, precise, and actionable advice. 
    Currency: ${getCurrencySymbol(projectContext.settings?.currency)}.
    
    If the user provides an attachment, note that currently I can only process text descriptions of attachments unless the system extracts data from them first.`;

    const messages = [
      { role: 'system', content: systemInstruction },
      ...history.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      }))
    ];

    // Add current message
    let content = currentMessage;
    if (attachment) {
        content += `

[Attachment Attached: ${attachment.mimeType}. Note: AI currently processing text-based metadata for this attachment.]`;
    }
    
    messages.push({ role: 'user', content });

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (err: any) {
    console.error("DeepSeek API Error:", err);
    return `DeepSeek Connection issue: ${err.message}`;
  }
};

/**
 * Fallback for site photo analysis if Gemini is preferred for vision
 * DeepSeek is currently text-focused, so we might still use Gemini for vision 
 * or describe the photo to DeepSeek.
 */
export const analyzeSitePhotoWithDeepSeek = async (photoBase64: string, category: string): Promise<string> => {
    return "DeepSeek currently supports text-based reasoning. For vision tasks like photo analysis, please use Gemini or provide a text description of the photo.";
};
