
import { useState, useEffect, useMemo, startTransition, useCallback, useRef } from 'react';
import { Project, User } from '../types';
import { apiService } from '../services/api/apiService';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { retryWithBackoff, DEFAULT_RETRY_OPTIONS } from '../utils/retryUtils';
import { prepareProjectWithMaterials } from '../utils/migration/materialMigrationUtils';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';
import { sanitizationUtils } from '../utils/validation/sanitizationUtils';
import { useAsyncPersistedReducer } from './usePersistence';
import { generateUniqueId } from '../utils/uuidUtils';

// Performance: Cache TTL for projects (5 minutes)
const PROJECTS_CACHE_TTL = 5 * 60 * 1000;
// Performance: Project detail refresh throttle (30 seconds)
const PROJECT_REFRESH_THROTTLE = 30 * 1000;

interface ProjectsReturn {
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  currentProject: Project | undefined;
  isLoadingProjects: boolean;
  apiError: string | null;
  fetchProjects: (page?: number) => Promise<void>;
  saveProject: (project: Partial<Project>) => Promise<void>;
  refreshCurrentProject: () => Promise<void>;
  updateLocation: (projectId: string, latitude: number, longitude: number) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  isHydrated?: boolean;
  isRefreshingDetail: boolean;
}


interface ProjectsState {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;
}

type ProjectsAction = 
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Project[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_SELECTED_PROJECT'; payload: string | null }
  | { type: 'UPDATE_PROJECTS'; payload: Project[] }
  | { type: 'HYDRATE'; payload: ProjectsState };

const projectsReducer = (state: ProjectsState, action: ProjectsAction): ProjectsState => {
  switch (action.type) {
    case 'HYDRATE':
      const hydratedProjects = Array.isArray(action.payload.projects) ? action.payload.projects.map((p: Project) => prepareProjectWithMaterials(p)) : [];
      return {
        projects: hydratedProjects,
        selectedProjectId: action.payload?.selectedProjectId ?? state.selectedProjectId,
        isLoading: action.payload?.isLoading ?? state.isLoading,
        error: action.payload?.error ?? state.error,
      };
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS': {
      const fetchedProjects = (action.payload || []).map((p: Project) => {
        const prepared = prepareProjectWithMaterials(p);
        // CRITICAL: Preserve detailed fields (documents, variation orders, etc.) 
        // if they already exist in our state but are missing from the bulk fetch list.
        const existing = state.projects.find(ep => ep.id === prepared.id);
        if (existing) {
          return {
            ...prepared,
            boq: prepared.boq?.length ? prepared.boq : (existing.boq || []),
            documents: prepared.documents?.length ? prepared.documents : (existing.documents || []),
            variationOrders: prepared.variationOrders?.length ? prepared.variationOrders : (existing.variationOrders || []),
            agencies: prepared.agencies?.length ? prepared.agencies : (existing.agencies || []),
            labTests: prepared.labTests?.length ? prepared.labTests : (existing.labTests || []),
            rfis: prepared.rfis?.length ? prepared.rfis : (existing.rfis || []),
            sitePhotos: prepared.sitePhotos?.length ? prepared.sitePhotos : (existing.sitePhotos || []),
            structures: prepared.structures?.length ? prepared.structures : (existing.structures || []),
            measurementSheets: prepared.measurementSheets?.length ? prepared.measurementSheets : (existing.measurementSheets || []),
          };
        }
        return prepared;
      });
      return { ...state, isLoading: false, projects: fetchedProjects, error: null };
    }
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProjectId: action.payload };
    case 'UPDATE_PROJECTS': {
      const incomingProjects = (action.payload || []).map((p: Project) => prepareProjectWithMaterials(p));
      console.log('[REDUCER] UPDATE_PROJECTS - incoming projects:', {
        count: incomingProjects.length,
        boqCounts: incomingProjects.map(p => ({
          id: p.id,
          boqCount: Array.isArray(p.boq) ? p.boq.length : 0
        }))
      });
      
      const mergedProjects = incomingProjects.map(p => {
        const existing = state.projects.find(ep => ep.id === p.id);
        if (existing) {
          const merged = {
            ...p,
            boq: p.boq?.length ? p.boq : (existing.boq || []),
            documents: p.documents?.length ? p.documents : (existing.documents || []),
            variationOrders: p.variationOrders?.length ? p.variationOrders : (existing.variationOrders || []),
            agencies: p.agencies?.length ? p.agencies : (existing.agencies || []),
            labTests: p.labTests?.length ? p.labTests : (existing.labTests || []),
            rfis: p.rfis?.length ? p.rfis : (existing.rfis || []),
            sitePhotos: p.sitePhotos?.length ? p.sitePhotos : (existing.sitePhotos || []),
            structures: p.structures?.length ? p.structures : (existing.structures || []),
            measurementSheets: p.measurementSheets?.length ? p.measurementSheets : (existing.measurementSheets || []),
          };
          console.log('[REDUCER] Merged project:', {
            id: merged.id,
            incomingBOQCount: Array.isArray(p.boq) ? p.boq.length : 0,
            existingBOQCount: Array.isArray(existing.boq) ? existing.boq.length : 0,
            mergedBOQCount: Array.isArray(merged.boq) ? merged.boq.length : 0,
            merged: merged.boq
          });
          return merged;
        }
        return p;
      });
      console.log('[REDUCER] UPDATE_PROJECTS - returning state with:', {
        projectsCount: mergedProjects.length,
        boqCounts: mergedProjects.map(p => ({
          id: p.id,
          boqCount: Array.isArray(p.boq) ? p.boq.length : 0
        }))
      });
      return { ...state, projects: mergedProjects };
    }
    default:
      return state;
  }
};

const INITIAL_STATE: ProjectsState = {
  projects: [],
  selectedProjectId: null,
  isLoading: false,
  error: null,
};

export const useProjects = (isAuthenticated: boolean, currentUser?: User): ProjectsReturn => {
  const [state, dispatch, isHydrated] = useAsyncPersistedReducer(
    projectsReducer, 
    INITIAL_STATE, 
    'roadmaster-projects-state'
  );

  const [isRefreshingDetail, setIsRefreshingDetail] = useState(false);

  // Ref to always access latest projects in async callbacks without stale closures
  const projectsRef = useRef(state.projects);
  projectsRef.current = state.projects;

  const debouncedCacheSync = useDebounce((updatedProjects: Project[]) => {
    DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 });
  }, 1000);

const lastRefreshTimeRef = useRef<number>(0);

  const refreshCurrentProject = useCallback(async () => {
    if (!state.selectedProjectId) return;
    
    // Performance: Throttle refreshes to prevent too many network calls
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < PROJECT_REFRESH_THROTTLE) {
      console.log('[SYNC] Skipping refresh - throttled');
      return;
    }
    lastRefreshTimeRef.current = now;
    
    setIsRefreshingDetail(true);
    try {
      const currentProjectBefore = projectsRef.current.find(p => p.id === state.selectedProjectId);
      console.log('[SYNC] Before refresh - BOQ:', {
        projectId: state.selectedProjectId,
        boqCount: Array.isArray(currentProjectBefore?.boq) ? currentProjectBefore.boq.length : 0
      });

      const updatedProject = await apiService.getProject(state.selectedProjectId, true);

      if (!updatedProject) throw new Error('Project not found after refresh.');

      console.log('[SYNC] After fetch - BOQ:', {
        projectId: state.selectedProjectId,
        boqCount: Array.isArray(updatedProject.boq) ? updatedProject.boq.length : 0,
        boqData: updatedProject.boq
      });

      const processedProject = prepareProjectWithMaterials(updatedProject);
      
      console.log('[SYNC] Processing refreshed project:', {
        projectId: processedProject.id,
        boqCount: Array.isArray(processedProject.boq) ? processedProject.boq.length : 0,
        boqData: processedProject.boq
      });
      
      startTransition(() => {
        dispatch({ 
          type: 'UPDATE_PROJECTS', 
          payload: projectsRef.current.map(p => p.id === processedProject.id ? processedProject : p)
        });
      });
    } catch (error) {
      console.warn('[SYNC] Failed to background refresh project from Supabase:', error);
    } finally {
      setIsRefreshingDetail(false);
    }
  }, [state.selectedProjectId, dispatch]);

  // AUTO-REFRESH: When a project is selected, fetch its full details (joins)
  useEffect(() => {
    if (state.selectedProjectId && isAuthenticated && isHydrated) {
      refreshCurrentProject();
    }
  }, [state.selectedProjectId, isAuthenticated, isHydrated, refreshCurrentProject]);

  const lastLocationUpdateRef = useRef<number>(0);
  const LOCATION_THROTTLE = 10000; // 10 seconds

  const updateLocation = useCallback(async (projectId: string, latitude: number, longitude: number) => {
    if (!currentUser?.id) return;

    // 1. Optimistic Update (Immediate)
    startTransition(() => {
      const userId = currentUser.id;
      dispatch({ 
        type: 'UPDATE_PROJECTS', 
        payload: projectsRef.current.map(p => p.id === projectId ? {
          ...p,
          staffLocations: [
            ...(p.staffLocations || []).filter(l => l.userId !== userId),
            {
              id: `loc-${userId}-${Date.now()}`,
              userId: userId,
              userName: currentUser.name || 'Staff',
              role: currentUser.role || 'Staff',
              latitude,
              longitude,
              status: 'Active' as const,
              timestamp: new Date().toISOString()
            }
          ]
        } : p)
      });
    });

    // 2. Throttled Backend Update
    const now = Date.now();
    if (now - lastLocationUpdateRef.current > LOCATION_THROTTLE) {
      lastLocationUpdateRef.current = now;
      try {
        await apiService.updateStaffLocation(projectId, latitude, longitude);
      } catch (error) {
        console.warn('[GPS] Failed to sync location via API:', error);
      }
    }
  }, [currentUser, dispatch]);

  const fetchProjects = useCallback(async (pageInput: any = 1) => {
    // Ensure page is a valid number (defends against React events being passed as 'page')
    const page = typeof pageInput === 'number' ? pageInput : 1;
    
    startTransition(() => {
      dispatch({ type: 'FETCH_START' });
    });
    try {
      const response = await apiService.getProjects(page);

      if (!response || !response.data) {
        throw new Error('No projects found or error fetching projects.');
      }

      const processedProjects = response.data.map(p => prepareProjectWithMaterials(p));

      startTransition(() => {
        dispatch({ type: 'FETCH_SUCCESS', payload: processedProjects });
      });
      DataCache.set(getCacheKey('projects'), processedProjects, { ttl: 10 * 60 * 1000 });
    } catch (error: unknown) { // Changed from any to unknown
      console.error('Failed to fetch projects from Supabase:', error);
      startTransition(() => {
        let errorMessage = 'Failed to fetch projects from Supabase.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = String(error); // Fallback for non-Error types
        }
        dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      });
    }
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && isHydrated) {
      const cached = DataCache.get<Project[]>(getCacheKey('projects'));
      if (cached) {
        // Set state from cache
        if (Array.isArray(cached)) {
          startTransition(() => {
            dispatch({ type: 'FETCH_SUCCESS', payload: cached });
          });
        } else {
          console.warn('Cached projects is not an array, fetching from API');
          fetchProjects();
        }
      } else {
        fetchProjects();
      }
    }
  }, [isAuthenticated, isHydrated, fetchProjects]);

  const currentProject = useMemo(() => {
    if (!state?.projects) return undefined;
    const selected = state.projects.find(p => p.id === state.selectedProjectId);
    console.log('[STATE] currentProject:', {
      projectId: selected?.id,
      boqCount: Array.isArray(selected?.boq) ? selected.boq.length : 0,
      selectedProjectId: state.selectedProjectId,
      timestamp: new Date().toISOString()
    });
    return selected;
  }, [state?.projects, state?.selectedProjectId]);

  const setSelectedProjectId = useCallback((id: string | null) => {
    startTransition(() => {
      dispatch({ type: 'SET_SELECTED_PROJECT', payload: id });
    });
}, []);

  const saveProject = useCallback(async (project: Partial<Project>): Promise<void> => {
    const isFullDefinition = !!(project.name && project.client);
    const isNewCreation = isFullDefinition && !project.id;
    
    const targetProjectId = isNewCreation ? undefined : (project.id || state.selectedProjectId);
    const isUpdate = !!targetProjectId;
    
    // DEFENSIVE: Ensure we have a valid targetProjectId before proceeding (neither new creation nor update without ID)
    if (!targetProjectId && !isNewCreation) {
      console.error('[saveProject] Cannot save project: No project ID available', {
        projectId: project?.id,
        selectedProjectId: state.selectedProjectId,
        isNewCreation
      });
      toast.error("Save Failed", { description: "No project selected. Please select a project first." });
      throw new Error("No project selected to save. Please select a project first.");
    }

    const previousProjects = [...projectsRef.current];
    const baseProject = targetProjectId ? projectsRef.current.find(p => p.id === targetProjectId) : undefined;

// DEFENSIVE: Generate a proper UUID for new projects (not timestamp-based to avoid collisions)
    const newProjectId = isNewCreation ? generateUniqueId() : targetProjectId;

    // DEFENSIVE: Validate we have an ID before proceeding
    if (!newProjectId) {
      console.error('[saveProject] Critical: No project ID could be generated', { isNewCreation, targetProjectId });
      toast.error("Save Failed", { description: "Could not generate project ID." });
      throw new Error("Project ID is required.");
    }

    const completeProjectData = {
      ...baseProject,
      ...project,
      id: newProjectId,
      updatedAt: new Date().toISOString(),
      contractNo: project.contractNo || baseProject?.contractNo || null,
    } as unknown as Project;

    console.log('[SAVE] completeProjectData - BOQ:', {
      projectId: completeProjectData.id,
      boqCount: Array.isArray(completeProjectData.boq) ? completeProjectData.boq.length : 0,
      boqData: completeProjectData.boq
    });

    if (!completeProjectData.name || !completeProjectData.client) {
      toast.error("Save Blocked", { description: "Project name and employer/client are required." });
      throw new Error("Project name and employer/client are required.");
    }

    const sanitizedProjectData = sanitizationUtils.sanitizeObject(completeProjectData) as Project;

    console.log('[SAVE] sanitizedProjectData - BOQ:', {
      projectId: sanitizedProjectData.id,
      boqCount: Array.isArray(sanitizedProjectData.boq) ? sanitizedProjectData.boq.length : 0,
      boqData: sanitizedProjectData.boq
    });

    // DEFENSIVE: Final validation that ID survived sanitization
    if (!sanitizedProjectData.id) {
      console.error('[saveProject] Project ID was lost during sanitization!', sanitizedProjectData);
      sanitizedProjectData.id = newProjectId; // Restore ID if lost
    }

    // Optimistic UI Update
    const optimisticProjects = isUpdate 
      ? projectsRef.current.map(p => p.id === sanitizedProjectData.id ? sanitizedProjectData : p)
      : [...projectsRef.current, sanitizedProjectData];
    
    startTransition(() => {
      dispatch({ type: 'UPDATE_PROJECTS', payload: optimisticProjects });
    });

    try {
      let backendProject: Project;
      
      if (isNewCreation) {
        // Pass currentUser details for audit logging
        backendProject = await retryWithBackoff(
          () => apiService.createProject(sanitizedProjectData, currentUser?.id, currentUser?.name),
          {
            ...DEFAULT_RETRY_OPTIONS,
            maxRetries: 3,
            initialDelayMs: 1000,
          }
        );
      } else {
        // Pass currentUser details and previous project data for audit logging
        backendProject = await retryWithBackoff(
          () => apiService.updateProject(sanitizedProjectData.id!, sanitizedProjectData, currentUser?.id, currentUser?.name, baseProject as Partial<Project>),
          {
            ...DEFAULT_RETRY_OPTIONS,
            maxRetries: 3,
            initialDelayMs: 1000,
          }
        );
      }

      console.log('[SAVE] Backend returned project - BOQ:', {
        projectId: backendProject.id,
        boqCount: Array.isArray(backendProject.boq) ? backendProject.boq.length : 0,
        boqData: backendProject.boq,
        timestamp: new Date().toISOString()
      });

      startTransition(() => {
        const finalProjects = projectsRef.current.map(p => p.id === backendProject.id ? backendProject : p);
        if (!isUpdate && !projectsRef.current.find(p => p.id === backendProject.id)) {
          finalProjects.push(backendProject);
        }
        console.log('[SAVE] Dispatching UPDATE_PROJECTS with:', {
          projectId: backendProject.id,
          boqCount: Array.isArray(backendProject.boq) ? backendProject.boq.length : 0,
          boqInDispatch: backendProject.boq
        });
        dispatch({ type: 'UPDATE_PROJECTS', payload: finalProjects });
        debouncedCacheSync(finalProjects);
      });

// CACHE INVALIDATION: Clear cache after successful save to ensure fresh data on next fetch
      DataCache.delete(getCacheKey('projects'));
      
      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${completeProjectData.name} has been synchronized with the cloud.`,
      });

    } catch (error: unknown) { // Changed from any to unknown
      console.error('[ERROR] Failed to save project to Supabase backend:', error);
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      
      let errorMsg = 'Unknown server error';
      if (error instanceof Error) {
        errorMsg = error.message;
      } else {
        errorMsg = String(error); // Fallback for non-Error types
      }

      if (errorMsg.includes('Failed to fetch')) {
        errorMsg = 'Network error: Please check your internet connection';
      } else if (errorMsg.includes('ERR_INTERNET_DISCONNECTED')) {
        errorMsg = 'No internet connection. Your changes are saved locally.';
      } else if (errorMsg.includes('401') || errorMsg.includes('403')) { // Basic check for status codes
        errorMsg = 'Permission denied. Please check your access rights.';
      } else if (errorMsg.includes('500')) { // Basic check for status codes
        errorMsg = 'Server error. The service may be temporarily unavailable.';
      }
      
      toast.error("Cloud Sync Failed", {
        description: `Changes kept locally but failed to sync: ${errorMsg}`,
      });
      
      throw new Error(errorMsg);
    }
  }, [state.selectedProjectId, debouncedCacheSync, currentUser, dispatch]);

  const deleteProject = async (projectId: string) => {
    const previousProjects = [...projectsRef.current];
    const projectToDelete = projectsRef.current.find(p => p.id === projectId);
    const wasSelected = state.selectedProjectId === projectId;
    
    // Optimistic update: remove from local state immediately
    const updatedProjects = previousProjects.filter(p => p.id !== projectId);
    startTransition(() => {
      dispatch({ type: 'UPDATE_PROJECTS', payload: updatedProjects });
    });
    
    if (wasSelected) {
      setSelectedProjectId(null);
    }

    try {
      // Pass currentUser details and project name for audit logging
      await apiService.deleteProject(projectId, currentUser?.id, currentUser?.name, projectToDelete?.name);

      // CACHE INVALIDATION: Clear cache after delete to ensure consistency
      DataCache.delete(getCacheKey('projects'));
      
      debouncedCacheSync(updatedProjects);
      
      toast.success("Project Deleted", {
        description: "The project has been permanently removed from the database.",
      });
    } catch (error: unknown) {
      // If backend reports "not found" or "cleanup failed", the project was already
      // removed from local state — treat as success since it no longer exists.
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Project not found') || errorMsg.includes('Failed to clean up files') || errorMsg.includes('404')) {
        console.warn(`[useProjects] Project ${projectId} not found on backend — local deletion already applied.`);
        DataCache.delete(getCacheKey('projects'));
        debouncedCacheSync(updatedProjects);
        toast.success("Project Deleted", {
          description: "The project has been removed locally.",
        });
        return;
      }
      
      // Rollback for unexpected errors
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      if (wasSelected) {
        setSelectedProjectId(projectId);
      }
      
      console.error('[ERROR] Failed to delete project from Supabase backend:', error);
      toast.error("Delete Failed", {
        description: `Rollback applied. Server responded with: ${errorMsg}`,
      });
    }
  };

  return {
    projects: state?.projects || [],
    selectedProjectId: state?.selectedProjectId || null,
    setSelectedProjectId,
    currentProject,
    isLoadingProjects: state?.isLoading || false,
    apiError: state?.error || null,
    fetchProjects,
    saveProject,
    refreshCurrentProject,
    updateLocation,
    deleteProject,
    isHydrated: isHydrated,
    isRefreshingDetail,
  };
  };

