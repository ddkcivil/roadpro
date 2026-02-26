// services/api/realApiService.ts
import { Project, User, Message, AppSettings } from '../../types';

class RealApiService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    return response.json();
  }

  // --- Project Management ---
  async getProjects(): Promise<Project[]> {
    return this.fetchApi<Project[]>('/projects');
  }

  async getProject(id: string): Promise<Project> {
    return this.fetchApi<Project>(`/projects/${id}`);
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    return this.fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    return this.fetchApi<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  }

  async deleteProject(id: string): Promise<void> {
    return this.fetchApi<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // --- User Management ---
  async getUsers(): Promise<User[]> {
    return this.fetchApi<User[]>('/users');
  }

  async createUser(userData: Partial<User>): Promise<User> {
    return this.fetchApi<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    return this.fetchApi<{ success: boolean; user?: User; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // --- Registration Management ---
  async getPendingRegistrations(): Promise<any[]> {
    return this.fetchApi<any[]>('/pending-registrations');
  }

  async submitRegistration(registrationData: any): Promise<any> {
    return this.fetchApi<any>('/pending-registrations', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
  }

  async approveRegistration(id: string): Promise<User> {
    return this.fetchApi<User>(`/pending-registrations/${id}/approve`, {
      method: 'POST',
    });
  }

  // --- Health Check ---
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.fetchApi<{ status: string; message: string }>('/health');
  }
}

export const realApiService = new RealApiService();
