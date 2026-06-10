/// <reference types="vite/client" />
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

// Using only the fast/low model - gemini-2.0-flash
const MODELS = [
  'gemini-2.0-flash'
];

async function runWithFallback(task: (model: any, modelName: string) => Promise<any>): Promise<any> {
  const ai = getAIClient();
  if (!ai) throw new Error("AI Client not initialized. Please check VITE_GEMINI_API_KEY.");
  
  let lastError: any = null;
  
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
        const statusCode = error.status || error.code || 0;
        
        // If it's a 404 (not found) or 400 (unsupported for this version), try next combination
        if (statusCode === 404 || statusCode === 400 || errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('400')) {
          console.warn(`Gemini Model ${modelName} on ${apiVer} unavailable, trying next...`);
          continue;
        }
        
        // If it's a 429 (quota) or 503 (service unavailable/capacity), we still try the next model 
        // because quotas are often model-specific and some models might have more capacity
        if (statusCode === 429 || statusCode === 503 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('503') || errMsg.includes('capacity')) {
          console.warn(`Quota or Capacity exceeded for ${modelName}, switching to fallback...`);
          continue;
        }
        
        throw error;
      }
    }
  }
  
  // If we reach here, all models failed
  console.error("All Gemini models failed:", lastError);
  
  // Create a descriptive error object for the universal provider to handle
  const finalError = new Error("AI services are currently reaching their capacity limits. Please try again in a few minutes.");
  (finalError as any).isCapacityError = true;
  (finalError as any).originalError = lastError;
  throw finalError;
}

export const isAIServiceAvailable = (): boolean => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return !!(apiKey && apiKey.trim() && apiKey !== 'your_api_key_here');
};

export const analyzeSitePhoto = async (photoBase64: string, category: string): Promise<{ text: string; metadata?: ChatMessage['metadata'] }> => {
    if (!isAIServiceAvailable()) return { text: "AI Service Unavailable: Gemini API Key not configured." };

    const startTime = Date.now();
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
        });
    } catch (err: any) {
        return { text: `Analysis failed: ${err.message || "Unknown Gemini error"}` };
    }
};

export const analyzeProjectStatus = async (
  boq: BOQItem[],
  rfis: RFI[],
  schedule: ScheduleTask[],
  userQuery: string
): Promise<{ text: string; metadata?: ChatMessage['metadata'] }> => {
  if (!isAIServiceAvailable()) return { text: "AI Service Unavailable." };

  const startTime = Date.now();
  const context = `Analyze project: BOQ items: ${boq.length}, Open RFIs: ${rfis.filter(r => r.status === 'Open').length}. Query: ${userQuery}`;

  return runWithFallback(async (model, modelName) => {
    const result = await model.generateContent(context);
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
  }).catch(() => ({ text: "Project analysis currently unavailable due to high traffic." }));
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
    // Summarize project context for better AI grounding
    const financialSummary = projectContext.boq ? 
      `Budget: ${projectContext.boq.reduce((acc: number, item: any) => acc + (item.quantity * item.rate), 0).toFixed(2)} ${getCurrencySymbol(projectContext.settings?.currency)}` : 
      'Budget info not available';
      
    const scheduleSummary = projectContext.schedule ? 
      `Tasks: ${projectContext.schedule.length}, Progress: ${Math.round(projectContext.schedule.reduce((acc: number, t: any) => acc + t.progress, 0) / projectContext.schedule.length)}%` : 
      'Schedule info not available';
    
    // Add daily updates context
    const dailyUpdates = `
    Today's Updates:
    - Schedule: ${projectContext.dailySchedule || 'No schedule updates for today.'}
    - Store/Inventory: ${projectContext.dailyStoreUpdates || 'No inventory updates for today.'}
    - Vehicle Status: ${projectContext.dailyVehicleStatus || 'No vehicle status updates for today.'}
    `;

    // Add Risk, Quality, and Stakeholder context
    const riskContext = projectContext.activeRisks?.length > 0 
      ? `Active Risks: ${projectContext.activeRisks.map((r: any) => `${r.description} (Severity: ${r.severity})`).join('; ')}`
      : 'No critical risks reported.';
    
    const qualityContext = projectContext.pendingInspections?.length > 0
      ? `Pending Inspections: ${projectContext.pendingInspections.map((i: any) => `${i.item} due on ${i.date}`).join('; ')}`
      : 'No pending inspections.';
      
    const stakeholderContext = projectContext.keyIssuesFromClient?.length > 0
      ? `Key Client Issues: ${projectContext.keyIssuesFromClient.join('; ')}`
      : 'No outstanding client issues.';

    const systemInstruction = `You are RoadMaster AI for project: ${projectContext.name} (${projectContext.code}). 
    Context: ${financialSummary}, ${scheduleSummary}.
    ${dailyUpdates}
    Project Management Context:
    - ${riskContext}
    - ${qualityContext}
    - ${stakeholderContext}
    
    Provide technical, actionable advice based on construction engineering standards (FIDIC). 
    Currency: ${getCurrencySymbol(projectContext.settings?.currency)}`;
    
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
