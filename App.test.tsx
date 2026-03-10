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

vi.mock('./services/api/realApiService', () => ({
  realApiService: {
    getProjects: vi.fn().mockResolvedValue([]),
    getUsers: vi.fn().mockResolvedValue([]),
    loginUser: vi.fn(),
  },
}));

describe('App Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders login page when not authenticated', () => {
    render(<App />);
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText ? screen.getByPlaceholderText('email@example.com') : screen.getByLabelText(/Email/i)).toBeInTheDocument();
  });

  it('renders project selector when authenticated but no project selected', async () => {
    window.localStorage.setItem('roadmaster-authenticated', 'true');
    window.localStorage.setItem('roadmaster-user-name', 'Test User');
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText(/Precision Infrastructure Intelligence/i)).toBeInTheDocument();
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
