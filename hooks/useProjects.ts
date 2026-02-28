import { useState, useEffect, useMemo, startTransition } from 'react';
import { Project } from '../types';
import { apiService } from '../services/api/apiService';
import { DataCache, getCacheKey } from '../utils/data/cacheUtils';
import { prepareProjectWithMaterials } from '../utils/migration/materialMigrationUtils';
import { toast } from 'sonner';

export const useProjects = (isAuthenticated: boolean) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const cacheKey = getCacheKey('projects');
    const cachedProjects = DataCache.get<Project[]>(cacheKey);
    
    if (cachedProjects && Array.isArray(cachedProjects)) {
      return cachedProjects;
    }
    
    const savedProjects = localStorage.getItem('roadmaster-projects');
    const projectsData = savedProjects ? JSON.parse(savedProjects) : [];
    
    const finalProjects = Array.isArray(projectsData) ? projectsData : [];
    
    if (!savedProjects) {
      localStorage.setItem('roadmaster-projects', JSON.stringify([]));
    }
    
    DataCache.set(cacheKey, finalProjects, { ttl: 10 * 60 * 1000 });
    
    return finalProjects;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem('roadmaster-selected-project') || null;
  });

  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('roadmaster-selected-project', selectedProjectId);
    } else {
      localStorage.removeItem('roadmaster-selected-project');
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    setApiError(null);
    try {
      const fetchedProjects = await apiService.getProjects();
      setProjects(fetchedProjects);
      localStorage.setItem('roadmaster-projects', JSON.stringify(fetchedProjects));
      DataCache.set(getCacheKey('projects'), fetchedProjects, { ttl: 10 * 60 * 1000 });
    } catch (error: any) {
      console.error('Failed to fetch projects from database:', error);
      setApiError(error.message || 'Failed to connect to the database. Please check your connection and configuration.');
    } finally {
      setIsLoadingProjects(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated]);

  const currentProject = useMemo(() => {
    const project = projects.find(p => p.id === selectedProjectId);
    return project ? prepareProjectWithMaterials(project) : undefined;
  }, [projects, selectedProjectId]);

  const saveProject = async (project: Partial<Project>) => {
    try {
      const targetProjectId = project.id || currentProject?.id;
      const isUpdate = !!targetProjectId;
      
      const baseProject = project.id 
        ? projects.find(p => p.id === project.id) 
        : currentProject;

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

      const processedProject: Project = prepareProjectWithMaterials(completeProjectData);

      let backendProject: Project;
      if (isUpdate) {
        backendProject = await apiService.updateProject(completeProjectData.id, processedProject);
      } else {
        backendProject = await apiService.createProject(processedProject);
      }

      startTransition(() => {
        setProjects(prev => {
          const updatedProjects = isUpdate 
            ? prev.map(p => p.id === backendProject.id ? backendProject : p)
            : [...prev, backendProject];
          
          localStorage.setItem('roadmaster-projects', JSON.stringify(updatedProjects));
          DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 });
          
          return updatedProjects;
        });
      });

      toast.success(isUpdate ? "Project Updated" : "Project Created", {
        description: `${completeProjectData.name} has been synchronized with the cloud.`,
      });
    } catch (error: any) {
      console.error('[ERROR] Failed to save project to backend:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Unknown server error';
      toast.error("Save Failed", {
        description: `Server responded with: ${errorMsg}`,
      });
      throw error;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await apiService.deleteProject(projectId);
      setProjects(prev => {
        const updatedProjects = prev.filter(p => p.id !== projectId);
        setTimeout(() => {
          localStorage.setItem('roadmaster-projects', JSON.stringify(updatedProjects));
          DataCache.set(getCacheKey('projects'), updatedProjects, { ttl: 10 * 60 * 1000 });
        }, 0);
        return updatedProjects;
      });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      toast.success("Project Deleted", {
        description: "The project has been permanently removed from the database.",
      });
    } catch (error: any) {
      console.error('[ERROR] Failed to delete project from backend:', error);
      const errorMsg = error.response?.data?.details || error.message || 'Unknown server error';
      toast.error("Delete Failed", {
        description: `Server responded with: ${errorMsg}`,
      });
    }
  };

  return {
    projects,
    setProjects,
    selectedProjectId,
    setSelectedProjectId,
    currentProject,
    isLoadingProjects,
    apiError,
    fetchProjects,
    saveProject,
    deleteProject
  };
};
