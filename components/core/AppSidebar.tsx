import React, { memo, startTransition } from 'react';
import { 
  HardHat, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  Settings
} from '@/components/icons';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { cn } from '~/lib/utils';
import { NavGroup } from '~/config/navigation';
import { UserWithPermissions } from '~/types';
import { motion } from 'framer-motion';

interface AppSidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navGroups: NavGroup[];
  currentUser: UserWithPermissions;
  logout: (selectedProjectId?: string, projectName?: string) => void;
  selectedProjectId: string | null;
  projectName?: string;
}

const groupColors: Record<string, string> = {
  'Project Overview': 'text-blue-500',
  'Commercial & Finance': 'text-amber-500',
  'Field Operations': 'text-indigo-500',
  'Resource Management': 'text-violet-500',
  'Quality & Engineering': 'text-emerald-500',
  'Administration': 'text-slate-500',
};

const AppSidebar: React.FC<AppSidebarProps> = memo(({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  navGroups,
  currentUser,
  logout,
  selectedProjectId,
  projectName
}) => {
  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 glass border-r-white/10">
          <SheetHeader className="p-4 border-b border-white/10">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 grad-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <HardHat size={20} strokeWidth={2.5} />
              </div>
              <span className="font-black tracking-tight">RoadMaster<span className="text-primary italic">Pro</span></span>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)]">
            <nav className="grid items-start gap-1 p-4">
              {navGroups.map(group => (
                <div key={group.title} className="mb-4">
                  <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-2 opacity-70", groupColors[group.title] || "text-muted-foreground")}>
                    {group.title}
                  </h3>
                  {group.items.map(item => (
                    <motion.div
                      key={item.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant={activeTab === item.id ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-10 px-3 rounded-xl transition-all duration-300",
                          activeTab === item.id 
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 active-glow" 
                            : "hover:bg-primary/10 hover:text-primary"
                        )}
                        onClick={() => {
                          setActiveTab(item.id);
                          setSidebarOpen(false);
                        }}
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-300", activeTab === item.id ? "scale-110" : "opacity-70")} />
                        <span className="truncate font-semibold text-sm">{item.label}</span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar (Persistent & Collapsible) */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 h-screen z-20",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 grad-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <HardHat size={18} strokeWidth={2.5} />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-black text-lg tracking-tight whitespace-nowrap">
                RoadMaster<span className="text-primary italic">Pro</span>
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-6">
            {navGroups.map(group => (
              <div key={group.title}>
                {!isSidebarCollapsed ? (
                  <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em] mb-3 px-3 opacity-80", groupColors[group.title] || "text-muted-foreground")}>
                    {group.title}
                  </h3>
                ) : (
                  <div className="flex justify-center mb-4">
                    <div className={cn("w-1.5 h-1.5 rounded-full", groupColors[group.title]?.replace('text-', 'bg-') || "bg-slate-300")} />
                  </div>
                )}
                <div className="space-y-1.5">
                  {group.items.map(item => (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={isSidebarCollapsed ? { scale: 1.05 } : { x: 4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant={activeTab === item.id ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start h-10 rounded-xl transition-all duration-300",
                              isSidebarCollapsed ? "px-0 justify-center w-12 mx-auto" : "gap-3 px-3",
                              activeTab === item.id 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 active-glow font-bold" 
                                : "hover:bg-primary/10 hover:text-primary font-medium"
                            )}
                            onClick={() => setActiveTab(item.id)}
                          >
                            <item.icon className={cn(
                              "h-[1.1rem] w-[1.1rem] shrink-0 transition-all duration-300", 
                              activeTab === item.id ? "scale-110" : "opacity-60"
                            )} />
                            {!isSidebarCollapsed && <span className="truncate text-[13px]">{item.label}</span>}
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      {isSidebarCollapsed && (
                        <TooltipContent side="right" sideOffset={15} className="font-bold border-none shadow-xl grad-slate text-[11px] px-3 py-1.5">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/10">
          <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start rounded-xl h-10", 
                isSidebarCollapsed ? "px-0 justify-center w-12 mx-auto" : "gap-3 px-3",
                activeTab === 'settings' ? "bg-slate-200 dark:bg-slate-800" : ""
              )}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-[1.1rem] w-[1.1rem] shrink-0 opacity-60" />
              {!isSidebarCollapsed && <span className="text-[13px] font-medium">System Settings</span>}
            </Button>
          </motion.div>
          <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-xl h-10 mt-1.5", 
                isSidebarCollapsed ? "px-0 justify-center w-12 mx-auto" : "gap-3 px-3"
              )}
              onClick={() => logout(selectedProjectId || undefined, projectName)}
            >
              <LogOut className="h-[1.1rem] w-[1.1rem] shrink-0" />
              {!isSidebarCollapsed && <span className="text-[13px] font-bold">Terminate Session</span>}
            </Button>
          </motion.div>
        </div>
      </aside>
    </>
  );
});

AppSidebar.displayName = 'AppSidebar';

export default AppSidebar;
