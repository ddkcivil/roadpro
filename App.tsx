import React, { useState, useEffect, useMemo, startTransition, lazy, Suspense } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Avatar, 
  Button,
  Fade,
  Tooltip,
  ListSubheader,
  Chip,
  alpha,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
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
  Download
} from 'lucide-react';
import { UserRole, Project, AppSettings, Message, UserWithPermissions, Permission } from './types';
import { PermissionsService } from './services/permissionsService';
import { AuditService } from './services/auditService';
import { DataCache, getCacheKey } from './utils/cacheUtils';
import { LocalStorageUtils } from './utils/localStorageUtils';
import { sqliteService } from './services/sqliteService';
import { DataSyncService } from './services/dataSyncService';
import { addSkipLink } from './utils/a11yUtils';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationsBadge from './components/NotificationsBadge';
import { I18nProvider } from './contexts/I18nContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Login from './components/Login';
import DataAnalysisModule from './components/DataAnalysisModule';

// Lazy-loaded components for performance optimization
const Dashboard = lazy(() => import('./components/Dashboard'));
const BOQModule = lazy(() => import('./components/BOQModule'));
const BillingModule = lazy(() => import('./components/BillingModule'));
const VariationModule = lazy(() => import('./components/VariationModule'));
const RFIModule = lazy(() => import('./components/RFIModule'));
const ScheduleModule = lazy(() => import('./components/ScheduleModule'));
const DailyReportModule = lazy(() => import('./components/DailyReportModule'));
const ProjectsList = lazy(() => import('./components/ProjectsList'));
const PortfolioDashboard = lazy(() => import('./components/PortfolioDashboard'));
const AIChatModal = lazy(() => import('./components/AIChatModal'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const SettingsModule = lazy(() => import('./components/SettingsModule'));
const ConstructionModule = lazy(() => import('./components/ConstructionModule'));
const MapModule = lazy(() => import('./components/MapModule'));
const LabModule = lazy(() => import('./components/LabModule'));
const QualityHub = lazy(() => import('./components/QualityHub'));
const LinearWorksModule = lazy(() => import('./components/LinearWorksModule'));
const SubcontractorModule = lazy(() => import('./components/SubcontractorModule'));
const SubcontractorBillingModule = lazy(() => import('./components/SubcontractorBillingModule'));
const DocumentsModule = lazy(() => import('./components/DocumentsModule'));
const MessagesModule = lazy(() => import('./components/MessagesModule'));
const FleetModule = lazy(() => import('./components/FleetModule'));
const ResourceManager = lazy(() => import('./components/ResourceManager'));
const SitePhotosModule = lazy(() => import('./components/SitePhotosModule'));
const EnvironmentModule = lazy(() => import('./components/EnvironmentModule'));
const PreConstructionModule = lazy(() => import('./components/PreConstructionModule'));
const PavementModule = lazy(() => import('./components/PavementModule'));
const AgencyModule = lazy(() => import('./components/AgencyModule'));
const AssetsModule = lazy(() => import('./components/AssetsModule'));
const ResourceMatrixModule = lazy(() => import('./components/ResourceMatrixModule'));
const MaterialsResourcesHub = lazy(() => import('./components/MaterialsResourcesHub'));
const FinancialsCommercialHub = lazy(() => import('./components/FinancialsCommercialHub'));
const ReportsAnalyticsHub = lazy(() => import('./components/ReportsAnalyticsHub'));
const ChandraOCRAnalyzer = lazy(() => import('./components/ChandraOCRAnalyzer'));
const MPRReportModule = lazy(() => import('./components/MPRReportModule'));
const OutputExportModule = lazy(() => import('./components/OutputExportModule'));

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4f46e5', light: '#6366f1', dark: '#3730a3', contrastText: '#ffffff' },
    secondary: { main: '#0f172a', light: '#334155', dark: '#020617' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#0f172a', secondary: '#475569' },
    divider: 'rgba(0,0,0,0.06)',
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "sans-serif"',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { 
          border: 'none', 
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02), 0 8px 24px rgba(0,0,0,0.02)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.04)',
          }
        }
      }
    }
  }
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#ffffff' },
    secondary: { main: '#f8fafc', light: '#ffffff', dark: '#cbd5e1' },
    background: { default: '#020617', paper: '#0f172a' },
    text: { primary: '#f8fafc', secondary: '#94a3b8' },
    divider: 'rgba(255,255,255,0.1)',
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "sans-serif"',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 2 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { 
          border: 'none', 
          backgroundColor: '#0f172a',
          color: '#94a3b8',
          transition: 'width 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'none',
          backgroundImage: 'none',
        }
      }
    }
  }
});

const App: React.FC = () => {
  // Register service worker and add accessibility features on component mount
  useEffect(() => {
    // Initialize localStorage with empty arrays if no data exists
    LocalStorageUtils.initializeEmptyData();
    
    // Ensure admin user exists
    const savedUsers = localStorage.getItem('roadmaster-users');
    if (!savedUsers || JSON.parse(savedUsers).length === 0) {
      const adminUser = {
        id: 'admin-001',
        name: 'Dharma Dhoj Kunwar',
        email: 'dharmadkunwar20@gmail.com',
        phone: '9779802877286',
        role: 'Admin',
        avatar: 'https://ui-avatars.com/api/?name=Dharma+Kunwar&background=random'
      };
      localStorage.setItem('roadmaster-users', JSON.stringify([adminUser]));
    }
    
    // Initialize SQLite service and migrate data from localStorage if needed
    const initializeSQLite = async () => {
      try {
        await sqliteService.initialize();
        
        // Check if we need to migrate data from localStorage to SQLite
        const sqliteDataExists = localStorage.getItem('roadmaster-sqlite-db');
        if (!sqliteDataExists) {
          console.log('Migrating data from localStorage to SQLite...');
          await sqliteService.migrateFromLocalStorage();
          console.log('Data migration to SQLite completed');
        }
      } catch (error) {
        console.error('Error initializing SQLite service:', error);
      }
    };
    
    initializeSQLite();
    
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
  const [themePrimaryColor, setThemePrimaryColor] = useState('#4f46e5');
  const [themeSecondaryColor, setThemeSecondaryColor] = useState('#0f172a');
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user was previously authenticated
    const authState = localStorage.getItem('roadmaster-authenticated') === 'true';
    console.log('Initial isAuthenticated state:', authState);
    return authState;
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('roadmaster-user-role');
    const role = savedRole ? savedRole as UserRole : UserRole.PROJECT_MANAGER;
    console.log('Initial userRole state:', role);
    return role;
  });
  const [userName, setUserName] = useState(() => {
    const name = localStorage.getItem('roadmaster-user-name') || 'Guest';
    console.log('Initial userName state:', name);
    return name;
  });
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const userId = localStorage.getItem('roadmaster-current-user-id') || 'u2';
    console.log('Initial currentUserId state:', userId);
    return userId;
  });

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
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  
  const theme = useMemo(() => {
    const baseTheme = themeMode === 'light' ? lightTheme : darkTheme;
    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        primary: { 
          main: themePrimaryColor, 
          light: themePrimaryColor, 
          dark: themePrimaryColor, 
          contrastText: '#ffffff' 
        },
        secondary: { 
          main: themeSecondaryColor, 
          light: themeSecondaryColor, 
          dark: themeSecondaryColor 
        },
      },
    });
  }, [themeMode, themePrimaryColor, themeSecondaryColor]);

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
  
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);
  
  const currentUser = useMemo(() => {
    // Get users from localStorage, fallback to empty array
    const savedUsers = localStorage.getItem('roadmaster-users');
    const users = savedUsers ? JSON.parse(savedUsers) : [];
    
    // Initialize with empty array if no data exists
    if (!savedUsers) {
      // Create admin user by default
      const adminUser = {
        id: 'admin-001',
        name: 'Dharma Dhoj Kunwar',
        email: 'dharmadkunwar20@gmail.com',
        phone: '9779802877286',
        role: 'Admin',
        avatar: 'https://ui-avatars.com/api/?name=Dharma+Kunwar&background=random'
      };
      const defaultUsers = [adminUser];
      localStorage.setItem('roadmaster-users', JSON.stringify(defaultUsers));
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
            // Create admin user by default
            const adminUser = {
              id: 'admin-001',
              name: 'Dharma Dhoj Kunwar',
              email: 'dharmadkunwar20@gmail.com',
              phone: '9779802877286',
              role: 'Admin',
              avatar: 'https://ui-avatars.com/api/?name=Dharma+Kunwar&background=random'
            };
            users = [adminUser];
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

  const onSaveProject = (project: Partial<Project>) => {
    setProjects(prev => {
      // Create a complete project object with default values for missing fields
      const completeProject: Project = {
        id: project.id || `proj-${Date.now()}`,
        name: project.name || '',
        code: project.code || '',
        location: project.location || '',
        contractor: project.contractor || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        client: project.client || '',
        boq: project.boq || [],
        rfis: project.rfis || [],
        labTests: project.labTests || [],
        schedule: project.schedule || [],
        inventory: project.inventory || [],
        inventoryTransactions: project.inventoryTransactions || [],
        vehicles: project.vehicles || [],
        vehicleLogs: project.vehicleLogs || [],
        documents: project.documents || [],
        dailyReports: project.dailyReports || [],
        preConstruction: project.preConstruction || [],
        landParcels: project.landParcels || [],
        mapOverlays: project.mapOverlays || [],
        hindrances: project.hindrances || [],
        ncrs: project.ncrs || [],
        contractBills: project.contractBills || [],
        measurementSheets: project.measurementSheets || [],
        staffLocations: project.staffLocations || [],
        // Initialize optional arrays if not provided
        structures: project.structures || [],
        agencies: project.agencies || [],
        agencyPayments: project.agencyPayments || [],
        linearWorks: project.linearWorks || [],
        subcontractorBills: project.subcontractorBills || [],
        sitePhotos: project.sitePhotos || [],
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
        weather: project.weather,
        lastSynced: project.lastSynced,
        spreadsheetId: project.spreadsheetId,
        settings: project.settings,
        environmentRegistry: project.environmentRegistry,
        projectManager: project.projectManager,
        supervisor: project.supervisor,
        consultantName: project.consultantName,
        clientName: project.clientName,
        logo: project.logo,
        engineer: project.engineer,
        contractNo: project.contractNo,
        contractPeriod: project.contractPeriod
      };
      
      const updatedProjects = project.id 
        ? prev.map(p => p.id === project.id ? completeProject : p)
        : [...prev, completeProject];
      
      localStorage.setItem('roadmaster-projects', JSON.stringify(updatedProjects));
      
      // Update cache
      DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 }); // 10 minutes
      
      return updatedProjects;
    });
  };

  const handleSelectProject = (projectId: string) => {
    startTransition(() => setSelectedProjectId(projectId));
  };
  
  const handleClearProject = () => {
    startTransition(() => {
      setSelectedProjectId(null);
      setHasSelectedProject(false);
    });
  };
  
  const onDeleteProject = (projectId: string) => {
    setProjects(prev => {
      const updatedProjects = prev.filter(p => p.id !== projectId);
      localStorage.setItem('roadmaster-projects', JSON.stringify(updatedProjects));
      
      // Update cache
      DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 }); // 10 minutes
      
      return updatedProjects;
    });
  };

  const handleManualSync = () => {
      if (!appSettings.googleSpreadsheetId && !currentProject?.spreadsheetId) {
          setSnackbarOpen(true);
          return;
      }
      setIsSyncing(true);
      setTimeout(() => {
          setIsSyncing(false);
          const now = new Date().toLocaleTimeString();
          if (currentProject) {
            onSaveProject({ ...currentProject, lastSynced: now });
          }
      }, 2000);
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const overviewItems = useMemo(() => {
    const items = [
      { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard }, 
      { id: 'map', label: 'GIS Alignment', icon: MapIcon },
      { id: 'messages', label: 'Communications', icon: MessageSquare },
      { id: 'documents', label: 'Document Hub', icon: FolderOpen }
    ];
    
    if ((currentUser as UserWithPermissions).permissions.includes(Permission.USER_READ)) {
      items.push({ id: 'user-management', label: 'User Management', icon: UserCheck });
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>
          <NotificationProvider>
            <Login onLogin={handleLogin} />
          </NotificationProvider>
        </I18nProvider>
      </ThemeProvider>
    );
  }
    
  // Render project selection screen if authenticated but no project selected
  if (isAuthenticated && !selectedProjectId) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <I18nProvider>
          <NotificationProvider>
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}>
            <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
              <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5, md: 2 }}>
                <Box sx={{ width: 42, height: 42, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <HardHat size={22} strokeWidth={2.5}/>
                </Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: 'text.primary', letterSpacing: '-0.03em' }}>RoadMaster<span style={{ color: '#818cf8' }}>.Pro</span></Typography>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Box display="flex" alignItems="center" gap={1.5}>
                <IconButton size="small" onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
                  {themeMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </IconButton>
                <Button
                  variant="outlined"
                  startIcon={<LogOut size={16} />}
                  onClick={() => {
                    // Log the logout event
                    AuditService.logLogout(currentUser.id, currentUser.name, selectedProjectId || undefined, currentProject?.name);
                    
                    setIsAuthenticated(false);
                    setUserRole(UserRole.PROJECT_MANAGER);
                    setUserName('');
                    setCurrentUserId('u2');
                    
                    // Clear authentication state from localStorage
                    localStorage.removeItem('roadmaster-authenticated');
                    localStorage.removeItem('roadmaster-user-role');
                    localStorage.removeItem('roadmaster-user-name');
                    localStorage.removeItem('roadmaster-current-user-id');
                  }}
                  size="small"
                >
                  Logout
                </Button>
              </Box>
            </Toolbar>
          </AppBar>
          
          <Box p={{ xs: 2, sm: 3, md: 4 }} flex={1} overflow="auto">
            <Box mb={4}>
              <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-0.04em' }}>Welcome, {userName}</Typography>
              <Typography variant="body1" color="text.secondary">Select an engineering project to begin</Typography>
            </Box>

            <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /></Box>}>
              <ProjectsList
                projects={projects}
                userRole={userRole}
                onSelectProject={handleSelectProject}
                onSaveProject={onSaveProject}
                onDeleteProject={onDeleteProject}
              />
            </Suspense>
          </Box>
        </Box>
          </NotificationProvider>
        </I18nProvider>
      </ThemeProvider>
    );
  }
    
  // Render main application if authenticated and project is selected
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <I18nProvider>
        <NotificationProvider>
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity="warning" sx={{ width: '100%' }}>
          Please configure a Google Spreadsheet ID in Settings &gt; Cloud Integrations first.
        </Alert>
      </Snackbar>
      <Box id="main-content" sx={{ display: 'flex', height: 'calc(100vh - 38px)', overflow: 'hidden' }}>
          
        <Drawer
          variant="permanent"
          sx={{ 
            width: sidebarCollapsed ? 78 : 260,
            flexShrink: 0,
            // Responsive adjustments for mobile
            [`@media (max-width:768px)`]: {
              width: sidebarCollapsed ? 58 : 220,
              '& .MuiDrawer-paper': {
                width: sidebarCollapsed ? 58 : 220,
              }
            },
            '& .MuiDrawer-paper': { 
              width: sidebarCollapsed ? 78 : 260,
              boxSizing: 'border-box',
              overflowX: 'hidden',
              // Responsive adjustments for mobile
              [`@media (max-width:768px)`]: {
                width: sidebarCollapsed ? 58 : 220,
              }
            } 
          }}
        >
          <Box p={sidebarCollapsed ? 1 : 2} display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5, 
            // Responsive adjustments for mobile
            [`@media (max-width:768px)`]: { 
              p: sidebarCollapsed ? 0.5 : 1.5, 
              gap: 1, 
              mb: 1 
            } 
          }}>
            <Box sx={{ width: 42, height: 42, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <HardHat size={22} strokeWidth={2.5}/>
            </Box>
            {!sidebarCollapsed && <Typography variant="h6" fontWeight="800" sx={{ color: 'white', letterSpacing: '-0.03em' }}>RoadMaster<span style={{ color: '#818cf8' }}>.Pro</span></Typography>}
          </Box>
          
          <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, 
            // Responsive adjustments for mobile
            [`@media (max-width:768px)`]: { 
              px: 1 
            } 
          }}>
            {navGroups.map(group => (
              <React.Fragment key={group.title}>
                {!sidebarCollapsed && (
                  <ListSubheader sx={{ bgcolor: 'transparent', color: 'rgba(148, 163, 184, 0.4)', fontSize: 10, fontWeight: 800, mt: 3, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {group.title}
                  </ListSubheader>
                )}
                {group.items.map(item => (
                  <Tooltip key={item.id} title={sidebarCollapsed ? item.label : ""} placement="right">
                    <ListItemButton
                      selected={activeTab === item.id}
                      onClick={() => startTransition(() => setActiveTab(item.id))}
                      sx={{
                        borderRadius: '12px', mb: 0.5, py: 1.2,
                        color: activeTab === item.id ? 'white' : '#94a3b8',
                        bgcolor: activeTab === item.id ? alpha('#4f46e5', 0.2) : 'transparent',
                        '&:hover': { bgcolor: alpha('#ffffff', 0.05) },
                        justifyContent: sidebarCollapsed ? 'center' : 'initial'
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 36, color: 'inherit' }}>
                        <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                      </ListItemIcon>
                      {!sidebarCollapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13, fontWeight: activeTab === item.id ? 700 : 500 }} />}
                    </ListItemButton>
                  </Tooltip>
                ))}
              </React.Fragment>
            ))}

            <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
            
            <Tooltip title={sidebarCollapsed ? "Settings" : ""} placement="right">
                <ListItemButton
                    selected={activeTab === 'settings'}
                    onClick={() => startTransition(() => setActiveTab('settings'))}
                    sx={{
                        borderRadius: '12px', mb: 0.5, py: 1.2,
                        color: activeTab === 'settings' ? 'white' : '#94a3b8',
                        bgcolor: activeTab === 'settings' ? alpha('#4f46e5', 0.2) : 'transparent',
                        '&:hover': { bgcolor: alpha('#ffffff', 0.05) },
                        justifyContent: sidebarCollapsed ? 'center' : 'initial'
                    }}
                >
                    <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 36, color: 'inherit' }}>
                        <Settings size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                    </ListItemIcon>
                    {!sidebarCollapsed && <ListItemText primary="Settings" primaryTypographyProps={{ fontSize: 13, fontWeight: activeTab === 'settings' ? 700 : 500 }} />}
                </ListItemButton>
            </Tooltip>
          </Box>

          <Box p={2} borderTop="1px solid rgba(255,255,255,0.05)">
              <ListItemButton onClick={() => {
                setIsAuthenticated(false);
                setUserRole(UserRole.PROJECT_MANAGER);
                setUserName('');
                setCurrentUserId('u2');
                
                // Clear authentication state from localStorage
                localStorage.removeItem('roadmaster-authenticated');
                localStorage.removeItem('roadmaster-user-role');
                localStorage.removeItem('roadmaster-user-name');
                localStorage.removeItem('roadmaster-current-user-id');
              }} sx={{ borderRadius: '12px', color: '#fca5a5', '&:hover': { bgcolor: alpha('#ef4444', 0.1) } }}>
                  <ListItemIcon sx={{ minWidth: sidebarCollapsed ? 0 : 36, color: 'inherit' }}><LogOut size={18}/></ListItemIcon>
                  {!sidebarCollapsed && <ListItemText primary="Log Out" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />}
              </ListItemButton>
              <IconButton onClick={() => setSidebarCollapsed(!sidebarCollapsed)} sx={{ color: '#475569', mt: 1, width: '100%' }}>
                  {sidebarCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>} 
              </IconButton>
          </Box>
        </Drawer>

        <Box flexGrow={1} display="flex" flexDirection="column" sx={{ bgcolor: 'background.default' }}>
          {currentProject ? (
            <>
                <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
                    <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5, md: 2 }} flexGrow={1}>
                      <Typography variant="h6" fontWeight="800" sx={{ letterSpacing: '-0.02em' }}>{currentProject.name}</Typography>
                      <Chip label={currentProject.code} size="small" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800, fontSize: 10, borderRadius: '6px' }} />
                      <Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => startTransition(() => setSelectedProjectId(null))}
                        startIcon={<LayoutGrid size={14} />}
                        sx={{ ml: 1, textTransform: 'none', borderRadius: 2, fontSize: 12 }}
                      >
                        Switch Project
                      </Button>
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Tooltip title={isSyncing ? "Synchronizing with Google Sheets..." : `Last Synced: ${currentProject.lastSynced || 'Never'}`}>
                          <Button 
                              size="small" 
                              variant="outlined" 
                              onClick={handleManualSync}
                              disabled={isSyncing}
                              startIcon={isSyncing ? <CircularProgress size={14} color="inherit" /> : (currentProject.spreadsheetId || appSettings.googleSpreadsheetId ? <CloudCog size={16} /> : <CloudOff size={16} />)}
                              sx={{ borderRadius: 2, textTransform: 'none', fontSize: 11, borderColor: 'divider' }}
                          >
                              {isSyncing ? 'Syncing...' : (currentProject.spreadsheetId || appSettings.googleSpreadsheetId ? 'Live Sheets' : 'Local Only')}
                          </Button>
                      </Tooltip>
                      
                      <IconButton size="small" onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
                          {themeMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                      </IconButton>
                      
                      <NotificationsBadge />
                      
                      <IconButton size="small" onClick={() => setIsAIModalOpen(true)} sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}>
                          <Bot size={20} />
                      </IconButton>
                      <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center' }} />
                      <Avatar src={currentUser.avatar} sx={{ width: 34, height: 34, border: '2px solid', borderColor: 'background.paper' }} />
                    </Box>
                  </Toolbar>
                </AppBar>

                <Box p={{ xs: 1, sm: 1.5, md: 2 }} flexGrow={1} overflow="auto" tabIndex={-1}>
                  <ErrorBoundary>
                    <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="400px"><CircularProgress /></Box>}>
                        <Box>
                        {activeTab === 'dashboard' && <Dashboard project={currentProject} settings={appSettings} onUpdateProject={onSaveProject} onUpdateSettings={(updatedSettings) => {
                                                setAppSettings(updatedSettings);
                                                // Save to localStorage
                                                localStorage.setItem('roadmaster-settings', JSON.stringify(updatedSettings));
                                              }} />}
                        {activeTab === 'schedule' && (currentUser as UserWithPermissions).permissions.includes(Permission.SCHEDULE_READ) && <ScheduleModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'construction' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <ConstructionModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'boq' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <BOQModule userRole={userRole} project={currentProject} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'variations' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <VariationModule userRole={userRole} project={currentProject} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'billing' && (currentUser as UserWithPermissions).permissions.includes(Permission.FINANCE_READ) && <BillingModule userRole={userRole} project={currentProject} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'financials' && (currentUser as UserWithPermissions).permissions.includes(Permission.FINANCE_READ) && <FinancialsCommercialHub userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'map' && (currentUser as UserWithPermissions).permissions.includes(Permission.PROJECT_READ) && <MapModule project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'rfis' && (currentUser as UserWithPermissions).permissions.includes(Permission.RFI_READ) && <RFIModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'assets' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <AssetsModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'daily-reports' && (currentUser as UserWithPermissions).permissions.includes(Permission.REPORT_READ) && <DailyReportModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'site-photos' && (currentUser as UserWithPermissions).permissions.includes(Permission.DOCUMENT_READ) && <SitePhotosModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'documents' && (currentUser as UserWithPermissions).permissions.includes(Permission.DOCUMENT_READ) && <DocumentsModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'agencies' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <AgencyModule userRole={userRole} project={currentProject} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'ocr-extraction' && (currentUser as UserWithPermissions).permissions.includes(Permission.DOCUMENT_READ) && <ChandraOCRAnalyzer />}
                        {activeTab === 'fleet' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <FleetModule project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'linear-works' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <LinearWorksModule project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'materials-hub' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <MaterialsResourcesHub project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'resources' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <ResourceManager project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'resource-matrix' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <ResourceMatrixModule project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'quality' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <QualityHub project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                                              {activeTab === 'lab' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <LabModule project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'environment' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <EnvironmentModule project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'reports-analytics' && (currentUser as UserWithPermissions).permissions.includes(Permission.REPORT_READ) && <ReportsAnalyticsHub project={currentProject} userRole={userRole} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'output-export' && (currentUser as UserWithPermissions).permissions.includes(Permission.REPORT_READ) && <OutputExportModule project={currentProject} userRole={userRole} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'data-analysis' && <DataAnalysisModule />}
                        {activeTab === 'pre-construction' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <PreConstructionModule project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'projects' && (currentUser as UserWithPermissions).permissions.includes(Permission.PROJECT_READ) && <ProjectsList 
                          projects={projects} 
                          userRole={userRole} 
                          onSelectProject={handleSelectProject} 
                          onSaveProject={onSaveProject} 
                          onDeleteProject={onDeleteProject} 
                        />}
                        {activeTab === 'pavement' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <PavementModule userRole={userRole} project={currentProject} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'mpr-report' && (currentUser as UserWithPermissions).permissions.includes(Permission.REPORT_READ) && <MPRReportModule project={currentProject} userRole={userRole} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'messages' && (currentUser as UserWithPermissions).permissions.includes(Permission.DOCUMENT_READ) && (
                          <MessagesModule 
                            currentUser={currentUser} 
                            users={LocalStorageUtils.getUsers()} 
                            messages={messages} 
                            onSendMessage={(text, receiverId) => {
                              const newMessage: Message = {
                                id: `msg-${Date.now()}-${Math.random()}`,
                                senderId: currentUser.id,
                                receiverId,
                                content: text,
                                timestamp: new Date().toISOString(),
                                read: false,
                                projectId: selectedProjectId || undefined
                              };
                              setMessages(prev => {
                                const updatedMessages = [...prev, newMessage];
                                // Save to localStorage
                                localStorage.setItem('roadmaster-messages', JSON.stringify(updatedMessages));
                                
                                // Update cache
                                DataCache.set(getCacheKey('messages'), updatedMessages, { ttl: 5 * 60 * 1000 }); // 5 minutes
                                
                                return updatedMessages;
                              });
                            }} 
                            projectId={selectedProjectId || ''}
                          />
                        )}
                        {activeTab === 'user-management' && (currentUser as UserWithPermissions).permissions.includes(Permission.USER_READ) && <UserManagement />}
                        {activeTab === 'subcontractors' && (currentUser as UserWithPermissions).permissions.includes(Permission.BOQ_READ) && <SubcontractorModule userRole={userRole} project={currentProject} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'subcontractor-billing' && (currentUser as UserWithPermissions).permissions.includes(Permission.FINANCE_READ) && <SubcontractorBillingModule userRole={userRole} project={currentProject} settings={appSettings} onProjectUpdate={onSaveProject} />}
                        {activeTab === 'settings' && (currentUser as UserWithPermissions).permissions.includes(Permission.SETTINGS_UPDATE) && <SettingsModule settings={appSettings} onUpdate={setAppSettings} />}
                        {activeTab === 'about' && (currentUser as UserWithPermissions).permissions.includes(Permission.PROJECT_READ) && <AboutPage />}
                        {activeTab === 'contact' && (currentUser as UserWithPermissions).permissions.includes(Permission.PROJECT_READ) && <ContactPage />}
                      </Box>
                  </Suspense>
                  </ErrorBoundary>
                </Box>
              </>
          ) : (
            // Show project selection when selectedProjectId exists but project not found
            <Box id="main-content" p={6} overflow="auto" className="bg-background-default" tabIndex={-1}>
               <Box mb={6} tabIndex={-1}>
                  <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: '-0.04em' }}>Project Not Found</Typography>
                  <Typography variant="body1" color="text.secondary" mb={3}>The selected project could not be found. Please select another project.</Typography>
                  <Button
                    variant="contained"
                    onClick={() => startTransition(() => setSelectedProjectId(null))}
                    startIcon={<LayoutGrid size={16} />}
                  >
                    Select Project
                  </Button>
               </Box>
               <Suspense fallback={<Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /></Box>}>
                 <ProjectsList
                    projects={projects}
                    userRole={userRole}
                    onSelectProject={handleSelectProject}
                    onSaveProject={onSaveProject}
                    onDeleteProject={onDeleteProject}
                  />
               </Suspense>
            </Box>
          )}
        </Box>
        {isAIModalOpen && currentProject && <AIChatModal project={currentProject} onClose={() => setIsAIModalOpen(false)} />}
      </Box>
        </NotificationProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App;