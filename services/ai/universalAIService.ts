import { chatWithGemini, analyzeSitePhoto as analyzeSitePhotoGemini, ChatMessage, isAIServiceAvailable as isGeminiAvailable } from './geminiService';
import { chatWithHuggingFace, isHuggingFaceAvailable } from './huggingFaceService';

export type AIProvider = 'gemini' | 'huggingface' | 'auto';

export interface AIResponse {
    text: string;
    metadata?: ChatMessage['metadata'];
    isFallback?: boolean;
}

/**
 * Universal service that manages multiple AI providers with automatic fallback
 */
export const getAIResponse = async (
    currentMessage: string,
    history: ChatMessage[],
    projectContext: any,
    attachment?: { mimeType: string; data: string },
    preferredProvider: AIProvider = 'auto',
    isFastMode: boolean = false
): Promise<AIResponse> => {
    
    const tryGemini = async (): Promise<AIResponse> => {
        if (!isGeminiAvailable()) {
            throw new Error("Gemini API not configured");
        }
        const response = await chatWithGemini(currentMessage, history, projectContext, attachment, isFastMode);
        
        // Check if geminiService returned an error that we should fallback from
        if (response.text.includes("reaching their capacity limits") || 
            response.text.includes("Connection issue") || 
            response.text.includes("temporarily unavailable")) {
            throw new Error("Gemini Capacity/Connection Error");
        }
        
        return response;
    };

    const tryHuggingFace = async (isFallback: boolean = false): Promise<AIResponse> => {
        if (!isHuggingFaceAvailable()) {
            throw new Error("Hugging Face API not configured");
        }
        const response = await chatWithHuggingFace(currentMessage, history, projectContext, attachment, isFastMode);
        return { ...response, isFallback };
    };

    // Logical branching based on provider preference
    if (preferredProvider === 'gemini') {
        return await tryGemini();
    }

    if (preferredProvider === 'huggingface') {
        return await tryHuggingFace();
    }

    // Default 'auto' mode: Gemini first, then HuggingFace
    try {
        return await tryGemini();
    } catch (err: any) {
        console.warn("Gemini failed, attempting fallback to Hugging Face:", err.message);
        
        if (isHuggingFaceAvailable()) {
            try {
                return await tryHuggingFace(true);
            } catch (hfErr: any) {
                console.error("Hugging Face fallback also failed:", hfErr.message);
                throw new Error(`Both AI services failed. Gemini: ${err.message}, HF: ${hfErr.message}`);
            }
        }
        
        // If HF not available, re-throw the original Gemini error
        throw err;
    }
};

export const isAnyAIServiceAvailable = (): boolean => {
    return isGeminiAvailable() || isHuggingFaceAvailable();
};

/**
 * Universal site photo analysis with fallback
 */
export const analyzeSitePhotoUniversal = async (
    photoBase64: string,
    category: string,
    preferredProvider: AIProvider = 'auto'
): Promise<string> => {
    const tryGemini = async () => {
        const response = await analyzeSitePhotoGemini(photoBase64, category);
        if (response.text.includes("reaching their capacity limits") || response.text.includes("Analysis failed")) {
            throw new Error("Gemini analysis unavailable");
        }
        return response.text;
    };

    const tryHuggingFace = async () => {
        const response = await chatWithHuggingFace(
            `Analyze this site photo from a road project. Category: "${category}". Identify progress and safety issues.`,
            [],
            { name: "Current Project" }, // Minimal project context
            { mimeType: 'image/jpeg', data: photoBase64 },
            false
        );
        return response.text;
    };

    if (preferredProvider === 'gemini') return await tryGemini();
    if (preferredProvider === 'huggingface') return await tryHuggingFace();

    try {
        return await tryGemini();
    } catch (err) {
        console.warn("Gemini photo analysis failed, attempting Hugging Face fallback");
        if (isHuggingFaceAvailable()) {
            return await tryHuggingFace();
        }
        throw err;
    }
};
