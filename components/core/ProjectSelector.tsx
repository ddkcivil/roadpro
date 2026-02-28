import React, { memo } from 'react';
import { HardHat, Sun, Moon, LogOut, Loader2, Database, RefreshCw } from '@/components/icons';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { Toggle } from '~/components/ui/toggle';
import { Badge } from '~/components/ui/badge';
import { Project, UserRole } from '../../types';
import { cn } from '~/lib/utils';
import ProjectsList from './ProjectsList';

interface Props {
  userName: string;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  logout: () => void;
  projects: Project[];
  setSelectedProjectId: (id: string) => void;
  deleteProject: (id: string) => void;
  onOpenProjectModal: (project: Partial<Project> | null) => void;
  isLoadingProjects: boolean;
  apiError: string | null;
  fetchProjects: () => void;
  userRole: UserRole;
}

const ProjectSelector: React.FC<Props> = memo(({ 
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
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] animate-pulse" />

      <div className="w-full max-w-6xl relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3 transition-transform hover:rotate-0">
              <HardHat size={32} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  RoadMaster <span className="text-primary">Pro</span>
                </h1>
                <Badge variant="outline" className="text-[10px] h-5 border-primary/20 bg-primary/5 text-primary">v1.0</Badge>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Welcome back, <span className="text-slate-900 dark:text-white font-bold">{userName}</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Toggle 
              pressed={themeMode === 'dark'} 
              onPressedChange={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border shadow-sm"
            >
              {themeMode === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Toggle>
            
            <Button variant="outline" onClick={fetchProjects} disabled={isLoadingProjects} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border">
              {isLoadingProjects ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            
            <Button variant="destructive" size="sm" onClick={logout} className="shadow-lg shadow-red-500/20">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>

        {apiError && (
          <Card className="mb-8 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
            <CardContent className="p-4 flex items-center gap-3 text-red-600 dark:text-red-400">
              <Database className="h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Backend Connection Issue</p>
                <p>{apiError}</p>
              </div>
              <Button size="sm" variant="outline" className="ml-auto bg-white" onClick={fetchProjects}>Retry</Button>
            </CardContent>
          </Card>
        )}

        <ProjectsList 
          projects={projects}
          userRole={userRole}
          onSelectProject={setSelectedProjectId}
          onSaveProject={() => {}} // Not needed in selector context
          onDeleteProject={deleteProject}
          onOpenModal={onOpenProjectModal}
        />

        <div className="mt-8 flex justify-center">
          <p className="text-xs text-slate-400 font-medium">Precision Infrastructure Intelligence • Local Storage Redundancy Enabled</p>
        </div>
      </div>
    </div>
  );
});

ProjectSelector.displayName = 'ProjectSelector';

export default ProjectSelector;
