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
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-6 flex justify-between items-center h-16 shrink-0 z-10 sticky top-0 transition-all duration-300">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-xl"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <h2 className="text-[13px] font-black px-2 tracking-tight text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {currentProject?.name || 'Select Workspace'}
            </h2>
            {currentProject?.code && (
              <Badge variant="outline" className="bg-white dark:bg-slate-900 border-primary/20 text-primary text-[10px] font-black px-1.5 py-0 rounded-lg">
                {currentProject.code}
              </Badge>
            )}
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-[11px] font-bold hover:bg-primary/10 hover:text-primary rounded-lg" 
              onClick={() => setSelectedProjectId(null)}
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Workspace
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="hidden md:flex items-center gap-2.5 text-muted-foreground font-semibold px-4 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-xl h-10 hover:bg-white dark:hover:bg-slate-900 hover:border-primary/30 hover:text-primary transition-all group"
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true
            });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4 group-hover:scale-110 transition-transform" />
          <span className="text-xs">Intelligence Command</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 font-mono text-[9px] font-black text-muted-foreground opacity-100">
            ⌘K
          </kbd>
        </Button>
        
        <div className="flex items-center gap-1.5 md:gap-2">
          <OfflineIndicator />

          <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
            <Toggle 
              size="sm" 
              className="h-8 w-8 rounded-lg data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:shadow-sm"
              pressed={themeMode === 'dark'} 
              onPressedChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="h-4 w-4 hidden dark:block text-blue-400" />
            </Toggle>

            <Separator orientation="vertical" className="h-4 mx-0.5" />

            <NotificationsBadge />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-500"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Bot className="h-4 w-4" />
            </Button>
          </div>

          <Avatar className="h-9 w-9 ring-2 ring-offset-2 ring-transparent hover:ring-primary transition-all duration-300 cursor-pointer shadow-md">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="bg-primary grad-primary text-white font-black text-xs">{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
