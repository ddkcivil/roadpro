import React, { useState, useEffect } from 'react';
import { 
  Menu as MenuIcon, 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  Loader2, 
  CloudCog, 
  Sun, 
  Moon, 
  Bot,
  Search,
  Wifi,
  WifiOff
} from '@/components/icons';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Toggle } from '~/components/ui/toggle';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import NotificationsBadge from './NotificationsBadge';
import { OfflineIndicator } from '../common/OfflineIndicator';
import { Project, UserWithPermissions } from '~/types';

interface AppHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  currentProject?: Project;
  setSelectedProjectId: (id: string | null) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  setIsAIModalOpen: (open: boolean) => void;
  currentUser: UserWithPermissions;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  setSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  currentProject,
  setSelectedProjectId,
  themeMode,
  setThemeMode,
  setIsAIModalOpen,
  currentUser
}) => {
  return (
    <header className="border-b border-border/40 bg-background/60 dark:bg-slate-950/60 backdrop-blur-xl px-4 md:px-8 flex justify-between items-center h-16 shrink-0 z-10 sticky top-0 transition-all duration-500">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-10 w-10 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-2 p-1.5 bg-muted/30 dark:bg-slate-900/40 rounded-2xl border border-border/40 shadow-inner">
            <div className="flex items-center gap-2 px-3 py-1 bg-background dark:bg-slate-950 rounded-xl shadow-sm border border-border/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-sm font-bold tracking-tight text-foreground truncate max-w-[240px]">
                {currentProject?.name || 'Select Workspace'}
              </h2>
            </div>
            
            {currentProject?.code && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black px-2 py-0.5 rounded-lg tracking-wider">
                {currentProject.code}
              </Badge>
            )}
            
            <Separator orientation="vertical" className="h-5 mx-1 opacity-20" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-xs font-bold hover:bg-primary/10 hover:text-primary rounded-xl transition-all" 
              onClick={() => setSelectedProjectId(null)}
            >
              <LayoutGrid className="mr-2 h-4 w-4 opacity-70" /> 
              <span className="opacity-90">Switch</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="hidden md:flex items-center gap-3 text-muted-foreground font-bold px-5 bg-muted/30 dark:bg-slate-900/40 border border-border/40 rounded-2xl h-11 hover:bg-background dark:hover:bg-slate-950 hover:border-primary/40 hover:text-primary transition-all duration-300 group shadow-sm"
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true
            });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4 group-hover:scale-110 transition-transform text-primary/70" />
          <span className="text-xs tracking-tight opacity-80">Intelligence Command</span>
          <div className="ml-3 pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-lg border border-border/60 bg-background dark:bg-slate-900 px-2 font-mono text-[10px] font-black text-muted-foreground/80 shadow-sm">
            <span className="text-xs">⌘</span>K
          </div>
        </Button>
        
        <div className="flex items-center gap-2 md:gap-3">
          <OfflineIndicator />

          <div className="flex items-center gap-1.5 bg-muted/30 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-border/40 shadow-inner">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl transition-all duration-500",
                      themeMode === 'dark' 
                        ? "bg-slate-950 text-blue-400 shadow-lg border border-blue-500/20" 
                        : "bg-white text-amber-500 shadow-md border border-amber-200"
                    )}
                    onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                  >
                    {themeMode === 'light' ? (
                      <Sun className="h-5 w-5 animate-in spin-in-90 duration-500" />
                    ) : (
                      <Moon className="h-5 w-5 animate-in spin-in-90 duration-500 fill-blue-400/20" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-bold text-xs">{themeMode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-5 mx-0.5 opacity-20" />

            <NotificationsBadge />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Bot className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-2xl blur opacity-0 group-hover:opacity-40 transition duration-500"></div>
            <Avatar className="h-10 w-10 border-2 border-background dark:border-slate-900 shadow-xl cursor-pointer relative transition-transform active:scale-95">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-primary grad-primary text-white font-black text-xs uppercase tracking-tighter shadow-inner">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background dark:border-slate-900 rounded-full shadow-sm"></div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
