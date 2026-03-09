import { Project, ScheduleTask, User } from '../../types';

// Interface for scheduling recommendations
export interface SchedulingRecommendation {
  taskId: string;
  taskName: string;
  recommendedDate: string;
  confidence: number; // 0-100 percentage
  reasons: string[];
  alternatives?: AlternativeSchedulingOption[];
  priorityAdjustment?: number; // -2 to +2 scale adjustment
  resourceRequirements?: string[];
  weatherConsiderations?: string;
}

// Interface for alternative scheduling options
export interface AlternativeSchedulingOption {
  date: string;
  score: number; // 0-100 score for this option
  reasons: string[];
  constraints: string[];
}

// Interface for scheduling constraints
export interface SchedulingConstraints {
  dependencies: string[]; // Task IDs that must be completed first
  resourceAvailability: string[]; // Resources needed
  weatherSuitability: boolean; // Whether weather is suitable
  regulatoryConstraints: string[]; // Legal/regulatory constraints
  siteConditions: string[]; // Site-specific constraints
}

// Main AI scheduling service class
export class AISchedulingService {
  /**
   * Generates AI-driven scheduling recommendations for tasks
   */
  async generateSchedulingRecommendations(project: Project, currentUser?: User): Promise<SchedulingRecommendation[]> {
    const recommendations: SchedulingRecommendation[] = [];

    // Analyze each task for optimal scheduling
    for (const task of project.schedule) {
      const recommendation = await this.analyzeTaskScheduling(task, project);
      recommendations.push(recommendation);
    }

    // Sort recommendations by priority and urgency
    return recommendations.sort((a, b) => {
      // Prioritize high-confidence recommendations
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // Then by task priority (if available)
      return 0;
    });
  }

  /**
   * Analyzes a single task for scheduling optimization
   */
  private async analyzeTaskScheduling(task: ScheduleTask, project: Project): Promise<SchedulingRecommendation> {
    // Analyze dependencies
    const dependencyIssues = this.analyzeDependencies(task, project);

    // Analyze resource availability
    const resourceAnalysis = this.analyzeResourceAvailability(task, project);

    // Analyze weather considerations
    const weatherAnalysis = this.analyzeWeatherForTask(task, project);

    // Analyze quality requirements
    const qualityAnalysis = this.analyzeQualityRequirements(task, project);

    // Calculate optimal start date considering all factors
    let optimalDate = new Date(task.startDate);

    // Adjust for dependencies
    if (dependencyIssues.pendingDependencies.length > 0) {
      // Find latest dependency completion date
      const latestDepCompletion = this.getLatestDependencyCompletion(dependencyIssues.pendingDependencies);
      if (latestDepCompletion && latestDepCompletion > optimalDate) {
        optimalDate = latestDepCompletion;
      }
    }

    // Adjust for weather unsuitability
    if (!weatherAnalysis.suitableForWeather && weatherAnalysis.bestAlternativeDate) {
      const altDate = new Date(weatherAnalysis.bestAlternativeDate);
      if (altDate > optimalDate) {
        optimalDate = altDate;
      }
    }

    // Consider resource availability
    const resourceAvailDate = this.getNextResourceAvailableDate(resourceAnalysis.unavailableResources);
    if (resourceAvailDate && resourceAvailDate > optimalDate) {
      optimalDate = resourceAvailDate;
    }

    // Prepare reasons for recommendation
    const reasons = [];
    if (dependencyIssues.pendingDependencies.length > 0) {
      reasons.push(`${dependencyIssues.pendingDependencies.length} dependent tasks pending`);
    }
    if (!weatherAnalysis.suitableForWeather) {
      reasons.push(`Weather conditions not ideal, recommend ${weatherAnalysis.bestAlternativeDate}`);
    }
    if (resourceAnalysis.unavailableResources.length > 0) {
      reasons.push(`${resourceAnalysis.unavailableResources.length} required resources unavailable`);
    }
    if (qualityAnalysis.requiresTesting) {
      reasons.push(`Quality tests required after completion`);
    }

    // Calculate confidence based on available data
    let confidence = 80; // Base confidence
    if (dependencyIssues.pendingDependencies.length > 0) confidence -= 10;
    if (!weatherAnalysis.suitableForWeather) confidence -= 15;
    if (resourceAnalysis.unavailableResources.length > 0) confidence -= 10;
    if (project.weather?.impactOnSchedule !== 'None') confidence -= 5;

    // Generate alternatives
    const alternatives = this.generateAlternativeSchedulingOptions(task, project, optimalDate);

    return {
      taskId: task.id,
      taskName: task.name,
      recommendedDate: optimalDate.toISOString().split('T')[0],
      confidence: Math.max(50, confidence), // Minimum 50% confidence
      reasons,
      alternatives,
      priorityAdjustment: this.calculatePriorityAdjustment(task, project),
      resourceRequirements: resourceAnalysis.requiredResources,
      weatherConsiderations: weatherAnalysis.considerations
    };
  }

  /**
   * Analyzes task dependencies
   */
  private analyzeDependencies(task: ScheduleTask, project: Project) {
    const pendingDependencies = [];
    const satisfiedDependencies = [];

    for (const dependency of task.dependencies) {
      const depTask = project.schedule.find(t => t.id === dependency.taskId);
      if (depTask) {
        if (depTask.status === 'Completed') {
          satisfiedDependencies.push(depTask);
        } else {
          pendingDependencies.push(depTask);
        }
      }
    }

    return { pendingDependencies, satisfiedDependencies };
  }

  /**
   * Analyzes resource availability for a task
   */
  private analyzeResourceAvailability(task: ScheduleTask, project: Project) {
    // Extract resource requirements from task description or linked BOQ items
    const requiredResources = this.extractResourceRequirements(task, project);
    const unavailableResources = [];

    // Check if required resources are available
    for (const resource of requiredResources) {
      // This is simplified - in a real system, you'd check resource allocation databases
      const isAvailable = this.isResourceAvailable(resource);
      if (!isAvailable) {
        unavailableResources.push(resource);
      }
    }

    return { requiredResources, unavailableResources };
  }

  /**
   * Extracts resource requirements from task
   */
  private extractResourceRequirements(task: ScheduleTask, project: Project): string[] {
    // Simplified extraction - in reality, this would parse task descriptions and linked BOQ items
    const resources: string[] = [];

    // If task is linked to a BOQ item, get materials from there
    if (task.boqItemId) {
      const boqItem = project.boq.find(b => b.id === task.boqItemId);
      if (boqItem) {
        resources.push(`${boqItem.description} materials`);
      }
    }

    // Add common construction resources based on task type
    if (task.name.toLowerCase().includes('excavation') || task.name.toLowerCase().includes('earthwork')) {
      resources.push('Excavators', 'Dump trucks', 'Operators');
    } else if (task.name.toLowerCase().includes('concrete')) {
      resources.push('Concrete mixer', 'Labourers', 'Vibrators');
    } else if (task.name.toLowerCase().includes('steel')) {
      resources.push('Steel fixers', 'Crane', 'Welders');
    }

    return resources;
  }

  /**
   * Checks if a resource is available during the required period
   */
  private isResourceAvailable(_resource: string): boolean {
    // Simplified check - in reality, this would check resource allocation schedules
    // For now, assume resources are available unless there's a clear conflict
    return true;
  }

  /**
   * Analyzes weather suitability for task execution
   */
  private analyzeWeatherForTask(task: ScheduleTask, project: Project) {
    let suitableForWeather = true;
    let bestAlternativeDate: string | null = null;
    let considerations = '';

    if (project.weather) {
      // Outdoor tasks are more sensitive to weather
      const isOutdoorTask = this.isOutdoorTask(task);

      if (isOutdoorTask) {
        if (project.weather.impactOnSchedule === 'Severe') {
          suitableForWeather = false;
          considerations = 'Severe weather conditions make outdoor work inadvisable';

          // Look for better weather forecast in the coming days
          const forecast = project.weather.forecast;
          if (forecast) {
            for (const day of forecast) {
              if (day.condition !== 'Rainy' && day.condition !== 'Snowy' && day.condition !== 'Stormy') {
                // Calculate approximate date based on forecast
                const date = new Date();
                date.setDate(date.getDate() + forecast.indexOf(day) + 1);
                bestAlternativeDate = date.toISOString().split('T')[0];
                break;
              }
            }
          }
        } else if (project.weather.impactOnSchedule === 'Moderate') {
          suitableForWeather = false;
          considerations = 'Moderate weather impact on outdoor work';
        }
      } else {
        considerations = 'Weather conditions suitable for indoor work';
      }
    }

    return { suitableForWeather, bestAlternativeDate, considerations };
  }

  /**
   * Determines if a task is outdoor-focused
   */
  private isOutdoorTask(task: ScheduleTask): boolean {
    // Simple heuristic based on task name
    const outdoorKeywords = [
      'excavation', 'backfill', 'grading', 'paving', 'concreting', 'foundation', 
      'erection', 'installation', 'landscaping', 'drainage', 'utility', 'fencing'
    ];

    return outdoorKeywords.some(keyword => 
      task.name.toLowerCase().includes(keyword)
    );
  }

  /**
   * Analyzes quality requirements for the task
   */
  private analyzeQualityRequirements(task: ScheduleTask, project: Project) {
    // Determine if this task requires quality testing
    const requiresTesting = this.doesTaskRequireTesting(task);

    // Identify related lab tests that may be needed
    const relatedTests = project.labTests.filter(test => 
      test.location.includes(task.name) || 
      test.componentId === task.id ||
      test.assetId
    );

    return { requiresTesting, relatedTests };
  }

  /**
   * Determines if a task requires quality testing
   */
  private doesTaskRequireTesting(task: ScheduleTask): boolean {
    // Tasks that typically require testing
    const testingKeywords = [
      'concrete', 'steel', 'material', 'foundation', 'structural', 
      'asphalt', 'compaction', 'density', 'strength'
    ];

    return testingKeywords.some(keyword => 
      task.name.toLowerCase().includes(keyword)
    );
  }

  /**
   * Gets the latest completion date among dependencies
   */
  private getLatestDependencyCompletion(dependencies: ScheduleTask[]): Date | null {
    if (dependencies.length === 0) return null;

    let latestDate: Date | null = null;

    for (const dep of dependencies) {
      const depEndDate = new Date(dep.endDate);
      if (!latestDate || depEndDate > latestDate) {
        latestDate = depEndDate;
      }
    }

    return latestDate;
  }

  /**
   * Gets next available date for unavailable resources
   */
  private getNextResourceAvailableDate(unavailableResources: string[]): Date | null {
    // Simplified - in reality, this would check resource calendars
    if (unavailableResources.length === 0) return null;

    // Return current date + 2 days as a simple solution
    const nextAvailable = new Date();
    nextAvailable.setDate(nextAvailable.getDate() + 2);
    return nextAvailable;
  }

  /**
   * Generates alternative scheduling options
   */
  private generateAlternativeSchedulingOptions(task: ScheduleTask, project: Project, optimalDate: Date): AlternativeSchedulingOption[] {
    const alternatives: AlternativeSchedulingOption[] = [];

    // Option 1: Original planned date
    const originalDate = new Date(task.startDate);
    const originalScore = this.calculateSchedulingScore(task, project, originalDate);
    alternatives.push({
      date: originalDate.toISOString().split('T')[0],
      score: originalScore,
      reasons: ['Original planned date'],
      constraints: []
    });

    // Option 2: Optimal recommended date
    const optimalScore = this.calculateSchedulingScore(task, project, optimalDate);
    alternatives.push({
      date: optimalDate.toISOString().split('T')[0],
      score: optimalScore,
      reasons: ['Optimal date based on all factors'],
      constraints: []
    });

    // Option 3: Next week if optimal is far
    const nextWeek = new Date(optimalDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekScore = this.calculateSchedulingScore(task, project, nextWeek);
    alternatives.push({
      date: nextWeek.toISOString().split('T')[0],
      score: nextWeekScore,
      reasons: ['Next week option'],
      constraints: []
    });

    // Sort by score descending
    return alternatives.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculates a scheduling score based on various factors
   */
  private calculateSchedulingScore(task: ScheduleTask, project: Project, _date: Date): number {
    let score = 100; // Base score

    // Deduct points for weather unsuitability
    if (project.weather) {
      if (this.isOutdoorTask(task)) {
        switch (project.weather.impactOnSchedule) {
          case 'Severe': score -= 30; break;
          case 'Moderate': score -= 20; break;
          case 'Minor': score -= 10; break;
        }
      }
    }

    // Deduct points for resource unavailability
    const resources = this.analyzeResourceAvailability(task, project);
    score -= resources.unavailableResources.length * 10;

    // Deduct points for dependency conflicts
    const deps = this.analyzeDependencies(task, project);
    score -= deps.pendingDependencies.length * 15;

    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  /**
   * Calculates priority adjustment based on project factors
   */
  private calculatePriorityAdjustment(task: ScheduleTask, project: Project): number {
    let adjustment = 0;

    // Increase priority if task is on critical path
    if (task.isCritical) adjustment += 1;

    // Increase priority if dependent tasks are waiting
    const dependentTasks = project.schedule.filter(t => 
      t.dependencies.some(d => d.taskId === task.id)
    );
    if (dependentTasks.length > 0) {
      adjustment += Math.min(dependentTasks.length, 2); // Max +2 adjustment
    }

    // Decrease priority if task has been delayed before
    const now = new Date();
    const originalEnd = new Date(task.endDate);
    if (now > originalEnd && task.status !== 'Completed') {
      adjustment -= 1; // Delayed tasks may need reprioritization
    }

    // Limit adjustment to -2 to +2 range
    return Math.max(-2, Math.min(2, adjustment));
  }

  /**
   * Optimizes the entire project schedule using AI
   */
  async optimizeProjectSchedule(project: Project): Promise<{
    optimizedTasks: ScheduleTask[];
    expectedImprovements: {
      durationReduction?: number; // Days reduced
      costSavings?: number; // Expected savings
      riskReduction?: number; // Risk reduction percentage
    };
    recommendations: string[];
  }> {
    // This is a simplified optimization - a full implementation would use more complex algorithms
    const optimizedTasks = [...project.schedule];
    const recommendations: string[] = [];

    // Identify tasks that could be fast-tracked
    const parallelizableTasks = this.identifyParallelizableTasks(project);
    if (parallelizableTasks.length > 0) {
      recommendations.push(`Consider running ${parallelizableTasks.length} tasks in parallel to reduce project duration`);
    }

    // Identify tasks that could be rescheduled for better resource utilization
    const resourceConflictTasks = this.identifyResourceConflicts(project);
    if (resourceConflictTasks.length > 0) {
      recommendations.push(`Reschedule ${resourceConflictTasks.length} tasks to reduce resource conflicts`);
    }

    // Identify weather-sensitive tasks that could be moved
    const weatherSensitiveTasks = this.identifyWeatherSensitiveTasks(project);
    if (weatherSensitiveTasks.length > 0) {
      recommendations.push(`Reschedule weather-sensitive tasks to optimal weather periods`);
    }

    return {
      optimizedTasks,
      expectedImprovements: {
        durationReduction: parallelizableTasks.length > 0 ? parallelizableTasks.length * 0.5 : 0, // Estimate 0.5 days per task
        riskReduction: 10 // Estimate 10% risk reduction
      },
      recommendations
    };
  }

  /**
   * Identifies tasks that could be run in parallel
   */
  private identifyParallelizableTasks(project: Project): ScheduleTask[] {
    // Simplified logic - find non-dependent tasks that don't compete for same resources
    return project.schedule.filter(task => 
      task.dependencies.length === 0 || 
      project.schedule.some(otherTask => 
        otherTask.id !== task.id && 
        !otherTask.dependencies.some(dep => dep.taskId === task.id)
      )
    );
  }

  /**
   * Identifies resource conflicts in the schedule
   */
  private identifyResourceConflicts(project: Project): ScheduleTask[] {
    // Simplified logic - identify tasks that require similar resources during overlapping periods
    return project.schedule.filter(task => {
      const resources = this.extractResourceRequirements(task, project);
      return resources.length > 2; // Tasks requiring many resources may conflict
    });
  }

  /**
   * Identifies weather-sensitive tasks
   */
  private identifyWeatherSensitiveTasks(project: Project): ScheduleTask[] {
    return project.schedule.filter(task => this.isOutdoorTask(task));
  }
}

// Export a singleton instance
export const aiSchedulingService = new AISchedulingService();