import { GoogleGenerativeAI } from "@google/generative-ai";
import { BOQItem, RFI, ScheduleTask } from '../../types';
import { formatCurrency } from '../../utils/formatting/exportUtils';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

const getAIClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  // Trim any whitespace from the API key
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    return null;
  }
  return new GoogleGenerativeAI(trimmedApiKey);
};

export const isAIServiceAvailable = (): boolean => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return !!(apiKey && apiKey.trim());
};

export const analyzeSitePhoto = async (photoBase64: string, category: string): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "AI Service Unavailable. Please check your configuration.";

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a construction site auditor.
    Analyze this site photo from a road project. The photo is categorized as "${category}".

    Tasks:
    1. Identify the current stage of construction shown.
    2. Spot any immediate safety hazards or deviations from standard engineering practices.
    3. Estimate physical progress if it's a structural component or pavement layer.
    4. List machinery or plant equipment visible.

    Keep the analysis professional, technical, and concise.`;

    // Check if the image is valid before processing
    if (!photoBase64 || photoBase64.length === 0) {
      throw new Error('Invalid image data provided');
    }

    try {
        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } },
                    { text: prompt }
                ]
            }]
        });
        return result.response.text() || "No analysis generated.";
    } catch (error) {
        console.error("Site Photo Analysis Error:", error);
        return "Could not perform automated analysis at this time.";
    }
};

// Original simple analysis
export const analyzeProjectStatus = async (
  boq: BOQItem[],
  rfis: RFI[],
  schedule: ScheduleTask[],
  userQuery: string
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable: Missing API Key.";

  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Validate inputs
  if (!boq || !rfis || !schedule) {
    return "Error: Invalid project data provided to AI service.";
  }

  const context = `
    You are an expert Senior Project Manager for a major Road Construction project.
    Analyze the following project data and answer the user's query.

    User Query: "${userQuery}"

    Project Data:
    1. Critical Schedule Items:
    ${JSON.stringify(schedule.filter(s => s.status !== 'Completed').slice(0, 5))}

    2. Recent RFIs:
    ${JSON.stringify(rfis.slice(0, 5))}

    3. BOQ Progress:
    ${JSON.stringify(boq.slice(0, 5))}
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: context }] }],
    });
    return result.response.text() || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while communicating with the AI service.";
  }
};

// --- Robust Chat Function ---
export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  attachment?: {
    mimeType: string;
    data: string; // base64
    type: 'image' | 'video' | 'pdf';
  };
}

export const chatWithGemini = async (
  currentMessage: string,
  history: ChatMessage[],
  projectContext: any,
  attachment?: { mimeType: string; data: string },
  useFastModel: boolean = false
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable. Please ensure VITE_GEMINI_API_KEY is set in your environment.";

  // Default to gemini-1.5-flash for all requests to ensure maximum compatibility and speed
  let modelName = 'gemini-1.5-flash';

  const model = ai.getGenerativeModel({ model: modelName });

  const systemInstruction = `You are RoadMaster AI, a helpful construction management assistant.
  
  APPLICATION CONTEXT:
  - You are part of RoadMaster Pro, a comprehensive construction project management application
  - You assist with BOQ ledger, scheduling, inspections (RFIs), variations, billing, and project documentation
  - You integrate with Google Sheets for live synchronization
  - You support field teams with daily reporting, site photos, and progress tracking
    
  PROJECT CONTEXT:
  - Project: ${projectContext.name} (${projectContext.code})
  - Location: ${projectContext.location}
  - Contractor: ${projectContext.contractor}
  - Client: ${projectContext.client}
  - Start Date: ${projectContext.startDate}
  - End Date: ${projectContext.endDate}
  - Contract Number: ${projectContext.contractNo || 'N/A'}
  
  PROJECT DATA AVAILABLE:
  - BOQ Items Count: ${(projectContext.boq || []).length}
  - RFI Count: ${(projectContext.rfis || []).length}
  - Schedule Tasks Count: ${(projectContext.schedule || []).length}
  - Structures Count: ${(projectContext.structures || []).length}
  - Lab Tests Count: ${(projectContext.labTests || []).length}
  - Subcontractors Count: ${(projectContext.subcontractors || []).length}
  - Vehicles Count: ${(projectContext.vehicles || []).length}
  - Site Photos Count: ${(projectContext.sitePhotos || []).length}
  - Daily Reports Count: ${(projectContext.dailyReports || []).length}
  - Variation Orders Count: ${(projectContext.variationOrders || []).length}
  - Contract Bills Count: ${(projectContext.contractBills || []).length}
    
  YOUR CAPABILITIES:
  1. Answer detailed questions about project schedule, BOQ items, costs, progress, and status
  2. Analyze uploaded documents (PDFs, Images) such as RFIs, Invoices, Drawings, and Reports
  3. Analyze site photos and videos for progress assessment, safety compliance, and quality checks
  4. Provide insights on project delays, bottlenecks, and critical path analysis
  5. Assist with cost estimation, budget tracking, and financial progress
  6. Generate formal construction correspondence and documentation
  7. Interpret technical drawings and specifications
  8. Identify potential issues and suggest mitigation strategies
    
  RESPONSE GUIDELINES:
  - Provide specific, actionable insights based on the project data
  - Reference specific BOQ items, RFI numbers, or schedule tasks when relevant
  - Use professional construction industry terminology
  - When analyzing progress, relate to chainages, quantities, and completion percentages
  - For cost-related queries, use the currency specified in the project settings: ${getCurrencySymbol(projectContext.settings?.currency)}
  - Maintain FIDIC-style professional communication standards
  
  SPECIFIC INSTRUCTIONS FOR DOCUMENT ANALYSIS:
  - If the user asks to analyze an RFI (Request for Inspection) document:
    Please extract the following details and present them in a Markdown Table:
    | Field | Value |
    |---|---|
    | RFI Number | ... |
    | Location/Chainage | ... |
    | Date of Inspection | ... |
    | Work Description | (Brief summary of work) |
    | Inspection Status | (Open/Approved/Rejected) |
  
    Then, list any "Key Observations" or engineering remarks found in the document below the table.
  
  - If the user uploads an Invoice or Bill:
    Extract Bill No, Vendor, Date, and Total Amount.
  
  - For Site Photos/Videos:
    Describe progress, identify machinery, or spot safety hazards.`;

  // Prepare project summary for enhanced context
  const projectSummary = `
PROJECT SUMMARY:
- Total BOQ Value: ${formatCurrency((projectContext.boq || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0) || 0, projectContext.settings)}
- Overall Progress: ${projectContext.boq?.length ? ((projectContext.boq.reduce((comp, item) => comp + item.completedQuantity, 0) / projectContext.boq.reduce((tot, item) => tot + item.quantity, 0)) * 100).toFixed(2) : '0'}%
- Active RFIs: ${(projectContext.rfis || []).filter(rfi => rfi.status === 'Open').length} open of ${(projectContext.rfis || []).length} total
- Upcoming Milestones: ${(projectContext.schedule || []).filter(task => task.status === 'Not Started' && new Date(task.startDate) <= new Date(Date.now() + 7*24*60*60*1000)).length} upcoming
- Completed Tasks: ${(projectContext.schedule || []).filter(task => task.status === 'Completed').length} of ${(projectContext.schedule || []).length} total
`;

  try {
    const contents = history.map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    // Add project summary context if this is the first interaction
    if (history.length === 0) {
      contents.push({
        role: 'user',
        parts: [{ text: projectSummary }]
      });
    }

    const currentParts: any[] = [{ text: currentMessage }];
    if (attachment) {
      currentParts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const result = await model.generateContent({
      contents: contents,
      systemInstruction: systemInstruction,
    });

    return result.response.text() || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I encountered an error. Please try again.";
  }
};

export const draftLetter = async (topic: string, recipient: string, useSearch: boolean = false): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Service Unavailable.";
  
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
    Draft a formal construction project correspondence letter.
    Topic: ${topic}
    Recipient Role: ${recipient}
    Sender Role: Project Manager

    Instructions:
    - Use a professional, contractual tone (FIDIC style if applicable).
    - If search is enabled, include specific relevant facts found (e.g., weather data, regulations).
    - Structure with a clear Subject, Reference (placeholder), Body, and Closing.
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: useSearch ? [{ googleSearchRetrieval: {} }] : [],
    });

    let text = result.response.text() || "Could not generate draft.";

    if (result.response.candidates?.[0]?.groundingMetadata?.groundingChuncks) {
       const links = result.response.candidates[0].groundingMetadata.groundingChuncks
         .map((c: any) => c.web?.uri)
         .filter((uri: string) => uri)
         .map((uri: string) => `- ${uri}`)
         .join('\n');

      if (links) {
        text += "\n\n--- \n**References Used:**\n" + links;
      }
    }

    return text;
  } catch (error) {
    console.error("Gemini Letter Gen Error:", error);
    return "Error generating letter.";
  }
};

// Removed extractDocumentMetadata function as it's no longer used - replaced by Chandra OCR
// The function was causing 404 errors as the gemini-1.5-flash model doesn't support the required features in the v1beta API
