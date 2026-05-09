
import { useEffect, useMemo, startTransition, useCallback, useRef } from 'react';
import { Project } from '../types';
import { apiService } from '../services/api/apiService';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { retryWithBackoff, DEFAULT_RETRY_OPTIONS } from '../utils/retryUtils';
import { prepareProjectWithMaterials } from '../utils/migration/materialMigrationUtils';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';
import { sanitizationUtils } from '../utils/validation/sanitizationUtils';
import { useAsyncPersistedReducer } from './usePersistence';
import { generateUniqueId } from '../utils/uuidUtils';

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
      const hydratedProjects = Array.isArray(action.payload.projects) ? action.payload.projects.map(p => prepareProjectWithMaterials(p)) : [];
      return {
        projects: hydratedProjects,
        selectedProjectId: action.payload?.selectedProjectId ?? state.selectedProjectId,
        isLoading: action.payload?.isLoading ?? state.isLoading,
        error: action.payload?.error ?? state.error,
      };
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      const fetchedProjects = (action.payload || []).map(p => prepareProjectWithMaterials(p));
      return { ...state, isLoading: false, projects: fetchedProjects, error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProjectId: action.payload };
    case 'UPDATE_PROJECTS':
      const updatedProjects = (action.payload || []).map(p => prepareProjectWithMaterials(p));
      return { ...state, projects: updatedProjects };
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

export const useProjects = (isAuthenticated: boolean, currentUser?: any): ProjectsReturn => {
  const [state, dispatch, isHydrated] = useAsyncPersistedReducer(
    projectsReducer, 
    INITIAL_STATE, 
    'roadmaster-projects-state'
  );

  // Ref to always access latest projects in async callbacks without stale closures
  const projectsRef = useRef(state.projects);
  projectsRef.current = state.projects;

  const debouncedCacheSync = useDebounce((updatedProjects: Project[]) => {
    DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 });
  }, 1000);

  const refreshCurrentProject = useCallback(async () => {
    if (!state.selectedProjectId) return;
    try {
      const updatedProject = await apiService.getProject(state.selectedProjectId);

      if (!updatedProject) throw new Error('Project not found after refresh.');

      const processedProject = prepareProjectWithMaterials(updatedProject);
      
      startTransition(() => {
        dispatch({ 
          type: 'UPDATE_PROJECTS', 
          payload: projectsRef.current.map(p => p.id === processedProject.id ? processedProject : p)
        });
      });
    } catch (error) {
      console.warn('[SYNC] Failed to background refresh project from Supabase:', error);
    }
  }, [state.selectedProjectId, dispatch]);

  const lastLocationUpdateRef = useRef<number>(0);
  const LOCATION_THROTTLE = 10000; // 10 seconds

  const updateLocation = useCallback(async (projectId: string, latitude: number, longitude: number) => {
    // 1. Optimistic Update (Immediate)
    startTransition(() => {
      dispatch({ 
        type: 'UPDATE_PROJECTS', 
        payload: projectsRef.current.map(p => p.id === projectId ? {
          ...p,
          staffLocations: [
            ...(p.staffLocations || []).filter(l => l.userId !== currentUser?.id),
            {
              id: `loc-${currentUser?.id}-${Date.now()}`,
              userId: currentUser?.id,
              userName: currentUser?.name || 'Staff',
              role: currentUser?.role || 'Staff',
              latitude,
              longitude,
              status: 'Active',
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

  const fetchProjects = useCallback(async (page = 1) => {
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
    } catch (error: any) {
      console.error('Failed to fetch projects from Supabase:', error);
      startTransition(() => {
        dispatch({ type: 'FETCH_ERROR', payload: error.message || 'Failed to fetch projects from Supabase.' });
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
    return state.projects.find(p => p.id === state.selectedProjectId);
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

    if (!completeProjectData.name || !completeProjectData.client) {
      toast.error("Save Blocked", { description: "Project name and employer/client are required." });
      throw new Error("Project name and employer/client are required.");
    }

    const sanitizedProjectData = sanitizationUtils.sanitizeObject(completeProjectData) as any;

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

      startTransition(() => {
        const finalProjects = projectsRef.current.map(p => p.id === backendProject.id ? backendProject : p);
        if (!isUpdate && !projectsRef.current.find(p => p.id === backendProject.id)) {
          finalProjects.push(backendProject);
        }
        dispatch({ type: 'UPDATE_PROJECTS', payload: finalProjects });
        debouncedCacheSync(finalProjects);
      });

// CACHE INVALIDATION: Clear cache after successful save to ensure fresh data on next fetch
      DataCache.delete(getCacheKey('projects'));
      
      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${completeProjectData.name} has been synchronized with the cloud.`,
      });

    } catch (error: any) {
      console.error('[ERROR] Failed to save project to Supabase backend:', error);
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      
      let errorMsg = error.message || 'Unknown server error';
      if (error.message?.includes('Failed to fetch')) {
        errorMsg = 'Network error: Please check your internet connection';
      } else if (error.message?.includes('ERR_INTERNET_DISCONNECTED')) {
        errorMsg = 'No internet connection. Your changes are saved locally.';
      } else if (error.status === 401 || error.status === 403) {
        errorMsg = 'Permission denied. Please check your access rights.';
      } else if (error.status >= 500) {
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
    
    try {
      const updatedProjects = previousProjects.filter(p => p.id !== projectId);
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: updatedProjects });
      });
      
      if (wasSelected) {
        setSelectedProjectId(null);
      }

      // Cleanup associated files before deleting project
      if (projectToDelete) {
        const fileIds: string[] = [];
        if (projectToDelete.documents) {
          projectToDelete.documents.forEach((doc: any) => {
            if (doc.fileId) fileIds.push(doc.fileId);
          });
        }
        if (projectToDelete.sitePhotos) {
          projectToDelete.sitePhotos.forEach((photo: any) => {
            if (photo.fileId) fileIds.push(photo.fileId);
          });
        }
        for (const fileId of fileIds) {
          apiService.deleteFile(fileId).catch((err: any) => console.error(`Failed to cleanup file ${fileId}:`, err));
        }
      }

// Pass currentUser details and project name for audit logging
      await apiService.deleteProject(projectId, currentUser?.id, currentUser?.name, projectToDelete?.name);

      // CACHE INVALIDATION: Clear cache after delete to ensure consistency
      DataCache.delete(getCacheKey('projects'));
      
      debouncedCacheSync(updatedProjects);
      
      toast.success("Project Deleted", {
        description: "The project has been permanently removed from the database.",
      });
    } catch (error: any) {
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      if (wasSelected) {
        setSelectedProjectId(projectId);
      }
      
      console.error('[ERROR] Failed to delete project from Supabase backend:', error);
      const errorMsg = error.message || 'Unknown server error';
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
    isHydrated: isHydrated, // Added to expose isHydrated
  };
  };

