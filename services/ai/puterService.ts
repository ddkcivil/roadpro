/**
 * Puter.js Service
 * 
 * Provides unified access to Puter.com's BaaS features:
 * - AI (Unified access to GPT-4o, Claude, etc.)
 * - KV Store (Cloud-synced storage)
 * - FS (Cloud file system)
 * - Auth (Zero-config authentication)
 */

declare const puter: any;

export const puterService = {
  /**
   * Check if Puter.js is available
   */
  isAvailable: (): boolean => {
    return typeof puter !== 'undefined';
  },

  /**
   * AI Chat with Puter's unified API
   */
  chat: async (message: string, context?: any): Promise<string> => {
    if (!puterService.isAvailable()) return "Puter.js not available.";
    
    try {
      // Create a lightweight summary of context to avoid hitting prompt limits
      const summary = context ? {
        name: context.name,
        code: context.code,
        client: context.client,
        contractor: context.contractor,
        summary: context.summary,
        status: context.status,
        boqCount: context.boq?.length || 0,
        rfiCount: context.rfis?.length || 0,
        taskCount: context.schedule?.length || 0
      } : {};

      const prompt = `Context: ${JSON.stringify(summary)}\n\nUser Message: ${message}`;
      
      const response = await puter.ai.chat(prompt);
      
      // Puter can return strings or objects depending on version/model
      if (typeof response === 'string') return response;
      if (response && response.message?.content) return response.message.content;
      if (response && response.text) return response.text;
      
      return JSON.stringify(response);
    } catch (error: any) {
      console.error("[Puter] AI Error Details:", error);
      const errorMsg = error?.error?.message || error?.message || "Unknown Puter AI Error";
      return `Puter AI Error: ${errorMsg}`;
    }
  },

  /**
   * Key-Value Store: Set
   */
  kvSet: async (key: string, value: any): Promise<void> => {
    if (!puterService.isAvailable()) return;
    try {
      await puter.kv.set(key, value);
    } catch (error) {
      console.error("[Puter] KV Set Error:", error);
    }
  },

  /**
   * Key-Value Store: Get
   */
  kvGet: async (key: string): Promise<any> => {
    if (!puterService.isAvailable()) return null;
    try {
      return await puter.kv.get(key);
    } catch (error) {
      console.error("[Puter] KV Get Error:", error);
      return null;
    }
  },

  /**
   * Sync Project to Puter Cloud
   */
  syncProjectToCloud: async (project: any): Promise<void> => {
    if (!puterService.isAvailable()) return;
    await puterService.kvSet(`project_${project.id}`, project);
    console.log(`[Puter] Project ${project.id} synced to cloud.`);
  },

  /**
   * Get Current User from Puter
   */
  getCurrentUser: async (): Promise<any> => {
    if (!puterService.isAvailable()) return null;
    try {
      return await puter.auth.getUser();
    } catch (error) {
      return null;
    }
  },

  /**
   * Sign In with Puter
   */
  signIn: () => {
    if (!puterService.isAvailable()) return;
    puter.auth.signIn();
  }
};
