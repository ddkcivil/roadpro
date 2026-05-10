import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAIResponse, analyzeSitePhotoUniversal } from './universalAIService';
import * as geminiService from './geminiService';

vi.mock('./geminiService', () => ({
    chatWithGemini: vi.fn(),
    analyzeSitePhoto: vi.fn(),
    isAIServiceAvailable: vi.fn(() => true)
}));

describe('Universal AI Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should use Gemini and return success', async () => {
        const mockResponse = { text: "Gemini response", metadata: { provider: 'gemini' } };
        vi.mocked(geminiService.chatWithGemini).mockResolvedValue(mockResponse as any);

        const result = await getAIResponse("hello", [], { name: "Test" });

        expect(geminiService.chatWithGemini).toHaveBeenCalled();
        expect(result.text).toBe("Gemini response");
        expect(result.metadata?.provider).toBe('gemini');
    });

    it('should analyze site photo using Gemini', async () => {
        const mockResponse = { text: "Site photo analysis complete", metadata: { provider: 'gemini' } };
        vi.mocked(geminiService.analyzeSitePhoto).mockResolvedValue(mockResponse as any);

        const result = await analyzeSitePhotoUniversal("base64data", "Earthwork");

        expect(geminiService.analyzeSitePhoto).toHaveBeenCalledWith("base64data", "Earthwork");
        expect(result).toBe("Site photo analysis complete");
    });
});
