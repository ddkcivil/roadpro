import React from 'react';
import { 
  Menu as MenuIcon, 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  Loader2, 
  CloudCog, 
  Sun, 
  Moon, 
  Bot 
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Toggle } from '~/components/ui/toggle';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import NotificationsBadge from './NotificationsBadge';
import { Project, UserWithPermissions } from '~/types';

interface AppHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  currentProject?: Project;
  setSelectedProjectId: (id: string | null) => void;
  handleManualSync: () => void;
  isSyncing: boolean;
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
  handleManualSync,
  isSyncing,
  themeMode,
  setThemeMode,
  setIsAIModalOpen,
  currentUser
}) => {
  return (
    <header className="border-b bg-white dark:bg-slate-900 p-2 flex justify-between items-center h-14 shrink-0 z-10">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="hidden lg:flex"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
        
        <Separator orientation="vertical" className="h-6 mx-2 hidden lg:block" />
        
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold truncate max-w-[200px]">{currentProject?.name || 'No Project Selected'}</h2>
          {currentProject?.code && <Badge variant="secondary" className="hidden sm:inline-flex">{currentProject.code}</Badge>}
          <Button variant="outline" size="sm" className="h-8 hidden sm:flex" onClick={() => setSelectedProjectId(null)}>
            <LayoutGrid className="mr-2 h-3 w-3" /> Switch
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleManualSync}>
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudCog className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isSyncing ? "Syncing..." : "Live Sheets"}</TooltipContent>
        </Tooltip>
        <Toggle 
          size="sm" 
          pressed={themeMode === 'dark'} 
          onPressedChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-5 w-5 dark:scale-0" />
          <Moon className="absolute h-5 w-5 scale-0 dark:scale-100" />
        </Toggle>
        <NotificationsBadge />
        <Button variant="ghost" size="icon" onClick={() => setIsAIModalOpen(true)}>
          <Bot className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default AppHeader;
