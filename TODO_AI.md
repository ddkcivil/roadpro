# AI Implementation TODO

## AI Services in This App
- **Google Gemini** (gemini-2.0-flash) - Primary AI ✅ Active
- ~~Hugging Face~~ - Removed ✅
- **OCR Service** (Tesseract.js + PDF.js) ✅ Active
- **Image Recognition** (Custom) ✅ Active
- **AI Scheduling** (Custom rule-based) ✅ Active

## Task 1: Integrate OCR Service into Chatbot
- [x] Read AIChatModal.tsx to understand current implementation
- [x] Modify AIChatModal.tsx to use OCR service for PDF preprocessing
- [x] Import ocrService in AIChatModal.tsx
- [x] Add PDF preprocessing before sending to AI

## Task 2: Remove Hugging Face AI
- [x] Removed huggingFaceService.ts file
- [x] Updated universalAIService.test.ts to remove Hugging Face references

## Task 3: Use Low Model Gemini
- [x] Already using gemini-2.0-flash (confirmed in geminiService.ts)

## Implementation Start
- [x] Step 1: Add OCR import to AIChatModal.tsx
- [x] Step 2: Add PDF preprocessing in sendMessage function
