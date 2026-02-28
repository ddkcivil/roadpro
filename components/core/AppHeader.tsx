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
    <header className="border-b bg-white dark:bg-slate-900 px-4 flex justify-between items-center h-16 shrink-0 z-10 transition-all duration-200">
      <div className="flex items-center gap-2 md:gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-10 w-10" // Improved touch target
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden lg:flex h-10 w-10" // Improved touch target
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        
        <Separator orientation="vertical" className="h-8 mx-1 hidden lg:block" />
        
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-sm md:text-base font-bold truncate max-w-[150px] md:max-w-[300px]">{currentProject?.name || 'No Project Selected'}</h2>
          {currentProject?.code && <Badge variant="secondary" className="hidden sm:inline-flex px-2 py-0.5">{currentProject.code}</Badge>}
          <Button variant="outline" size="sm" className="h-9 hidden sm:flex px-3" onClick={() => setSelectedProjectId(null)}>
            <LayoutGrid className="mr-2 h-4 w-4" /> Switch
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        <Button 
          variant="ghost" 
          size="sm" 
          className="hidden md:flex items-center gap-2 text-muted-foreground font-medium px-3 border border-slate-200 dark:border-slate-800 rounded-lg h-10 hover:bg-slate-100 transition-all"
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true
            });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4" />
          <span className="text-xs lg:text-sm">Search...</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        
        <div className="flex items-center gap-1 md:gap-2">
          <OfflineIndicator />

          <Toggle 
            size="sm" 
            className="h-10 w-10"
            pressed={themeMode === 'dark'} 
            onPressedChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
          >
            <Sun className="h-5 w-5 dark:scale-0 transition-transform" />
            <Moon className="absolute h-5 w-5 scale-0 dark:scale-100 transition-transform" />
          </Toggle>

          <NotificationsBadge />

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10"
            onClick={() => setIsAIModalOpen(true)}
          >
            <Bot className="h-5 w-5" />
          </Button>

          <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary transition-all cursor-pointer">
            <AvatarImage src={currentUser.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
