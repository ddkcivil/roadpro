import React, { startTransition } from 'react';
import { HardHat, Sun, Moon, LogOut, Loader2, Database, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Toggle } from '~/components/ui/toggle';
import PortfolioDashboard from './PortfolioDashboard';
import { Project, UserRole } from '~/types';

interface ProjectSelectorProps {
  userName: string;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  logout: () => void;
  projects: Project[];
  setSelectedProjectId: (id: string | null) => void;
  deleteProject: (id: string) => Promise<void>;
  onOpenProjectModal: (project: Partial<Project> | null) => void;
  isLoadingProjects: boolean;
  apiError: string | null;
  fetchProjects: () => Promise<void>;
  userRole: UserRole;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  userName,
  themeMode,
  setThemeMode,
  logout,
  projects,
  setSelectedProjectId,
  deleteProject,
  onOpenProjectModal,
  isLoadingProjects,
  apiError,
  fetchProjects,
  userRole
}) => {
  if (isLoadingProjects) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Loading engineering projects...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100 dark:border-red-900/20">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <Database size={40} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Connection Error</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
            We couldn't reach the project database. This usually happens when environment variables are missing or the database is offline.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl text-xs font-mono mb-8 break-words text-left border border-red-100 dark:border-red-900/20">
            {apiError}
          </div>
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full font-bold h-12" onClick={() => fetchProjects()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry Connection
            </Button>
            <Button variant="outline" className="w-full font-bold h-12" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-500">
      <header className="sticky top-0 z-50 glass border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <HardHat size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-foreground leading-none">RoadMaster<span className="text-primary">.Pro</span></h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle
            size="sm"
            pressed={themeMode === 'dark'}
            onPressedChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Toggle>
          <Button variant="outline" size="sm" className="rounded-full px-4 font-bold" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 md:p-12 overflow-auto max-w-7xl mx-auto w-full">
        <div className="mb-10 text-center md:text-left">
          <h2 className="text-4xl font-black tracking-tight mb-2">Welcome, {userName}</h2>
          <p className="text-lg text-muted-foreground font-medium">Select a project to access the control center</p>
        </div>
        <PortfolioDashboard 
          projects={projects} 
          onSelectProject={(id) => startTransition(() => setSelectedProjectId(id))} 
          onDeleteProject={deleteProject}
          onOpenProjectModal={onOpenProjectModal}
        />
      </main>
    </div>
  );
};

export default ProjectSelector;
