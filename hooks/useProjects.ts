import { useEffect, useMemo, startTransition, useCallback } from 'react';
import { Project } from '../types';
import { apiService } from '../services/api/apiService';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { prepareProjectWithMaterials } from '../utils/migration/materialMigrationUtils';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';
import { AuditService } from '../services/analytics/auditService';
import { sanitizationUtils } from '../utils/validation/sanitizationUtils';
import { useAsyncPersistedReducer } from './usePersistence';
import { useRateLimit } from './useRateLimit';

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
      const hydratedProjects = (action.payload.projects || []).map(p => prepareProjectWithMaterials(p));
      return { 
        ...state, 
        ...action.payload, 
        projects: hydratedProjects,
        isLoading: false 
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

export const useProjects = (isAuthenticated: boolean, currentUser?: any) => {
  const [state, dispatch, isHydrated] = useAsyncPersistedReducer(
    projectsReducer, 
    INITIAL_STATE, 
    'roadmaster-projects-state'
  );

  const debouncedCacheSync = useDebounce((updatedProjects: Project[]) => {
    DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 });
  }, 1000);

  const performActualSave = async (completeProjectData: Project, baseProject: Project | undefined, isUpdate: boolean) => {
    try {
      const processedProject: Project = prepareProjectWithMaterials(completeProjectData);

      let backendProject: Project;
      if (isUpdate) {
        backendProject = await apiService.updateProject(completeProjectData.id, processedProject);
        if (currentUser) {
          await AuditService.logDataModification(
            currentUser.id, 
            currentUser.name, 
            'UPDATE', 
            'project', 
            backendProject.id, 
            backendProject.name,
            baseProject,
            backendProject
          );
        }
      } else {
        backendProject = await apiService.createProject(processedProject);
        if (currentUser) {
          await AuditService.logDataModification(
            currentUser.id, 
            currentUser.name, 
            'CREATE', 
            'project', 
            backendProject.id, 
            backendProject.name,
            undefined,
            backendProject
          );
        }
      }

      startTransition(() => {
        const finalProjects = state.projects.map(p => p.id === (isUpdate ? backendProject.id : completeProjectData.id) ? backendProject : p);
        dispatch({ type: 'UPDATE_PROJECTS', payload: finalProjects });
        debouncedCacheSync(finalProjects);
      });

      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${completeProjectData.name} has been synchronized with the cloud.`,
      });
    } catch (error: any) {
      console.error('[ERROR] Failed to save project to backend:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Unknown server error';
      toast.error("Cloud Sync Failed", {
        description: `Changes kept locally but failed to sync: ${errorMsg}`,
      });
    }
  };

  const debouncedBackendSave = useMemo(
    () => {
      let timeout: any;
      return (data: Project, base: Project | undefined, isUp: boolean) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => performActualSave(data, base, isUp), 2000);
      };
    },
    [currentUser, state.projects]
  );

  const fetchProjects = async (page = 1) => {
    startTransition(() => {
      dispatch({ type: 'FETCH_START' });
    });
    try {
      const response = await apiService.getProjects(page);
      const fetchedProjects = response.data;
      startTransition(() => {
        dispatch({ type: 'FETCH_SUCCESS', payload: fetchedProjects });
      });
      DataCache.set(getCacheKey('projects'), fetchedProjects, { ttl: 10 * 60 * 1000 });
    } catch (error: any) {
      console.error('Failed to fetch projects from database:', error);
      startTransition(() => {
        dispatch({ type: 'FETCH_ERROR', payload: error.message || 'Failed to connect to the database.' });
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated && isHydrated) {
      fetchProjects();
    }
  }, [isAuthenticated, isHydrated]);

  const currentProject = useMemo(() => {
    if (!state?.projects) return undefined;
    return state.projects.find(p => p.id === state.selectedProjectId);
  }, [state?.projects, state?.selectedProjectId]);

  const setSelectedProjectId = useCallback((id: string | null) => {
    startTransition(() => {
      dispatch({ type: 'SET_SELECTED_PROJECT', payload: id });
    });
  }, []);

  const saveProject = useCallback(async (project: Partial<Project>) => {
    const targetProjectId = project.id || state.selectedProjectId;
    const isUpdate = !!targetProjectId;
    
    const baseProject = state.projects.find(p => p.id === targetProjectId);

    const completeProjectData: Project = {
      ...baseProject,
      ...project,
      id: targetProjectId || `proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    } as Project;

    if (!completeProjectData.name || !completeProjectData.client) {
      toast.error("Save Blocked", { description: "Project name and employer/client are required." });
      return;
    }

    const sanitizedProjectData = sanitizationUtils.sanitizeObject(completeProjectData);

    // Optimistic UI Update - Instant feedback for user
    const optimisticProjects = isUpdate 
      ? state.projects.map(p => p.id === sanitizedProjectData.id ? sanitizedProjectData : p)
      : [...state.projects, sanitizedProjectData];
    
    startTransition(() => {
      dispatch({ type: 'UPDATE_PROJECTS', payload: optimisticProjects });
    });

    // Background debounced backend save
    debouncedBackendSave(sanitizedProjectData, baseProject, isUpdate);
  }, [state.projects, state.selectedProjectId, debouncedBackendSave]);

  const deleteProject = async (projectId: string) => {
    const previousProjects = [...state.projects];
    const projectToDelete = state.projects.find(p => p.id === projectId);
    
    try {
      const updatedProjects = previousProjects.filter(p => p.id !== projectId);
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: updatedProjects });
      });
      
      if (state.selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }

      await apiService.deleteProject(projectId);
      if (currentUser && projectToDelete) {
        await AuditService.logDataModification(
          currentUser.id, 
          currentUser.name, 
          'DELETE', 
          'project', 
          projectId, 
          projectToDelete.name,
          projectToDelete,
          undefined
        );
      }
      debouncedCacheSync(updatedProjects);
      
      toast.success("Project Deleted", {
        description: "The project has been permanently removed from the database.",
      });
    } catch (error: any) {
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      if (state.selectedProjectId === null && projectToDelete) {
         setSelectedProjectId(projectId);
      }
      
      console.error('[ERROR] Failed to delete project from backend:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Unknown server error';
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
    deleteProject
  };
};
