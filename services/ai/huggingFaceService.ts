import { ChatMessage } from './geminiService';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

// Default model if none specified in environment
const DEFAULT_TEXT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
const DEFAULT_VISION_MODEL = 'llava-hf/llava-1.5-7b-hf'; // Good for vision tasks

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey || trimmedApiKey === 'your_huggingface_api_key_here') return null;
  return trimmedApiKey;
};

const getModelId = (hasAttachment: boolean) => {
  if (hasAttachment) {
    return import.meta.env.VITE_HUGGINGFACE_VISION_MODEL_ID || DEFAULT_VISION_MODEL;
  }
  return import.meta.env.VITE_HUGGINGFACE_MODEL_ID || DEFAULT_TEXT_MODEL;
};

export const isHuggingFaceAvailable = (): boolean => {
  const apiKey = getApiKey();
  return !!apiKey;
};

export const chatWithHuggingFace = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  isFastMode: boolean = false
): Promise<{ text: string; metadata?: ChatMessage['metadata'] }> => {
  const apiKey = getApiKey();
  if (!apiKey) return { text: "Please configure your Hugging Face API Key in the environment settings." };

  const modelId = getModelId(!!attachment);
  const API_URL = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;

  try {
    const startTime = Date.now();
    const systemInstruction = `You are RoadMaster AI, a professional infrastructure project assistant for project: ${projectContext.name}. 
    Provide technical, precise, and actionable advice. 
    Currency: ${getCurrencySymbol(projectContext.settings?.currency)}.`;

    let payload: any;

    if (attachment && attachment.mimeType.startsWith('image/')) {
        // For vision models, many expect a specific format or just the image + prompt
        // Note: Different HF models might expect different payload formats. 
        // LLaVA style models often use the 'inputs' with image and text
        payload = {
            inputs: {
                image: attachment.data, // Should be base64
                question: `${systemInstruction}\n\nUser Question: ${currentMessage}`
            },
            parameters: {
                max_new_tokens: 1024,
                temperature: 0.7
            }
        };
    } else {
        // Construct prompt for Mistral/Llama style instruct models
        let prompt = `<s>[INST] ${systemInstruction} [/INST]</s>`;
        
        history.forEach(msg => {
          if (msg.role === 'user') {
            prompt += `<s>[INST] ${msg.text} [/INST]`;
          } else {
            prompt += ` ${msg.text} </s>`;
          }
        });

        // Add current message
        let currentText = currentMessage;
        if (attachment) {
            currentText += `\n\n[Attachment Attached: ${attachment.mimeType}. Note: Processing as text metadata.]`;
        }
        
        prompt += `<s>[INST] ${currentText} [/INST]`;
        
        payload = {
            inputs: prompt,
            parameters: {
              max_new_tokens: 1024,
              return_full_text: false,
              temperature: 0.7,
              top_p: 0.95,
              wait_for_model: true
            }
        };
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const result = await response.json();
    const endTime = Date.now();
    let text = "";

    // Result parsing depends on model type
    if (Array.isArray(result)) {
        text = result[0]?.generated_text || result[0]?.answer || JSON.stringify(result);
    } else {
        text = result.generated_text || result.answer || JSON.stringify(result);
    }

    // Clean up text (remove prompt if returned)
    if (text.includes('[/INST]')) {
        text = text.split('[/INST]').pop()?.trim() || text;
    }

    return {
        text: text,
        metadata: {
            timestamp: endTime,
            model: modelId,
            processingTime: endTime - startTime,
            provider: 'huggingface'
        }
    };

  } catch (err: any) {
    console.error("Hugging Face API Error:", err);
    if (err.message?.includes('currently loading')) {
        return { text: "The Hugging Face model is currently being loaded into memory. Please try again in about 30 seconds." };
    }
    return { text: `Hugging Face Connection issue: ${err.message}` };
  }
};
