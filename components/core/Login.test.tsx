import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { UserRole } from '~/types';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AuditService
vi.mock('../../services/analytics/auditService', () => ({
  AuditService: {
    logLogin: vi.fn(),
  },
}));

describe('Login Component', () => {
  const mockOnLogin = vi.fn();
  const mockOnShowRegistration = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form by default', () => {
    render(<Login onLogin={mockOnLogin} onShowRegistration={mockOnShowRegistration} />);
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    render(<Login onLogin={mockOnLogin} onShowRegistration={mockOnShowRegistration} />);
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const form = emailInput.closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      // Zod validation should show error (might be in summary and near input)
      expect(screen.getAllByText(/Please enter a valid email address/i).length).toBeGreaterThan(0);
    });
  });

  it('calls onLogin on successful authentication', async () => {
    const mockUser = { id: 'u1', full_name: 'Test User', email: 'test@example.com', role: UserRole.ADMIN };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: mockUser,
        token: 'mock-jwt-token'
      })
    });

    render(<Login onLogin={mockOnLogin} onShowRegistration={mockOnShowRegistration} />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth?action=login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      }));
      expect(mockOnLogin).toHaveBeenCalledWith(UserRole.ADMIN, 'Test User', 'mock-jwt-token', 'u1', undefined);
    });
  });

  it('switches to register view', () => {
    render(<Login onLogin={mockOnLogin} onShowRegistration={mockOnShowRegistration} />);
    
    const registerButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(registerButton);

    expect(mockOnShowRegistration).toHaveBeenCalled();
  });
});
