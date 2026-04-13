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
import { useRateLimit } from './useRateLimit';
import { supabase } from '../lib/supabase';


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

  const saveTimeoutRef = useRef<any>(null);

  const debouncedBackendSave = useCallback((data: Project, base: Project | undefined, isUp: boolean) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => performActualSave(data, base, isUp), 2000);
  }, [performActualSave]);

  const refreshCurrentProject = useCallback(async () => {
    if (!state.selectedProjectId) return;
    try {
      // --- Supabase Integration ---
      const { data: updatedProject, error } = await supabase
        .from('projects')
        .select('*') // Fetch all project details
        .eq('id', state.selectedProjectId) // Filter by the selected project ID
        .single(); // Expect a single project


      if (error) throw error;
      if (!updatedProject) throw new Error('Project not found after refresh.');

      const processedProject = prepareProjectWithMaterials(updatedProject);
      
      startTransition(() => {
        dispatch({ 
          type: 'UPDATE_PROJECTS', 
          payload: state.projects.map(p => p.id === processedProject.id ? {
            ...p, // Keep existing project data for other projects
            // Update the specific project with fresh data
            staffLocations: processedProject.staffLocations,
            vehicles: processedProject.vehicles,
            updatedAt: processedProject.updatedAt,
            lastSynced: new Date().toISOString()
          } : p)
        });
      });
    } catch (error) {
      console.warn('[SYNC] Failed to background refresh project from Supabase:', error);
    }
  }, [state.selectedProjectId, state.projects, currentUser, dispatch]);

  const lastLocationUpdateRef = useRef<number>(0);
  const LOCATION_THROTTLE = 10000; // 10 seconds

  const updateLocation = useCallback(async (projectId: string, latitude: number, longitude: number) => {
    // 1. Optimistic Update (Immediate)
    startTransition(() => {
      dispatch({ 
        type: 'UPDATE_PROJECTS', 
        payload: state.projects.map(p => p.id === projectId ? {
          ...p,
          staffLocations: [
            ...(p.staffLocations || []).filter(l => l.userId !== currentUser?.id),
            {
              // Assuming a structure for staffLocation entry. Adjust 'id' and other fields as per Supabase schema.
              // If staffLocations is an array of objects, you might need to generate a unique ID for this entry or rely on Supabase's auto-generated IDs if upserting.
              // For simplicity, using a user-specific ID and timestamp.
              id: `loc-${currentUser?.id}-${Date.now()}`, // Unique ID for this location entry
              userId: currentUser?.id,
              userName: currentUser?.name || 'Staff', // Fallback name
              role: currentUser?.role || 'Staff', // Fallback role
              latitude,
              longitude,
              status: 'Active', // Assuming a status field
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
        // --- Supabase Integration ---
        const { error } = await supabase
          .from('staffLocations') // Assuming a table named 'staffLocations'

          .upsert([ // Use upsert to either insert or update
            {
              project_id: projectId,
              user_id: currentUser?.id,
              latitude: latitude,
              longitude: longitude,
              timestamp: new Date().toISOString(),
              // Add other fields as necessary based on your schema
              // e.g., status: 'Active'
            }
          ], { onConflict: 'project_id, user_id' }); // Define unique constraint for upsert

        if (error) {
          throw error;
        }
        // No specific success toast here, as it's a background update
      } catch (error) {
        console.warn('[GPS] Failed to sync location to Supabase backend:', error);
        // Consider adding a toast notification for critical failures if needed,
        // but for location updates, a warning might suffice.
      }
    }
  }, [state.projects, currentUser, dispatch]);

  const fetchProjects = async (page = 1) => {
    startTransition(() => {
      dispatch({ type: 'FETCH_START' });
    });
    try {
      const { data: fetchedProjects, error } = await supabase
        .from('projects')

        .select('*') // Select all columns, adjust as needed
        .order('createdAt', { ascending: false }); // Example: order by creation date

      if (error) throw error;

      if (!fetchedProjects) {
        throw new Error('No projects found or error fetching projects.');
      }

      const processedProjects = (fetchedProjects || []).map((p: any) => prepareProjectWithMaterials(p));

      
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
    
    const baseProject = state.projects.find(p => p.id === targetProjectId);

    const completeProjectData: Project = {
      ...baseProject,
      ...project,
      id: targetProjectId || `proj-${Date.now()}`, // Use Date.now() as a fallback ID generator, or consider uuidv4
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

    // --- Supabase Integration ---
    try {
      let backendProjectResult: { data: Project | null, error: any };
      
      if (isUpdate) {
        backendProjectResult = await supabase
          .from('projects')
          .update(sanitizedProjectData)
          .eq('id', sanitizedProjectData.id)
          .select('*')
          .single();
      } else {
        backendProjectResult = await supabase
          .from('projects')
          .insert({ ...sanitizedProjectData, id: sanitizedProjectData.id }) // Ensure ID is included if generated locally
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
          baseProject, // Use baseProject for comparison
          backendProject // Use the returned backendProject for the new state
        );
      }

      // Update state with the confirmed backend data and sync cache
      startTransition(() => {
        const finalProjects = state.projects.map(p => p.id === backendProject.id ? backendProject : p);
        dispatch({ type: 'UPDATE_PROJECTS', payload: finalProjects });
        debouncedCacheSync(finalProjects);
      });

      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${completeProjectData.name} has been synchronized with the cloud.`,
      });

    } catch (error: any) {
      console.error('[ERROR] Failed to save project to Supabase backend:', error);
      // Rollback optimistic update if save fails
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: state.projects }); // Revert to current state from reducer
      });
      const errorMsg = error.message || 'Unknown server error';
      toast.error("Cloud Sync Failed", {
        description: `Changes kept locally but failed to sync: ${errorMsg}`,
      });
    }
  }, [state.projects, state.selectedProjectId, debouncedBackendSave, currentUser, dispatch]);

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

      // --- Supabase Integration ---
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) throw deleteError;

      // If deletion from Supabase is successful
      if (currentUser && projectToDelete) {
        await AuditService.logDataModification(
          currentUser.id, 
          currentUser.name, 
          'DELETE', 
          'project', 
          projectId, 
          projectToDelete.name,
          projectToDelete, // Pass the project data before deletion for audit log
          undefined
        );
      }
      debouncedCacheSync(updatedProjects);
      
      toast.success("Project Deleted", {
        description: "The project has been permanently removed from the database.",
      });
    } catch (error: any) {
      // Rollback optimistic update if deletion fails
      startTransition(() => {
        dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      });
      if (state.selectedProjectId === null && projectToDelete) {
         setSelectedProjectId(projectId); // Restore selected project if it was the one deleted
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
    deleteProject
  };
};
