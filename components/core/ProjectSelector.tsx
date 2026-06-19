import React, { memo } from 'react';
import { HardHat, Sun, Moon, LogOut, Loader2, Database, RefreshCw, Fingerprint } from '@/components/icons';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Toggle } from '~/components/ui/toggle';
import { Badge } from '~/components/ui/badge';
import { Project, UserRole } from '../../types';
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center p-4 sm:p-8 relative overflow-hidden transition-colors duration-500 safe-pt safe-pb">
      {/* Animated Background - Match Homepage */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-7xl relative z-10 flex-1 flex flex-col">
        {/* Header - More premium, consistent branding */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 pt-4">
          <div className="flex items-center gap-4 group">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/20 transition-transform group-hover:scale-105 group-hover:rotate-2">
              <Fingerprint className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tighter uppercase italic text-white leading-none">
                  RoadMaster <span className="text-primary">Pro</span>
                </h1>
                <Badge variant="outline" className="text-[9px] font-black tracking-widest border-primary/20 bg-primary/5 text-primary uppercase h-5">Enterprise</Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                Operational Command Center <span className="h-1 w-1 rounded-full bg-slate-600" /> <span className="text-primary/70">v1.0.4</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto bg-slate-900/40 backdrop-blur-md border border-slate-800 p-2 rounded-[1.5rem]">
            <div className="px-4 py-2 flex flex-col">
               <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mb-0.5">Authorized Identity</span>
               <span className="text-sm font-black text-white">{userName}</span>
            </div>

            <div className="h-10 w-px bg-slate-800 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => fetchProjects()} 
                    disabled={isLoadingProjects} 
                    className="h-11 w-11 rounded-2xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
                    title="Refresh Data"
                >
                    {isLoadingProjects ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                </Button>
                
                <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={logout} 
                    className="h-11 px-6 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
                >
                    <LogOut className="mr-2 h-3.5 w-3.5" /> Sign Out
                </Button>
            </div>
          </div>
        </header>

        {apiError && (
          <Card className="mb-10 border-rose-500/20 bg-rose-500/5 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-black uppercase text-xs tracking-widest mb-0.5">Database Link Failure</p>
                <p className="text-sm text-rose-400/80 font-medium">{apiError}</p>
              </div>
              <Button size="sm" variant="outline" className="bg-rose-500 text-white border-none font-bold rounded-xl h-10 px-6 hover:bg-rose-600 transition-colors" onClick={() => fetchProjects()}>Synchronize Now</Button>
            </CardContent>
          </Card>
        )}

        <div className="flex-1">
            <div className="mb-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Project Portfolio Registry</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
            </div>

            <ProjectsList 
                projects={projects}
                userRole={userRole}
                onSelectProject={setSelectedProjectId}
                onSaveProject={() => {}} 
                onDeleteProject={deleteProject}
                onOpenModal={onOpenProjectModal}
            />
        </div>

        <footer className="mt-16 py-8 border-t border-slate-900 text-center flex flex-col items-center gap-4">
          <div className="flex items-center gap-8 opacity-40 grayscale filter hover:grayscale-0 hover:opacity-100 transition-all duration-700">
             <span className="text-[10px] font-black uppercase tracking-widest">Global GIS Standards</span>
             <span className="text-[10px] font-black uppercase tracking-widest">ISO 9001 Compliance</span>
             <span className="text-[10px] font-black uppercase tracking-widest">Secure Cloud Ops</span>
          </div>
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.3em]">
            Precision Infrastructure Intelligence • Local Storage Redundancy Enabled
          </p>
        </footer>
      </div>
    </div>
  );
});

ProjectSelector.displayName = 'ProjectSelector';

export default ProjectSelector;
