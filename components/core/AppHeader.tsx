import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Menu as MenuIcon, 
  LayoutGrid, 
  Sun, 
  Moon, 
  Bot,
  Search,
  Activity,
  Loader2
} from '@/components/icons';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '~/components/ui/dropdown-menu';
import { 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  Mail as MailIcon, 
  Phone as PhoneIcon 
} from 'lucide-react';
import NotificationsBadge from './NotificationsBadge';
import { OfflineIndicator } from '../common/OfflineIndicator';
import { Project, UserWithPermissions, StaffLocation } from '../../types';
import { cn } from '~/lib/utils';
import { toast } from 'sonner';

interface AppHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  currentProject?: Project;
  onProjectUpdate: (project: Partial<Project>) => void;
  updateLocation: (projectId: string, lat: number, lng: number) => Promise<void>;
  setSelectedProjectId: (id: string | null) => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  setIsAIModalOpen: (open: boolean) => void;
  currentUser: UserWithPermissions;
  onLogout: () => Promise<void>;
}

const AppHeader: React.FC<AppHeaderProps> = React.memo(({
  setSidebarOpen,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  currentProject,
  onProjectUpdate,
  updateLocation,
  setSelectedProjectId,
  themeMode,
  setThemeMode,
  setIsAIModalOpen,
  currentUser,
  onLogout
}) => {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Use a ref for currentProject to avoid stale closures in watchPosition
  const currentProjectRef = useRef(currentProject);
  useEffect(() => {
    currentProjectRef.current = currentProject;
  }, [currentProject]);

  const stopBroadcasting = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsBroadcasting(false);
    toast.info("Broadcast Stopped", { description: "You are no longer sharing your live location." });
  }, []);

  const startBroadcasting = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Not Supported", { description: "Your browser does not support GPS tracking." });
      return;
    }

    setIsBroadcasting(true);
    toast.success("Broadcast Active", { description: "Your live location is being shared with the team." });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const project = currentProjectRef.current;
        
        if (project) {
          updateLocation(project.id, latitude, longitude).catch(err => {
            console.error("[GPS] Update failed:", err);
          });
        }
      },
      (error) => {
        console.error("[GPS] Error:", error);
        stopBroadcasting();
        toast.error("GPS Error", { description: "Failed to access your location. Please check permissions." });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      }
    );
  }, [updateLocation, stopBroadcasting]);

  const toggleBroadcast = () => {
    if (isBroadcasting) {
      stopBroadcasting();
    } else {
      startBroadcasting();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <header className="h-20 flex items-center justify-between px-4 md:px-10 border-b border-white/5 bg-transparent shrink-0 z-10 sticky top-0 transition-all duration-500">
      <div className="flex items-center gap-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden h-12 w-12 hover:bg-white/10 rounded-2xl transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
        
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-3 p-1.5 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/10 shadow-inner">
            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-950 rounded-xl shadow-lg border border-white/10">
              <div className="w-2 h-2 rounded-full grad-primary animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
              <h2 className="text-sm font-black tracking-tight text-foreground truncate max-w-[280px]">
                {currentProject?.name || 'Unassigned Workspace'}
              </h2>
            </div>
            
            {currentProject?.code && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black px-2.5 py-1 rounded-lg tracking-widest uppercase">
                {currentProject.code}
              </Badge>
            )}
            
            <Separator orientation="vertical" className="h-6 mx-1 opacity-10" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 px-4 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-primary rounded-xl transition-all" 
              onClick={() => setSelectedProjectId(null)}
            >
              <LayoutGrid className="mr-2 h-4 w-4 opacity-40" /> 
              <span>Switch</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        {/* Intelligence Command - Modern Omni-search trigger */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="hidden xl:flex items-center gap-4 text-muted-foreground font-black px-6 bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl h-12 hover:bg-white/10 hover:border-primary/30 hover:text-primary transition-all duration-500 group shadow-sm"
          onClick={() => {
            const event = new KeyboardEvent('keydown', {
              key: 'k',
              ctrlKey: true,
              bubbles: true
            });
            document.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4 group-hover:scale-110 transition-transform text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase opacity-60">Intelligence Command</span>
          <div className="ml-4 pointer-events-none inline-flex h-7 select-none items-center gap-1.5 rounded-lg border border-white/10 bg-white dark:bg-slate-900 px-2.5 font-mono text-[10px] font-black text-muted-foreground/80 shadow-inner">
            <span className="text-xs">⌘</span>K
          </div>
        </Button>
        
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:block">
            <OfflineIndicator />
          </div>

          <div className="flex items-center gap-2 bg-black/5 dark:bg-white/5 p-1.5 rounded-[1.25rem] border border-white/10 shadow-inner">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-xl transition-all duration-500",
                      isBroadcasting 
                        ? "bg-red-500/10 text-red-500 border border-red-500/30 animate-pulse" 
                        : "hover:bg-primary/10 hover:text-primary"
                    )}
                    onClick={toggleBroadcast}
                  >
                    {isBroadcasting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Activity className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="grad-slate border-none text-[10px] font-black">
                  {isBroadcasting ? 'STOP BROADCAST' : 'START LIVE TRACKING'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-1 opacity-10" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-xl transition-all duration-500",
                      themeMode === 'dark' 
                        ? "bg-slate-950 text-blue-400 shadow-xl border border-blue-500/20 active-glow" 
                        : "bg-white text-amber-500 shadow-lg border border-amber-200"
                    )}
                    onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
                  >
                    {themeMode === 'light' ? (
                      <Sun className="h-5 w-5 animate-in spin-in-90 duration-700" />
                    ) : (
                      <Moon className="h-5 w-5 animate-in spin-in-90 duration-700 fill-blue-400/20" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="grad-slate border-none text-[10px] font-black">
                  {themeMode === 'light' ? 'NIGHT MISSION' : 'DAY MISSION'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Separator orientation="vertical" className="h-6 mx-1 opacity-10" />

            <NotificationsBadge />

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300 group"
              onClick={() => setIsAIModalOpen(true)}
            >
              <Bot className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative group ml-2 cursor-pointer">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-primary via-indigo-500 to-violet-600 rounded-2xl blur opacity-0 group-hover:opacity-40 transition duration-700"></div>
                <div className="h-11 w-11 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl relative transition-transform duration-500 hover:scale-105 active:scale-95">
                  <Avatar className="h-full w-full rounded-none">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-tighter rounded-none">
                      {currentUser.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl glass animate-in zoom-in-95 duration-300" align="end" sideOffset={12}>
              <div className="relative h-24 bg-gradient-to-br from-primary via-indigo-600 to-violet-700">
                <div className="absolute inset-0 opacity-20 mesh-gradient"></div>
                <div className="absolute -bottom-10 left-6">
                  <div className="h-20 w-20 rounded-3xl border-4 border-white/20 shadow-2xl overflow-hidden glass">
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage src={currentUser.avatar} />
                      <AvatarFallback className="bg-slate-900 text-white font-black text-xl">
                        {currentUser.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              
              <div className="pt-12 pb-6 px-6">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black tracking-tighter text-foreground leading-tight">{currentUser.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
                      {currentUser.role}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      Active Now
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                      <MailIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Network Address</span>
                      <span className="text-sm font-bold truncate max-w-[180px]">{currentUser.email || 'not-assigned@roadmaster.os'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                      <PhoneIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Secure Line</span>
                      <span className="text-sm font-bold">{currentUser.phone || '9779800000000'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-white/10 group-hover/item:bg-emerald-500/10 group-hover/item:text-emerald-500 transition-colors">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Security Clearance</span>
                      <span className="text-sm font-bold">Authenticated Terminal</span>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator className="my-6 opacity-10" />

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] border-white/10 hover:bg-white/5">
                    <Settings className="mr-2 h-4 w-4 opacity-40" />
                    Settings
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/20"
                    onClick={() => onLogout()}
                  >
                    <LogOut className="mr-2 h-4 w-4 opacity-40" />
                    Disconnect
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});

export default AppHeader;
