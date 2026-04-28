import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Mock factory for App's critical hooks - controlled via vi.hoisted()
 * This ensures variables are available during mock initialization
 */
const { 
  mockUseAuth,
  mockUseProjects,
  mockUseMessages,
  mockUseSettings,
  mockUseAppInitialization,
  mockUseKeyboardShortcuts,
  mockUseI18n,
  mockUseNotifications
} = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseProjects: vi.fn(),
  mockUseMessages: vi.fn(),
  mockUseSettings: vi.fn(),
  mockUseAppInitialization: vi.fn(),
  mockUseKeyboardShortcuts: vi.fn(),
  mockUseI18n: vi.fn(),
  mockUseNotifications: vi.fn(),
}));

// Mock paths matching App.tsx imports exactly
vi.mock('./hooks/useAuth.tsx', () => ({
  useAuth: mockUseAuth
}));

vi.mock('./hooks/useProjects', () => ({
  useProjects: mockUseProjects
}));

vi.mock('./hooks/useMessages', () => ({
  useMessages: mockUseMessages
}));

vi.mock('./hooks/useSettings', () => ({
  useSettings: mockUseSettings
}));

vi.mock('./hooks/useAppInitialization', () => ({
  useAppInitialization: mockUseAppInitialization
}));

vi.mock('./hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: mockUseKeyboardShortcuts
}));

vi.mock('./contexts/I18nContext', () => ({
  useI18n: mockUseI18n,
  I18nProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('./contexts/NotificationContext', () => ({
  useNotifications: mockUseNotifications,
  NotificationProvider: ({ children }: any) => <>{children}</>,
}));

// Mock lazy-loaded components to avoid loading issues in tests
vi.mock('./components/core/ProjectSelector', () => ({
  default: ({ userName }: any) => (
    <div data-testid="project-selector">
      <h1>RoadMaster Pro</h1>
      <p>Welcome back, {userName}</p>
    </div>
  )
}));

vi.mock('./components/core/ProjectModal', () => ({
  default: () => <div data-testid="project-modal">ProjectModal</div>
}));

vi.mock('./components/core/ProjectsListSkeleton', () => ({
  default: () => <div data-testid="projects-skeleton">ProjectsListSkeleton</div>
}));

// Mock the modules that cause issues in JSDOM or are too complex for unit tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  BarChart: () => <div />,
  Bar: () => <div />,
  PieChart: () => <div />,
  Pie: () => <div />,
  Cell: () => <div />,
}));

// Mock the apiService (App calls apiService directly)
vi.mock('./services/api/apiService', () => ({
  apiService: {
    getProjects: vi.fn().mockResolvedValue([]),
    getUsers: vi.fn().mockResolvedValue([]),
    heartbeat: vi.fn().mockResolvedValue({ status: 'ok' }),
  },
}));

// Import App after mocks are defined to ensure it uses the mocked hooks
import App from './App';

describe('App Integration', () => {
  beforeEach(() => {
    // Clear mocks and localStorage
    vi.clearAllMocks();
    vi.clearAllTimers();
    
    // Mock localStorage consistently
    let store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
      length: 0,
      key: vi.fn((i) => Object.keys(store)[i] || null),
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
    
    // Default mock implementations for all App hooks
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      userRole: 'SITE_ENGINEER',
      userName: '',
      currentUserId: '',
      currentUser: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    mockUseProjects.mockReturnValue({
      projects: [],
      selectedProjectId: null,
      setSelectedProjectId: vi.fn(),
      currentProject: null,
      isLoadingProjects: false,
      apiError: null,
      fetchProjects: vi.fn().mockResolvedValue(undefined),
      saveProject: vi.fn().mockResolvedValue(undefined),
      refreshCurrentProject: vi.fn(),
      updateLocation: vi.fn(),
      deleteProject: vi.fn(),
      isHydrated: true,
    });

    mockUseMessages.mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      markAsRead: vi.fn(),
      isLoading: false,
    });

    mockUseSettings.mockReturnValue({
      appSettings: {},
      updateSettings: vi.fn(),
    });

    mockUseAppInitialization.mockImplementation((setLoadingStatus: any, setSystemReady: any, setIsInitialLoading: any) => {
      // Use microtask to avoid "cannot update during render"
      Promise.resolve().then(() => {
        setLoadingStatus('Ready');
        setSystemReady(true);
        setIsInitialLoading(false);
      });
    });

    mockUseKeyboardShortcuts.mockReturnValue(undefined);

    mockUseI18n.mockReturnValue({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string) => key,
    });

    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      addNotification: vi.fn(),
      removeNotification: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      updatePreferences: vi.fn(),
      getNotificationHistory: () => [],
      clearNotifications: vi.fn(),
      requestPushPermission: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders login page when not authenticated', async () => {
    render(<App />);
    // Wait for the loading state to pass and then check for login elements
    await waitFor(() => {
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
    });
  });

  it('renders project selector when authenticated', async () => {
    const mockUser = {
      id: 'u1',
      full_name: 'Test User',
      role: 'ADMIN',
      email: 'test@example.com'
    };
    
    // Mock useAuth to return authenticated state
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      userRole: mockUser.role,
      userName: mockUser.full_name,
      currentUserId: mockUser.id,
      currentUser: mockUser,
      loading: false,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    
    await waitFor(() => {
      // Check for elements that are in our mocked ProjectSelector
      expect(screen.getByTestId('project-selector')).toBeInTheDocument();
      expect(screen.getByText(/RoadMaster/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
