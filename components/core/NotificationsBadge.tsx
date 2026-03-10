import React from "react";
import { Bell, Check, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

import { Button } from '~/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Tooltip, TooltipContent } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';


// NOTE: This is a refactored version of the NotificationsBadge component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

const NotificationsBadge: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  
  if (!notifications) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-8 w-8 rounded-lg">
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <div className="p-1.5 rounded-lg bg-emerald-500/10"><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /></div>;
      case 'warning': return <div className="p-1.5 rounded-lg bg-amber-500/10"><AlertCircle className="h-3.5 w-3.5 text-amber-500" /></div>;
      case 'error': return <div className="p-1.5 rounded-lg bg-rose-500/10"><AlertCircle className="h-3.5 w-3.5 text-rose-500" /></div>;
      case 'info': default: return <div className="p-1.5 rounded-lg bg-blue-500/10"><Info className="h-3.5 w-3.5 text-blue-500" /></div>;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500 transition-colors">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center bg-rose-500 text-white text-[8px] font-black rounded-full ring-2 ring-background animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 rounded-2xl glass border-white/10 shadow-2xl overflow-hidden" align="end" sideOffset={10}>
        <div className="flex justify-between items-center px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-white/5">
          <DropdownMenuLabel className="text-xs font-black uppercase tracking-widest opacity-70">Intelligence Feed</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-[10px] font-black hover:bg-primary/10 hover:text-primary rounded-lg"
              onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
            >
              CLEAR ALL
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center opacity-40">
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
                <Bell size={24} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider">No active alerts</p>
            </div>
          ) : (
            <div className="p-1">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-xl transition-all duration-200 mb-1 group cursor-default",
                    !notification.read ? "bg-primary/5 border border-primary/10" : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  )}
                >
                  <div className="flex w-full justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight">{notification.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">{notification.message}</p>
                      </div>
                    </div>
                    {!notification.read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shadow-[0_0_8px_rgba(var(--primary),0.5)]" />}
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 pl-9">
                    <span className="text-[9px] font-black text-muted-foreground opacity-50 uppercase tracking-tight">
                      {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-600" 
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-lg hover:bg-rose-500/10 hover:text-rose-600" 
                        onClick={() => removeNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 bg-slate-50/30 dark:bg-slate-950/10 border-t border-white/5 text-center">
           <Button variant="ghost" size="sm" className="w-full h-8 text-[10px] font-bold opacity-60 hover:opacity-100">
              VIEW SYSTEM LOGS
           </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsBadge;
