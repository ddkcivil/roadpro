import { API_CONFIG } from './apiConfig';

// API service to communicate with backend
class ApiService {
  private baseUrl: string;
  private mockData: {
    users: any[];
    projects: any[];
    pendingRegistrations: any[];
  };

  constructor() {
    // Use configured API URL
    this.baseUrl = API_CONFIG.BASE_URL;
    
    // Fallback mock data for when API is not available
    this.mockData = {
      users: [
        {
          id: 'admin-1',
          name: 'System Administrator',
          email: 'admin@roadpro.com',
          phone: '+1234567890',
          role: 'ADMIN',
          avatar: 'https://ui-avatars.com/api/?name=System+Administrator&background=random'
        }
      ],
      projects: [],
      pendingRegistrations: []
    };
  }

  // Check if API is available
  private async isApiAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Mock delay to simulate network requests
  private async delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // User Management
  async getUsers() {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/users`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed, falling back to mock data:', error);
        return this.mockData.users;
      }
    } else {
      await this.delay();
      return this.mockData.users;
    }
  }

  async createUser(userData) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create user');
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      
      // Check if user already exists
      const existingUser = this.mockData.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      const newUser = {
        id: `user-${Date.now()}`,
        ...userData,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
        createdAt: new Date().toISOString()
      };
      
      this.mockData.users.push(newUser);
      return newUser;
    }
  }

  async loginUser(email, password) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Login failed');
        }
        
        return await response.json();
      } catch (error) {
        console.error('API login request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      
      // Fallback to mock login
      const user = this.mockData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        },
        token: 'mock-jwt-token-' + Date.now()
      };
    }
  }

  // Pending Registrations
  async getPendingRegistrations() {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/pending-registrations`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed, falling back to mock data:', error);
        return this.mockData.pendingRegistrations;
      }
    } else {
      await this.delay();
      return this.mockData.pendingRegistrations;
    }
  }

  async submitRegistration(registrationData) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/pending-registrations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit registration');
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      
      const existingPending = this.mockData.pendingRegistrations.find(
        r => r.email.toLowerCase() === registrationData.email.toLowerCase()
      );
      
      if (existingPending) {
        throw new Error('Registration already pending');
      }
      
      const pendingReg = {
        id: `pending-${Date.now()}`,
        ...registrationData,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      this.mockData.pendingRegistrations.push(pendingReg);
      return pendingReg;
    }
  }

  async approveRegistration(id) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/pending-registrations/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to approve registration');
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      
      const pendingUser = this.mockData.pendingRegistrations.find(r => r.id === id);
      if (!pendingUser) {
        throw new Error('Pending registration not found');
      }
      
      const newUser = {
        id: `user-${Date.now()}`,
        name: pendingUser.name,
        email: pendingUser.email,
        phone: pendingUser.phone,
        role: pendingUser.requestedRole,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUser.name)}&background=random`,
        createdAt: new Date().toISOString()
      };
      
      this.mockData.users.push(newUser);
      this.mockData.pendingRegistrations = this.mockData.pendingRegistrations.filter(r => r.id !== id);
      
      return newUser;
    }
  }

  async rejectRegistration(id) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/pending-registrations/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to reject registration');
        }
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      this.mockData.pendingRegistrations = this.mockData.pendingRegistrations.filter(r => r.id !== id);
    }
  }

  async getProjects() {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/projects`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed, falling back to mock data:', error);
        return this.mockData.projects;
      }
    } else {
      await this.delay();
      return this.mockData.projects;
    }
  }

  async createProject(projectData) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create project');
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      
      const project = {
        id: `proj-${Date.now()}`,
        ...projectData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.mockData.projects.push(project);
      return project;
    }
  }

  async updateProject(id, projectData) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update project');
        }
        
        return await response.json();
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      
      const index = this.mockData.projects.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error('Project not found');
      }
      
      this.mockData.projects[index] = {
        ...this.mockData.projects[index],
        ...projectData,
        updatedAt: new Date().toISOString()
      };
      
      return this.mockData.projects[index];
    }
  }

  async deleteProject(id) {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/projects/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete project');
        }
      } catch (error) {
        console.error('API request failed:', error);
        throw error;
      }
    } else {
      await this.delay();
      this.mockData.projects = this.mockData.projects.filter(p => p.id !== id);
    }
  }

  // Health check
  async healthCheck() {
    const apiAvailable = await this.isApiAvailable();
    
    if (apiAvailable) {
      try {
        const response = await fetch(`${this.baseUrl}/api/health`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('API health check failed:', error);
        return { status: 'error', timestamp: new Date().toISOString() };
      }
    } else {
      await this.delay(100);
      return { status: 'mock-ok', timestamp: new Date().toISOString() };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();