import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Bot, Send, Paperclip, Zap, Image as ImageIcon, Video, Loader2, Sparkles, FileText } from 'lucide-react';
import { chatWithGemini, ChatMessage } from '../../services/ai/geminiService';
import { Project } from '../../types';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';

interface Props {
  project: Project;
  onClose: () => void;
}

const AIChatModal: React.FC<Props> = ({ project, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFastMode, setIsFastMode] = useState(false);
  
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
    let attachmentData = attachment ? await new Promise((resolve) => {
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
            base64Data = await new Promise((resolve) => {
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
    const responseText = await chatWithGemini(
        userText || (attachment ? "Analyze this attachment." : ""), // Fallback text if empty
        newHistory, 
        project,
        attachment ? { mimeType: attachment.file.type, data: base64Data } : undefined,
        isFastMode
    );

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
          <Box sx={{ display: 'flex', gap: 2, mb: 4, overflowX: 'auto', pb: 2, px: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
              {chips.map((chip, i) => (
                  <Chip 
                      key={i} 
                      label={chip} 
                      onClick={() => handleChipClick(chip)} 
                      sx={{ 
                          cursor: 'pointer', 
                          bgcolor: 'white', 
                          border: '1px solid',
                          borderColor: 'divider',
                          fontWeight: 500,
                          borderRadius: 2,
                          '&:hover': { bgcolor: 'primary.light', borderColor: 'primary.main', color: 'primary.main', transform: 'translateY(-1px)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } 
                      }}
                      icon={<Sparkles size={14} style={{ color: 'primary.main' }} />}
                  />
              ))}
          </Box>
      );
  };

  return (
    <Box 
      ref={modalRef}
      sx={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}
      onClick={onClose} // Close modal when clicking on backdrop
    >
      <Box 
        sx={{ bgcolor: 'background.paper', width: '100%', maxWidth: '600px', height: '85vh', borderRadius: 4, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', border: '1px solid', borderColor: 'divider' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-modal-title"
      >
        
        {/* Header */}
        <Box sx={{ bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', flexShrink: 0 }} id="chat-modal-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.2)', p: 2, borderRadius: '50%', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Bot size={24} />
            </Box>
            <Box>
                <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: '1.4' }}>RoadMaster AI</Typography>
                <Box sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 1 }}>
                    Powered by Gemini {isFastMode ? 'Flash Lite' : '3.0 Pro'}
                </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <FormControlLabel
                control={
                    <Switch 
                        size="small" 
                        checked={isFastMode} 
                        onChange={(e) => setIsFastMode(e.target.checked)} 
                        color="secondary"
                        sx={{ 
                            '& .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.4)' },
                            '& .Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(156, 163, 175, 0.7)' }
                        }}
                    />
                }
                label={
                    <Box sx={{ fontSize: '0.75rem', fontWeight: 'medium', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Zap size={12} className={isFastMode ? 'text-[#fbbf24]' : 'text-inherit'} />
                        Fast Mode
                    </Box>
                }
              />
              <IconButton onClick={onClose} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, borderRadius: 2 }}>
                <X size={20} />
              </IconButton>
          </Box>
        </Box>

        {/* Chat Area */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {messages.map((msg, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <Box sx={{ display: 'flex', maxWidth: '85%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 3 }}>
                        {/* Avatar */}
                        <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.5, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', bgcolor: msg.role === 'user' ? 'primary.light' : 'grey.100', border: '1px solid', borderColor: 'divider' }}>
                            {msg.role === 'user' ? (
                                <Typography variant="caption" fontWeight="bold" color="primary.main">ME</Typography>
                            ) : (
                                <Sparkles size={18} style={{ color: 'primary.main' }} />
                            )}
                        </Box>

                        {/* Bubble */}
                        <Box sx={{ 
                            p: 2.5, 
                            borderRadius: 3, 
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
                            fontSize: '0.9rem', 
                            lineHeight: '1.5', 
                            bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                            color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                            borderTopRightRadius: msg.role === 'user' ? 0 : 3,
                            borderTopLeftRadius: msg.role === 'user' ? 3 : 0,
                            border: msg.role !== 'user' ? '1px solid' : 'none',
                            borderColor: msg.role !== 'user' ? 'divider' : 'transparent',
                            '&:hover': { boxShadow: msg.role !== 'user' ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }
                        }}>
                            {/* Attachment Preview in Message */}
                            {msg.attachment && (
                                <Box sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
                                    {msg.attachment.type === 'video' ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40, px: 2, gap: 1 }}>
                                            <Video size={16} style={{ color: 'text.secondary' }} />
                                            <Typography variant="caption" color="text.secondary">Video Attached</Typography>
                                        </Box>
                                    ) : msg.attachment.type === 'pdf' ? (
                                        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ bgcolor: 'error.light', p: 1.5, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileText size={18} style={{ color: '#ef4444' }} />
                                            </Box>
                                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                                <Typography variant="caption" fontWeight="medium" color={msg.role === 'user' ? 'primary.contrastText' : 'text.primary'}>PDF Document</Typography>
                                                <Typography variant="caption" color={msg.role === 'user' ? 'primary.light' : 'text.secondary'}>Attached for analysis</Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box sx={{ position: 'relative' }}>
                                            <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="Upload" style={{ maxWidth: '200px', maxHeight: '192px', objectFit: 'cover', display: 'block' }} />
                                        </Box>
                                    )}
                                </Box>
                            )}
                            
                            <Box sx={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif' }}>
                                {msg.text}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            ))}
            
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 3, maxWidth: '85%' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.25, boxShadow: 1 }}>
                            <Bot size={16} style={{ color: 'primary.main' }} />
                        </Box>
                        <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 2, borderTopLeftRadius: 0, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'primary.main' }} />
                            <Typography variant="caption" color="text.secondary" fontWeight="medium">Analyzing...</Typography>
                        </Box>
                    </Box>
                </Box>
            )}
            <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            {/* Attachment Preview Area */}
            {attachment && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'background.paper', p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', width: 'fit-content', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <Box sx={{ width: 48, height: 48, bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid', borderColor: 'divider' }}>
                        {attachment.type === 'image' ? (
                            <img src={attachment.preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : attachment.type === 'pdf' ? (
                            <FileText size={20} style={{ color: '#ef4444' }} />
                        ) : (
                            <Video size={18} style={{ color: 'text.secondary' }} />
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" fontWeight="medium" color="text.primary" sx={{ maxWidth: '150px', textOverflow: 'ellipsis', overflow: 'hidden' }}>{attachment.file.name}</Typography>
                        <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight="regular">{attachment.type}</Typography>
                    </Box>
                    <IconButton size="small" onClick={clearAttachment} sx={{ ml: 1, borderRadius: 1, '&:hover': { bgcolor: 'error.light', color: 'error.dark' } }}>
                        <X size={14} />
                    </IconButton>
                </Box>
            )}

            {/* Suggestion Chips */}
            {renderSuggestionChips()}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
                                <input
                                    type="file"
                                    id="file-upload-input" // Added id for accessibility
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept="image/*,video/*,application/pdf"
                                />
                                <label htmlFor="file-upload-input" className="sr-only">Upload PDF (RFI/Invoice) or Media</label>
                                
                                {/* Fix: Wrapped Tooltip child in a span for strict MUI compatibility */}
                                <Tooltip title="Upload PDF (RFI/Invoice) or Media" arrow>                    <span>
                        <IconButton 
                            onClick={() => fileInputRef.current?.click()}
                            sx={{ 
                                bgcolor: attachment ? 'indigo.50' : 'grey.100', 
                                color: attachment ? 'indigo.600' : 'grey.600',
                                border: '1px solid',
                                borderColor: attachment ? 'indigo.200' : 'grey.300',
                                borderRadius: 2,
                                p: 1.5,
                                '&:hover': { bgcolor: 'indigo.100', color: 'indigo.700', transform: 'translateY(-1px)' }
                            }}
                        >
                            <Paperclip size={20} />
                        </IconButton>
                    </span>
                </Tooltip>

                <Box sx={{ flex: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', alignItems: 'center', px: 2, py: 1.5, transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', '&:focus-within': { boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.2) !important', borderColor: 'primary.main' } }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about schedule, or upload RFI PDF for extraction..."
                        className="flex-1 bg-transparent outline-none text-sm text-foreground p-0"
                        autoFocus
                        aria-label="Ask about schedule or upload RFI PDF"
                    />
                </Box>

                <IconButton 
                    type="submit" 
                    disabled={isLoading || (!input.trim() && !attachment)}
                    sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white', 
                        p: 1.5,
                        borderRadius: 2,
                        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.5), 0 2px 4px -1px rgba(79, 70, 229, 0.3)',
                        '&:hover': { bgcolor: 'primary.dark', transform: 'translateY(-1px)', boxShadow: '0 6px 12px -2px rgba(79, 70, 229, 0.6)' },
                        '&.Mui-disabled': { bgcolor: 'grey.300', color: 'grey.500', boxShadow: 'none', transform: 'none' }
                    }}
                >
                    {isLoading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
                </IconButton>
            </Box>
            <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.disabled" fontSize={10}>
                    AI can make mistakes. Verify important project information.
                </Typography>
            </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AIChatModal;
