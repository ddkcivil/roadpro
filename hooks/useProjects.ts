
import { useEffect, useMemo, startTransition, useCallback, useRef } from 'react';
import { Project } from '../types';
import { apiService } from '../services/api/apiService';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { prepareProjectWithMaterials } from '../utils/migration/materialMigrationUtils';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';
import { AuditService } from '../services/analytics/auditService';
import { sanitizationUtils } from '../utils/validation/sanitizationUtils';
import { useAsyncPersistedReducer } from './usePersistence';
import { supabase } from '../lib/supabase';
import { mapProjectFromDb, mapProjectToDb } from '../api/_utils/mappers';

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
      const { data: updatedProject, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', state.selectedProjectId)
        .single();

      if (error) throw error;
      if (!updatedProject) throw new Error('Project not found after refresh.');

      const processedProject = prepareProjectWithMaterials(mapProjectFromDb(updatedProject) as Project);
      
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
        const { error } = await supabase
          .from('staff_locations')
          .upsert([
            {
              project_id: projectId,
              user_id: currentUser?.id,
              latitude: latitude,
              longitude: longitude,
              timestamp: new Date().toISOString(),
            }
          ], { onConflict: 'project_id, user_id' });

        if (error) {
          throw error;
        }
      } catch (error) {
        console.warn('[GPS] Failed to sync location to Supabase backend:', error);
      }
    }
  }, [currentUser, dispatch]);

  const fetchProjects = async (page = 1) => {
    startTransition(() => {
      dispatch({ type: 'FETCH_START' });
    });
    try {
      const { data: fetchedProjects, error } = await supabase
        .from('projects')
        .select('*')
        .order('createdat', { ascending: false })
        .range((page - 1) * 50, page * 50 - 1);

      if (error) throw error;

      if (!fetchedProjects) {
        throw new Error('No projects found or error fetching projects.');
      }

      const processedProjects = (fetchedProjects || []).map((p: any) => prepareProjectWithMaterials(mapProjectFromDb(p) as Project));

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
    const previousProjects = [...projectsRef.current];
    const baseProject = projectsRef.current.find(p => p.id === targetProjectId);

    const completeProjectData = {
      ...baseProject,
      ...project,
      id: targetProjectId || `proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      contractNo: null,
    } as unknown as Project;

    if (!completeProjectData.name || !completeProjectData.client) {
      toast.error("Save Blocked", { description: "Project name and employer/client are required." });
      return;
    }

    const sanitizedProjectData = sanitizationUtils.sanitizeObject(completeProjectData) as any;

    // Optimistic UI Update
    const optimisticProjects = isUpdate 
      ? projectsRef.current.map(p => p.id === sanitizedProjectData.id ? sanitizedProjectData : p)
      : [...projectsRef.current, sanitizedProjectData];
    
    startTransition(() => {
      dispatch({ type: 'UPDATE_PROJECTS', payload: optimisticProjects });
    });

    try {
      let backendProjectResult;
      
      if (isUpdate) {
        backendProjectResult = await supabase
          .from('projects')
          .update(mapProjectToDb(sanitizedProjectData))
          .eq('id', sanitizedProjectData.id)
          .select('*')
          .single();
      } else {
        backendProjectResult = await supabase
          .from('projects')
          .insert(mapProjectToDb({ ...sanitizedProjectData, id: sanitizedProjectData.id }))
          .select('*')
          .single();
      }

      if (backendProjectResult.error) throw backendProjectResult.error;

      const backendProject = backendProjectResult.data as Project;

      if (currentUser) {
        await AuditService.logDataModification(
          currentUser.id, 
          currentUser.name, 
          isUpdate ? 'UPDATE' : 'CREATE', 
          'project', 
          backendProject.id, 
          backendProject.name,
          baseProject,
          backendProject
        );
      }

      startTransition(() => {
        const finalProjects = projectsRef.current.map(p => p.id === backendProject.id ? backendProject : p);
        dispatch({ type: 'UPDATE_PROJECTS', payload: finalProjects });
        debouncedCacheSync(finalProjects);
      });

      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${completeProjectData.name} has been synchronized with the cloud.`,
      });

    } catch (error: any) {
      console.error('[ERROR] Failed to save project to Supabase backend:', error);
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      const errorMsg = error.message || 'Unknown server error';
      toast.error("Cloud Sync Failed", {
        description: `Changes kept locally but failed to sync: ${errorMsg}`,
      });
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

      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) throw deleteError;

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
