import { Project, BOQItem, RFIStatus } from '../../types';

export interface EVMMetrics {
  plannedValue: number;    // BCWS
  earnedValue: number;     // BCWP
  actualCost: number;      // ACWP
  costVariance: number;    // CV = EV - AC
  scheduleVariance: number; // SV = EV - PV
  cpi: number;             // EV / AC
  spi: number;             // EV / PV
  estimateAtCompletion: number; // EAC
}

export interface QualityMetrics {
  rfiResponseRate: number;
  labPassRate: number;
  ncrClosureRate: number;
  avgRfiTurnaroundDays: number;
}

export interface ResourceForecast {
  resourceName: string;
  currentStock: number;
  estimatedNeeded: number;
  shortfall: number;
  daysRemaining: number;
  criticality: 'Normal' | 'Warning' | 'Critical';
}

export interface ProjectCluster {
  center: { lat: number; lng: number };
  projectIds: string[];
  count: number;
}

/**
 * Service for advanced project reporting and predictive analytics.
 */
export class ReportingService {
  /**
   * Calculates Earned Value Management metrics for a project
   */
  static calculateEVM(project: Project): EVMMetrics {
    const boq = project.boq || [];
    
    const plannedValue = boq.reduce((acc, item) => acc + (item.quantity * item.rate), 0);
    const earnedValue = boq.reduce((acc, item) => acc + (item.completedQuantity * item.rate), 0);
    const actualCost = (project.subcontractorPayments || []).reduce((acc, p) => acc + p.amount, 0) +
                       (project.agencyPayments || []).reduce((acc, p) => acc + p.amount, 0);

    const costVariance = earnedValue - actualCost;
    
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const today = new Date();
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = today.getTime() - startDate.getTime();
    const expectedProgress = totalDuration > 0 ? Math.min(1, elapsed / totalDuration) : 0;
    
    const targetEV = plannedValue * expectedProgress;
    const scheduleVariance = earnedValue - targetEV;

    const cpi = actualCost > 0 ? earnedValue / actualCost : 1;
    const spi = targetEV > 0 ? earnedValue / targetEV : 1;
    const estimateAtCompletion = cpi > 0 ? plannedValue / cpi : plannedValue;

    return {
      plannedValue,
      earnedValue,
      actualCost,
      costVariance,
      scheduleVariance,
      cpi,
      spi,
      estimateAtCompletion
    };
  }

  /**
   * Analyzes quality control performance
   */
  static calculateQualityMetrics(project: Project): QualityMetrics {
    const rfis = project.rfis || [];
    const tests = project.labTests || [];
    const ncrs = project.ncrs || [];

    const closedRfis = rfis.filter(r => r.status === RFIStatus.CLOSED || r.status === RFIStatus.APPROVED).length;
    const rfiResponseRate = rfis.length > 0 ? (closedRfis / rfis.length) * 100 : 100;

    const passedTests = tests.filter(t => t.result === 'Pass').length;
    const labPassRate = tests.length > 0 ? (passedTests / tests.length) * 100 : 100;

    const closedNcrs = ncrs.filter(n => n.status === 'Closed').length;
    const ncrClosureRate = ncrs.length > 0 ? (closedNcrs / ncrs.length) * 100 : 100;

    let totalDays = 0;
    let countedRfis = 0;
    rfis.forEach(r => {
      if (r.status !== RFIStatus.OPEN && r.responseDate) {
        const start = new Date(r.date);
        const end = new Date(r.responseDate);
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        totalDays += diff;
        countedRfis++;
      }
    });

    return {
      rfiResponseRate,
      labPassRate,
      ncrClosureRate,
      avgRfiTurnaroundDays: countedRfis > 0 ? totalDays / countedRfis : 0
    };
  }

  /**
   * Predicts future resource needs based on current burn rate and remaining work.
   */
  static predictResourceNeeds(project: Project): ResourceForecast[] {
    const evm = this.calculateEVM(project);
    const progressFactor = evm.earnedValue / (evm.plannedValue || 1);
    
    if (progressFactor === 0) return [];

    const inventory = project.inventory || [];
    const transactions = project.inventoryTransactions || [];

    return inventory.map(item => {
      const itemTransactions = transactions.filter(t => t.itemId === item.id && t.type === 'OUT');
      const totalConsumed = itemTransactions.reduce((acc, t) => acc + t.quantity, 0);
      
      const estimatedTotalNeeded = totalConsumed / progressFactor;
      const estimatedRemainingNeeded = Math.max(0, estimatedTotalNeeded - totalConsumed);
      const shortfall = Math.max(0, estimatedRemainingNeeded - item.quantity);
      
      const endDate = new Date(project.endDate);
      const today = new Date();
      const daysRemaining = Math.max(1, (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let criticality: ResourceForecast['criticality'] = 'Normal';
      if (shortfall > 0) {
        criticality = shortfall > (item.quantity * 0.5) ? 'Critical' : 'Warning';
      }

      return {
        resourceName: item.itemName,
        currentStock: item.quantity,
        estimatedNeeded: Math.round(estimatedRemainingNeeded),
        shortfall: Math.round(shortfall),
        daysRemaining: Math.round(daysRemaining),
        criticality
      };
    });
  }

  /**
   * Identifies clusters of projects based on geographic proximity.
   * Useful for resource sharing and logistics planning.
   */
  static analyzeGeospatialClusters(projects: Project[], radiusKm: number = 10): ProjectCluster[] {
    const geoProjects = projects.filter(p => p.lat !== undefined && p.lng !== undefined);
    const clusters: ProjectCluster[] = [];
    const processedIds = new Set<string>();

    for (const project of geoProjects) {
      if (processedIds.has(project.id)) continue;

      const cluster: ProjectCluster = {
        center: { lat: project.lat!, lng: project.lng! },
        projectIds: [project.id],
        count: 1
      };

      processedIds.add(project.id);

      for (const other of geoProjects) {
        if (processedIds.has(other.id)) continue;

        const dist = this.calculateDistance(
          project.lat!, project.lng!,
          other.lat!, other.lng!
        );

        if (dist <= radiusKm) {
          cluster.projectIds.push(other.id);
          cluster.count++;
          processedIds.add(other.id);
        }
      }

      if (cluster.count > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Helper to calculate distance between two points in km using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
