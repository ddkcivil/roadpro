import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

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

// Mock the realApiService with new auth logic
vi.mock('./services/api/realApiService', () => ({
  realApiService: {
    // Mock loginUser or any other method that might be called by App during auth state setup
    // For now, assume App uses useAuth hook directly which reads localStorage
    // If App directly calls login/logout, we need to mock those too.
    // Based on useAuth logic, App primarily relies on the hook.
    getProjects: vi.fn().mockResolvedValue([]),
    getUsers: vi.fn().mockResolvedValue([]),
    // loginUser is no longer directly called by App for auth state restoration
  },
}));

// Mock useAuth hook
vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false, // Default to not authenticated
    userRole: 'SITE_ENGINEER',
    userName: '',
    currentUserId: '',
    currentUser: null,
    loading: true,
    token: null,
    login: vi.fn(), // Mock login function
    logout: vi.fn(), // Mock logout function
  }),
}));

describe('App Integration', () => {
  beforeEach(() => {
    // Clear localStorage and mocks before each test
    window.localStorage.clear();
    vi.clearAllMocks();
    
    // Reset window.localStorage for each test
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // Mock the useAuth hook's initial state for unauthenticated user
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      userRole: 'SITE_ENGINEER',
      userName: '',
      currentUserId: '',
      currentUser: null,
      loading: false, // Set loading to false for quicker test execution if initial state is known
      token: null,
      login: vi.fn(),
      logout: vi.fn(),
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
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      userRole: mockUser.role,
      userName: mockUser.full_name,
      currentUserId: mockUser.id,
      currentUser: { // Mock currentUser structure if needed by App component
        ...mockUser,
        // Add any other properties App might check on currentUser
      },
      loading: false,
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
    });

    // Mock localStorage to simulate auth persistence (though useAuth hook doesn't directly read it in this mock)
    // This part might be more relevant if App was directly reading localStorage before useAuth is initialized
    window.localStorage.getItem.mockReturnValueOnce('mock-token');
    window.localStorage.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Infrastructure Management System/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      expect(screen.getByText(/Test User/i)).toBeInTheDocument(); // Check for user name
    }, { timeout: 3000 });
  });
});
