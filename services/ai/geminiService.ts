import { GoogleGenerativeAI } from "@google/generative-ai";
import { BOQItem, RFI, ScheduleTask } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) return null;
  return new GoogleGenerativeAI(trimmedApiKey);
};

// Robust fallback list to handle varied model availability
const MODELS = [
  'gemini-2.0-flash', 
  'gemini-1.5-flash', 
  'gemini-1.5-pro', 
  'gemini-1.5-flash-8b', 
  'gemini-1.0-pro'
];

async function runWithFallback(task: (model: any) => Promise<any>): Promise<any> {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Client not initialized");
  
  let lastError = null;
  for (const modelName of MODELS) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      return await task(model);
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
      const isNotFoundError = error.message?.includes('404') || error.message?.includes('not found');
      
      if (isNotFoundError || isQuotaError) {
        console.warn(`Gemini Model ${modelName} unavailable (${isQuotaError ? '429 Quota' : '404 Not Found'}), trying fallback...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const isAIServiceAvailable = (): boolean => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return !!(apiKey && apiKey.trim());
};

export const analyzeSitePhoto = async (photoBase64: string, category: string): Promise<string> => {
    return runWithFallback(async (model) => {
      const prompt = `You are a construction site auditor. Analyze this site photo from a road project. Category: "${category}". Identify progress, safety issues, and visible equipment. Concise/Technical.`;
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
    }).catch(err => {
      console.error("Photo Analysis Error:", err);
      return "AI Analysis failed. Please check connection.";
    });
};

export const analyzeProjectStatus = async (
  boq: BOQItem[],
  rfis: RFI[],
  schedule: ScheduleTask[],
  userQuery: string
): Promise<string> => {
  return runWithFallback(async (model) => {
    const context = `Analyze project: BOQ items count: ${boq.length}, Open RFIs: ${rfis.filter(r => r.status === 'Open').length}. Query: ${userQuery}`;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: context }] }],
    });
    return result.response.text();
  }).catch(() => "Project analysis unavailable.");
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const chatWithGemini = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string }
): Promise<string> => {
  return runWithFallback(async (model) => {
    const systemInstruction = `You are RoadMaster AI for project: ${projectContext.name}. Provide technical, FIDIC-standard advice. Current currency: ${getCurrencySymbol(projectContext.settings?.currency)}`;
    
    const contents = history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

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

    return result.response.text();
  }).catch(err => {
    console.error("Chat Error:", err);
    return `Connection error (${err.message}). Try again in a moment.`;
  });
};

export const draftLetter = async (topic: string, recipient: string, useSearch: boolean = false): Promise<string> => {
  return runWithFallback(async (model) => {
    const prompt = `Draft FIDIC-style letter for topic: ${topic}, Recipient: ${recipient}. Professional tone.`;
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return result.response.text();
  }).catch(() => "Failed to generate draft.");
};
