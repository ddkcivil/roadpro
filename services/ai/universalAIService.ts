import { 
  chatWithGemini, 
  analyzeSitePhoto as analyzeSitePhotoGemini, 
  ChatMessage, 
  isAIServiceAvailable as isGeminiAvailable 
} from './geminiService';
import { 
  chatWithOllama, 
  analyzeSitePhotoOllama, 
  isOllamaServiceAvailable 
} from './ollamaService';

export type AIProvider = 'gemini' | 'ollama' | 'auto';

export interface AIResponse {
    text: string;
    metadata?: ChatMessage['metadata'];
    isFallback?: boolean;
}

/**
 * Universal AI service using Google Gemini or Ollama
 */
export const getAIResponse = async (
    currentMessage: string,
    history: ChatMessage[],
    projectContext: any,
    attachment?: { mimeType: string; data: string },
    preferredProvider: AIProvider = 'auto',
    isFastMode: boolean = false
): Promise<AIResponse> => {
    
    // Determine which provider to use
    const useOllama = preferredProvider === 'ollama' || 
                     (preferredProvider === 'auto' && !isGeminiAvailable() && isOllamaServiceAvailable());
    const useGemini = !useOllama && isGeminiAvailable();

    if (useOllama) {
        const response = await chatWithOllama(currentMessage, history, projectContext, attachment, isFastMode);
        return response;
    }
    
    if (useGemini) {
        const response = await chatWithGemini(currentMessage, history, projectContext, attachment, isFastMode);
        return response;
    }
    
    throw new Error("No AI service available. Please configure Gemini API key or ensure Ollama is running.");
};

export const isAnyAIServiceAvailable = (): boolean => {
    return isGeminiAvailable() || isOllamaServiceAvailable();
};

/**
 * Universal site photo analysis using Gemini or Ollama
 */
export async function analyzeSitePhotoUniversal(
    photoBase64: string,
    category: string,
    preferredProvider: AIProvider = 'auto'
): Promise<string> {
    
    const useOllama = preferredProvider === 'ollama' || 
                     (preferredProvider === 'auto' && !isGeminiAvailable() && isOllamaServiceAvailable());
    const useGemini = !useOllama && isGeminiAvailable();

    if (useOllama) {
        const response = await analyzeSitePhotoOllama(photoBase64, category);
        return response.text;
    }
    
    if (useGemini) {
        const response = await analyzeSitePhotoGemini(photoBase64, category);
        return response.text;
    }
    
    throw new Error("No AI service available for photo analysis. Please configure Gemini API key or ensure Ollama is running with a vision model.");
}