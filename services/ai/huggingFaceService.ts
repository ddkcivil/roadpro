import { ChatMessage } from './geminiService';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

// Default model if none specified in environment
const DEFAULT_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey || trimmedApiKey === 'your_huggingface_api_key_here') return null;
  return trimmedApiKey;
};

const getModelId = () => {
  return import.meta.env.VITE_HUGGINGFACE_MODEL_ID || DEFAULT_MODEL;
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
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Please configure your Hugging Face API Key in the environment settings.";

  const modelId = getModelId();
  const API_URL = `https://api-inference.huggingface.co/models/${encodeURIComponent(modelId)}`;

  try {
    const systemInstruction = `You are RoadMaster AI, a professional infrastructure project assistant for project: ${projectContext.name}. 
    Provide technical, precise, and actionable advice. 
    Currency: ${getCurrencySymbol(projectContext.settings?.currency)}.
    
    If the user provides an attachment, note that currently I can only process text descriptions of attachments via the Hugging Face Inference API unless using a multimodal model.`;

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
        currentText += `\n\n[Attachment Attached: ${attachment.mimeType}. Note: Hugging Face Inference API is currently processing text-based context.]`;
    }
    
    prompt += `<s>[INST] ${currentText} [/INST]`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-use-cache': 'false' // Helpful for avoiding stale responses or specific proxy issues
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          return_full_text: false,
          temperature: 0.7,
          top_p: 0.95,
          wait_for_model: true // Tell Hugging Face to wait if the model is still loading
        },
        options: {
          wait_for_model: true, // Some models expect it in options
          use_cache: false
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const result = await response.json();
    
    // Result can be an array or an object depending on the model/API state
    if (Array.isArray(result) && result[0]?.generated_text) {
      return result[0].generated_text.trim();
    } else if (result.generated_text) {
      return result.generated_text.trim();
    } else if (typeof result === 'string') {
        return result.trim();
    }

    return "Received an unexpected response format from Hugging Face.";

  } catch (err: any) {
    console.error("Hugging Face API Error:", err);
    if (err.message?.includes('currently loading')) {
        return "The Hugging Face model is currently being loaded into memory. Please try again in about 30 seconds.";
    }
    return `Hugging Face Connection issue: ${err.message}`;
  }
};
