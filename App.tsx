import React, { useState, useEffect, useMemo, lazy, Suspense, startTransition, useCallback, useRef } from 'react';
import { Database, Mail, Info, Loader2 } from 'lucide-react';
import { Project, User, UserRole, Permission } from './types';
import { LocalStorageUtils } from './utils/data/localStorageUtils';
import { getNavigationGroups } from './config/navigation';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useMessages } from './hooks/useMessages';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppInitialization } from './hooks/useAppInitialization';

import { apiService } from './services/api/apiService';

import ErrorBoundary from './components/core/ErrorBoundary';
import AppSidebar from './components/core/AppSidebar';
import AppHeader from './components/core/AppHeader';

import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Homepage from './components/core/Homepage';
import Login from './components/core/Login';
import { LoadingScreen } from './components/core/LoadingScreen';

// Shadcn UI components
import { Button } from '~/components/ui/button';
import { Toaster } from 'sonner';
import { TooltipProvider } from '~/components/ui/tooltip';


// Lazy-loaded components
const AboutPage = lazy(() => import('./components/core/AboutPage'));
const ContactPage = lazy(() => import('./components/core/ContactPage'));
const ProjectModal = lazy(() => import('./components/core/ProjectModal'));
const ProjectSelector = lazy(() => import('./components/core/ProjectSelector'));
const GISRoadModule = lazy(() => import('./components/modules/GISRoadModule'));
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
const RoadInventoryModule = lazy(() => import('./components/modules/RoadInventoryModule'));
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

const App: React.FC = () => {
  console.log('App.tsx: App component function started.');
  const auth = useAuth() || { isAuthenticated: false, userRole: UserRole.SITE_ENGINEER, userName: '', currentUserId: '', currentUser: null, loading: true, login: () => {}, logout: () => {} };
  const {
    isAuthenticated,
    userRole,
    userName,
    currentUserId,
    currentUser,
    loading: isAuthLoading,
    login,
    logout
  } = auth;

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [systemReady, setSystemReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Booting Kernel...');

console.log('[App] State:', { isAuthenticated, isAuthLoading, isInitialLoading, systemReady });
  console.log('[App] >>> RENDERING: isInitialLoading=', isInitialLoading, 'isAuthLoading=', isAuthLoading, 'isAuthenticated=', isAuthenticated);

  // Initialize App with custom hook
  useAppInitialization(setLoadingStatus, setSystemReady, setIsInitialLoading);

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
    refreshCurrentProject,
    updateLocation,
    deleteProject,
    isHydrated,
    isRefreshingDetail
  } = useProjects(isAuthenticated && (systemReady || !isInitialLoading), currentUser);

const {
    messages,
    sendMessage,
    markAsRead,
    isLoading: isLoadingMessages
} = useMessages(currentUser, currentProject?.id || '', isAuthenticated && (systemReady || !isInitialLoading));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => LocalStorageUtils.getActiveTab());
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);

  useEffect(() => {
    console.log('App.tsx: useEffect for fetchProjects triggered. Auth:', isAuthenticated, 'Hydrated:', isHydrated);
    if (isAuthenticated && isHydrated) {
      fetchProjects();
    }
  }, [isAuthenticated, isHydrated, fetchProjects]);

  useKeyboardShortcuts({
    onToggleSidebar: () => startTransition(() => setIsSidebarCollapsed(prev => !prev)),
    onOpenProjectSwitcher: () => setSelectedProjectId(null),
  });

  const handleReset = useCallback(() => {
    if (confirm("This will clear your local session and data. Are you sure?")) {
      localStorage.clear();
      window.location.reload();
    }
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
      LocalStorageUtils.setActiveTab(tab); // Save the active tab to localStorage
    });
  }, []);

  const handleSaveProject = useCallback((project: Partial<Project>) => {
    return saveProject(project);
  }, [saveProject]);
  
  const [users, setUsers] = useState<User[]>(() => {
    try {
        return LocalStorageUtils.getUsers() || [];
    } catch (e) {
        return [];
    }
  });

  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const fetchedUsers = await apiService.getUsers();
      setUsers(fetchedUsers || []);
      LocalStorageUtils.setUsers(fetchedUsers || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      const userRefreshInterval = setInterval(fetchUsers, 60000);
      apiService.heartbeat(); 
      const heartbeatInterval = setInterval(() => {
        apiService.heartbeat().catch(err => console.warn('Heartbeat failed', err));
      }, 120000);

      return () => {
        clearInterval(userRefreshInterval);
        clearInterval(heartbeatInterval);
      };
    }
  }, [isAuthenticated, fetchUsers]);

// Add this useEffect to handle the auth failure event
  // Use refs to store the callback to prevent duplicate listener registrations
  const authStateRef = useRef({ isAuthenticated, isAuthLoading, isInitialLoading });
  const logoutRef = useRef(logout);
  
  // Update refs when values change
  useEffect(() => {
    authStateRef.current = { isAuthenticated, isAuthLoading, isInitialLoading };
  }, [isAuthenticated, isAuthLoading, isInitialLoading]);
  
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    console.log('[App] Setting up event listener for roadmaster-auth-failure');
    const handleAuthFailure = () => {
      // Use refs to get the current state to avoid stale closures
      const { isAuthenticated: currentIsAuthenticated, isAuthLoading: currentIsAuthLoading, isInitialLoading: currentIsInitialLoading } = authStateRef.current;
      const currentLogout = logoutRef.current;
      
      // Only logout if the user is authenticated and not currently loading auth/initialization
      // This prevents interfering with the initial login or logout processes
      if (currentIsAuthenticated && !currentIsAuthLoading && !currentIsInitialLoading) {
        console.warn('[App] Detected roadmaster-auth-failure. Logging out user.');
        currentLogout();
      } else {
        console.log('[App] roadmaster-auth-failure detected, but not performing logout due to current state (isAuthenticated:', currentIsAuthenticated, ', isAuthLoading:', currentIsAuthLoading, ', isInitialLoading:', currentIsInitialLoading, ')');
      }
    };

    window.addEventListener('roadmaster-auth-failure', handleAuthFailure);

    return () => {
      console.log('[App] Removing event listener for roadmaster-auth-failure');
      window.removeEventListener('roadmaster-auth-failure', handleAuthFailure);
    };
  }, []); // Empty dependencies - listeners are now stable via refs

  const navGroups = useMemo(() => {
      if (!currentUser) return [];
      return getNavigationGroups(currentUser);
  }, [currentUser]);

  if (isInitialLoading || isAuthLoading) {
    return <LoadingScreen onReset={handleReset} status={isAuthLoading ? 'Authenticating...' : loadingStatus} />;
  }

if (!isAuthenticated) {
    return showRegistration ? (
      <Suspense fallback={<LoadingScreen status="Loading Registration..." />}>
        <div className="min-h-screen bg-muted flex items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <UserRegistration onBackToLogin={() => setShowRegistration(false)} />
          </div>
        </div>
      </Suspense>
    ) : (
      <Homepage onLogin={login} onShowRegistration={() => setShowRegistration(true)} />
    );
  }

  // Project Selection Guard
  if (!selectedProjectId || !currentProject) {
    return (
      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectSelector 
          userName={userName || 'User'}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          logout={logout}
          projects={projects || []}
          setSelectedProjectId={(id) => startTransition(() => setSelectedProjectId(id))}
          deleteProject={(id) => startTransition(() => { deleteProject(id); })}
          onOpenProjectModal={(p) => { setEditProject(p); setIsProjectModalOpen(true); }}
          isLoadingProjects={isLoadingProjects}
          apiError={apiError}
          fetchProjects={fetchProjects}
          userRole={userRole || UserRole.SITE_ENGINEER}
        />
        <ProjectModal 
          open={isProjectModalOpen} 
          onClose={() => setIsProjectModalOpen(false)} 
          onSave={async (p: Partial<Project>) => { await saveProject(p); setIsProjectModalOpen(false); }}
          project={editProject}
        />
      </Suspense>
    );
  }

  // Main Application Shell
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-500 relative mesh-gradient safe-pl safe-pr">
        
        <AppSidebar 
          isSidebarCollapsed={isSidebarCollapsed}
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

        <div id="main-content" className="flex-1 flex flex-col min-w-0 relative lg:m-4 lg:ml-0 m-0 rounded-none lg:rounded-[2rem] glass overflow-hidden border-none shadow-2xl safe-pb">
          <AppHeader 
            setSidebarOpen={(open) => startTransition(() => setSidebarOpen(open))}
            currentProject={currentProject}
            onProjectUpdate={handleSaveProject}
            updateLocation={updateLocation}
            setSelectedProjectId={(id) => startTransition(() => setSelectedProjectId(id))}
            themeMode={themeMode}
            setThemeMode={setThemeMode}
            setIsAIModalOpen={(open) => startTransition(() => setIsAIModalOpen(open))}
            currentUser={currentUser}
            onLogout={logout}
            setActiveTab={handleTabChange}
          />

          <main className="flex-1 overflow-auto bg-transparent custom-scrollbar">
            <ErrorBoundary>
              <AnimatePresence mode="wait">
                <PageTransition key={activeTab}>
                  <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin opacity-20" /></div>}>
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
                          <MapModule project={currentProject!} onProjectUpdate={handleSaveProject as any} settings={appSettings} users={users} />
                        </ErrorBoundary>
                      )}

                      {activeTab === 'gis-road' && (
                        <ErrorBoundary>
                          <GISRoadModule project={currentProject!} onProjectUpdate={handleSaveProject as any} settings={appSettings} />
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
{activeTab === 'schedule' && <ScheduleModule project={currentProject!} settings={appSettings} userRole={userRole} onProjectUpdate={handleSaveProject as any} />}
                        {activeTab === 'construction' && <ConstructionModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                        {activeTab === 'linear-works' && <LinearWorksModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
                        {activeTab === 'road-inventory' && <RoadInventoryModule project={currentProject!} onProjectUpdate={handleSaveProject as any} />}
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
                            onMarkRead={markAsRead}
                            isLoading={isLoadingMessages}
                          />
                        )}
                        {activeTab === 'documentation-hub' && (
                          <DocumentationHub
                            project={currentProject!}
                            onProjectUpdate={handleSaveProject as any}
                            userRole={userRole}
                            settings={appSettings}
                            onNavigate={handleTabChange}
                            isLoading={isRefreshingDetail}
                            onRefresh={refreshCurrentProject}
                          />
                        )}                        {activeTab === 'settings' && userRole === UserRole.ADMIN && (
                          <SettingsModule settings={appSettings} onUpdate={updateSettings} />
                        )}
                        {activeTab === 'staff-management' && (
                          <ProtectedTab permission={Permission.USER_READ}>
                            <StaffManagementModule />
                          </ProtectedTab>
                        )}
                      </div>
                    </div>
                  </Suspense>
                </PageTransition>
              </AnimatePresence>
            </ErrorBoundary>
          </main>
        </div>

        <Suspense fallback={<></>}>
          {isAIModalOpen && currentProject && (
            <AIChatModal project={currentProject} onClose={() => startTransition(() => setIsAIModalOpen(false))} />
          )}

          {isProjectModalOpen && (
            <ProjectModal 
              open={isProjectModalOpen} 
              onClose={() => startTransition(() => setIsProjectModalOpen(false))} 
              onSave={async (p: Partial<Project>) => { await handleSaveProject(p); startTransition(() => setIsProjectModalOpen(false)); }}
              project={editProject}
            />
          )}

          <GlobalSearch 
            projects={projects}
            currentProject={currentProject}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onNavigate={handleTabChange}
          />
        </Suspense>

        {/* Floating Info Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
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
  );
};

const WrappedApp: React.FC = () => {
  return (
    <I18nProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </NotificationProvider>
    </I18nProvider>
  );
};

export default WrappedApp;
