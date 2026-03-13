import { GoogleGenerativeAI } from "@google/generative-ai";
import { BOQItem, RFI, ScheduleTask } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey || trimmedApiKey === 'your_api_key_here') return null;
  return new GoogleGenerativeAI(trimmedApiKey);
};

// Expanded fallback list with GA and latest aliases
const MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-pro'
];

async function runWithFallback(task: (model: any, modelName: string) => Promise<any>): Promise<any> {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Client not initialized. Please check VITE_GEMINI_API_KEY.");
  
  let lastError = null;
  
  // Try each model
  for (const modelName of MODELS) {
    // Try both v1beta and v1 for each model to maximize compatibility
    for (const apiVer of ['v1beta', 'v1']) {
      try {
        const model = ai.getGenerativeModel({ model: modelName }, { apiVersion: apiVer as any });
        return await task(model, modelName);
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message?.toLowerCase() || "";
        
        // If it's a 404 (not found) or 400 (unsupported for this version), try next combination
        if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('400')) {
          console.warn(`Gemini Model ${modelName} on ${apiVer} unavailable, trying next...`);
          continue;
        }
        
        // If it's a 429 (quota), we still try the next model because quotas are often model-specific
        if (errMsg.includes('429') || errMsg.includes('quota')) {
          console.warn(`Quota exceeded for ${modelName}, switching to fallback...`);
          continue;
        }
        
        throw error;
      }
    }
  }
  
  // If we reach here, all models failed
  console.error("All Gemini models failed:", lastError);
  throw new Error("AI services are currently reaching their capacity limits. Please try again in a few minutes.");
}

export const isAIServiceAvailable = (): boolean => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return !!(apiKey && apiKey.trim() && apiKey !== 'your_api_key_here');
};

export const analyzeSitePhoto = async (photoBase64: string, category: string): Promise<string> => {
    if (!isAIServiceAvailable()) return "AI Service Unavailable: Gemini API Key not configured.";

    try {
        return await runWithFallback(async (model, modelName) => {
            const prompt = `Analyze this site photo from a road project. Category: "${category}". Identify progress and safety issues.`;
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: photoBase64.replace(/^data:image\/\w+;base64,/, "") } },
                        { text: prompt }
                    ]
                }]
            });
            return result.response.text();
        });
    } catch (err: any) {
        return `Analysis failed: ${err.message || "Unknown Gemini error"}`;
    }
};

export const analyzeProjectStatus = async (
  boq: BOQItem[],
  rfis: RFI[],
  schedule: ScheduleTask[],
  userQuery: string
): Promise<string> => {
  if (!isAIServiceAvailable()) return "AI Service Unavailable.";

  const context = `Analyze project: BOQ items: ${boq.length}, Open RFIs: ${rfis.filter(r => r.status === 'Open').length}. Query: ${userQuery}`;

  return runWithFallback(async (model, modelName) => {
    const result = await model.generateContent(context);
    return result.response.text();
  }).catch(() => "Project analysis currently unavailable due to high traffic.");
};

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

export const chatWithGemini = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  isFastMode: boolean = false
): Promise<{ text: string; metadata?: ChatMessage['metadata'] }> => {
  if (!isAIServiceAvailable()) return { text: "Please configure your Gemini API Key." };

  const startTime = Date.now();
  
  return runWithFallback(async (model, modelName) => {
    const systemInstruction = `You are RoadMaster AI for project: ${projectContext.name}. Provide technical advice. Currency: ${getCurrencySymbol(projectContext.settings?.currency)}`;
    
    const contents = history.map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.attachment) {
        parts.push({
          inlineData: {
            mimeType: msg.attachment.mimeType,
            data: msg.attachment.data.replace(/^data:.*?;base64,/, "")
          }
        });
      }
      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts: parts
      };
    });

    const currentParts: any[] = [{ text: currentMessage }];
    if (attachment) {
      currentParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data.replace(/^data:.*?;base64,/, "")
        }
      });
    }

    contents.push({ role: 'user', parts: currentParts });

    const result = await model.generateContent({
      contents: contents,
      systemInstruction: systemInstruction,
    });

    const endTime = Date.now();
    
    return {
        text: result.response.text(),
        metadata: {
            timestamp: endTime,
            model: modelName, 
            processingTime: endTime - startTime,
            provider: 'gemini'
        }
    };
  }).catch(err => {
    return { text: `Connection issue: ${err.message}` };
  });
};

export const draftLetter = async (topic: string, recipient: string, useSearch: boolean = false): Promise<string> => {
  if (!isAIServiceAvailable()) return "AI Service Unavailable.";
  
  const prompt = `Draft FIDIC-style letter for topic: ${topic}, Recipient: ${recipient}.`;

  return runWithFallback(async (model, modelName) => {
    const result = await model.generateContent(prompt);
    return result.response.text();
  }).catch(() => "Drafting service temporarily unavailable.");
};
