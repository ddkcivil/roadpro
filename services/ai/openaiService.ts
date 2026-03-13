import { ChatMessage } from './geminiService';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey || trimmedApiKey === 'your_openai_api_key_here') return null;
  return trimmedApiKey;
};

export const isOpenAIAvailable = (): boolean => {
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
  const apiKey = getApiKey();
  if (!apiKey) return "Please configure your OpenAI API Key in the environment settings.";

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

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (err: any) {
    console.error("OpenAI API Error:", err);
    return `OpenAI Connection issue: ${err.message}`;
  }
};
