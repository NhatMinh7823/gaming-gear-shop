/**
 * Analytics and monitoring for multi-tool workflows
 * Tracks performance metrics, completion rates, and generates reports
 */
class WorkflowAnalytics {
  constructor() {
    this.metrics = {
      workflowsStarted: 0,
      workflowsCompleted: 0,
      workflowsCancelled: 0,
      workflowsErrored: 0,
      toolExecutions: {},
      averageStepsPerWorkflow: 0,
      averageCompletionTime: 0,
      completionRate: 0,
      lastResetTime: Date.now()
    };
    
    this.workflowData = [];
    this.toolMetrics = new Map(); // toolName -> detailed metrics
    this.dailyData = new Map(); // date -> daily metrics
    this.maxDataRetention = 1000; // Keep last 1000 workflows
    this.maxDailyRetention = 30; // Keep 30 days of daily data
    
    // Debug mode
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
    
    // Initialize cleanup
    this.startCleanupTimer();
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[WorkflowAnalytics] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[WorkflowAnalytics ERROR] ${message}`, ...args);
  }

  /**
   * Track workflow start
   */
  trackWorkflowStart(workflow) {
    this.metrics.workflowsStarted++;
    
    const workflowRecord = {
      id: workflow.id,
      sessionId: workflow.sessionId,
      type: workflow.type,
      startTime: Date.now(),
      userId: workflow.data?.userId || null,
      originalMessage: workflow.data?.originalMessage || '',
      status: 'started',
      expectedSteps: workflow.steps?.length || 0
    };
    
    this.workflowData.push(workflowRecord);
    this.cleanupOldData();
    
    // Update daily metrics
    this.updateDailyMetrics('workflowsStarted', workflow.type);
    
    this.log(`📊 Workflow started tracked: ${workflow.type} (${workflow.id})`);
  }

  /**
   * Track workflow completion
   */
  trackWorkflowCompletion(workflow) {
    this.metrics.workflowsCompleted++;
    
    const workflowRecord = this.workflowData.find(w => w.id === workflow.id);
    if (workflowRecord) {
      workflowRecord.status = 'completed';
      workflowRecord.completionTime = Date.now();
      workflowRecord.duration = workflowRecord.completionTime - workflowRecord.startTime;
      workflowRecord.stepsCompleted = workflow.currentStep || 0;
      workflowRecord.efficiency = workflow.data?.efficiency || 0;
      workflowRecord.toolsUsed = workflow.history?.map(h => h.tool).filter(Boolean) || [];
    }
    
    // Update averages
    this.updateAverages();
    
    // Update daily metrics
    this.updateDailyMetrics('workflowsCompleted', workflow.type);
    
    this.log(`✅ Workflow completion tracked: ${workflow.type} in ${workflowRecord?.duration}ms`);
  }

  /**
   * Track workflow cancellation
   */
  trackWorkflowCancellation(workflow, reason = 'unknown') {
    this.metrics.workflowsCancelled++;
    
    const workflowRecord = this.workflowData.find(w => w.id === workflow.id);
    if (workflowRecord) {
      workflowRecord.status = 'cancelled';
      workflowRecord.cancellationTime = Date.now();
      workflowRecord.duration = workflowRecord.cancellationTime - workflowRecord.startTime;
      workflowRecord.cancellationReason = reason;
      workflowRecord.stepsCompleted = workflow.currentStep || 0;
      workflowRecord.toolsUsed = workflow.history?.map(h => h.tool).filter(Boolean) || [];
    }
    
    // Update daily metrics
    this.updateDailyMetrics('workflowsCancelled', workflow.type);
    
    this.log(`❌ Workflow cancellation tracked: ${workflow.type} - ${reason}`);
  }

  /**
   * Track workflow error
   */
  trackWorkflowError(workflow, error) {
    this.metrics.workflowsErrored++;
    
    const workflowRecord = this.workflowData.find(w => w.id === workflow.id);
    if (workflowRecord) {
      workflowRecord.status = 'error';
      workflowRecord.errorTime = Date.now();
      workflowRecord.duration = workflowRecord.errorTime - workflowRecord.startTime;
      workflowRecord.error = {
        message: error?.message || error,
        step: workflow.currentStep || 0,
        stepName: workflow.steps?.[workflow.currentStep]?.name || 'unknown'
      };
      workflowRecord.stepsCompleted = workflow.currentStep || 0;
      workflowRecord.toolsUsed = workflow.history?.map(h => h.tool).filter(Boolean) || [];
    }
    
    // Update daily metrics
    this.updateDailyMetrics('workflowsErrored', workflow.type);
    
    this.logError(`💥 Workflow error tracked: ${workflow.type} - ${error?.message || error}`);
  }

  /**
   * Track tool execution
   */
  trackToolExecution(toolName, success = true, duration = 0, context = {}) {
    // Update main metrics
    if (!this.metrics.toolExecutions[toolName]) {
      this.metrics.toolExecutions[toolName] = {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        totalDuration: 0,
        lastUsed: Date.now()
      };
    }

    const toolMetrics = this.metrics.toolExecutions[toolName];
    toolMetrics.total++;
    toolMetrics.totalDuration += duration;
    toolMetrics.averageDuration = toolMetrics.totalDuration / toolMetrics.total;
    toolMetrics.lastUsed = Date.now();
    
    if (success) {
      toolMetrics.successful++;
    } else {
      toolMetrics.failed++;
    }

    // Update detailed tool metrics
    if (!this.toolMetrics.has(toolName)) {
      this.toolMetrics.set(toolName, {
        executions: [],
        hourlyUsage: new Map(),
        errorPatterns: new Map()
      });
    }

    const detailedMetrics = this.toolMetrics.get(toolName);
    detailedMetrics.executions.push({
      timestamp: Date.now(),
      success,
      duration,
      context: { ...context },
      hour: new Date().getHours()
    });

    // Track hourly usage
    const hour = new Date().getHours();
    const hourlyCount = detailedMetrics.hourlyUsage.get(hour) || 0;
    detailedMetrics.hourlyUsage.set(hour, hourlyCount + 1);

    // Track error patterns
    if (!success && context.error) {
      const errorType = context.error.split(':')[0] || 'unknown';
      const errorCount = detailedMetrics.errorPatterns.get(errorType) || 0;
      detailedMetrics.errorPatterns.set(errorType, errorCount + 1);
    }

    // Cleanup old executions (keep last 100 per tool)
    if (detailedMetrics.executions.length > 100) {
      detailedMetrics.executions = detailedMetrics.executions.slice(-100);
    }

    this.log(`🔧 Tool execution tracked: ${toolName} (${success ? 'success' : 'failed'}) - ${duration}ms`);
  }

  /**
   * Update daily metrics
   */
  updateDailyMetrics(metricType, workflowType = null) {
    const today = new Date().toDateString();
    
    if (!this.dailyData.has(today)) {
      this.dailyData.set(today, {
        date: today,
        workflowsStarted: 0,
        workflowsCompleted: 0,
        workflowsCancelled: 0,
        workflowsErrored: 0,
        byType: {},
        toolUsage: {},
        timestamp: Date.now()
      });
    }

    const dailyMetrics = this.dailyData.get(today);
    dailyMetrics[metricType]++;

    // Track by workflow type
    if (workflowType) {
      if (!dailyMetrics.byType[workflowType]) {
        dailyMetrics.byType[workflowType] = {
          started: 0,
          completed: 0,
          cancelled: 0,
          errored: 0
        };
      }

      const typeKey = metricType.replace('workflows', '').toLowerCase();
      if (typeKey === 'started') dailyMetrics.byType[workflowType].started++;
      else if (typeKey === 'completed') dailyMetrics.byType[workflowType].completed++;
      else if (typeKey === 'cancelled') dailyMetrics.byType[workflowType].cancelled++;
      else if (typeKey === 'errored') dailyMetrics.byType[workflowType].errored++;
    }

    // Cleanup old daily data
    if (this.dailyData.size > this.maxDailyRetention) {
      const sortedDates = Array.from(this.dailyData.keys()).sort();
      const toRemove = this.dailyData.size - this.maxDailyRetention;
      for (let i = 0; i < toRemove; i++) {
        this.dailyData.delete(sortedDates[i]);
      }
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    this.updateCompletionRate();

    return {
      ...this.metrics,
      timestamp: Date.now(),
      uptime: Date.now() - this.metrics.lastResetTime,
      
      // Derived metrics
      errorRate: this.metrics.workflowsStarted > 0 ? 
        (this.metrics.workflowsErrored / this.metrics.workflowsStarted) * 100 : 0,
      
      cancellationRate: this.metrics.workflowsStarted > 0 ? 
        (this.metrics.workflowsCancelled / this.metrics.workflowsStarted) * 100 : 0,
      
      activeWorkflows: this.workflowData.filter(w => w.status === 'started').length,
      
      // Tool summary
      mostUsedTool: this.getMostUsedTool(),
      slowestTool: this.getSlowestTool(),
      mostReliableTool: this.getMostReliableTool()
    };
  }

  /**
   * Get workflow performance by type
   */
  getWorkflowPerformance() {
    const performance = {};
    
    for (const workflow of this.workflowData) {
      if (!performance[workflow.type]) {
        performance[workflow.type] = {
          started: 0,
          completed: 0,
          cancelled: 0,
          errored: 0,
          totalDuration: 0,
          averageDuration: 0,
          completionRate: 0,
          averageSteps: 0,
          efficiency: 0
        };
      }
      
      const perf = performance[workflow.type];
      perf.started++;
      
      if (workflow.status === 'completed') {
        perf.completed++;
        perf.totalDuration += workflow.duration || 0;
        perf.averageSteps += workflow.stepsCompleted || 0;
        perf.efficiency += workflow.efficiency || 0;
      } else if (workflow.status === 'cancelled') {
        perf.cancelled++;
      } else if (workflow.status === 'error') {
        perf.errored++;
      }
    }

    // Calculate averages
    for (const type in performance) {
      const perf = performance[type];
      perf.completionRate = perf.started > 0 ? (perf.completed / perf.started) * 100 : 0;
      
      if (perf.completed > 0) {
        perf.averageDuration = perf.totalDuration / perf.completed;
        perf.averageSteps = perf.averageSteps / perf.completed;
        perf.efficiency = perf.efficiency / perf.completed;
      }
    }
    
    return performance;
  }

  /**
   * Get tool performance analytics
   */
  getToolPerformance() {
    const toolPerformance = {};

    for (const [toolName, metrics] of this.toolMetrics.entries()) {
      const executions = metrics.executions;
      const successful = executions.filter(e => e.success);
      const failed = executions.filter(e => !e.success);

      toolPerformance[toolName] = {
        totalExecutions: executions.length,
        successfulExecutions: successful.length,
        failedExecutions: failed.length,
        successRate: executions.length > 0 ? (successful.length / executions.length) * 100 : 0,
        
        // Duration metrics
        averageDuration: successful.length > 0 ? 
          successful.reduce((sum, e) => sum + e.duration, 0) / successful.length : 0,
        
        medianDuration: this.calculateMedian(successful.map(e => e.duration)),
        
        minDuration: successful.length > 0 ? Math.min(...successful.map(e => e.duration)) : 0,
        maxDuration: successful.length > 0 ? Math.max(...successful.map(e => e.duration)) : 0,
        
        // Usage patterns
        hourlyUsage: Object.fromEntries(metrics.hourlyUsage),
        peakHour: this.getPeakHour(metrics.hourlyUsage),
        
        // Error analysis
        errorPatterns: Object.fromEntries(metrics.errorPatterns),
        mostCommonError: this.getMostCommonError(metrics.errorPatterns),
        
        // Recent performance (last 24 hours)
        recent24h: this.getRecentPerformance(executions, 24),
        
        // Last execution
        lastExecution: executions.length > 0 ? executions[executions.length - 1] : null
      };
    }

    return toolPerformance;
  }

  /**
   * Generate daily report
   */
  generateDailyReport(date = null) {
    const targetDate = date || new Date().toDateString();
    const dailyMetrics = this.dailyData.get(targetDate);

    if (!dailyMetrics) {
      return {
        date: targetDate,
        error: 'No data available for this date'
      };
    }

    // Get workflow data for the day
    const dayStart = new Date(targetDate).setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate).setHours(23, 59, 59, 999);
    
    const dayWorkflows = this.workflowData.filter(w => 
      w.startTime >= dayStart && w.startTime <= dayEnd
    );

    return {
      date: targetDate,
      summary: {
        totalWorkflows: dailyMetrics.workflowsStarted,
        completedWorkflows: dailyMetrics.workflowsCompleted,
        cancelledWorkflows: dailyMetrics.workflowsCancelled,
        erroredWorkflows: dailyMetrics.workflowsErrored,
        completionRate: dailyMetrics.workflowsStarted > 0 ? 
          (dailyMetrics.workflowsCompleted / dailyMetrics.workflowsStarted) * 100 : 0
      },
      
      byType: dailyMetrics.byType,
      
      performance: {
        averageCompletionTime: this.calculateAverageCompletionTime(dayWorkflows),
        mostPopularWorkflowType: this.getMostPopularWorkflowType(dailyMetrics.byType),
        peakHour: this.getPeakHourForDay(dayWorkflows)
      },
      
      toolUsage: this.getDailyToolUsage(dayStart, dayEnd),
      
      trends: {
        comparedToPreviousDay: this.compareToPreviousDay(targetDate),
        weeklyTrend: this.getWeeklyTrend(targetDate)
      }
    };
  }

  /**
   * Update calculated averages
   */
  updateAverages() {
    const completedWorkflows = this.workflowData.filter(w => w.status === 'completed');
    
    if (completedWorkflows.length > 0) {
      const totalSteps = completedWorkflows.reduce((sum, w) => sum + (w.stepsCompleted || 0), 0);
      const totalTime = completedWorkflows.reduce((sum, w) => sum + (w.duration || 0), 0);
      
      this.metrics.averageStepsPerWorkflow = totalSteps / completedWorkflows.length;
      this.metrics.averageCompletionTime = totalTime / completedWorkflows.length;
    }
  }

  /**
   * Update completion rate
   */
  updateCompletionRate() {
    if (this.metrics.workflowsStarted > 0) {
      this.metrics.completionRate = (this.metrics.workflowsCompleted / this.metrics.workflowsStarted) * 100;
    }
  }

  /**
   * Helper methods for analytics calculations
   */
  getMostUsedTool() {
    let maxUsage = 0;
    let mostUsed = null;
    
    for (const [toolName, metrics] of Object.entries(this.metrics.toolExecutions)) {
      if (metrics.total > maxUsage) {
        maxUsage = metrics.total;
        mostUsed = { name: toolName, usage: maxUsage };
      }
    }
    
    return mostUsed;
  }

  getSlowestTool() {
    let maxDuration = 0;
    let slowest = null;
    
    for (const [toolName, metrics] of Object.entries(this.metrics.toolExecutions)) {
      if (metrics.averageDuration > maxDuration) {
        maxDuration = metrics.averageDuration;
        slowest = { name: toolName, averageDuration: maxDuration };
      }
    }
    
    return slowest;
  }

  getMostReliableTool() {
    let highestSuccessRate = 0;
    let mostReliable = null;
    
    for (const [toolName, metrics] of Object.entries(this.metrics.toolExecutions)) {
      const successRate = metrics.total > 0 ? (metrics.successful / metrics.total) * 100 : 0;
      if (successRate > highestSuccessRate) {
        highestSuccessRate = successRate;
        mostReliable = { name: toolName, successRate: highestSuccessRate };
      }
    }
    
    return mostReliable;
  }

  calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[middle - 1] + sorted[middle]) / 2 : 
      sorted[middle];
  }

  getPeakHour(hourlyUsage) {
    let maxUsage = 0;
    let peakHour = 0;
    
    for (const [hour, usage] of hourlyUsage.entries()) {
      if (usage > maxUsage) {
        maxUsage = usage;
        peakHour = hour;
      }
    }
    
    return { hour: peakHour, usage: maxUsage };
  }

  getMostCommonError(errorPatterns) {
    let maxCount = 0;
    let mostCommon = null;
    
    for (const [error, count] of errorPatterns.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = { error, count };
      }
    }
    
    return mostCommon;
  }

  getRecentPerformance(executions, hours) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recent = executions.filter(e => e.timestamp > cutoff);
    
    return {
      total: recent.length,
      successful: recent.filter(e => e.success).length,
      failed: recent.filter(e => !e.success).length,
      averageDuration: recent.length > 0 ? 
        recent.reduce((sum, e) => sum + e.duration, 0) / recent.length : 0
    };
  }

  /**
   * Cleanup old data to prevent memory leaks
   */
  cleanupOldData() {
    if (this.workflowData.length > this.maxDataRetention) {
      this.workflowData = this.workflowData.slice(-this.maxDataRetention);
    }
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000); // Every 5 minutes

    this.log("🧹 Analytics cleanup timer started");
  }

  /**
   * Reset all metrics (for testing or manual reset)
   */
  resetMetrics() {
    this.metrics = {
      workflowsStarted: 0,
      workflowsCompleted: 0,
      workflowsCancelled: 0,
      workflowsErrored: 0,
      toolExecutions: {},
      averageStepsPerWorkflow: 0,
      averageCompletionTime: 0,
      completionRate: 0,
      lastResetTime: Date.now()
    };
    
    this.workflowData = [];
    this.toolMetrics.clear();
    this.dailyData.clear();
    
    this.log("📊 Metrics reset completed");
  }

  /**
   * Export analytics data for backup/analysis
   */
  exportData() {
    return {
      metrics: this.metrics,
      workflowData: this.workflowData,
      toolMetrics: Object.fromEntries(this.toolMetrics),
      dailyData: Object.fromEntries(this.dailyData),
      exportTime: Date.now(),
      version: '1.0'
    };
  }

  /**
   * Get system health indicators
   */
  getHealthIndicators() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recent24hWorkflows = this.workflowData.filter(w => w.startTime > last24h);
    const completed24h = recent24hWorkflows.filter(w => w.status === 'completed');
    const errored24h = recent24hWorkflows.filter(w => w.status === 'error');
    
    return {
      overallHealth: this.calculateOverallHealth(),
      
      indicators: {
        workflowVolume: {
          status: recent24hWorkflows.length > 10 ? 'healthy' : recent24hWorkflows.length > 0 ? 'warning' : 'critical',
          value: recent24hWorkflows.length,
          description: 'Workflows in last 24h'
        },
        
        completionRate: {
          status: this.metrics.completionRate > 80 ? 'healthy' : this.metrics.completionRate > 60 ? 'warning' : 'critical',
          value: Math.round(this.metrics.completionRate),
          description: 'Overall completion rate (%)'
        },
        
        errorRate: {
          status: this.metrics.errorRate < 5 ? 'healthy' : this.metrics.errorRate < 15 ? 'warning' : 'critical',
          value: Math.round(this.metrics.errorRate * 100) / 100,
          description: 'Overall error rate (%)'
        },
        
        averageResponseTime: {
          status: this.metrics.averageCompletionTime < 30000 ? 'healthy' : this.metrics.averageCompletionTime < 60000 ? 'warning' : 'critical',
          value: Math.round(this.metrics.averageCompletionTime),
          description: 'Average completion time (ms)'
        }
      },
      
      lastUpdated: now
    };
  }

  calculateOverallHealth() {
    const indicators = this.getHealthIndicators().indicators;
    const scores = Object.values(indicators).map(i => 
      i.status === 'healthy' ? 100 : i.status === 'warning' ? 60 : 20
    );
    
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (averageScore >= 80) return 'healthy';
    if (averageScore >= 60) return 'warning';
    return 'critical';
  }

  /**
   * Helper method: Group array by property
   */
  groupBy(array, property) {
    return array.reduce((groups, item) => {
      const key = item[property];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {});
  }
}

module.exports = WorkflowAnalytics;
