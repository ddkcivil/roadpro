import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Message } from '../../types';
import { Send, MoreVertical, Hash, Check, CheckCheck, MessageCircle, Mail, Phone, Paperclip, FileText, HardHat, Loader2, X, Download, File, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';
import * as ReactWindow from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const List = (ReactWindow as any).VariableSizeList || ReactWindow.VariableSizeList;

interface Props {
  currentUser: User | null;
  users: User[];
  messages: Message[];
  projectId: string;
  onSendMessage: (text: string, receiverId: string, projectId: string, attachment?: { url: string, name: string, type: string }) => void;
  onMarkRead?: (messageId: string) => void;
  isLoading?: boolean;
}

const MessagesModule: React.FC<Props> = ({ currentUser, users = [], messages = [], projectId, onSendMessage, onMarkRead, isLoading = false }) => {
  const [activeChatId, setActiveChatId] = useState<string>('general');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ file: File, preview: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const listRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const itemSizeMap = useRef<Record<number, number>>({});

  const setRowHeight = useCallback((index: number, size: number) => {
    const clampedSize = Math.max(40, size); // Enforce minimum row height
    if (itemSizeMap.current[index] !== clampedSize) {
        itemSizeMap.current[index] = clampedSize;
        if (listRef.current) {
            listRef.current.resetAfterIndex(0); // Reset from 0 to recalculate all positions
        }
    }
  }, []);

  const getItemSize = (index: number) => {
    const cached = itemSizeMap.current[index];
    if (cached) return cached;
    // Return a reasonable default based on message content length
    const msg = activeMessages[index];
    if (!msg) return 100;
    const contentLength = (msg.content || '').length;
    const hasAttachment = !!msg.attachmentUrl;
    // Rough estimate: ~20px per line, base 60px for bubble + padding + timestamp
    const estimatedLines = Math.max(1, Math.ceil(contentLength / 60));
    const baseHeight = 60 + (estimatedLines * 20);
    const attachmentHeight = hasAttachment ? 200 : 0;
    return Math.min(baseHeight + attachmentHeight, 400); // Cap at 400px estimate
  };

  // Handle mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(activeChatId === null);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [activeChatId]);

  const selectChat = (id: string) => {
    setActiveChatId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Mark unread messages as read when active chat changes
  useEffect(() => {
    if (onMarkRead && activeChatId && currentUser) {
      const unread = messages.filter(m => 
        m.receiverId === currentUser.id && 
        m.senderId === activeChatId && 
        !m.read
      );
      unread.forEach(m => onMarkRead(m.id));
    }
  }, [activeChatId, messages, currentUser, onMarkRead]);

  // Helper to get user details
  const getUser = useCallback((id: string) => (users || []).find(u => u.id === id), [users]);

  const activeMessages = useMemo(() => {
    if (activeChatId === 'general') {
        return (messages || []).filter(m => m.receiverId === 'general' && m.projectId === projectId);
    }
    return (messages || []).filter(m => 
        ((m.senderId === currentUser?.id && m.receiverId === activeChatId) ||
        (m.senderId === activeChatId && m.receiverId === currentUser?.id)) &&
        m.projectId === projectId
    );
  }, [messages, activeChatId, projectId, currentUser]);

  // Clear cached row heights whenever the active chat or message list changes,
  // otherwise stale index-keyed heights cause rows to overlap.
  useEffect(() => {
    itemSizeMap.current = {};
    if (listRef.current) listRef.current.resetAfterIndex(0, true);
  }, [activeChatId, activeMessages.length, projectId]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current && activeMessages.length > 0) {
      listRef.current.scrollToItem(activeMessages.length - 1, 'end');
    }
  }, [activeMessages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const onScroll = ({ scrollOffset, scrollDirection }: any) => {
    // Show jump button if scrolling up significantly
    if (scrollDirection === 'backward' && scrollOffset > 100) {
      setShowScrollButton(true);
    } else if (scrollDirection === 'forward') {
      setShowScrollButton(false);
    }
  };

  const MessageRow = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const rowRef = useRef<HTMLDivElement>(null);
    
    // Use ResizeObserver for more robust height tracking
    useEffect(() => {
        if (!rowRef.current) return;
        
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setRowHeight(index, entry.contentRect.height + 8); // Add small buffer
            }
        });
        
        observer.observe(rowRef.current);
        return () => observer.disconnect();
    }, [index, setRowHeight]);

    const msg = activeMessages[index];
    if (!msg) return null;
    const isMe = msg.senderId === currentUser?.id;
    const sender = getUser(msg.senderId);
    
    // Grouping logic for tighter spacing
    const nextMsg = index < activeMessages.length - 1 ? activeMessages[index+1] : null;
    const prevMsg = index > 0 ? activeMessages[index-1] : null;
    
    const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;
    const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
    const isNewDay = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();

    const renderAttachment = () => {
        if (!msg.attachmentUrl) return null;

        const isImage = msg.attachmentType?.startsWith('image/');
        
        return (
            <div className={cn(
                "mt-2 p-2 rounded-lg border bg-background/50 flex flex-col gap-2 overflow-hidden",
                isMe ? "border-primary-foreground/20" : "border-border"
            )}>
                {isImage ? (
                    <div className="relative group max-w-sm">
                        <img 
                            src={msg.attachmentUrl} 
                            alt={msg.attachmentName} 
                            className="rounded border max-h-60 w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                            onLoad={() => {
                                // Re-trigger height calculation once image loads
                                if (rowRef.current) setRowHeight(index, rowRef.current.getBoundingClientRect().height + 8);
                            }}
                            onClick={() => window.open(msg.attachmentUrl, '_blank')}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); window.open(msg.attachmentUrl, '_blank'); }}>
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 py-1">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{msg.attachmentName}</p>
                            <p className="text-[10px] opacity-60 uppercase">{msg.attachmentType?.split('/')[1] || 'File'}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => window.open(msg.attachmentUrl, '_blank')}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
      <div 
        style={{ ...style, position: 'absolute' }} 
        className={cn("px-3", isFirstInGroup || isNewDay ? "pt-4" : "pt-1")}
        ref={rowRef}
      >
        {isNewDay && (
            <div className="flex items-center justify-center my-4">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 rounded-full border">
                    {new Date(msg.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="h-[1px] flex-1 bg-border" />
            </div>
        )}
        <div className={cn("flex", isMe ? 'justify-end' : 'justify-start')}>
            <div className={cn("flex max-w-[85%] gap-2", isMe ? 'flex-row-reverse' : 'flex-row')}>
                {!isMe && (
                    <div className="w-8 shrink-0">
                      {isFirstInGroup && (
                        <Avatar className="h-8 w-8 shadow-sm"> 
                           <AvatarImage src={sender?.avatar} />
                           <AvatarFallback className="bg-primary/10 text-primary text-xs">{(sender?.name || '?').charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                )}
                             
                <div className="min-w-0">
                    {isFirstInGroup && !isMe && <p className="text-[10px] font-bold text-muted-foreground ml-1 mb-0.5 uppercase tracking-wider">{sender?.name}</p>}
                    <div className={cn(
                        "p-3 shadow-sm text-sm relative break-words transition-all",
                        isMe ? 'bg-primary text-primary-foreground' : 'bg-card border',
                        isFirstInGroup && isMe ? 'rounded-2xl rounded-tr-sm' : 
                        isFirstInGroup && !isMe ? 'rounded-2xl rounded-tl-sm' : 'rounded-2xl'
                    )}>
                        {msg.content}
                        {renderAttachment()}
                        <div className={cn(
                            "text-[10px] mt-1 flex items-center justify-end",
                            isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        )}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {isMe && (msg.read ? <CheckCheck className="h-3 w-3 ml-1"/> : <Check className="h-3 w-3 ml-1"/>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  };

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() && !attachedFile) return;

      let attachment = undefined;

      if (attachedFile) {
          setIsUploading(true);
          try {
              const { fileToCompressedBase64 } = await import('../../utils/data/imageUtils');
              const base64 = await fileToCompressedBase64(attachedFile.file);

              attachment = {
                  url: base64,
                  name: attachedFile.file.name,
                  type: attachedFile.file.type
              };
          } catch (error) {
              toast.error("Failed to process attachment");
              setIsUploading(false);
              return;
          }
      }
      
      try {
          await onSendMessage(inputText, activeChatId, projectId, attachment);
          setInputText('');
          if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview);
          setAttachedFile(null);
          // Scroll to bottom immediately after sending
          setTimeout(scrollToBottom, 100);
      } catch (error: any) {
          console.error('Failed to send message:', error);
          toast.error("Failed to send message", { description: error.message || "An unexpected error occurred." });
      } finally {
          setIsUploading(false);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { // Reduced to 2MB for base64 safety
              toast.error("File too large", { description: "Maximum size is 2MB for chat attachments." });
              return;
          }
          setAttachedFile({
              file,
              preview: URL.createObjectURL(file)
          });
      }
  };

  const removeAttachment = () => {
      if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview);
      setAttachedFile(null);
  };

  const filteredUsers = (users || []).filter(u => 
      u && u.id !== currentUser?.id && 
      (u.name || 'User').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWhatsAppClick = (phone?: string) => {
      if (!phone) {
          toast.info("No phone number available for this user.");
          return;
      }
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleEmailClick = (email?: string) => {
      if (!email) {
          toast.info("No email address available for this user.");
          return;
      }
      window.location.href = `mailto:${email}`;
  };

  const handleLinkRFI = () => {
      setInputText(prev => prev + "Ref: RFI/CH/12+500 ");
  };
  const handleLinkBOQ = () => {
      setInputText(prev => prev + "Ref: Item 4.01 (GSB) ");
  };

  const activeUser = getUser(activeChatId);

  const isOnline = useCallback((user?: User) => {
    if (!user?.lastSeen) return false;
    const lastSeenDate = new Date(user.lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / 60000;
    return diffMinutes < 5; // Online if seen in last 5 minutes
  }, []);

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-xl border bg-card text-card-foreground shadow-lg overflow-hidden relative">
        {/* Sidebar */}
        <div className={cn(
            "flex w-full md:w-80 flex-col border-r bg-muted/40 transition-all duration-300 absolute md:relative z-20 h-full",
            !isSidebarOpen && "-translate-x-full md:translate-x-0"
        )}>
            <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
                <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight">Messages</h2>
                <div className="relative">
                     <Input 
                        placeholder="Search for people..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50 border-2 focus-visible:ring-primary"
                        aria-label="Search for people"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-4 py-2 uppercase text-[10px] font-black tracking-widest text-muted-foreground mt-2 opacity-50">Channels</div>
                
                <div 
                    onClick={() => selectChat('general')}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all mx-2 rounded-xl mt-1
                                ${activeChatId === 'general' ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'}`}
                >
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-colors",
                        activeChatId === 'general' ? 'bg-white/20' : 'bg-primary/10 text-primary'
                    )}>
                        <Hash className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold truncate leading-tight">Project General</p>
                        <p className={cn(
                            "text-[10px] uppercase font-black tracking-tighter truncate opacity-70",
                            activeChatId === 'general' ? 'text-primary-foreground' : 'text-muted-foreground'
                        )}>Team announcements</p>
                    </div>
                </div>

                <div className="px-4 py-2 uppercase text-[10px] font-black tracking-widest text-muted-foreground mt-4 opacity-50">Direct Messages</div>
                
                <div className="px-2 space-y-1">
                    {filteredUsers.map(user => {
                        const userMessages = (messages || []).filter(m => (m.senderId === user.id && m.receiverId === currentUser?.id) || (m.senderId === currentUser?.id && m.receiverId === user.id));
                        const lastMsg = userMessages[userMessages.length - 1];
                        const unreadCount = (messages || []).filter(m => m.senderId === user.id && m.receiverId === currentUser?.id && !m.read).length;

                        return (
                            <div 
                                key={user.id}
                                onClick={() => selectChat(user.id)}
                                className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-all rounded-xl
                                            ${activeChatId === user.id ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted'}`}
                                title={user.phone ? `Phone: ${user.phone}` : ''}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="h-10 w-10 border-2 border-transparent group-hover:border-primary/20 transition-all">
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback className={cn(activeChatId === user.id ? "bg-white/20 text-white" : "bg-primary/5 text-primary")}>
                                            {user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {isOnline(user) && (
                                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background shadow-sm" />
                                    )}
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-background animate-bounce">
                                            {unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <p className="font-bold truncate leading-none">{user.name}</p>
                                        {lastMsg && <p className={cn("text-[9px] font-black uppercase tracking-tighter", activeChatId === user.id ? "text-primary-foreground/70" : "text-muted-foreground")}>{new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                                    </div>
                                    <p className={cn(
                                        "text-[10px] truncate leading-tight",
                                        activeChatId === user.id ? "text-primary-foreground/80" : "text-muted-foreground"
                                    )}>
                                        {lastMsg ? (lastMsg.senderId === currentUser?.id ? 'You: ' + lastMsg.content : lastMsg.content) : user.role}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col bg-background z-10">
             {/* Header */}
             <div className="flex min-h-[80px] items-center justify-between border-b bg-card/50 backdrop-blur-md px-4 md:px-6 py-2 shrink-0">
                 <div className="flex items-center gap-3 md:gap-4">
                     {/* Mobile Back Button */}
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden" 
                        onClick={() => setIsSidebarOpen(true)}
                    >
                         <ChevronLeft className="h-6 w-6" />
                     </Button>

                     {activeChatId === 'general' ? (
                         <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                             <Hash className="h-5 w-5 md:h-6 md:w-6" />
                         </div>
                     ) : (
                         <div className="relative">
                            <Avatar className="h-10 w-10 md:h-12 md:w-12 shadow-md"> 
                                <AvatarImage src={activeUser?.avatar} />
                                <AvatarFallback className="bg-primary/5 text-primary">{(activeUser?.name || '?').charAt(0)}</AvatarFallback>
                            </Avatar>
                            {isOnline(activeUser) && (
                                <span className="absolute bottom-0 right-0 h-3 md:h-3.5 w-3 md:w-3.5 rounded-full bg-emerald-500 ring-2 ring-card shadow-sm" />
                            )}
                         </div>
                     )}
                     <div className="min-w-0">
                         <h3 className="text-lg md:text-xl font-black text-foreground leading-tight truncate tracking-tight">
                             {activeChatId === 'general' ? 'Project General' : activeUser?.name}
                         </h3>
                         <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-2">
                             {activeChatId === 'general' ? (
                                <Badge variant="outline" className="h-4 py-0 text-[8px] font-black uppercase tracking-widest">{users.length} members</Badge>
                             ) : (
                                 <div className="flex items-center gap-x-2 truncate">
                                     <Badge className="h-4 py-0 text-[8px] font-black uppercase tracking-widest">{activeUser?.role}</Badge>
                                     <span className="hidden sm:inline-flex items-center gap-1 font-mono">
                                         <Phone className="h-3 w-3" /> {activeUser?.phone || 'No phone'}
                                     </span>
                                 </div>
                             )}
                             {activeChatId !== 'general' && isOnline(activeUser) && (
                                <span className="text-emerald-500 font-black uppercase tracking-widest text-[8px] flex items-center gap-1">
                                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Online
                                </span>
                             )}
                         </div>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-1 md:gap-2">
                     {activeChatId !== 'general' && activeUser && (
                         <>
                             <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => handleEmailClick(activeUser.email)}
                                className="hidden lg:flex font-bold h-9"
                                disabled={!activeUser.email}
                             >
                                <Mail className="mr-2 h-4 w-4" /> Email
                             </Button>
                             <Button 
                                variant="default"
                                size="sm"
                                onClick={() => handleWhatsAppClick(activeUser.phone)} 
                                className="hidden lg:flex bg-green-500 hover:bg-green-600 text-white font-bold h-9"
                                disabled={!activeUser.phone}
                             >
                                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                             </Button>
                             
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleEmailClick(activeUser.email)} className="lg:hidden h-9 w-9" disabled={!activeUser.email}>
                                            <Mail className="h-5 w-5 text-muted-foreground" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Email</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleWhatsAppClick(activeUser.phone)} className="lg:hidden h-9 w-9 text-green-600" disabled={!activeUser.phone}>
                                            <MessageCircle className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>WhatsApp</TooltipContent>
                                </Tooltip>
                             </TooltipProvider>

                             <Separator orientation="vertical" className="h-6 mx-1 md:mx-2" />
                         </>
                     )}
                     <Button variant="ghost" size="icon" className="h-9 w-9"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                 </div>
             </div>

             {/* Messages */}
             <div className="flex-1 min-h-0 bg-slate-50/30 relative">
                 {activeMessages.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-full opacity-60">
                         {isLoading ? (
                             <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hydrating encrypted channel...</p>
                             </div>
                         ) : (
                             <>
                                 <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4 shadow-inner border-4 border-background">
                                     {activeChatId === 'general' ? <Hash className="h-10 w-10 text-muted-foreground/50" /> : <MessageCircle className="h-10 w-10 text-muted-foreground/50" />}
                                 </div>
                                 <h4 className="text-lg font-black tracking-tight text-foreground">Secure Channel Initialized</h4>
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">
                                     {activeChatId === 'general' ? 'Broadcasts will appear here.' : `Direct link with ${activeUser?.name.split(' ')[0]} established.`}
                                 </p>
                             </>
                         )}
                     </div>
                 ) : (
                     <>
                        <AutoSizer>
                            {({ height, width }) => (
                            <List
                                ref={listRef}
                                height={height}
                                width={width}
                                itemCount={activeMessages.length}
                                itemSize={getItemSize} 
                                className="scrollbar-hide"
                                onScroll={onScroll}
                                style={{ padding: '4px 0' }}
                            >
                                {MessageRow}
                            </List>
                            )}
                        </AutoSizer>
                        {showScrollButton && (
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                onClick={scrollToBottom}
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full shadow-2xl border-2 bg-background/80 backdrop-blur-md animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300 font-bold"
                            >
                                <ChevronRight className="rotate-90 mr-2 h-4 w-4" /> Latest messages
                            </Button>
                        )}
                     </>
                 )}
             </div>

             {/* Input Area */}
             <div className="border-t bg-card/50 backdrop-blur-sm p-4 relative z-30">
                 {attachedFile && (
                     <div className="mb-4 p-3 rounded-2xl bg-muted/80 border-2 border-primary/20 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-300 shadow-xl">
                         <div className="w-14 h-14 rounded-xl border-2 border-background bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                             {attachedFile.file.type.startsWith('image/') ? (
                                 <img src={attachedFile.preview} alt="Preview" className="w-full h-full object-cover" />
                             ) : (
                                 <File className="h-7 w-7 text-muted-foreground" />
                             )}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="text-xs font-black truncate text-foreground">{attachedFile.file.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="h-4 py-0 text-[8px] font-black uppercase">{(attachedFile.file.size / 1024).toFixed(0)} KB</Badge>
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-widest">Ready for uplink</span>
                             </div>
                         </div>
                         <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={removeAttachment}>
                             <X className="h-5 w-5" />
                         </Button>
                     </div>
                 )}

                 <div className="flex gap-1 mb-2">
                     <TooltipProvider>
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                    <Paperclip className="h-5 w-5" />
                                 </Button>
                             </TooltipTrigger>
                             <TooltipContent>Attach Media/File</TooltipContent>
                         </Tooltip>
                         <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} aria-label="Attach media or file" />
                         
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-amber-100 hover:text-amber-600" onClick={handleLinkRFI}><HardHat className="h-5 w-5" /></Button>
                             </TooltipTrigger>
                             <TooltipContent>Inject RFI Reference</TooltipContent>
                         </Tooltip>
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-indigo-100 hover:text-indigo-600" onClick={handleLinkBOQ}><FileText className="h-5 w-5" /></Button>
                             </TooltipTrigger>
                             <TooltipContent>Inject BOQ Reference</TooltipContent>
                         </Tooltip>
                     </TooltipProvider>
                 </div>
                 <form onSubmit={handleSend} className="flex gap-3">
                     <Textarea 
                         placeholder={`Secure message to ${activeChatId === 'general' ? '#general' : activeUser?.name.split(' ')[0] || 'chat'}...`}
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         className="flex-1 resize-none min-h-[56px] rounded-2xl p-4 bg-muted/80 border-2 border-transparent focus-visible:border-primary/30 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all font-medium text-sm"
                         onKeyDown={(e) => {
                             if (e.key === 'Enter' && !e.shiftKey) {
                                 e.preventDefault();
                                 handleSend(e as any);
                             }
                         }}
                         aria-label="Message input"
                     />
                     <Button 
                         type="submit" 
                         disabled={(!inputText.trim() && !attachedFile) || isUploading}
                         size="icon"
                         className="h-[56px] w-[56px] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
                     >
                         {isUploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Send className="h-7 w-7" />}
                     </Button>
                 </form>
             </div>
        </div>
    </div>
  );
};

export default MessagesModule;
