import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../../types';
import { Send, Search, MoreVertical, Hash, User as UserIcon, Check, CheckCheck, MessageCircle, Mail, Phone, Paperclip, FileText, HardHat } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';
import { toast } from 'sonner';

interface Props {
  currentUser: User | null;
  users: User[];
  messages: Message[];
  projectId: string;
  onSendMessage: (text: string, receiverId: string, projectId: string) => void;
}

const MessagesModule: React.FC<Props> = ({ currentUser, users = [], messages = [], projectId, onSendMessage }) => {
  const [activeChatId, setActiveChatId] = useState<string>('general');
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChatId]);

  const getFilteredMessages = () => {
      if (activeChatId === 'general') {
          return (messages || []).filter(m => m.receiverId === 'general' && m.projectId === projectId);
      }
      // Direct messages between current user and selected user
      return (messages || []).filter(m => 
          ((m.senderId === currentUser?.id && m.receiverId === activeChatId) ||
          (m.senderId === activeChatId && m.receiverId === currentUser?.id)) &&
          m.projectId === projectId
      );
  };

  const activeMessages = getFilteredMessages();

  const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim()) return;
      onSendMessage(inputText, activeChatId, projectId);
      setInputText('');
  };

  // Helper to get user details
  const getUser = (id: string) => (users || []).find(u => u.id === id);

  const filteredUsers = (users || []).filter(u => 
      u.id !== currentUser?.id && 
      u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWhatsAppClick = (phone?: string) => {
      if (!phone) {
          toast.info("No phone number available for this user.");
          return;
      }
      // Simple sanitize
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

  // Mock handlers for enhancements
  const handleAttach = () => toast.info("Attachment Feature: Opens file picker.");
  const handleLinkRFI = () => {
      setInputText(prev => prev + "Ref: RFI/CH/12+500 ");
  };
  const handleLinkBOQ = () => {
      setInputText(prev => prev + "Ref: Item 4.01 (GSB) ");
  };

  const activeUser = getUser(activeChatId);

  return (
    <div className="flex h-[calc(100vh-140px)] rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Sidebar */}
        <div className="flex w-80 flex-col border-r bg-muted/40">
            <div className="p-4 border-b">
                <h2 className="text-2xl font-bold text-foreground mb-3">Messages</h2>
                <Input 
                    placeholder="Search people..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<Search className="h-4 w-4 text-muted-foreground" />} // Assuming Input can take an icon prop
                />
            </div>

            <ScrollArea className="flex-1">
                <div className="px-4 py-2 uppercase text-xs font-bold text-muted-foreground mt-1">Channels</div>
                
                <div 
                    onClick={() => setActiveChatId('general')}
                    className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all 
                                ${activeChatId === 'general' ? 'bg-primary/10 border-r-4 border-primary' : 'hover:bg-muted/60'}`}
                >
                    <div className="w-10 h-10 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                        <Hash className="h-5 w-5" />
                    </div>
                    <div>
                        <p className={`font-semibold ${activeChatId === 'general' ? 'text-primary' : 'text-foreground'}`}>Project General</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">Team announcements</p>
                    </div>
                </div>

                <div className="px-4 py-2 uppercase text-xs font-bold text-muted-foreground mt-4">Direct Messages</div>
                
                {filteredUsers.map(user => {
                    const userMessages = (messages || []).filter(m => (m.senderId === user.id && m.receiverId === currentUser?.id) || (m.senderId === currentUser?.id && m.receiverId === user.id));
                    const lastMsg = userMessages.pop();
                    const unreadCount = (messages || []).filter(m => m.senderId === user.id && m.receiverId === currentUser?.id && !m.read).length;

                    return (
                        <div 
                            key={user.id}
                            onClick={() => setActiveChatId(user.id)}
                            className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-all 
                                        ${activeChatId === user.id ? 'bg-primary/10 border-r-4 border-primary' : 'hover:bg-muted/60'}`}
                            title={user.phone ? `Phone: ${user.phone}` : ''}
                        >
                            <div className="relative">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {unreadCount > 0 && (
                                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-red-500 ring-2 ring-background" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <p className={`font-semibold ${activeChatId === user.id ? 'text-primary' : 'text-foreground'}`}>{user.name}</p>
                                    {lastMsg && <p className="text-xs text-muted-foreground">{new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                    {lastMsg ? (lastMsg.senderId === currentUser?.id ? 'You: ' + lastMsg.content : lastMsg.content) : user.role}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex flex-1 flex-col bg-background">
             {/* Header */}
             <div className="flex min-h-[80px] items-center justify-between border-b bg-card px-6 py-2 shrink-0">
                 <div className="flex items-center gap-4">
                     {activeChatId === 'general' ? (
                         <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow">
                             <Hash className="h-6 w-6" />
                         </div>
                     ) : (
                         <Avatar className="h-12 w-12"> 
                            <AvatarImage src={activeUser?.avatar} />
                            <AvatarFallback>{activeUser?.name.charAt(0)}</AvatarFallback>
                         </Avatar>
                     )}
                     <div>
                         <h3 className="text-xl font-bold text-foreground leading-tight">
                             {activeChatId === 'general' ? 'Project General' : activeUser?.name}
                         </h3>
                         <p className="text-sm text-muted-foreground">
                             {activeChatId === 'general' ? `${users.length} members` : (
                                 <span className="flex flex-col sm:flex-row items-start sm:items-center gap-x-3 text-sm mt-1">
                                     <Badge className="font-bold">{activeUser?.role}</Badge>
                                     {activeUser?.phone && (
                                         <span className="flex items-center gap-1 font-mono text-muted-foreground">
                                             <Phone className="h-3 w-3" /> {activeUser.phone}
                                         </span>
                                     )}
                                     {activeUser?.email && (
                                         <span className="flex items-center gap-1 text-muted-foreground">
                                             <Mail className="h-3 w-3" /> {activeUser.email}
                                         </span>
                                     )}
                                 </span>
                             )}
                         </p>
                     </div>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     {activeChatId !== 'general' && activeUser && (
                         <>
                             <Button 
                                variant="outline"
                                size="sm" 
                                onClick={() => handleEmailClick(activeUser.email)}
                                className="hidden md:flex"
                             >
                                <Mail className="mr-2 h-4 w-4" /> Email
                             </Button>
                             <Button 
                                variant="default"
                                size="sm"
                                onClick={() => handleWhatsAppClick(activeUser.phone)} 
                                className="hidden md:flex bg-green-500 hover:bg-green-600 text-white"
                             >
                                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                             </Button>
                             
                             {/* Mobile Icons */}
                             <Button variant="ghost" size="icon" onClick={() => handleEmailClick(activeUser.email)} className="md:hidden">
                                 <Mail className="h-5 w-5 text-muted-foreground" />
                             </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleWhatsAppClick(activeUser.phone)} className="md:hidden bg-green-500/10 hover:bg-green-500/20 text-green-600">
                                 <MessageCircle className="h-5 w-5" />
                             </Button>

                             <Separator orientation="vertical" className="h-6 mx-2" />
                         </>
                     )}
                     <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5 text-muted-foreground" /></Button>
                 </div>
             </div>

             {/* Messages */}
             <ScrollArea className="flex-1 p-6 space-y-4">
                 {activeMessages.length === 0 ? (
                     <div className="text-center py-10 opacity-60">
                         <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                             {activeChatId === 'general' ? <Hash className="h-8 w-8 text-muted-foreground" /> : <MessageCircle className="h-8 w-8 text-muted-foreground" />}
                         </div>
                         <p className="text-muted-foreground">
                             {activeChatId === 'general' ? 'No announcements yet.' : `Start a conversation with ${activeUser?.name.split(' ')[0]}.`}
                         </p>
                     </div>
                 ) : (
                     activeMessages.map((msg, index) => {
                         const isMe = msg.senderId === currentUser?.id;
                         const sender = getUser(msg.senderId);
                         const showHeader = index === 0 || activeMessages[index-1].senderId !== msg.senderId;
             
                         return (
                             <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`flex max-w-[70%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                     {!isMe && showHeader && (
                                         <Avatar className="h-8 w-8"> 
                                            <AvatarImage src={sender?.avatar} />
                                            <AvatarFallback>{sender?.name.charAt(0)}</AvatarFallback>
                                         </Avatar>
                                     )}
                                     {!isMe && !showHeader && <div className="w-8" />} {/* Spacer */}
                                                  
                                     <div>
                                         {showHeader && !isMe && <p className="text-xs text-muted-foreground ml-1 mb-1">{sender?.name}</p>}
                                         <div className={`p-3 rounded-2xl shadow-sm text-sm relative 
                                                         ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border rounded-tl-sm'}`}>
                                             {msg.content}
                                             <div className={`text-xs mt-1 flex items-center ${isMe ? 'justify-end text-primary-foreground/80' : 'justify-end text-muted-foreground'}`}>
                                                 {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                 {isMe && (msg.read ? <CheckCheck className="h-3 w-3 ml-1"/> : <Check className="h-3 w-3 ml-1"/>)}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                         );
                     })
                 )}
                 <div ref={messagesEndRef} />
             </ScrollArea>

             {/* Input Area with Enhanced Toolbar */}
             <div className="border-t bg-card p-4">
                 <div className="flex gap-2 mb-2 px-1">
                     <TooltipProvider>
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" onClick={handleAttach}><Paperclip className="h-4 w-4 text-muted-foreground" /></Button>
                             </TooltipTrigger>
                             <TooltipContent>Attach File</TooltipContent>
                         </Tooltip>
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" onClick={handleLinkRFI}><HardHat className="h-4 w-4 text-muted-foreground" /></Button>
                             </TooltipTrigger>
                             <TooltipContent>Link RFI</TooltipContent>
                         </Tooltip>
                         <Tooltip>
                             <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" onClick={handleLinkBOQ}><FileText className="h-4 w-4 text-muted-foreground" /></Button>
                             </TooltipTrigger>
                             <TooltipContent>Link BOQ Item</TooltipContent>
                         </Tooltip>
                     </TooltipProvider>
                 </div>
                 <form onSubmit={handleSend} className="flex gap-2">
                     <Textarea 
                         placeholder={`Message ${activeChatId === 'general' ? '#general' : activeUser?.name.split(' ')[0]}...`}
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         className="flex-1 resize-none min-h-[48px] rounded-lg p-3 bg-muted/60 border-0 focus-visible:ring-offset-0 focus-visible:ring-transparent"
                     />
                     <Button 
                         type="submit" 
                         disabled={!inputText.trim()}
                         size="icon"
                         className="h-12 w-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                     >
                         <Send className="h-6 w-6" />
                     </Button>
                 </form>
             </div>
        </div>
    </div>
  );
};

export default MessagesModule;
