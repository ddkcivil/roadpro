import React from 'react';
import { 
  HardHat, 
  LogOut,
  Settings
} from '@/components/icons';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
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

const AppSidebar: React.FC<AppSidebarProps> = React.memo(({
  isSidebarCollapsed,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  navGroups,
  logout,
  selectedProjectId,
  projectName
}) => {
  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-background/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-border/40">
          <SheetHeader className="p-6 border-b border-border/40">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-11 h-11 grad-primary rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 active-glow">
                <HardHat size={22} strokeWidth={2.5} className="text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter text-foreground">
                RoadMaster<span className="text-primary italic">Pro</span>
              </span>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-160px)]">
            <nav className="grid items-start gap-2 p-4">
              {navGroups.map(group => (
                <div key={group.title} className="mb-6">
                  <h3 className={cn(
                    "text-[11px] font-black uppercase tracking-[0.25em] mb-3 px-3 opacity-60", 
                    groupColors[group.title] || "text-muted-foreground"
                  )}>
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {group.items.map(item => (
                      <motion.div
                        key={item.id}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={activeTab === item.id ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-4 h-11 px-4 rounded-2xl transition-all duration-300",
                            activeTab === item.id 
                              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-bold" 
                              : "hover:bg-primary/10 hover:text-primary font-medium text-foreground/70"
                          )}
                          onClick={() => {
                            setActiveTab(item.id);
                            setSidebarOpen(false);
                          }}
                        >
                          <item.icon className={cn(
                            "h-[1.1rem] w-[1.1rem] shrink-0 transition-transform duration-300", 
                            activeTab === item.id ? "scale-110" : "opacity-60"
                          )} />
                          <span className="truncate text-sm">{item.label}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar (Persistent & Collapsible) */}
      <aside 
        className={cn(
          "hidden lg:flex flex-col m-4 rounded-[2rem] glass transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 h-[calc(100vh-2rem)] z-20 shadow-2xl relative overflow-hidden",
          isSidebarCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        
        <div className="h-20 flex items-center px-6 border-b border-white/10 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 grad-primary rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25 shrink-0 active-glow">
              <HardHat size={22} strokeWidth={2.5} className="text-white" />
            </div>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="font-black text-xl tracking-tighter text-foreground whitespace-nowrap leading-none">
                  RoadMaster<span className="text-primary italic">Pro</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Infrastructure OS</span>
              </motion.div>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 px-3 py-6">
          <nav className="space-y-8">
            {navGroups.map(group => (
              <div key={group.title}>
                {!isSidebarCollapsed ? (
                  <h3 className={cn(
                    "text-[10px] font-black uppercase tracking-[0.25em] mb-4 px-4 opacity-40", 
                    groupColors[group.title] || "text-muted-foreground"
                  )}>
                    {group.title}
                  </h3>
                ) : (
                  <div className="flex justify-center mb-5">
                    <div className={cn("w-1.5 h-1.5 rounded-full shadow-sm", groupColors[group.title]?.replace('text-', 'bg-') || "bg-slate-300")} />
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map(item => (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ x: isSidebarCollapsed ? 0 : 4 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start h-11 rounded-xl transition-all duration-300 relative overflow-hidden group",
                              isSidebarCollapsed ? "px-0 justify-center w-12 mx-auto" : "gap-4 px-4",
                              activeTab === item.id 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold" 
                                : "hover:bg-white/10 dark:hover:bg-white/5 font-semibold text-foreground/70"
                            )}
                            onClick={() => setActiveTab(item.id)}
                          >
                            {activeTab === item.id && (
                              <motion.div 
                                layoutId="active-pill"
                                className="absolute left-0 w-1 h-6 bg-white rounded-full"
                              />
                            )}
                            <item.icon className={cn(
                              "h-[1.1rem] w-[1.1rem] shrink-0 transition-all duration-300", 
                              activeTab === item.id ? "scale-110 opacity-100" : "opacity-50 group-hover:opacity-100"
                            )} />
                            {!isSidebarCollapsed && <span className="truncate text-sm tracking-tight">{item.label}</span>}
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      {isSidebarCollapsed && (
                        <TooltipContent side="right" sideOffset={15} className="font-black border-none shadow-2xl grad-slate text-[11px] px-4 py-2 rounded-xl">
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

        <div className="p-4 border-t border-white/10 bg-white/5 dark:bg-black/20">
          <div className="space-y-1">
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start rounded-xl h-11 transition-all duration-300 font-bold", 
                isSidebarCollapsed ? "px-0 justify-center w-12 mx-auto" : "gap-4 px-4",
                activeTab === 'settings' ? "bg-white/10 shadow-sm" : "text-foreground/60"
              )}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="h-[1.1rem] w-[1.1rem] shrink-0 opacity-50" />
              {!isSidebarCollapsed && <span className="text-sm tracking-tight">Settings</span>}
            </Button>
            
            <Button 
              variant="ghost" 
              className={cn(
                "w-full justify-start text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 rounded-xl h-11 transition-all duration-300 font-black", 
                isSidebarCollapsed ? "px-0 justify-center w-12 mx-auto" : "gap-4 px-4"
              )}
              onClick={() => logout(selectedProjectId || undefined, projectName)}
            >
              <LogOut className="h-[1.1rem] w-[1.1rem] shrink-0" />
              {!isSidebarCollapsed && <span className="text-sm tracking-tighter uppercase">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
});

AppSidebar.displayName = 'AppSidebar';

export default AppSidebar;
