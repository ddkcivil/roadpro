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

// Mock data (can be extended)
const mockUsers: User[] = [
  { id: 'admin-001', name: 'Admin User', email: 'admin@example.com', phone: '123-456-7890', role: UserRole.ADMIN, avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=random' },
  { id: 'pm-001', name: 'Project Manager', email: 'pm@example.com', phone: '098-765-4321', role: UserRole.PROJECT_MANAGER, avatar: 'https://ui-avatars.com/api/?name=Project+Manager&background=random' },
  { id: 'se-001', name: 'Site Engineer', email: 'se@example.com', phone: '111-222-3333', role: UserRole.SITE_ENGINEER, avatar: 'https://ui-avatars.com/api/?name=Site+Engineer&background=random' },
];

const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Road Extension Phase 1',
    code: 'REX-P1',
    location: 'Kathmandu, Nepal',
    contractor: 'ABC Construction',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    client: 'Ministry of Physical Infrastructure',
    engineer: 'XYZ Engineering',
    contractNo: 'MPI-REX-2023-001',
    boq: [],
    rfis: [],
    labTests: [],
    schedule: [],
    vehicles: [],
    vehicleLogs: [],
    documents: [],
    dailyReports: [],
    preConstruction: [],
    landParcels: [],
    mapOverlays: [],
    hindrances: [],
    ncrs: [],
    contractBills: [],
    measurementSheets: [],
    staffLocations: [],
    inventory: [],
    inventoryTransactions: [],
    agencyPayments: [],
    agencies: [],
  }
];

// Initialize localStorage with mock data if empty
const initializeLocalStorage = () => {
  if (!localStorage.getItem(LS_USERS_KEY)) {
    setToLocalStorage(LS_USERS_KEY, mockUsers);
  }
  if (!localStorage.getItem(LS_PROJECTS_KEY)) {
    setToLocalStorage(LS_PROJECTS_KEY, mockProjects);
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
    const users = getFromLocalStorage(LS_USERS_KEY, []);
    const user = users.find(u => u.email === email);

    if (user && (
      (user.email === 'admin@example.com' && password === 'admin') ||
      (user.email === 'pm@example.com' && password === 'pm') ||
      (user.email === 'se@example.com' && password === 'se')
    )) {
      // For simplicity, we use hardcoded passwords for mock users
      const userWithPermissions = PermissionsService.createUserWithPermissions(user);
      // Store current user ID in localStorage for App.tsx to pick up
      localStorage.setItem('roadmaster-authenticated', 'true');
      localStorage.setItem('roadmaster-user-role', user.role);
      localStorage.setItem('roadmaster-user-name', user.name);
      localStorage.setItem('roadmaster-current-user-id', user.id);
      return { success: true, user: userWithPermissions };
    }
    
    // Fallback for hardcoded credentials from App.tsx/Login.tsx
    if ((email === 'admin' && password === 'admin')) {
        const adminUser = users.find(u => u.role === UserRole.ADMIN) || mockUsers[0];
         localStorage.setItem('roadmaster-authenticated', 'true');
         localStorage.setItem('roadmaster-user-role', adminUser.role);
         localStorage.setItem('roadmaster-user-name', adminUser.name);
         localStorage.setItem('roadmaster-current-user-id', adminUser.id);
        return { success: true, user: adminUser };
    }
    if ((email === 'projectmanager' && password === 'projectmanager')) {
        const pmUser = users.find(u => u.role === UserRole.PROJECT_MANAGER) || mockUsers[1];
         localStorage.setItem('roadmaster-authenticated', 'true');
         localStorage.setItem('roadmaster-user-role', pmUser.role);
         localStorage.setItem('roadmaster-user-name', pmUser.name);
         localStorage.setItem('roadmaster-current-user-id', pmUser.id);
        return { success: true, user: pmUser };
    }
    if ((email === 'user' && password === 'user')) {
        const seUser = users.find(u => u.role === UserRole.SITE_ENGINEER) || mockUsers[2];
         localStorage.setItem('roadmaster-authenticated', 'true');
         localStorage.setItem('roadmaster-user-role', seUser.role);
         localStorage.setItem('roadmaster-user-name', seUser.name);
         localStorage.setItem('roadmaster-current-user-id', seUser.id);
        return { success: true, user: seUser };
    }

    return { success: false, message: 'Invalid email or password' };
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
    let pendingRegistrations = getFromLocalStorage(LS_PENDING_REGISTRATIONS_KEY, []);
    pendingRegistrations = pendingRegistrations.filter(reg => reg.id !== id);
    setToLocalStorage(LS_PENDING_REGISTRATIONS_KEY, pendingRegistrations);
  }

  // --- Health Check ---
  async healthCheck(): Promise<{ status: string; message: string }> {
    await simulateDelay();
    return { status: 'ok', message: 'Using LocalStorage API Service' };
  }

  // --- Other Modules (mock implementations) ---
  async getLeaveRequests(): Promise<any[]> {
    await simulateDelay();
    return [];
  }

  async createLeaveRequest(leaveRequest: any): Promise<any> {
    await simulateDelay();
    return { ...leaveRequest, id: uuidv4() };
  }

  async updateLeaveRequest(id: string, updates: any): Promise<any> {
    await simulateDelay();
    return { id, ...updates };
  }
}

export const localStorageApiService = new LocalStorageApiService();