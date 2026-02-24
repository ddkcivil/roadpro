import React, { useState, useEffect, useMemo, startTransition, lazy, Suspense } from 'react';
import { 
  Sun,
  Moon,
  LayoutDashboard,
  HardHat,
  Hammer,
  FileText,
  Settings,
  Menu as MenuIcon,
  Bot,
  CalendarClock,
  ClipboardCheck,
  Map as MapIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CloudCog,
  CloudOff,
  LayoutGrid,
  Eye,
  Shield,
  Scale,
  Package,
  DollarSign,
  BarChart3,
  CreditCard,
  Users,
  PackageSearch,
  Mail,
  MessageSquare,
  FolderOpen,
  UserCheck,
  FileDiff,
  Briefcase,
  Navigation,
  Camera,
  ClipboardList,
  Truck,
  Layers,
  Trees,
  Download,
  Plus,
  Landmark,
  GripVertical,
  Loader2
} from 'lucide-react';
import { UserRole, Project, AppSettings, Message, UserWithPermissions, Permission } from './types';
import { PermissionsService } from './services/auth/permissionsService';
import { AuditService } from './services/analytics/auditService';
import { DataCache, getCacheKey } from './utils/data/cacheUtils';
import { LocalStorageUtils } from './utils/data/localStorageUtils';

import { DataSyncService } from './services/database/dataSyncService';
import { apiService } from './services/api/apiService';
import { prepareProjectWithMaterials } from './utils/migration/materialMigrationUtils';
import { addSkipLink } from './utils/accessibility/a11yUtils';

import AboutPage from './components/core/AboutPage';
import ContactPage from './components/core/ContactPage';
import ErrorBoundary from './components/core/ErrorBoundary';
import NotificationsBadge from './components/core/NotificationsBadge';
import ProjectModal from './components/core/ProjectModal';

import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Login from './components/core/Login';
import DataAnalysisModule from './components/core/DataAnalysisModule';
import ProjectsList from './components/core/ProjectsList';

// Shadcn UI components
import { Button } from '~/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Toggle } from '~/components/ui/toggle';
import { Separator } from '~/components/ui/separator';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Progress } from '~/components/ui/progress';
import { Toaster, toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Dialog } from '~/components/ui/dialog';

// Lazy-loaded components - keep as is
const Dashboard = lazy(() => import('./components/core/Dashboard'));
const BOQModule = lazy(() => import('./components/modules/BOQModule'));
const BillingModule = lazy(() => import('./components/modules/BillingModule'));
const VariationModule = lazy(() => import('./components/modules/VariationModule'));
const RFIModule = lazy(() => import('./components/modules/RFIModule'));
const ScheduleModule = lazy(() => import('./components/modules/ScheduleModule'));
const DailyReportModule = lazy(() => import('./components/modules/DailyReportModule'));
const PortfolioDashboard = lazy(() => import('./components/core/PortfolioDashboard'));
const AIChatModal = lazy(() => import('./components/utilities/AIChatModal'));
const UserManagement = lazy(() => import('./components/common/UserManagement'));
const UserRegistration = lazy(() => import('./components/common/UserRegistration'));
const StaffManagementModule = lazy(() => import('./components/modules/StaffManagementModule'));
const ResourceManagementHub = lazy(() => import('./components/modules/ResourceManagementHub'));
const DocumentationHub = lazy(() => import('./components/modules/DocumentationHub'));
const FinancialManagementHub = lazy(() => import('./components/modules/FinancialManagementHub'));
const SettingsModule = lazy(() => import('./components/modules/SettingsModule'));
const ConstructionModule = lazy(() => import('./components/modules/ConstructionModule'));
// const MapModule = lazy(() => import('./components/modules/MapModule'));
const LabModule = lazy(() => import('./components/modules/LabModule'));
const QualityHub = lazy(() => import('./components/hubs/QualityHub'));
const LinearWorksModule = lazy(() => import('./components/modules/LinearWorksModule'));
const SubcontractorModule = lazy(() => import('./components/modules/SubcontractorModule'));
const SubcontractorBillingModule = lazy(() => import('./components/modules/SubcontractorBillingModule'));
const DocumentsModule = lazy(() => import('./components/modules/DocumentsModule'));
const MessagesModule = lazy(() => import('./components/modules/MessagesModule'));
const FleetModule = lazy(() => import('./components/modules/FleetModule'));
const ResourceManager = lazy(() => import('./components/modules/ResourceManager'));
const SitePhotosModule = lazy(() => import('./components/modules/SitePhotosModule'));
const EnvironmentModule = lazy(() => import('./components/modules/EnvironmentModule'));
const PreConstructionModule = lazy(() => import('./components/modules/PreConstructionModule'));
const PavementModule = lazy(() => import('./components/modules/PavementModule'));
const AgencyModule = lazy(() => import('./components/modules/AgencyModule'));
const AssetsModule = lazy(() => import('./components/modules/AssetsModule'));
const ResourceMatrixModule = lazy(() => import('./components/modules/ResourceMatrixModule'));
const ReportsAnalyticsHub = lazy(() => import('./components/hubs/ReportsAnalyticsHub'));
const ChandraOCRAnalyzer = lazy(() => import('./components/utilities/ChandraOCRAnalyzer'));
const MaterialManagementModule = lazy(() => import('./components/modules/MaterialManagementModule'));
const MPRReportModule = lazy(() => import('./components/modules/MPRReportModule'));


const App: React.FC = () => {
  // Register service worker and add accessibility features on component mount
  useEffect(() => {
    // Initialize localStorage with empty arrays if no data exists
    LocalStorageUtils.initializeEmptyData();
    
    // Initialize with empty users array if no data exists
    const savedUsers = localStorage.getItem('roadmaster-users');
    if (!savedUsers) {
      localStorage.setItem('roadmaster-users', JSON.stringify([]));
    }
    

    
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          // Check if we're on localhost or a secure context (HTTPS)
          if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('SW registered: ', registration);
          } else {
            console.log('Service worker not registered: not a secure context');
          }
        } catch (registrationError) {
          console.log('SW registration failed: ', registrationError);
        }
      };
      
      // Wait for the window to load
      if (document.readyState === 'loading') {
        window.addEventListener('load', registerSW);
      } else {
        registerSW();
      }
    }
    
    // Add accessibility features
    addSkipLink('#main-content', 'Skip to main content');
  }, []);


  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode]);


  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [userName, setUserName] = useState('Admin');
  const [currentUserId, setCurrentUserId] = useState<string>('admin-001');

  // Effect to verify authentication state after component mounts
  useEffect(() => {
    console.log('Component mounted - Auth state check:', {
      isAuthenticated,
      userRole,
      userName,
      currentUserId,
      localStorageAuth: localStorage.getItem('roadmaster-authenticated'),
      localStorageRole: localStorage.getItem('roadmaster-user-role'),
      localStorageName: localStorage.getItem('roadmaster-user-name'),
      localStorageUserId: localStorage.getItem('roadmaster-current-user-id'),
    });
  }, [isAuthenticated, userRole, userName, currentUserId]);

  // Debug effect to track authentication state changes
  useEffect(() => {
    console.log('Authentication state changed:', {
      isAuthenticated,
      userRole,
      userName,
      currentUserId
    });
  }, [isAuthenticated, userRole, userName, currentUserId]);
  
  // Project selection state
  const [hasSelectedProject, setHasSelectedProject] = useState(false);
  
  // Main app state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  
  // Initialize projects from localStorage or use mock data with caching
  const [projects, setProjects] = useState<Project[]>(() => {
    const cacheKey = getCacheKey('projects');
    const cachedProjects = DataCache.get<Project[]>(cacheKey);
    
    if (cachedProjects) {
      return cachedProjects;
    }
    
    const savedProjects = localStorage.getItem('roadmaster-projects');
    const projectsData = savedProjects ? JSON.parse(savedProjects) : [];
    
    // Initialize with empty array if no data exists
    if (!savedProjects) {
      localStorage.setItem('roadmaster-projects', JSON.stringify([]));
    }
    
    // Cache the projects
    DataCache.set(cacheKey, projectsData, { ttl: 10 * 60 * 1000 }); // 10 minutes
    
    return projectsData;
  });
  

  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    // Try to restore the last selected project from localStorage
    const savedSelectedProject = localStorage.getItem('roadmaster-selected-project');
    console.log('Initial selectedProjectId state:', savedSelectedProject);
    return savedSelectedProject || null;
  });
  
  // Update localStorage whenever selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('roadmaster-selected-project', selectedProjectId);
      setHasSelectedProject(true); // Move to main app after project selection
    } else {
      localStorage.removeItem('roadmaster-selected-project');
    }
  }, [selectedProjectId]);
  
  // Initialize messages from localStorage or use mock data
  const [messages, setMessages] = useState<Message[]>(() => {
    const cacheKey = getCacheKey('messages');
    const cachedMessages = DataCache.get<Message[]>(cacheKey);
    
    if (cachedMessages) {
      return cachedMessages;
    }
    
    const savedMessages = localStorage.getItem('roadmaster-messages');
    const messagesData = savedMessages ? JSON.parse(savedMessages) : [];
    
    // Initialize with empty array if no data exists
    if (!savedMessages) {
      localStorage.setItem('roadmaster-messages', JSON.stringify([]));
    }
    
    // Cache the messages
    DataCache.set(cacheKey, messagesData, { ttl: 5 * 60 * 1000 }); // 5 minutes
    
    return messagesData;
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  


  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('roadmaster-settings');
    return savedSettings ? JSON.parse(savedSettings) : {
      companyName: 'RoadMaster Pro',
      currency: 'USD', // Default currency - can be changed in settings
      vatRate: 13,
      fiscalYearStart: '2024-01-01',
      googleSpreadsheetId: '',
      notifications: {
          enableEmail: true,
          enableInApp: true,
          notifyUpcoming: true,
          daysBefore: 7,
          notifyOverdue: true,
          dailyDigest: true,
      }
    };
  });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Partial<Project> | null>(null);
  
  const currentProject = useMemo(() => {
    const project = projects.find(p => p.id === selectedProjectId);
    return project ? prepareProjectWithMaterials(project) : project;
  }, [projects, selectedProjectId]);
  
  const currentUser = useMemo(() => {
    // Get users from localStorage, fallback to empty array
    const savedUsers = localStorage.getItem('roadmaster-users');
    let users = savedUsers ? JSON.parse(savedUsers) : [];

    // Initialize with empty array if no data exists
    if (!savedUsers) {
      users = [];
      localStorage.setItem('roadmaster-users', JSON.stringify(users));
    }
    
    // Find user by ID or use a default user
    let user = users.find(u => u.id === currentUserId);
    if (!user && users.length > 0) {
      user = users[0]; // Use first user as fallback
    }
    
    // If no user found, create a default user
    if (!user) {
      user = {
        id: currentUserId || 'admin-001',
        name: 'Dharma Dhoj Kunwar',
        email: 'dharmadkunwar20@gmail.com',
        phone: '9779802877286',
        role: UserRole.ADMIN,
        avatar: 'https://ui-avatars.com/api/?name=Dharma+Kunwar&background=random'
      };
    }
    
    return PermissionsService.createUserWithPermissions(user);
  }, [currentUserId]);
  
  // Memoize the user permissions to prevent unnecessary recalculations
  const userPermissions = useMemo(() => currentUser, [currentUser]);

  const handleLogin = (role: UserRole, name: string) => {
      startTransition(() => {
          setIsAuthenticated(true);
          setUserRole(role);
          setUserName(name);
          
          // Save authentication state to localStorage
          localStorage.setItem('roadmaster-authenticated', 'true');
          localStorage.setItem('roadmaster-user-role', role);
          localStorage.setItem('roadmaster-user-name', name);
          
          // Get users from localStorage
          const savedUsers = localStorage.getItem('roadmaster-users');
          let users = savedUsers ? JSON.parse(savedUsers) : [];

          // Initialize with empty array if no data exists
          if (!savedUsers) {
            users = [];
            localStorage.setItem('roadmaster-users', JSON.stringify(users));
          }
          
          // Look for admin user first, then by role, then default
          let userId = 'u2'; // default fallback
          
          if (role === UserRole.ADMIN) {
            const adminUser = users.find(u => u.role === 'Admin' || u.role === UserRole.ADMIN);
            userId = adminUser ? adminUser.id : 'admin-001';
          } else {
            userId = users.find(u => u.role === role)?.id || userId;
          }
          
          setCurrentUserId(userId);
          localStorage.setItem('roadmaster-current-user-id', userId);
      });
  };

  const onSaveProject = async (project: Partial<Project>) => {
    console.log('onSaveProject called with:', project);
    try {
      let backendProject: Project;
      // Ensure all fields are initialized to prevent issues with backend or other modules
      const completeProjectData: Project = {
        id: project.id || `proj-${Date.now()}`, // Generate ID if new
        name: project.name || '',
        code: project.code || '',
        location: project.location || '',
        contractor: project.contractor || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        client: project.client || '',
        engineer: project.engineer || '',
        contractNo: project.contractNo || '',
        contractPeriod: project.contractPeriod || '',
        projectManager: project.projectManager || '',
        supervisor: project.supervisor || '',
        consultantName: project.consultantName || '',
        clientName: project.clientName || '',
        logo: project.logo || '',
        weather: project.weather, // Weather can be undefined
        lastSynced: project.lastSynced,
        spreadsheetId: project.spreadsheetId,
        settings: project.settings,
        environmentRegistry: project.environmentRegistry || { treesRemoved: 0, treesPlanted: 0, sprinklingLogs: [], treeLogs: [] },

        // Arrays, ensure they are always arrays
        boq: project.boq || [],
        rfis: project.rfis || [],
        labTests: project.labTests || [],
        schedule: project.schedule || [],
        structures: project.structures || [],
        agencies: project.agencies || [],
        agencyPayments: project.agencyPayments || [],
        linearWorks: project.linearWorks || [],
        inventory: project.inventory || [],
        inventoryTransactions: project.inventoryTransactions || [],
        vehicles: project.vehicles || [],
        vehicleLogs: project.vehicleLogs || [],
        documents: project.documents || [],
        sitePhotos: project.sitePhotos || [],
        dailyReports: project.dailyReports || [],
        preConstruction: project.preConstruction || [],
        landParcels: project.landParcels || [],
        mapOverlays: project.mapOverlays || [],
        hindrances: project.hindrances || [],
        ncrs: project.ncrs || [],
        contractBills: project.contractBills || [],
        subcontractorBills: project.subcontractorBills || [],
        measurementSheets: project.measurementSheets || [],
        staffLocations: project.staffLocations || [],
        purchaseOrders: project.purchaseOrders || [],
        agencyMaterials: project.agencyMaterials || [],
        agencyBills: project.agencyBills || [],
        subcontractorPayments: project.subcontractorPayments || [],
        preConstructionTasks: project.preConstructionTasks || [],
        kmlData: project.kmlData || [],
        variationOrders: project.variationOrders || [],
        resources: project.resources || [],
        resourceAllocations: project.resourceAllocations || [],
        milestones: project.milestones || [],
        comments: project.comments || [],
        checklists: project.checklists || [],
        defects: project.defects || [],
        complianceWorkflows: project.complianceWorkflows || [],
        auditLogs: project.auditLogs || [],
        structureTemplates: project.structureTemplates || [],
        accountingIntegrations: project.accountingIntegrations || [],
        accountingTransactions: project.accountingTransactions || [],
        personnel: project.personnel || [],
        fleet: project.fleet || [],
      };
      
      // Apply material migration to ensure unified material system is used
      const processedProject: Project = prepareProjectWithMaterials(completeProjectData);

      if (project.id) {
        backendProject = await apiService.updateProject(project.id, processedProject);
      } else {
        backendProject = await apiService.createProject(processedProject);
      }

      setProjects(prev => {
        const updatedProjects = project.id 
          ? prev.map(p => p.id === backendProject.id ? backendProject : p)
          : [...prev, backendProject];
        
        localStorage.setItem('roadmaster-projects', JSON.stringify(updatedProjects));
        DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 }); // 10 minutes
        

        
        return updatedProjects;
      });
    } catch (error) {
      console.error('Failed to save project to backend:', error);
      // Optionally show an error message to the user
      throw error; // Re-throw to allow further error handling if needed
    }
  };

  const handleSelectProject = (projectId: string) => {
    startTransition(() => setSelectedProjectId(projectId));
  };
  
  const handleClearProject = () => {
    startTransition(() => {
      setSelectedProjectId(null);
      // setHasSelectedProject(false); // This state is no longer needed after refactor.
    });
  };
  
  const onDeleteProject = async (projectId: string) => {
    try {
      await apiService.deleteProject(projectId);
      setProjects(prev => {
        const updatedProjects = prev.filter(p => p.id !== projectId);
        
        // Defer synchronous storage updates to prevent blocking the main thread during the click event
        setTimeout(() => {
          localStorage.setItem('roadmaster-projects', JSON.stringify(updatedProjects));
          DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 }); // 10 minutes
        }, 0);


        
        return updatedProjects;
      });
    } catch (error) {
      console.error('Failed to delete project from backend:', error);
      throw error;
    }
  };

  const handleManualSync = () => {
      if (!appSettings.googleSpreadsheetId && !currentProject?.spreadsheetId) {
          toast("Sync Failed", {
            description: "Please configure a Google Spreadsheet ID in Settings > Cloud Integrations first.",
            action: {
              label: "Close",
              onClick: () => console.log("Close"),
            },
          });
          return;
      }
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          const now = new Date().toLocaleTimeString();
          if (currentProject) {
            onSaveProject({ ...currentProject, lastSynced: now });
            toast("Sync Complete", {
              description: `Project synced successfully at ${now}.`,
            });
          }
      }, 2000);
  };

  // const handleSnackbarClose removed - replaced by useToast
  
  const overviewItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard }, 
      // { id: 'map', label: 'GIS Alignment', icon: MapIcon },
      { id: 'messages', label: 'Communications', icon: MessageSquare },
      { id: 'documents', label: 'Document Hub', icon: FolderOpen }
    ];
    
    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.PROJECT_MANAGER) {
      if ((currentUser as UserWithPermissions).permissions.includes(Permission.USER_READ)) {
        items.push({ id: 'user-management', label: 'User Management', icon: UserCheck });
      }
      items.push({ id: 'user-registration', label: 'Create Account', icon: Shield }); // This is 'Create Account'
    }
    
    return items;
  }, [currentUser]);

  const navGroups = useMemo(() => [
    { title: 'Overview', items: overviewItems },
    { title: 'Commercial', items: [
        { id: 'boq', label: 'BOQ Ledger', icon: FileText },
        { id: 'billing', label: 'Billing & Invoicing', icon: CreditCard },
        { id: 'variations', label: 'Amendments', icon: FileDiff },
        { id: 'financials', label: 'Financials & Commercial', icon: DollarSign },
        { id: 'ocr-extraction', label: 'Chandra OCR', icon: Eye }
    ]},
    { title: 'Partners', items: [
        { id: 'agencies', label: 'Agencies', icon: Briefcase },
        { id: 'subcontractors', label: 'Subcontractors', icon: Briefcase },
        { id: 'subcontractor-billing', label: 'Subcontractor Billing', icon: CreditCard }
    ]},
    { title: 'Execution', items: [
        { id: 'schedule', label: 'CPM Schedule', icon: CalendarClock }, 
        { id: 'construction', label: 'Structural', icon: Hammer }, 
        { id: 'linear-works', label: 'Chainage Progress', icon: Navigation }, 
        { id: 'site-photos', label: 'Visual Intel', icon: Camera },
        { id: 'daily-reports', label: 'Field DPR', icon: ClipboardList },
        { id: 'pre-construction', label: 'Pre-Construction', icon: HardHat },
        { id: 'reports-analytics', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'mpr-report', label: 'Monthly Reports', icon: FileText }
    ]},
    { title: 'Ops & Quality', items: [
        { id: 'rfis', label: 'Inspections', icon: ClipboardCheck },
        { id: 'materials-hub', label: 'Materials & Resources', icon: Package },
        { id: 'assets', label: 'Assets & Equipment', icon: PackageSearch },
        { id: 'resources', label: 'Resource Management', icon: Users },
        { id: 'fleet', label: 'Telemetry', icon: Truck },
        { id: 'resource-matrix', label: 'Resource Matrix', icon: Layers },
        { id: 'quality', label: 'Quality Hub', icon: Shield },
        { id: 'lab', label: 'Material Testing', icon: Scale },
        { id: 'environment', label: 'EMP Compliance', icon: Trees },
        { id: 'output-export', label: 'Exports & Reports', icon: Download },
        { id: 'data-analysis', label: 'Data Analysis', icon: BarChart3 }
    ]},
    { title: 'Information', items: [
        { id: 'about', label: 'About', icon: HardHat },
        { id: 'contact', label: 'Contact', icon: Mail }
    ]}
  ], [overviewItems]);

  // Render login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <I18nProvider>
        <NotificationProvider>
          <Login onLogin={handleLogin} />
        </NotificationProvider>
      </I18nProvider>
    );
  }
    
  // Render project selection screen if authenticated but no project selected
  if (isAuthenticated && !selectedProjectId) {
    return (
      <I18nProvider>
        <NotificationProvider>
          <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="border-b bg-background p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <HardHat size={20} strokeWidth={2.5} />
                </div>
                <h1 className="text-lg font-bold text-foreground">RoadMaster<span className="text-primary">.Pro</span></h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
                  <Sun className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  AuditService.logLogout(currentUser.id, currentUser.name, selectedProjectId || undefined, currentProject?.name);
                  setIsAuthenticated(false);
                  setUserRole(UserRole.PROJECT_MANAGER);
                  setUserName('');
                  setCurrentUserId('u2');
                  localStorage.removeItem('roadmaster-authenticated');
                  localStorage.removeItem('roadmaster-user-role');
                  localStorage.removeItem('roadmaster-user-name');
                  localStorage.removeItem('roadmaster-current-user-id');
                }}>
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </Button>
              </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">
              <h2 className="text-2xl font-bold mb-4">Welcome, {userName}</h2>
              <p className="text-md text-slate-600 mb-6">Select an engineering project to begin</p>
              <ProjectsList
                projects={projects}
                userRole={userRole}
                onSelectProject={handleSelectProject}
                onSaveProject={onSaveProject}
                onDeleteProject={onDeleteProject}
                onOpenModal={(project) => {
                  setEditProject(project);
                  setIsProjectModalOpen(true);
                }}
              />
            </main>
          </div>
          <ProjectModal
            open={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            onSave={(project) => {
              onSaveProject(project);
              setIsProjectModalOpen(false);
            }}
            project={editProject}
          />
        </NotificationProvider>
      </I18nProvider>
    );
  }
    
  // Render main application if authenticated and project is selected
  return (
    <I18nProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <div className="flex min-h-screen bg-background text-foreground overflow-hidden">
            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                      <HardHat size={20} strokeWidth={2.5} />
                    </div>
                    RoadMaster<span className="text-indigo-600">.Pro</span>
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
                              activeTab === item.id && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            )}
                            onClick={() => {
                              startTransition(() => setActiveTab(item.id));
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
                "hidden lg:flex flex-col border-r bg-white transition-all duration-300 ease-in-out shrink-0 h-screen",
                isSidebarCollapsed ? "w-16" : "w-64"
              )}
            >
              <div className="h-14 flex items-center px-4 border-b shrink-0 overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                    <HardHat size={16} strokeWidth={2.5} />
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="font-bold whitespace-nowrap">RoadMaster<span className="text-indigo-600">.Pro</span></span>
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
                                  activeTab === item.id && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                )}
                                onClick={() => startTransition(() => setActiveTab(item.id))}
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
                  onClick={() => startTransition(() => setActiveTab('settings'))}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {!isSidebarCollapsed && <span>Settings</span>}
                </Button>
                <Button 
                  variant="ghost" 
                  className={cn("w-full justify-start text-red-500 mt-1", isSidebarCollapsed ? "px-0 justify-center" : "gap-3")}
                  onClick={() => {
                    AuditService.logLogout(currentUser.id, currentUser.name, selectedProjectId || undefined, currentProject?.name);
                    setIsAuthenticated(false);
                    setUserRole(UserRole.PROJECT_MANAGER);
                    setUserName('');
                    setCurrentUserId('u2');
                    localStorage.removeItem('roadmaster-authenticated');
                    localStorage.removeItem('roadmaster-user-role');
                    localStorage.removeItem('roadmaster-user-name');
                    localStorage.removeItem('roadmaster-current-user-id');
                  }}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!isSidebarCollapsed && <span>Logout</span>}
                </Button>
              </div>
            </aside>

            {/* Main content area */}
            <div id="main-content" className="flex flex-col flex-1 h-screen overflow-hidden">
              <header className="border-b bg-white p-2 flex justify-between items-center h-14 shrink-0 z-10">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="hidden lg:flex"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  >
                    {isSidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6 mx-2 hidden lg:block" />
                  
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold truncate max-w-[200px]">{currentProject?.name || 'No Project Selected'}</h2>
                    {currentProject?.code && <Badge variant="secondary" className="hidden sm:inline-flex">{currentProject.code}</Badge>}
                    <Button variant="outline" size="sm" className="h-8 hidden sm:flex" onClick={() => setSelectedProjectId(null)}>
                      <LayoutGrid className="mr-2 h-3 w-3" /> Switch
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleManualSync}>
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudCog className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isSyncing ? "Syncing..." : "Live Sheets"}</TooltipContent>
                  </Tooltip>
                  <Toggle
                    size="sm"
                    pressed={themeMode === 'dark'} // Control the pressed state based on themeMode
                    onPressedChange={() => setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'))}
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Toggle>
                  <NotificationsBadge />
                  <Button variant="ghost" size="icon" onClick={() => setIsAIModalOpen(true)}>
                    <Bot className="h-5 w-5" />
                  </Button>
                  <Avatar>
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </header>

              <main className="flex-1 p-4 overflow-auto bg-slate-50">
                <ErrorBoundary>
                  <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    {activeTab === 'dashboard' && <Dashboard project={currentProject} settings={appSettings} onUpdateProject={onSaveProject} onUpdateSettings={setAppSettings} />}
                    {/* Other module renderings will go here */}
                    {activeTab === 'about' && <AboutPage />}
                    {activeTab === 'contact' && <ContactPage />}
                    {activeTab === 'user-management' && <UserManagement />}
                    {activeTab === 'user-registration' && <UserRegistration />}
                    {activeTab === 'boq' && <BOQModule project={currentProject} settings={appSettings} userRole={userRole} onProjectUpdate={onSaveProject} />}
                    {activeTab === 'financials' && <FinancialManagementHub project={currentProject} userRole={userRole} settings={appSettings} onProjectUpdate={onSaveProject} />}
                    {activeTab === 'settings' && <SettingsModule settings={appSettings} onUpdate={setAppSettings} />}
                  </Suspense>
                </ErrorBoundary>
              </main>
            </div>

            {isAIModalOpen && currentProject && <AIChatModal project={currentProject} onClose={() => setIsAIModalOpen(false)} />}
            <ProjectModal
              open={isProjectModalOpen}
              onClose={() => setIsProjectModalOpen(false)}
              onSave={(project) => { onSaveProject(project); setIsProjectModalOpen(false); }}
              project={editProject}
            />
          </div>
        </TooltipProvider>
      </NotificationProvider>
    </I18nProvider>
  );
};

export default App;
