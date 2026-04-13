import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { UserRole } from '~/types';
import { apiService } from '../../services/api/apiService';

// Mock apiService
vi.mock('../../services/api/apiService', () => ({
  apiService: {
    loginUser: vi.fn(),
    submitRegistration: vi.fn(),
    submitAuditLog: vi.fn(),
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
    
    // Find the form and submit it
    const form = emailInput.closest('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('error-summary')).toBeInTheDocument();
    });
  });

  it('calls onLogin on successful authentication', async () => {
    const mockUser = { id: 'u1', name: 'Test User', email: 'test@example.com', role: UserRole.ADMIN };
    (apiService.loginUser as any).mockResolvedValue({
      success: true,
      user: mockUser,
      token: 'mock-jwt-token',
      csrfToken: 'mock-csrf-token'
    });

    render(<Login onLogin={mockOnLogin} onShowRegistration={mockOnShowRegistration} />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
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
