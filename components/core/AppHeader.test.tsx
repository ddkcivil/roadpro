import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AppHeader from './AppHeader';
import { UserRole } from '../../types';

// Mock the components that are complex or tested elsewhere
vi.mock('../common/OfflineIndicator', () => ({
  OfflineIndicator: () => <div data-testid="offline-indicator">OfflineIndicator</div>,
}));

vi.mock('./NotificationsBadge', () => ({
  default: () => <div data-testid="notifications-badge">NotificationsBadge</div>,
}));

// Mock Tooltip components from UI
vi.mock('~/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

describe('AppHeader', () => {
  const defaultProps = {
    setSidebarOpen: vi.fn(),
    isSidebarCollapsed: false,
    setIsSidebarCollapsed: vi.fn(),
    currentProject: {
      id: 'p1',
      name: 'Test Project',
      code: 'PROJ-01',
      client: 'Test Client',
      contractor: 'Test Contractor',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      boq: [],
      schedule: [],
      rfis: [],
    } as any,
    onProjectUpdate: vi.fn(),
    setSelectedProjectId: vi.fn(),
    themeMode: 'light' as const,
    setThemeMode: vi.fn(),
    setIsAIModalOpen: vi.fn(),
    currentUser: {
      id: 'u1',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.ADMIN,
      permissions: [],
      avatar: '',
    } as any,
  };

  it('renders project name and code', () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('PROJ-01')).toBeInTheDocument();
  });

  it('calls setSidebarOpen when mobile menu button is clicked', () => {
    render(<AppHeader {...defaultProps} />);
    // The mobile button has class lg:hidden
    const mobileButton = screen.getAllByRole('button')[0]; // First button is menu
    fireEvent.click(mobileButton);
    expect(defaultProps.setSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('calls setIsSidebarCollapsed when collapse button is clicked', () => {
    render(<AppHeader {...defaultProps} />);
    // Desktop collapse button is usually the second one
    const collapseButton = screen.getAllByRole('button')[1];
    fireEvent.click(collapseButton);
    expect(defaultProps.setIsSidebarCollapsed).toHaveBeenCalled();
  });

  it('renders child components like OfflineIndicator', () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('notifications-badge')).toBeInTheDocument();
  });
});
