import { ChatMessage } from './geminiService';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

// Define the Puter global interface
declare global {
  interface Window {
    puter: any;
  }
}

/**
 * Check if the Puter SDK is loaded and ready
 */
export const isPuterAvailable = (): boolean => {
  return !!(window.puter && window.puter.ai);
};

/**
 * Chat with DeepSeek using Puter's free AI API
 */
export const chatWithPuter = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  isFastMode: boolean = false
): Promise<string> => {
  if (!isPuterAvailable()) {
    return "Puter.js SDK not loaded. Please ensure the script is correctly included in index.html.";
  }

  try {
    const model = isFastMode ? 'deepseek-v3' : 'deepseek-r1';
    
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
        content += `\n\n[Attachment Attached: ${attachment.mimeType}. Note: AI currently processing text-based metadata for this attachment.]`;
    }
    
    messages.push({ role: 'user', content });

    // Puter AI Chat call
    const response = await window.puter.ai.chat(messages, { model: model });
    
    return typeof response === 'string' ? response : response.message.content;

  } catch (err: any) {
    console.error("Puter AI Error:", err);
    return `Puter AI Connection issue: ${err.message || "Unknown error"}`;
  }
};

/**
 * Perform reasoning-based analysis using Puter's DeepSeek
 */
export const analyzeWithPuter = async (prompt: string, isFastMode: boolean = false): Promise<string> => {
    if (!isPuterAvailable()) return "Puter AI Unavailable.";
    
    try {
        const model = isFastMode ? 'deepseek-v3' : 'deepseek-r1';
        const response = await window.puter.ai.chat(prompt, { model: model });
        return typeof response === 'string' ? response : response.message.content;
    } catch (err: any) {
        throw new Error(`Puter Analysis failed: ${err.message}`);
    }
};
