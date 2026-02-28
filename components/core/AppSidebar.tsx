import React from 'react';
import { 
  HardHat, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import { cn } from '~/lib/utils';
import { NavGroup } from '~/config/navigation';
import { UserWithPermissions } from '~/types';

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

const AppSidebar: React.FC<AppSidebarProps> = ({
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
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                <HardHat size={20} strokeWidth={2.5} />
              </div>
              RoadMaster<span className="text-primary">.Pro</span>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-140px)]">
            <nav className="grid items-start gap-1 p-4">
              {navGroups.map(group => (
                <div key={group.title} className="mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-2">{group.title}</h3>
                  {group.items.map(item => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 h-9 px-2",
                        activeTab === item.id && "bg-secondary text-primary hover:bg-secondary/80"
                      )}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Button>
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
          "hidden lg:flex flex-col border-r bg-white dark:bg-slate-900 transition-all duration-300 ease-in-out shrink-0 h-screen",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-14 flex items-center px-4 border-b shrink-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shrink-0">
              <HardHat size={16} strokeWidth={2.5} />
            </div>
            {!isSidebarCollapsed && (
              <span className="font-bold whitespace-nowrap">RoadMaster<span className="text-primary">.Pro</span></span>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-4">
            {navGroups.map(group => (
              <div key={group.title}>
                {!isSidebarCollapsed ? (
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 px-2">{group.title}</h3>
                ) : (
                  <Separator className="my-4" />
                )}
                <div className="space-y-1">
                  {group.items.map(item => (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={activeTab === item.id ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start h-9 transition-all",
                            isSidebarCollapsed ? "px-0 justify-center" : "gap-3 px-2",
                            activeTab === item.id && "bg-secondary text-primary hover:bg-secondary/80"
                          )}
                          onClick={() => setActiveTab(item.id)}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </Button>
                      </TooltipTrigger>
                      {isSidebarCollapsed && (
                        <TooltipContent side="right">
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

        <div className="p-2 border-t mt-auto">
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start", isSidebarCollapsed ? "px-0 justify-center" : "gap-3")}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Settings</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={cn("w-full justify-start text-red-500 mt-1", isSidebarCollapsed ? "px-0 justify-center" : "gap-3")}
            onClick={() => logout(selectedProjectId || undefined, projectName)}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
