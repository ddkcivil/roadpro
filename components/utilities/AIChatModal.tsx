import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Bot, Send, Paperclip, Zap, Video, Loader2, Sparkles, FileText, Settings2 } from 'lucide-react';
import { chatWithGemini, ChatMessage, isAIServiceAvailable as isGeminiAvailable } from '../../services/ai/geminiService';
import { chatWithDeepSeek, isDeepSeekAvailable } from '../../services/ai/deepseekService';
import { chatWithHuggingFace, isHuggingFaceAvailable } from '../../services/ai/huggingFaceService';
import { chatWithOpenAI, isOpenAIAvailable } from '../../services/ai/openaiService';
import { Project } from '../../types';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface Props {
  project: Project;
  onClose: () => void;
}

const AIChatModal: React.FC<Props> = ({ project, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFastMode, setIsFastMode] = useState(false);
  const [aiProvider, setAIProvider] = useState<'deepseek' | 'gemini' | 'huggingface' | 'openai'>(
    isOpenAIAvailable() ? 'openai' : (isDeepSeekAvailable() ? 'deepseek' : (isHuggingFaceAvailable() ? 'huggingface' : 'gemini'))
  );

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{
    file: File;
    preview: string;
    type: 'image' | 'video' | 'pdf';
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Focus management for accessibility
  useEffect(() => {
    // Focus the input field when modal opens
    const inputField = modalRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
    if (inputField) {
      inputField.focus();
    }

    // Prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';

    // Cleanup
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Trap focus within the modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>;

      if (!focusableElements) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial Greeting
  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{
            role: 'model',
            text: `Hello! I'm your AI assistant for project **${project.code}**. \n\nYou can:
• Upload **RFI Documents (PDF)** to extract description, status, and dates.
• Upload Site Photos/Videos for progress analysis.
• Ask about the project schedule or BOQ status.`
        }]);
    }
  }, [project.code]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isVideo = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf';
      const preview = URL.createObjectURL(file);

      setAttachment({
        file,
        preview,
        type: isVideo ? 'video' : isPdf ? 'pdf' : 'image'
      });
    }
  };

  const clearAttachment = () => {
    if (attachment) {
      URL.revokeObjectURL(attachment.preview);
      setAttachment(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (textOverride?: string) => {
    const userText = textOverride || input.trim();
    if ((!userText && !attachment) || isLoading) return;

    // Convert blob URL to base64 for storage in message history
    let attachmentData = attachment ? await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data url prefix (e.g. "data:image/png;base64,")
            resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(attachment.file);
    }) : undefined;

    // 1. Prepare User Message for UI
    const newUserMsg: ChatMessage = {
      role: 'user',
      text: userText,
      attachment: attachment ? {
          mimeType: attachment.file.type,
          data: attachmentData as string, // Use base64 data for storage
          type: attachment.type
      } : undefined
    };

    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // 2. Prepare Data for API
    let base64Data = '';
    if (attachment) {
        try {
            base64Data = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    // Remove data url prefix (e.g. "data:image/png;base64,")
                    resolve(base64String.split(',')[1]);
                };
                reader.readAsDataURL(attachment.file);
            });
        } catch (err) {
            console.error("File read error", err);
        }
    }

    // 3. Call AI Service
    let responseText = "";
    try {
        if (aiProvider === 'openai') {
            responseText = await chatWithOpenAI(
                userText || (attachment ? "Analyze this attachment." : ""), 
                newHistory,
                project,
                attachment ? { mimeType: attachment.file.type, data: base64Data } : undefined,
                isFastMode
            );
        } else if (aiProvider === 'deepseek') {
            responseText = await chatWithDeepSeek(
                userText || (attachment ? "Analyze this attachment." : ""), 
                newHistory,
                project,
                attachment ? { mimeType: attachment.file.type, data: base64Data } : undefined,
                isFastMode
            );
        } else if (aiProvider === 'huggingface') {
            responseText = await chatWithHuggingFace(
                userText || (attachment ? "Analyze this attachment." : ""), 
                newHistory,
                project,
                attachment ? { mimeType: attachment.file.type, data: base64Data } : undefined,
                isFastMode
            );
        } else {
            responseText = await chatWithGemini(
                userText || (attachment ? "Analyze this attachment." : ""), 
                newHistory,
                project,
                attachment ? { mimeType: attachment.file.type, data: base64Data } : undefined,
                isFastMode
            );
        }
    } catch (err: any) {
        responseText = `Error: ${err.message || "Failed to get AI response"}`;
    }

    // 4. Update UI with AI Response
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
    clearAttachment();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleChipClick = (label: string) => {
      let prompt = label;
      if (label === "Extract RFI Details") prompt = "Analyze this RFI document. Extract key details including Description of Work, Inspection Status, Inspection Date, and Location in a summary table.";
      else if (label === "Analyze Invoice") prompt = "Extract invoice details: Vendor, Date, Bill No, Amount.";
      else if (label === "Assess Site Progress") prompt = "Analyze this site image/video and describe the construction progress and machinery used.";

      sendMessage(prompt);
  };

  const renderSuggestionChips = () => {
      if (isLoading) return null;

      const chips = [];

      if (attachment) {
          if (attachment.type === 'pdf' || attachment.type === 'image') {
              chips.push("Extract RFI Details");
              chips.push("Analyze Invoice");
          }
          if (attachment.type === 'image' || attachment.type === 'video') {
              chips.push("Assess Site Progress");
              chips.push("Check Safety Compliance");
          }
      } else if (messages.length === 1) {
          chips.push("Project Schedule Summary");
          chips.push("Pending RFIs Status");
          chips.push("BOQ Financial Progress");
      }

      if (chips.length === 0) return null;

      return (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {chips.map((chip, i) => (
                  <Badge
                      key={i}
                      onClick={() => handleChipClick(chip)}
                      className="cursor-pointer bg-background border border-border font-medium rounded-lg hover:bg-primary/10 hover:border-primary hover:text-primary transition-all shadow-sm flex items-center gap-1.5 py-1.5 px-3"
                      variant="outline"
                  >
                      <Sparkles size={14} className="text-primary" />
                      {chip}
                  </Badge>
              ))}
          </div>
      );
  };

  const isServiceAvailable = 
    aiProvider === 'openai' ? isOpenAIAvailable() :
    (aiProvider === 'deepseek' ? isDeepSeekAvailable() : 
    (aiProvider === 'huggingface' ? isHuggingFaceAvailable() : isGeminiAvailable()));

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-[600px] h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title"
      >

        {/* Header */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 flex items-center justify-between text-white shrink-0" id="chat-modal-title">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-full backdrop-blur-md border border-white/20">
                <Bot size={24} className="text-blue-400" />
            </div>
            <div>
                <h6 className="font-bold leading-tight">RoadMaster AI</h6>
                <div className="text-[10px] text-white/70 flex items-center gap-2">
                    {aiProvider === 'openai' ? 'OpenAI GPT-4o' : (aiProvider === 'deepseek' ? 'DeepSeek V3/R1' : (aiProvider === 'huggingface' ? 'Hugging Face' : 'Gemini 3.0 Pro'))}
                    <Badge variant="outline" className="text-[8px] h-3 px-1 border-white/20 text-white/60">
                        {isFastMode ? 'High Speed' : 'High Performance'}
                    </Badge>
                </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
              <DropdownMenu>
                  <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9 rounded-lg">
                                      <Settings2 size={18} />
                                  </Button>
                              </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>AI Provider Settings</TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuLabel>AI Intelligence Provider</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setAIProvider('openai')} className="flex items-center justify-between">
                          <span>OpenAI GPT-4o (Multimodal)</span>
                          {aiProvider === 'openai' && <Zap size={14} className="text-primary fill-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAIProvider('deepseek')} className="flex items-center justify-between">
                          <span>DeepSeek API (Paid)</span>
                          {aiProvider === 'deepseek' && <Zap size={14} className="text-primary fill-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAIProvider('gemini')} className="flex items-center justify-between">
                          <span>Google Gemini (Multimodal)</span>
                          {aiProvider === 'gemini' && <Zap size={14} className="text-primary fill-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setAIProvider('huggingface')} className="flex items-center justify-between">
                          <span>Hugging Face (Open Models)</span>
                          {aiProvider === 'huggingface' && <Zap size={14} className="text-primary fill-primary" />}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 flex items-center justify-between">
                          <Label htmlFor="fast-mode-dropdown" className="text-xs cursor-pointer">Fast Mode</Label>
                          <Switch
                              id="fast-mode-dropdown"
                              checked={isFastMode}
                              onCheckedChange={setIsFastMode}
                              className="scale-75"
                          />
                      </div>
                  </DropdownMenuContent>
              </DropdownMenu>

              <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-lg h-9 w-9"
              >
                <X size={20} />
              </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-4">
            {!isServiceAvailable && (
                <Alert variant="destructive" className="mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>AI Provider Connection Required</AlertTitle>
                    <AlertDescription>
                        {aiProvider === 'openai' 
                          ? "OpenAI API key is missing. Add VITE_OPENAI_API_KEY to your .env file."
                          : (aiProvider === 'deepseek' 
                            ? "DeepSeek API key is missing. Add VITE_DEEPSEEK_API_KEY to your .env file." 
                            : (aiProvider === 'huggingface' 
                              ? "Hugging Face API key is missing. Add VITE_HUGGINGFACE_API_KEY to your .env file."
                              : "Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env file."))}
                    </AlertDescription>
                </Alert>
            )}
            {messages.map((msg, idx) => (
                <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn("flex max-w-[85%] gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                        {/* Avatar */}
                        <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm border",
                            msg.role === 'user' ? "bg-primary/10 border-primary/20" : "bg-white border-slate-200"
                        )}>
                            {msg.role === 'user' ? (
                                <span className="text-[10px] font-bold text-primary">ME</span>
                            ) : (
                                <Sparkles size={18} className="text-primary" />
                            )}
                        </div>

                        {/* Bubble */}
                        <div className={cn(
                            "p-3 rounded-2xl shadow-sm text-sm leading-relaxed",
                            msg.role === 'user'
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-white text-foreground border border-slate-200 rounded-tl-none hover:shadow-md transition-shadow"
                        )}>
                            {/* Attachment Preview in Message */}
                            {msg.attachment && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-border bg-background">
                                    {msg.attachment.type === 'video' ? (
                                        <div className="flex items-center justify-center h-10 px-2 gap-2">
                                            <Video size={16} className="text-muted-foreground" />
                                            <span className="text-xs text-muted-foreground">Video Attached</span>
                                        </div>
                                    ) : msg.attachment.type === 'pdf' ? (
                                        <div className="p-3 flex items-center gap-3">
                                            <div className="bg-red-50 p-2 rounded flex items-center justify-center">
                                                <FileText size={18} className="text-red-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={cn("text-xs font-medium", msg.role === 'user' ? "text-primary-foreground" : "text-foreground")}>PDF Document</span>
                                                <span className={cn("text-[10px]", msg.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground")}>Attached for analysis</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="Upload" className="max-w-[200px] max-h-48 object-cover block" />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="whitespace-pre-wrap font-sans">
                                {msg.text}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {isLoading && (
                <div className="flex justify-start">
                    <div className="flex gap-3 max-w-[85%]">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 mt-1 shadow-sm border border-slate-200">
                            <Bot size={16} className="text-primary" />
                        </div>
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 rounded-tl-none">
                            <Loader2 size={16} className="animate-spin text-primary" />
                            <span className="text-xs text-muted-foreground font-medium">Analyzing...</span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {/* Attachment Preview Area */}
            {attachment && (
                <div className="mb-3 flex items-center gap-3 bg-background p-2 rounded-xl border border-border w-fit shadow-sm">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative border border-border">
                        {attachment.type === 'image' ? (
                            <img src={attachment.preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : attachment.type === 'pdf' ? (
                            <FileText size={20} className="text-red-500" />
                        ) : (
                            <Video size={18} className="text-muted-foreground" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground max-w-[150px] truncate">{attachment.file.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{attachment.type}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearAttachment}
                        className="h-6 w-6 ml-1 hover:bg-red-50 hover:text-red-600"
                    >
                        <X size={14} />
                    </Button>
                </div>
            )}

            {/* Suggestion Chips */}
            {renderSuggestionChips()}

            <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <input
                    type="file"
                    id="file-upload-input"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,video/*,application/pdf"
                    aria-label="Upload attachment"
                />

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "h-11 w-11 shrink-0 rounded-xl transition-all",
                                    attachment ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-slate-50 text-slate-600 border-slate-200"
                                )}
                                aria-label="Upload PDF or Media"
                            >
                                <Paperclip size={20} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Upload PDF (RFI/Invoice) or Media</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex-1 bg-background border border-border rounded-xl flex items-center px-3 py-2.5 transition-all shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about schedule, or upload RFI PDF..."
                        className="flex-1 bg-transparent outline-none text-sm p-0"
                        autoFocus
                        aria-label="Ask AI about your project"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || (!input.trim() && !attachment) || !isServiceAvailable}
                    className="h-11 w-11 shrink-0 rounded-xl shadow-lg transition-transform active:scale-95"
                    size="icon"
                >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </Button>
            </form>
            <div className="text-center mt-2">
                <span className="text-[10px] text-muted-foreground">
                    AI models provide reasoning based on project data. Verify important project details.
                </span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatModal;
