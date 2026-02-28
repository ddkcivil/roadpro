import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import React from 'react';
import { UserRole } from '~/types';
import { apiService } from '../../services/api/apiService';

// Mock apiService
vi.mock('../../services/api/apiService', () => ({
  apiService: {
    loginUser: vi.fn(),
    submitRegistration: vi.fn(),
  },
}));

describe('Login Component', () => {
  const mockOnLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in form by default', () => {
    render(<Login onLogin={mockOnLogin} />);
    expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Continue/i });

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

    render(<Login onLogin={mockOnLogin} />);
    
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith(UserRole.ADMIN, 'Test User', 'mock-jwt-token', 'u1');
    });
  });

  it('switches to register view', () => {
    render(<Login onLogin={mockOnLogin} />);
    
    const registerButton = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(registerButton);

    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
  });
});
