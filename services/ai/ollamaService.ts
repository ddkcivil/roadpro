import { BOQItem, RFI, ScheduleTask } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

const getOllamaClient = () => {
  // We don't need a client object, just the base URL
  return OLLAMA_HOST;
};

export const isOllamaServiceAvailable = (): boolean => {
  // We can't synchronously check if Ollama is running without making a request.
  // For now, we'll assume it's available if the host is set.
  // In practice, the functions that call Ollama will handle errors.
  return !!OLLAMA_HOST;
};

async function runWithFallback(task: (model: string) => Promise<any>): Promise<any> {
  const models = [
    // We can make this configurable via env or take from request
    'deepseek-r1:32b',
    'qwen2.5-coder:7b',
    'codellama:latest',
    'nemotron-3-super:cloud'
  ];

  let lastError: any = null;

  for (const modelName of models) {
    try {
      return await task(modelName);
    } catch (error: any) {
      lastError = error;
      console.warn(`Ollama model ${modelName} failed:`, error.message);
      // Continue to next model
    }
  }

  // If we reach here, all models failed
  console.error("All Ollama models failed:", lastError);
  const finalError = new Error("Ollama service is currently unavailable. Please try again later.");
  (finalError as any).originalError = lastError;
  throw finalError;
}

export const chatWithOllama = async (
  currentMessage: string,
  history: any[], // We'll define ChatMessage type later if needed, but for now use any
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  isFastMode: boolean = false
): Promise<{ text: string; metadata?: any }> => {
  if (!isOllamaServiceAvailable()) {
    return { text: "Ollama Service Unavailable." };
  }

  const startTime = Date.now();

  return runWithFallback(async (modelName) => {
    const ollamaHost = getOllamaClient();

    // Build the messages array for Ollama chat API
    const messages = [];

    // Add system instruction
    const systemInstruction = `You are RoadMaster AI for project: ${projectContext.name}. Provide technical advice. Currency: ${getCurrencySymbol(projectContext.settings?.currency)}`;
    messages.push({
      role: 'system',
      content: systemInstruction
    });

    // Add history
    history.forEach((msg: any) => {
      // Assuming msg has role and content
      messages.push({
        role: msg.role,
        content: msg.text
      });
      // Note: Ollama chat API doesn't natively support attachments in the same way.
      // We'll handle attachments in the user message below.
    });

    // Add current message with optional attachment
    const currentParts: any = { role: 'user', content: currentMessage };
    if (attachment) {
      // For vision models, we can pass images in the content as base64
      // Ollama expects images as base64 string in the message content for certain models
      // We'll append the image data as a base64 string with a prefix? Actually, Ollama's API expects:
      //   {
      //     "model": "llava",
      //     "messages": [
      //       {
      //         "role": "user",
      //         "content": "Describe this image:",
      //         "images": ["base64_image_data"]
      //       }
      //     ]
      //   }
      // But we are using the chat endpoint. Let's check the Ollama API documentation.
      // Since we are not sure which model we are using, we'll adopt a format that works for vision models:
      // We'll add an "images" array if attachment is present.
      // However, note that not all models support images. We'll let the model fail if it doesn't support images.
      currentParts.images = [attachment.data.replace(/^data:image\/\w+;base64,/, "")];
    }
    messages.push(currentParts);

    // Prepare the request body
    const requestBody = {
      model: modelName,
      messages: messages,
      stream: false
    };

    const response = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const endTime = Date.now();

    return {
      text: data.message.content,
      metadata: {
        timestamp: endTime,
        model: modelName,
        processingTime: endTime - startTime,
        provider: 'ollama'
      }
    };
  });
};

export const analyzeSitePhotoOllama = async (
  photoBase64: string,
  category: string
): Promise<{ text: string; metadata?: any }> => {
  if (!isOllamaServiceAvailable()) {
    return { text: "Ollama Service Unavailable." };
  }

  const startTime = Date.now();

  return runWithFallback(async (modelName) => {
    const ollamaHost = getOllamaClient();

    // For image analysis, we use the chat endpoint with an image
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: `Analyze this site photo from a road project. Category: "${category}". Identify progress and safety issues.`,
          images: [photoBase64.replace(/^data:image\/\w+;base64,/, "")]
        }
      ],
      stream: false
    };

    const response = await fetch(`${ollamaHost}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const endTime = Date.now();

    return {
      text: data.message.content,
      metadata: {
        timestamp: endTime,
        model: modelName,
        processingTime: endTime - startTime,
        provider: 'ollama'
      }
    };
  });
};

export const analyzeProjectStatusOllama = async (
  boq: BOQItem[],
  rfis: RFI[],
  schedule: ScheduleTask[],
  userQuery: string
): Promise<{ text: string; metadata?: any }> => {
  if (!isOllamaServiceAvailable()) {
    return { text: "Ollama Service Unavailable." };
  }

  const startTime = Date.now();
  const context = `Analyze project: BOQ items: ${boq.length}, Open RFIs: ${rfis.filter(r => r.status === 'Open').length}. Query: ${userQuery}`;

  return runWithFallback(async (modelName) => {
    const ollamaHost = getOllamaClient();

    const requestBody = {
      model: modelName,
      prompt: context,
      stream: false
    };

    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const endTime = Date.now();

    return {
      text: data.response,
      metadata: {
        timestamp: endTime,
        model: modelName,
        processingTime: endTime - startTime,
        provider: 'ollama'
      }
    };
  });
};

// Define the ChatMessage type for consistency with geminiService
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  attachment?: {
    mimeType: string;
    data: string;
    type: 'image' | 'video' | 'pdf';
  };
  metadata?: {
    timestamp?: number;
    model?: string;
    confidence?: number;
    processingTime?: number;
    sources?: string[];
    provider?: string;
  };
}