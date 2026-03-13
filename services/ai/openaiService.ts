import { ChatMessage } from './geminiService';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const AI_PROXY_URL = '/api/ai';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey || trimmedApiKey === 'your_openai_api_key_here') return null;
  return trimmedApiKey;
};

export const isOpenAIAvailable = (): boolean => {
  // On client side, we check if key exists (it will be passed to proxy if needed, 
  // but better to have it in Vercel env vars directly)
  const apiKey = getApiKey();
  return !!apiKey;
};

export const chatWithOpenAI = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  isFastMode: boolean = false
): Promise<string> => {
  try {
    const model = isFastMode ? 'gpt-4o-mini' : 'gpt-4o';
    
    const systemInstruction = `You are RoadMaster AI, a professional infrastructure project assistant for project: ${projectContext.name}. 
    Provide technical, precise, and actionable advice. 
    Currency: ${getCurrencySymbol(projectContext.settings?.currency)}.
    
    If the user provides an attachment, it will be provided as a base64 encoded image if it's an image.`;

    const messages: any[] = [
      { role: 'system', content: systemInstruction }
    ];

    // Add history
    history.forEach(msg => {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      });
    });

    // Add current message with potential attachment
    if (attachment && attachment.mimeType.startsWith('image/')) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: currentMessage || "Analyze this image." },
          {
            type: 'image_url',
            image_url: {
              url: `data:${attachment.mimeType};base64,${attachment.data}`
            }
          }
        ]
      });
    } else {
      let content = currentMessage;
      if (attachment) {
        content += `\n\n[Attachment Attached: ${attachment.mimeType}. Note: GPT-4o currently processing text-based context for non-image files.]`;
      }
      messages.push({ role: 'user', content });
    }

    const response = await fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'openai',
        model: model,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.error || `Proxy Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (err: any) {
    console.error("AI Proxy Error:", err);
    return `AI Service Error: ${err.message}`;
  }
};
