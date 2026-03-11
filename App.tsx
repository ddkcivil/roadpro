import React, { useState, useEffect, useMemo, lazy, Suspense, startTransition, useCallback } from 'react';
import { Loader2, Database, Mail, Info } from 'lucide-react';
import { Project, User } from './types';
import { LocalStorageUtils } from './utils/data/localStorageUtils';
import { getNavigationGroups } from './config/navigation';
import { SyncService } from './services/api/syncService';
import { DataSyncService } from './services/database/dataSyncService';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useMessages } from './hooks/useMessages';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import { apiService } from './services/api/apiService';
import { sqliteService } from './services/database/sqliteService';
import { addSkipLink } from './utils/accessibility/a11yUtils';

import ErrorBoundary from './components/core/ErrorBoundary';
import AppSidebar from './components/core/AppSidebar';
import AppHeader from './components/core/AppHeader';

import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Login from './components/core/Login';

// Shadcn UI components
import { Button } from '~/components/ui/button';
import { Toaster } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';


// Lazy-loaded components
const AboutPage = lazy(() => import('./components/core/AboutPage'));
const ContactPage = lazy(() => import('./components/core/ContactPage'));
const ProjectModal = lazy(() => import('./components/core/ProjectModal'));
const ProjectSelector = lazy(() => import('./components/core/ProjectSelector'));
const GlobalSearch = lazy(() => import('./components/utilities/GlobalSearch'));
const DataAnalysisModule = lazy(() => import('./components/core/DataAnalysisModule'));
const Dashboard = lazy(() => import('./components/core/Dashboard'));
const BOQModule = lazy(() => import('./components/modules/BOQModule'));
const BillingModule = lazy(() => import('./components/modules/BillingModule'));
const VariationModule = lazy(() => import('./components/modules/VariationModule'));
const RFIModule = lazy(() => import('./components/modules/RFIModule'));
const ScheduleModule = lazy(() => import('./components/modules/ScheduleModule'));
const DailyReportModule = lazy(() => import('./components/modules/DailyReportModule'));
const AIChatModal = lazy(() => import('./components/utilities/AIChatModal'));
const UserManagement = lazy(() => import('./components/common/UserManagement'));
const UserActivity = lazy(() => import('./components/common/UserActivity'));
const UserRegistration = lazy(() => import('./components/common/UserRegistration'));
const StaffManagementModule = lazy(() => import('./components/modules/StaffManagementModule'));
const DocumentationHub = lazy(() => import('./components/modules/DocumentationHub'));
const FinancialManagementHub = lazy(() => import('./components/modules/FinancialManagementHub'));
const SettingsModule = lazy(() => import('./components/modules/SettingsModule'));
const ConstructionModule = lazy(() => import('./components/modules/ConstructionModule'));
const MapModule = lazy(() => import('./components/modules/MapModule'));
const LabModule = lazy(() => import('./components/modules/LabModule'));
const QualityHub = lazy(() => import('./components/hubs/QualityHub'));
const LinearWorksModule = lazy(() => import('./components/modules/LinearWorksModule'));
const SubcontractorModule = lazy(() => import('./components/modules/SubcontractorModule'));
const SubcontractorBillingModule = lazy(() => import('./components/modules/SubcontractorBillingModule'));
const MessagesModule = lazy(() => import('./components/modules/MessagesModule'));
const FleetModule = lazy(() => import('./components/modules/FleetModule'));
const SitePhotosModule = lazy(() => import('./components/modules/SitePhotosModule'));
const EnvironmentModule = lazy(() => import('./components/modules/EnvironmentModule'));
const PreConstructionModule = lazy(() => import('./components/modules/PreConstructionModule'));
const AgencyModule = lazy(() => import('./components/modules/AgencyModule'));
const AssetsModule = lazy(() => import('./components/modules/AssetsModule'));
const ResourceMatrixModule = lazy(() => import('./components/modules/ResourceMatrixModule'));
const ReportsAnalyticsHub = lazy(() => import('./components/hubs/ReportsAnalyticsHub'));
const ChandraOCRAnalyzer = lazy(() => import('./components/utilities/ChandraOCRAnalyzer'));
const MaterialManagementModule = lazy(() => import('./components/modules/MaterialManagementModule'));
const MPRReportModule = lazy(() => import('./components/modules/MPRReportModule'));
import ProjectsListSkeleton from './components/core/ProjectsListSkeleton';
import DashboardSkeleton from './components/core/DashboardSkeleton';
import { PageTransition } from './components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { ProtectedTab } from './components/common/ProtectedTab';
import { Permission } from './types';

const LoadingScreen: React.FC<{ onReset?: () => void; status?: string }> = ({ onReset, status }) => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowWarning(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center animate-pulse">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-50 dark:border-slate-950 animate-bounce" />
      </div>
      <h2 className="mt-8 text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">
        RoadMaster <span className="text-primary">OS</span>
      </h2>
      <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-[0.3em] animate-pulse">
        {status || 'Initializing Neural Grid...'}
      </p>
      
      {showWarning && (
        <div className="mt-12 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <p className="text-[10px] text-slate-400 font-mono">System is taking longer than expected to respond.</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            className="text-[10px] uppercase tracking-widest font-bold opacity-50 hover:opacity-100 transition-opacity"
          >
            Force System Reset
          </Button>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const {
    isAuthenticated,
    userRole,
    userName,
    currentUserId,
    currentUser,
    login,
    logout
  } = useAuth();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Booting Kernel...');

  console.log('[App] State:', { isAuthenticated, isInitialLoading, loadingStatus });
  
  const { 
    appSettings, 
    updateSettings 
  } = useSettings();

  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    currentProject,
    isLoadingProjects,
    apiError,
    fetchProjects,
    saveProject,
    deleteProject
  } = useProjects(isAuthenticated, currentUser);

  const {
    messages,
    sendMessage,
    isLoading: isLoadingMessages
  } = useMessages(currentUser, currentProject?.id || 'general', isAuthenticated);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);

  useKeyboardShortcuts({
    onToggleSidebar: () => startTransition(() => setIsSidebarCollapsed(prev => !prev)),
    onOpenProjectSwitcher: () => setSelectedProjectId(null),
  });

  const handleReset = () => {
    if (confirm("This will clear your local session and data. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (isInitialLoading) {
    return <LoadingScreen onReset={handleReset} status={loadingStatus} />;
  }

  // Initialize service worker and accessibility on mount
  useEffect(() => {
    LocalStorageUtils.initializeEmptyData();
    
    // Initialize SQLite service
    const initApp = async () => {
      // Safety timeout: Ensure loading screen clears after 8 seconds even if something hangs
      const loadingTimeout = setTimeout(() => {
        setIsInitialLoading(false);
        console.warn('App initialization timed out, forcing load...');
      }, 8000);

      try {
        setLoadingStatus('Mounting Neural Grid (WASM)...');
        await sqliteService.initialize();
        
        setLoadingStatus('Synchronizing Local Core...');
        await DataSyncService.syncAllToSQLite();
        
        setLoadingStatus('Ready for Operation');
      } catch (err) {
        console.error('Failed to initialize SQLite service:', err);
        setLoadingStatus('Initialization Error - Falling back to Legacy Storage');
      } finally {
        clearTimeout(loadingTimeout);
        // Small delay to ensure smooth transition
        setTimeout(() => setIsInitialLoading(false), 800);
      }
    };
    
    initApp();
    
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            await navigator.serviceWorker.register('/sw.js');
          }
        } catch (error) {
          console.error('SW registration failed: ', error);
        }
      };
      
      if (document.readyState === 'loading') {
        window.addEventListener('load', registerSW);
      } else {
        registerSW();
      }
    }
    
    addSkipLink('#main-content', 'Skip to main content');

    // Handle background sync when coming back online
    const handleOnline = () => {
      SyncService.processQueue();
    };
    
    window.addEventListener('online', handleOnline);
    
    // Initial check on mount
    if (navigator.onLine) {
      SyncService.processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Theme management
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);

  const handleTabChange = useCallback((tab: string) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const handleSaveProject = useCallback((project: Partial<Project>) => {
    startTransition(() => {
      saveProject(project);
    });
  }, [saveProject]);
  
  const [users, setUsers] = useState<User[]>(() => {
    return LocalStorageUtils.getUsers();
  });

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers);
      LocalStorageUtils.setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  const navGroups = useMemo(() => getNavigationGroups(currentUser), [currentUser]);

  // Authentication Guard
  if (!isAuthenticated) {
    return (
      <I18nProvider>
        <NotificationProvider>
          {showRegistration ? (
            <Suspense fallback={<div className="flex justify-center items-center h-screen bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
              <div className="min-h-screen bg-muted flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                  <UserRegistration onBackToLogin={() => setShowRegistration(false)} />
                </div>
              </div>
            </Suspense>
          ) : (
            <Login onLogin={login} onShowRegistration={() => setShowRegistration(true)} />
          )}
        </NotificationProvider>
      </I18nProvider>
    );
  }
    
  // Project Selection Guard
  if (isAuthenticated && (!selectedProjectId || !currentProject)) {
    return (
      <I18nProvider>
        <NotificationProvider>
          {isLoadingProjects ? (
            <ProjectsListSkeleton />
          ) : (
            <ProjectSelector 
              userName={userName}
              themeMode={themeMode}
              setThemeMode={setThemeMode}
              logout={logout}
              projects={projects}
              setSelectedProjectId={(id) => startTransition(() => setSelectedProjectId(id))}
              deleteProject={(id) => startTransition(() => deleteProject(id))}
              onOpenProjectModal={(p) => { setEditProject(p); setIsProjectModalOpen(true); }}
              isLoadingProjects={isLoadingProjects}
              apiError={apiError}
              fetchProjects={fetchProjects}
              userRole={userRole}
            />
          )}
          <ProjectModal 
            open={isProjectModalOpen} 
            onClose={() => setIsProjectModalOpen(false)} 
            onSave={(p) => { saveProject(p); setIsProjectModalOpen(false); }}
            project={editProject}
          />
        </NotificationProvider>
      </I18nProvider>
    );
  }
    
  // Main Application Shell
  return (
    <I18nProvider>
      <NotificationProvider>
        <TooltipProvider>
          <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-500 relative mesh-gradient">
            
            <AppSidebar 
              isSidebarCollapsed={isSidebarCollapsed}
              setIsSidebarCollapsed={(collapsed) => startTransition(() => setIsSidebarCollapsed(collapsed))}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={(open) => startTransition(() => setSidebarOpen(open))}
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              navGroups={navGroups}
              currentUser={currentUser}
              logout={logout}
              selectedProjectId={selectedProjectId}
              projectName={currentProject?.name}
            />

            <div id="main-content" className="flex-1 flex flex-col min-w-0 relative lg:m-4 lg:ml-0 m-0 rounded-none lg:rounded-[2rem] glass overflow-hidden border-none shadow-2xl">
              <AppHeader 
                setSidebarOpen={(open) => startTransition(() => setSidebarOpen(open))}
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={(collapsed) => startTransition(() => setIsSidebarCollapsed(collapsed))}
                currentProject={currentProject}
                setSelectedProjectId={(id) => startTransition(() => setSelectedProjectId(id))}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                setIsAIModalOpen={(open) => startTransition(() => setIsAIModalOpen(open))}
                currentUser={currentUser}
              />

              <main className="flex-1 overflow-auto bg-transparent custom-scrollbar">
                <ErrorBoundary>
                  <AnimatePresence mode="wait">
                    <PageTransition key={activeTab}>
                      <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>}>
                        {!currentProject && !['about', 'contact', 'user-management', 'user-registration', 'settings'].includes(activeTab) ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-40">
                            <Database className="h-16 w-16 mb-6" />
                            <p className="text-xl font-black tracking-tighter uppercase">Project Context Missing</p>
                            <Button variant="ghost" className="mt-6 rounded-xl font-bold border border-border/40" onClick={() => setSelectedProjectId(null)}>Return to Portfolio</Button>
                          </div>
                        ) : (
                          <div className="min-h-full">
                            {activeTab === 'dashboard' && (
                              <ErrorBoundary>
                                <Suspense fallback={<DashboardSkeleton />}>
                                  <Dashboard project={currentProject!} settings={appSettings} onUpdateProject={handleSaveProject} onUpdateSettings={updateSettings} isLoading={isLoadingProjects} />
                                </Suspense>
                              </ErrorBoundary>
                            )}
                            
                            {activeTab === 'map' && (
                              <ErrorBoundary>
                                <MapModule project={currentProject!} onProjectUpdate={handleSaveProject as any} settings={appSettings} />
                              </ErrorBoundary>
                            )}
                            
                            <div className="px-4 md:px-8 pb-8">
                              {activeTab === 'about' && <AboutPage />}
                              {activeTab === 'contact' && <ContactPage />}
                              {activeTab === 'user-management' && (
                                <ProtectedTab permission={Permission.USER_READ}>
                                  <UserManagement />
                                </ProtectedTab>
                              )}
                              {activeTab === 'user-activity' && (
                                <ProtectedTab permission={Permission.USER_READ}>
                                  <UserActivity />
                                </ProtectedTab>
                              )}
                              {activeTab === 'user-registration' && (
                                <ProtectedTab permission={Permission.USER_CREATE}>
                                  <UserRegistration />
                                </ProtectedTab>
                              )}
                              {activeTab === 'boq' && <BOQModule project={currentProject!} settings={appSettings} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'billing' && <BillingModule project={currentProject!} settings={appSettings} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'variations' && <VariationModule project={currentProject!} settings={appSettings} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'financials' && <FinancialManagementHub project={currentProject!} userRole={userRole} settings={appSettings} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'ocr-extraction' && <ChandraOCRAnalyzer />}
                              {activeTab === 'agencies' && <AgencyModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} settings={appSettings} />}
                              {activeTab === 'subcontractors' && <SubcontractorModule project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'subcontractor-billing' && <SubcontractorBillingModule project={currentProject!} settings={appSettings} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'schedule' && <ScheduleModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'construction' && <ConstructionModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'linear-works' && <LinearWorksModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'site-photos' && <SitePhotosModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'daily-reports' && <DailyReportModule project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'pre-construction' && <PreConstructionModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'reports-analytics' && <ReportsAnalyticsHub project={currentProject!} userRole={userRole} settings={appSettings} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'mpr-report' && <MPRReportModule project={currentProject!} settings={appSettings} />}
                              {activeTab === 'rfis' && <RFIModule project={currentProject!} userRole={userRole} currentUser={currentUser} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'materials-hub' && <MaterialManagementModule project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'assets' && <AssetsModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'fleet' && <FleetModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'resource-matrix' && <ResourceMatrixModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'quality' && <QualityHub project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'lab' && <LabModule project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'environment' && <EnvironmentModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'data-analysis' && <DataAnalysisModule />}
                              {activeTab === 'messages' && (
                                <MessagesModule 
                                  currentUser={currentUser}
                                  users={users}
                                  messages={messages}
                                  projectId={selectedProjectId || currentProject?.id || ''}
                                  onSendMessage={sendMessage}
                                  isLoading={isLoadingMessages}
                                />
                              )}
                              {activeTab === 'documents' && (
                                <DocumentationHub 
                                  project={currentProject!} 
                                  onProjectUpdate={handleSaveProject as any} 
                                  userRole={userRole} 
                                  onNavigate={handleTabChange}
                                />
                              )}
                              {activeTab === 'settings' && <SettingsModule settings={appSettings} onUpdate={updateSettings} />}
                              {activeTab === 'staff-management' && <StaffManagementModule />}
                            </div>
                          </div>
                        )}
                      </Suspense>
                    </PageTransition>
                  </AnimatePresence>
                </ErrorBoundary>
              </main>
            </div>

            {isAIModalOpen && currentProject && (
              <AIChatModal project={currentProject} onClose={() => startTransition(() => setIsAIModalOpen(false))} />
            )}
            
            <ProjectModal 
              open={isProjectModalOpen} 
              onClose={() => startTransition(() => setIsProjectModalOpen(false))} 
              onSave={(p) => { handleSaveProject(p); startTransition(() => setIsProjectModalOpen(false)); }}
              project={editProject}
            />
            
            <GlobalSearch 
              projects={projects}
              currentProject={currentProject}
              onSelectProject={(id) => setSelectedProjectId(id)}
              onNavigate={handleTabChange}
            />

            {/* Floating Info Buttons */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => handleTabChange('about')}
                      className="w-12 h-12 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white p-0 flex items-center justify-center border-2 border-white/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150"
                    >
                      <Info className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-bold">About RoadMaster</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => handleTabChange('contact')}
                      className="w-12 h-12 rounded-full shadow-2xl bg-emerald-600 hover:bg-emerald-700 text-white p-0 flex items-center justify-center border-2 border-white/20 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                      <Mail className="h-6 w-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-bold">Contact Support</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Toaster 
            position="bottom-right" 
            richColors 
            closeButton
            theme={themeMode}
            toastOptions={{
              className: 'rounded-2xl border-border/50 glass shadow-2xl',
              classNames: {
                title: 'font-black tracking-tight',
                description: 'text-xs opacity-70 font-medium',
              }
            }}
          />
        </TooltipProvider>
      </NotificationProvider>
    </I18nProvider>
  );
};

export default App;
