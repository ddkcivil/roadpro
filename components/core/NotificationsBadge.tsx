import React, { useState } from "react";
import { Bell, Check, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { cn } from '~/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';


// NOTE: This is a refactored version of the NotificationsBadge component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

const NotificationsBadge: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  
  // Early return if context is not ready
  if (!notifications) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'info': default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <div className="flex justify-between items-center p-4">
          <DropdownMenuLabel className="text-lg font-bold">Notifications</DropdownMenuLabel>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { console.log('Mark all read placeholder'); }}
            >
              <Check className="mr-2 h-4 w-4" /> Mark All Read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No notifications. You're all caught up!</p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem key={notification.id} className={cn("flex flex-col items-start gap-1 p-3", !notification.read && "bg-accent/50")}>
                <div className="flex w-full justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getIcon(notification.type)}
                    <span className="font-semibold">{notification.title}</span>
                  </div>
                  {!notification.read && <Badge className="bg-primary/20 text-primary">New</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(notification.timestamp).toLocaleString()}</p>
                <div className="flex gap-2 self-end">
                  {!notification.read && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => console.log('Mark as read placeholder', notification.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mark as read</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => console.log('Dismiss placeholder', notification.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Dismiss</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsBadge;
