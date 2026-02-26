// services/api/localStorageApiService.ts
import { UserRole, Project, User, RFI, LabTest, AppSettings } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { PermissionsService } from '../auth/permissionsService';

// Utility to simulate API delay
const simulateDelay = (ms = 300) => new Promise(res => setTimeout(res, ms));

// Generic helper to get data from localStorage
const getFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

// Generic helper to set data to localStorage
const setToLocalStorage = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const LS_USERS_KEY = 'roadmaster-users';
const LS_PROJECTS_KEY = 'roadmaster-projects';
const LS_PENDING_REGISTRATIONS_KEY = 'roadmaster-pending-registrations';

// Empty initial data
const initialUsers: User[] = [];
const initialProjects: Project[] = [];

// Initialize localStorage if empty
const initializeLocalStorage = () => {
  if (!localStorage.getItem(LS_USERS_KEY)) {
    setToLocalStorage(LS_USERS_KEY, initialUsers);
  }
  if (!localStorage.getItem(LS_PROJECTS_KEY)) {
    setToLocalStorage(LS_PROJECTS_KEY, initialProjects);
  }
  if (!localStorage.getItem(LS_PENDING_REGISTRATIONS_KEY)) {
    setToLocalStorage(LS_PENDING_REGISTRATIONS_KEY, []);
  }
};

class LocalStorageApiService {
  constructor() {
    initializeLocalStorage();
  }

  // --- User Management ---
  async getUsers(): Promise<User[]> {
    await simulateDelay();
    return getFromLocalStorage(LS_USERS_KEY, []);
  }

  async createUser(userData: User): Promise<User> {
    await simulateDelay();
    const users = getFromLocalStorage(LS_USERS_KEY, []);
    const newUser = { ...userData, id: uuidv4() };
    users.push(newUser);
    setToLocalStorage(LS_USERS_KEY, users);
    return newUser;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    await simulateDelay();
    let users = getFromLocalStorage(LS_USERS_KEY, []);
    users = users.map(user => user.id === id ? { ...user, ...userData } : user);
    setToLocalStorage(LS_USERS_KEY, users);
    return users.find(user => user.id === id)!;
  }

  async deleteUser(id: string): Promise<void> {
    await simulateDelay();
    let users = getFromLocalStorage(LS_USERS_KEY, []);
    users = users.filter(user => user.id !== id);
    setToLocalStorage(LS_USERS_KEY, users);
  }

  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    await simulateDelay();
    return { success: false, message: 'LocalStorage login disabled. Use actual API.' };
  }

  // --- Project Management ---
  async getProjects(): Promise<Project[]> {
    await simulateDelay();
    return getFromLocalStorage(LS_PROJECTS_KEY, []);
  }

  async createProject(projectData: Project): Promise<Project> {
    await simulateDelay();
    const projects = getFromLocalStorage(LS_PROJECTS_KEY, []);
    const newProject = { ...projectData, id: uuidv4() };
    projects.push(newProject);
    setToLocalStorage(LS_PROJECTS_KEY, projects);
    return newProject;
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    await simulateDelay();
    let projects = getFromLocalStorage(LS_PROJECTS_KEY, []);
    projects = projects.map(project => project.id === id ? { ...project, ...projectData } : project);
    setToLocalStorage(LS_PROJECTS_KEY, projects);
    return projects.find(project => project.id === id)!;
  }

  async deleteProject(id: string): Promise<void> {
    await simulateDelay();
    let projects = getFromLocalStorage(LS_PROJECTS_KEY, []);
    projects = projects.filter(project => project.id !== id);
    setToLocalStorage(LS_PROJECTS_KEY, projects);
  }

  // --- Registration Management ---
  async getPendingRegistrations(): Promise<any[]> {
    await simulateDelay();
    return getFromLocalStorage(LS_PENDING_REGISTRATIONS_KEY, []);
  }

  async submitRegistration(registrationData: any): Promise<any> {
    await simulateDelay();
    const pendingRegistrations = getFromLocalStorage(LS_PENDING_REGISTRATIONS_KEY, []);
    const newRegistration = { ...registrationData, id: uuidv4(), status: 'Pending' };
    pendingRegistrations.push(newRegistration);
    setToLocalStorage(LS_PENDING_REGISTRATIONS_KEY, pendingRegistrations);
    return newRegistration;
  }

  async approveRegistration(id: string): Promise<any> {
    await simulateDelay();
    let pendingRegistrations = getFromLocalStorage(LS_PENDING_REGISTRATIONS_KEY, []);
    const approvedReg = pendingRegistrations.find(reg => reg.id === id);
    if (approvedReg) {
      // Move to users
      const users = getFromLocalStorage(LS_USERS_KEY, []);
      const newUser: User = { 
        id: uuidv4(), 
        name: approvedReg.name, 
        email: approvedReg.email, 
        phone: approvedReg.phone, 
        role: approvedReg.requestedRole 
      };
      users.push(newUser);
      setToLocalStorage(LS_USERS_KEY, users);

      // Remove from pending
      pendingRegistrations = pendingRegistrations.filter(reg => reg.id !== id);
      setToLocalStorage(LS_PENDING_REGISTRATIONS_KEY, pendingRegistrations);
      return newUser;
    }
    throw new Error('Registration not found');
  }

  async rejectRegistration(id: string): Promise<void> {
    await simulateDelay();
    pendingRegistrations = getFromLocalStorage(LS_PENDING_REGISTRATIONS_KEY, []).filter(reg => reg.id !== id);
    setToLocalStorage(LS_PENDING_REGISTRATIONS_KEY, pendingRegistrations);
  }

  // --- Health Check ---
  async healthCheck(): Promise<{ status: string; message: string }> {
    await simulateDelay();
    return { status: 'ok', message: 'Using LocalStorage API Service' };
  }
}

export const localStorageApiService = new LocalStorageApiService();
