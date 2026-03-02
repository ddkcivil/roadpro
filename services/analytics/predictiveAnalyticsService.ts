import { Project, ScheduleTask, BOQItem, LabTest, RFI, NCR, WeatherInfo } from '../../types';
import { getCurrencySymbol } from '../../utils/formatting/currencyUtils';

// Interface for prediction results
export interface PredictionResult {
  confidence: number; // 0-100 percentage
  predictedValue: number;
  actualValue?: number; // If known (for historical data)
  explanation: string;
  riskFactors: string[];
  recommendations: string[];
}

// Interface for delay predictions
export interface DelayPrediction extends PredictionResult {
  predictedDelayDays: number;
  baselineCompletionDate: string;
  predictedCompletionDate: string;
}

// Interface for cost predictions
export interface CostPrediction extends PredictionResult {
  predictedCost: number;
  baselineCost: number;
  variance: number; // Difference from baseline
  currency: string;
}

// Interface for performance indicators
export interface PerformanceIndicators {
  spi: number; // Schedule Performance Index
  cpi: number; // Cost Performance Index
  tcpi: number; // To-Complete Performance Index
  scheduleHealth: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  costHealth: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  trend: 'Improving' | 'Stable' | 'Declining';
}

// Main predictive analytics service class
export class PredictiveAnalyticsService {
  /**
   * Predicts potential delays based on current project data
   */
  async predictDelays(project: Project): Promise<DelayPrediction[]> {
    const predictions: DelayPrediction[] = [];
    
    // Analyze each task for potential delays
    for (const task of project.schedule) {
      const prediction = this.analyzeTaskDelayRisk(task, project);
      predictions.push(prediction);
    }
    
    return predictions;
  }

  /**
   * Predicts potential cost overruns
   */
  async predictCosts(project: Project): Promise<CostPrediction> {
    // Calculate baseline cost from BOQ using contract value formula
    const provisionalSum = project.boq
      .filter(item => item.unit?.toUpperCase() === 'PS')
      .reduce((sum, item) => sum + item.amount, 0);
      
    const amountWithoutPS = project.boq
      .filter(item => item.unit?.toUpperCase() !== 'PS')
      .reduce((sum, item) => sum + item.amount, 0);
      
    const vatRate = project.settings?.vatRate || 13;
    const vatAmount = amountWithoutPS * (vatRate / 100);
    
    const baselineCost = provisionalSum + amountWithoutPS + vatAmount;
    
    // Analyze various cost factors
    const riskFactors = [];
    let totalRiskMultiplier = 1.0;
    
    // Weather-related cost risks
    if (project.weather) {
      if (project.weather.impactOnSchedule !== 'None') {
        riskFactors.push(`Weather impact: ${project.weather.impactOnSchedule} schedule impact`);
        switch (project.weather.impactOnSchedule) {
          case 'Minor':
            totalRiskMultiplier += 0.05;
            break;
          case 'Moderate':
            totalRiskMultiplier += 0.10;
            break;
          case 'Severe':
            totalRiskMultiplier += 0.20;
            break;
        }
      }
    }
    
    // RFI-related cost risks
    const openRFIs = project.rfis.filter(rfi => rfi.status === 'Open' || rfi.status === 'Pending Inspection');
    if (openRFIs.length > 0) {
      riskFactors.push(`${openRFIs.length} open RFIs may cause delays and cost increases`);
      totalRiskMultiplier += Math.min(openRFIs.length * 0.02, 0.15); // Max 15% increase for RFIs
    }
    
    // NCR-related cost risks
    const openNCRs = project.ncrs.filter(ncr => ncr.status === 'Open' || ncr.status === 'Correction Pending');
    if (openNCRs.length > 0) {
      riskFactors.push(`${openNCRs.length} open NCRs may require rework and additional costs`);
      totalRiskMultiplier += Math.min(openNCRs.length * 0.03, 0.10); // Max 10% increase for NCRs
    }
    
    // Lab test failure risks
    const failedTests = project.labTests.filter(test => test.result === 'Fail');
    if (failedTests.length > 0) {
      riskFactors.push(`${failedTests.length} failed lab tests may require material replacement`);
      totalRiskMultiplier += Math.min(failedTests.length * 0.01, 0.05); // Max 5% increase for failed tests
    }
    
    const predictedCost = baselineCost * totalRiskMultiplier;
    const variance = predictedCost - baselineCost;
    
    return {
      confidence: 75, // We estimate 75% confidence in this calculation
      predictedValue: predictedCost, // Set predictedValue as required by PredictionResult
      predictedCost,
      baselineCost,
      variance,
      currency: getCurrencySymbol(project.settings?.currency),
      explanation: 'Cost prediction based on baseline BOQ plus risk multipliers for weather, RFIs, NCRs, and lab test failures',
      riskFactors,
      recommendations: [
        'Monitor weather forecasts closely and adjust schedules accordingly',
        'Resolve open RFIs promptly to avoid cascading delays',
        'Address quality issues identified in NCRs immediately',
        'Implement preventive measures to reduce future lab test failures'
      ]
    };
  }

  /**
   * Calculates project performance indicators
   */
  async calculatePerformanceIndicators(project: Project): Promise<PerformanceIndicators> {
    // Calculate SPI (Schedule Performance Index)
    let plannedValue = 0;
    let earnedValue = 0;
    
    for (const task of project.schedule) {
      const taskPlannedValue = task.progress > 0 ? task.progress / 100 : 0;
      plannedValue += taskPlannedValue;
      
      // Earned value based on planned completion vs actual
      const taskEarnedValue = task.progress / 100;
      earnedValue += taskEarnedValue;
    }
    
    const spi = plannedValue > 0 ? earnedValue / plannedValue : 1.0;
    
    // Calculate CPI (Cost Performance Index) using contract value logic
    const provisionalSum = project.boq
      .filter(item => item.unit?.toUpperCase() === 'PS')
      .reduce((sum, item) => sum + item.amount, 0);
      
    const amountWithoutPS = project.boq
      .filter(item => item.unit?.toUpperCase() !== 'PS')
      .reduce((sum, item) => sum + item.amount, 0);
      
    const vatRate = project.settings?.vatRate || 13;
    const vatAmount = amountWithoutPS * (vatRate / 100);
    const plannedCost = provisionalSum + amountWithoutPS + vatAmount;

    const actualCost = project.boq.reduce((sum, item) => {
      const completedRatio = item.completedQuantity / item.quantity;
      const baseAmount = item.amount * completedRatio;
      // Add VAT if not PS
      if (item.unit?.toUpperCase() !== 'PS') {
        return sum + baseAmount * (1 + vatRate / 100);
      }
      return sum + baseAmount;
    }, 0);
    
    const cpi = actualCost > 0 ? earnedValue / actualCost : 1.0;
    
    // Calculate TCPI (To-Complete Performance Index)
    const remainingWork = plannedCost - actualCost;
    const remainingBudget = plannedCost - actualCost;
    const tcpi = remainingBudget > 0 ? remainingWork / remainingBudget : 1.0;
    
    // Determine health ratings
    const scheduleHealth = this.getHealthRating(spi);
    const costHealth = this.getHealthRating(cpi);
    
    // Determine trend (simplified)
    const recentTasks = project.schedule.slice(-5); // Last 5 tasks
    const completedRecently = recentTasks.filter(t => t.status === 'Completed').length;
    const trend = completedRecently / recentTasks.length > 0.5 ? 'Improving' : 'Stable';
    
    return {
      spi,
      cpi,
      tcpi,
      scheduleHealth,
      costHealth,
      trend
    };
  }

  /**
   * Predicts potential delays for a specific task
   */
  private analyzeTaskDelayRisk(task: ScheduleTask, project: Project): DelayPrediction {
    const now = new Date();
    const endDate = new Date(task.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let riskScore = 0;
    const riskFactors = [];
    
    // Progress vs timeline risk
    const startDate = new Date(task.startDate);
    const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDuration = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedProgress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;
    
    if (task.progress < expectedProgress - 10) {
      riskFactors.push(`Progress (${task.progress}%) behind schedule (${expectedProgress.toFixed(1)}%)`);
      riskScore += 30;
    } else if (task.progress < expectedProgress - 5) {
      riskFactors.push(`Progress slightly behind schedule`);
      riskScore += 15;
    }
    
    // Weather risk
    if (project.weather) {
      if (project.weather.impactOnSchedule === 'Severe') {
        riskFactors.push('Severe weather conditions affecting outdoor work');
        riskScore += 25;
      } else if (project.weather.impactOnSchedule === 'Moderate') {
        riskFactors.push('Moderate weather conditions affecting work');
        riskScore += 15;
      }
    }
    
    // Dependency risk
    if (task.dependencies && task.dependencies.length > 0) {
      const dependentTasks = task.dependencies.map(dep => 
        project.schedule.find(t => t.id === dep.taskId)
      ).filter(Boolean) as ScheduleTask[];
      
      const delayedDependencies = dependentTasks.filter(t => 
        t.status === 'Delayed' || 
        (t.progress < 100 && new Date(t.endDate) < now)
      );
      
      if (delayedDependencies.length > 0) {
        riskFactors.push(`${delayedDependencies.length} dependent tasks are delayed`);
        riskScore += 20 * delayedDependencies.length;
      }
    }
    
    // Calculate predicted delay
    const baseDelay = Math.max(0, expectedProgress - task.progress);
    const weatherFactor = project.weather ? 
      (project.weather.impactOnSchedule === 'Severe' ? 1.5 : 
       project.weather.impactOnSchedule === 'Moderate' ? 1.2 : 1.0) : 1.0;
    
    const predictedDelayDays = Math.round(baseDelay * weatherFactor * (daysRemaining / 100));
    
    // Calculate predicted completion date
    const predictedCompletionDate = new Date(endDate);
    predictedCompletionDate.setDate(predictedCompletionDate.getDate() + predictedDelayDays);
    
    return {
      confidence: Math.max(60, 100 - riskScore), // Higher risk = lower confidence
      predictedValue: predictedDelayDays, // Set predictedValue as required by PredictionResult
      predictedDelayDays,
      baselineCompletionDate: task.endDate,
      predictedCompletionDate: predictedCompletionDate.toISOString().split('T')[0],
      explanation: `Risk analysis based on progress, weather, and dependencies`,
      riskFactors,
      recommendations: [
        'Focus resources on high-priority tasks',
        'Consider adjusting task dependencies',
        'Plan for weather contingencies',
        'Increase monitoring frequency for at-risk tasks'
      ]
    };
  }

  /**
   * Gets health rating based on index value
   */
  private getHealthRating(index: number): PerformanceIndicators['scheduleHealth'] {
    if (index >= 1.1) return 'Excellent';
    if (index >= 1.0) return 'Good';
    if (index >= 0.9) return 'Fair';
    if (index >= 0.8) return 'Poor';
    return 'Critical';
  }

  /**
   * Generates early warning alerts based on predictive analysis
   */
  async generateEarlyWarnings(project: Project): Promise<string[]> {
    const warnings: string[] = [];
    const performance = await this.calculatePerformanceIndicators(project);
    
    // Schedule warnings
    if (performance.spi < 0.8) {
      warnings.push(`⚠️ Critical schedule delay detected (SPI: ${performance.spi.toFixed(2)})`);
    } else if (performance.spi < 0.9) {
      warnings.push(`⚠️ Schedule delay risk detected (SPI: ${performance.spi.toFixed(2)})`);
    }
    
    // Cost warnings
    if (performance.cpi < 0.8) {
      warnings.push(`⚠️ Critical cost overrun detected (CPI: ${performance.cpi.toFixed(2)})`);
    } else if (performance.cpi < 0.9) {
      warnings.push(`⚠️ Cost overrun risk detected (CPI: ${performance.cpi.toFixed(2)})`);
    }
    
    // Trend warnings
    if (performance.trend === 'Declining') {
      warnings.push(`📉 Project performance trending downward`);
    }
    
    // Task-specific warnings
    const delayPredictions = await this.predictDelays(project);
    const highRiskTasks = delayPredictions.filter(p => p.confidence > 70 && p.predictedDelayDays > 5);
    
    if (highRiskTasks.length > 0) {
      warnings.push(`🚨 ${highRiskTasks.length} tasks at high risk of significant delays`);
    }
    
    return warnings;
  }
}

// Export a singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService();