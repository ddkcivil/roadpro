import { useEffect, useMemo, startTransition } from 'react';
import { Project } from '../types';
import { apiService } from '../services/api/apiService';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { prepareProjectWithMaterials } from '../utils/migration/materialMigrationUtils';
import { toast } from 'sonner';
import { useDebounce } from './useDebounce';
import { AuditService } from '../services/analytics/auditService';
import { sanitizationUtils } from '../utils/validation/sanitizationUtils';
import { usePersistedReducer } from './usePersistence';
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
  | { type: 'UPDATE_PROJECTS'; payload: Project[] };

const projectsReducer = (state: ProjectsState, action: ProjectsAction): ProjectsState => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, projects: action.payload, error: null };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_SELECTED_PROJECT':
      return { ...state, selectedProjectId: action.payload };
    case 'UPDATE_PROJECTS':
      return { ...state, projects: action.payload };
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
  const [state, dispatch] = usePersistedReducer(
    projectsReducer, 
    INITIAL_STATE, 
    'roadmaster-projects-state'
  );

  const { checkLimit, remainingTime } = useRateLimit({
    limit: 10,
    windowMs: 60000 // 10 saves per minute
  });

  const debouncedCacheSync = useDebounce((updatedProjects: Project[]) => {
    DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 });
  }, 1000);

  const fetchProjects = async (page = 1) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const response = await apiService.getProjects(page);
      const fetchedProjects = response.data;
      dispatch({ type: 'FETCH_SUCCESS', payload: fetchedProjects });
      DataCache.set(getCacheKey('projects'), fetchedProjects, { ttl: 10 * 60 * 1000 });
    } catch (error: any) {
      console.error('Failed to fetch projects from database:', error);
      dispatch({ type: 'FETCH_ERROR', payload: error.message || 'Failed to connect to the database.' });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const currentProject = useMemo(() => {
    if (!state?.projects) return undefined;
    const project = state.projects.find(p => p.id === state.selectedProjectId);
    return project ? prepareProjectWithMaterials(project) : undefined;
  }, [state?.projects, state?.selectedProjectId]);

  const setSelectedProjectId = (id: string | null) => {
    dispatch({ type: 'SET_SELECTED_PROJECT', payload: id });
  };

  const saveProject = async (project: Partial<Project>) => {
    if (!checkLimit()) {
      toast.warning("Rate limit exceeded", {
        description: `Please wait ${Math.ceil(remainingTime)} seconds before saving again.`
      });
      return;
    }

    const previousProjects = [...state.projects];
    try {
      const targetProjectId = project.id || currentProject?.id;
      const isUpdate = !!targetProjectId;
      
      const baseProject = project.id 
        ? state.projects.find(p => p.id === project.id) 
        : currentProject;

      // Basic Conflict Check
      if (isUpdate && baseProject?.updatedAt && project.updatedAt) {
        if (new Date(baseProject.updatedAt) > new Date(project.updatedAt)) {
          console.warn('Potential conflict detected: Local version might be older than last sync.');
        }
      }

      const completeProjectData: Project = {
        id: targetProjectId || `proj-${Date.now()}`,
        name: project.name || baseProject?.name || '',
        code: project.code || baseProject?.code || '',
        location: project.location || baseProject?.location || '',
        contractor: project.contractor || baseProject?.contractor || '',
        startDate: project.startDate || baseProject?.startDate || '',
        endDate: project.endDate || baseProject?.endDate || '',
        client: project.client || baseProject?.client || '',
        engineer: project.engineer || baseProject?.engineer || '',
        contractNo: project.contractNo || baseProject?.contractNo || '',
        contractPeriod: project.contractPeriod || baseProject?.contractPeriod || '',
        projectManager: project.projectManager || baseProject?.projectManager || '',
        supervisor: project.supervisor || baseProject?.supervisor || '',
        consultantName: project.consultantName || baseProject?.consultantName || '',
        clientName: project.clientName || baseProject?.clientName || '',
        logo: project.logo || baseProject?.logo || '',
        weather: project.weather || baseProject?.weather,
        lastSynced: project.lastSynced || baseProject?.lastSynced,
        spreadsheetId: project.spreadsheetId || baseProject?.spreadsheetId,
        settings: project.settings || baseProject?.settings,
        updatedAt: new Date().toISOString(),
        environmentRegistry: project.environmentRegistry || baseProject?.environmentRegistry || { treesRemoved: 0, treesPlanted: 0, sprinklingLogs: [], treeLogs: [] },
        boq: project.boq || baseProject?.boq || [],
        rfis: project.rfis || baseProject?.rfis || [],
        labTests: project.labTests || baseProject?.labTests || [],
        schedule: project.schedule || baseProject?.schedule || [],
        structures: project.structures || baseProject?.structures || [],
        agencies: project.agencies || baseProject?.agencies || [],
        agencyPayments: project.agencyPayments || baseProject?.agencyPayments || [],
        linearWorks: project.linearWorks || baseProject?.linearWorks || [],
        inventory: project.inventory || baseProject?.inventory || [],
        inventoryTransactions: project.inventoryTransactions || baseProject?.inventoryTransactions || [],
        vehicles: project.vehicles || baseProject?.vehicles || [],
        vehicleLogs: project.vehicleLogs || baseProject?.vehicleLogs || [],
        documents: project.documents || baseProject?.documents || [],
        sitePhotos: project.sitePhotos || baseProject?.sitePhotos || [],
        dailyReports: project.dailyReports || baseProject?.dailyReports || [],
        preConstruction: project.preConstruction || baseProject?.preConstruction || [],
        landParcels: project.landParcels || baseProject?.landParcels || [],
        mapOverlays: project.mapOverlays || baseProject?.mapOverlays || [],
        hindrances: project.hindrances || baseProject?.hindrances || [],
        ncrs: project.ncrs || baseProject?.ncrs || [],
        contractBills: project.contractBills || baseProject?.contractBills || [],
        subcontractorBills: project.subcontractorBills || baseProject?.subcontractorBills || [],
        measurementSheets: project.measurementSheets || baseProject?.measurementSheets || [],
        staffLocations: project.staffLocations || baseProject?.staffLocations || [],
        purchaseOrders: project.purchaseOrders || baseProject?.purchaseOrders || [],
        agencyMaterials: project.agencyMaterials || baseProject?.agencyMaterials || [],
        agencyBills: project.agencyBills || baseProject?.agencyBills || [],
        subcontractorPayments: project.subcontractorPayments || baseProject?.subcontractorPayments || [],
        preConstructionTasks: project.preConstructionTasks || baseProject?.preConstructionTasks || [],
        kmlData: project.kmlData || baseProject?.kmlData || [],
        variationOrders: project.variationOrders || baseProject?.variationOrders || [],
        resources: project.resources || baseProject?.resources || [],
        resourceAllocations: project.resourceAllocations || baseProject?.resourceAllocations || [],
        milestones: project.milestones || baseProject?.milestones || [],
        comments: project.comments || baseProject?.comments || [],
        checklists: project.checklists || baseProject?.checklists || [],
        defects: project.defects || baseProject?.defects || [],
        complianceWorkflows: project.complianceWorkflows || baseProject?.complianceWorkflows || [],
        auditLogs: project.auditLogs || baseProject?.auditLogs || [],
        structureTemplates: project.structureTemplates || baseProject?.structureTemplates || [],
        accountingIntegrations: project.accountingIntegrations || baseProject?.accountingIntegrations || [],
        accountingTransactions: project.accountingTransactions || baseProject?.accountingTransactions || [],
        personnel: project.personnel || baseProject?.personnel || [],
        fleet: project.fleet || baseProject?.fleet || [],
      };

      if (!completeProjectData.name || !completeProjectData.client) {
        toast.error("Save Blocked", {
          description: "Project name and employer/client are required fields.",
        });
        return;
      }

      const sanitizedProjectData = sanitizationUtils.sanitizeObject(completeProjectData);

      const optimisticProjects = isUpdate 
        ? state.projects.map(p => p.id === sanitizedProjectData.id ? sanitizedProjectData : p)
        : [...state.projects, sanitizedProjectData];
      
      dispatch({ type: 'UPDATE_PROJECTS', payload: optimisticProjects });

      const processedProject: Project = prepareProjectWithMaterials(sanitizedProjectData);

      let backendProject: Project;
      if (isUpdate) {
        backendProject = await apiService.updateProject(sanitizedProjectData.id, processedProject);
        if (currentUser) {
          AuditService.logDataModification(
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
          AuditService.logDataModification(
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
        const finalProjects = isUpdate 
          ? state.projects.map(p => p.id === backendProject.id ? backendProject : p)
          : optimisticProjects.map(p => p.id === sanitizedProjectData.id ? backendProject : p);
        
        dispatch({ type: 'UPDATE_PROJECTS', payload: finalProjects });
        debouncedCacheSync(finalProjects);
      });

      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${sanitizedProjectData.name} has been synchronized with the cloud.`,
      });
    } catch (error: any) {
      dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      
      console.error('[ERROR] Failed to save project to backend:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Unknown server error';
      toast.error("Save Failed", {
        description: `Rollback applied. Server responded with: ${errorMsg}`,
      });
      throw error;
    }
  };

  const deleteProject = async (projectId: string) => {
    const previousProjects = state?.projects ? [...state.projects] : [];
    const projectToDelete = state?.projects?.find(p => p.id === projectId);
    
    try {
      const updatedProjects = previousProjects.filter(p => p.id !== projectId);
      dispatch({ type: 'UPDATE_PROJECTS', payload: updatedProjects });
      
      if (state?.selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }

      await apiService.deleteProject(projectId);
      if (currentUser && projectToDelete) {
        AuditService.logDataModification(
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
      dispatch({ type: 'UPDATE_PROJECTS', payload: previousProjects });
      if (state?.selectedProjectId === null && projectToDelete) {
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
