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

import AboutPage from './components/core/AboutPage';
import ContactPage from './components/core/ContactPage';
import ErrorBoundary from './components/core/ErrorBoundary';
import ProjectModal from './components/core/ProjectModal';
import AppSidebar from './components/core/AppSidebar';
import AppHeader from './components/core/AppHeader';
import ProjectSelector from './components/core/ProjectSelector';
import GlobalSearch from './components/utilities/GlobalSearch';

import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Login from './components/core/Login';
import DataAnalysisModule from './components/core/DataAnalysisModule';

// Shadcn UI components
import { Button } from '~/components/ui/button';
import { Toaster } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';


// Lazy-loaded components
const Dashboard = lazy(() => import('./components/core/Dashboard'));
const BOQModule = lazy(() => import('./components/modules/BOQModule'));
const BillingModule = lazy(() => import('./components/modules/BillingModule'));
const VariationModule = lazy(() => import('./components/modules/VariationModule'));
const RFIModule = lazy(() => import('./components/modules/RFIModule'));
const ScheduleModule = lazy(() => import('./components/modules/ScheduleModule'));
const DailyReportModule = lazy(() => import('./components/modules/DailyReportModule'));
const AIChatModal = lazy(() => import('./components/utilities/AIChatModal'));
const UserManagement = lazy(() => import('./components/common/UserManagement'));
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


const App: React.FC = () => {
  // Global hooks
  const { 
    isAuthenticated, 
    userRole, 
    userName, 
    currentUser, 
    login, 
    logout 
  } = useAuth();

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
    sendMessage
  } = useMessages(currentUser);

  useKeyboardShortcuts({
    onToggleSidebar: () => startTransition(() => setIsSidebarCollapsed(prev => !prev)),
    onOpenProjectSwitcher: () => setSelectedProjectId(null),
  });

  // Initialize service worker and accessibility on mount
  useEffect(() => {
    LocalStorageUtils.initializeEmptyData();
    
    // Initialize SQLite service
    sqliteService.initialize().then(() => {
      DataSyncService.syncAllToSQLite();
    }).catch(err => {
      console.error('Failed to initialize SQLite service:', err);
    });
    
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

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);
  
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
          <Login onLogin={login} />
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

            <div id="main-content" className="flex-1 flex flex-col min-w-0 relative m-4 ml-0 rounded-[2rem] glass overflow-hidden border-none shadow-2xl">
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
                              {activeTab === 'subcontractor-billing' && <SubcontractorBillingModule project={currentProject!} settings={appSettings} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'schedule' && <ScheduleModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'construction' && <ConstructionModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'linear-works' && <LinearWorksModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'site-photos' && <SitePhotosModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'daily-reports' && <DailyReportModule project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'pre-construction' && <PreConstructionModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'reports-analytics' && <ReportsAnalyticsHub project={currentProject!} userRole={userRole} settings={appSettings} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'mpr-report' && <MPRReportModule project={currentProject!} userRole={userRole} settings={appSettings} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'rfis' && <RFIModule project={currentProject!} userRole={userRole} currentUser={currentUser} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'materials-hub' && <MaterialManagementModule project={currentProject!} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                              {activeTab === 'assets' && <AssetsModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
                              {activeTab === 'fleet' && <FleetModule project={currentProject!} onProjectUpdate={handleSaveProject as any} userRole={userRole} />}
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
              userRole={userRole}
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
