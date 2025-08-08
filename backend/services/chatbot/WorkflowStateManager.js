/**
 * Manages workflow state across multi-step conversations
 * Tracks workflow progression, completion, and analytics
 */
class WorkflowStateManager {
  constructor() {
    this.workflows = new Map(); // sessionId -> workflow state
    this.maxAge = 30 * 60 * 1000; // 30 minutes
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    this.maxWorkflows = 1000; // Maximum workflows to keep in memory
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    // Debug mode
    this.debugMode = process.env.CHATBOT_DEBUG === "true";
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[WorkflowStateManager] ${message}`, ...args);
    }
  }

  logError(message, ...args) {
    console.error(`[WorkflowStateManager ERROR] ${message}`, ...args);
  }

  /**
   * Initialize a new workflow
   * @param {string} sessionId - Session identifier
   * @param {string} type - Workflow type ('purchase', 'search', 'wishlist_purchase')
   * @param {Object} data - Initial workflow data
   */
  initWorkflow(sessionId, type, data = {}) {
    const workflow = { // về mặt kỹ thuật workflow là một object chứa các thông tin để 
      id: `${sessionId}_${Date.now()}`,
      sessionId,
      type,
      currentStep: 0,
      steps: this.getWorkflowSteps(type),
      data: {
        startTime: Date.now(),
        userId: data.userId || null,
        originalMessage: data.originalMessage || '',
        ...data
      },
      history: [], // Track step history
      status: 'active', // active, completed, cancelled, error
      timestamp: Date.now(),
      lastActivity: Date.now()
    };
    
    this.workflows.set(sessionId, workflow);
    this.log(`🚀 Workflow initialized: ${type} for session ${sessionId}`);
    
    return workflow;
  }

  /**
   * Get workflow steps for different types
   */
  getWorkflowSteps(type) {
    const stepDefinitions = {
      purchase: [
        { name: 'search', tool: 'product_search', description: 'Tìm kiếm sản phẩm', required: true },
        { name: 'select', tool: null, description: 'User chọn sản phẩm', required: false },
        { name: 'add_to_cart', tool: 'cart_tool', description: 'Thêm vào giỏ hàng', required: true },
        { name: 'confirm_order', tool: null, description: 'User xác nhận đặt hàng', required: false },
        { name: 'initiate_order', tool: 'optimized_ai_order_tool', description: 'Khởi tạo đặt hàng', required: true }
      ],
      
      search: [
        { name: 'search', tool: 'product_search', description: 'Tìm kiếm sản phẩm', required: true },
        { name: 'display_results', tool: null, description: 'Hiển thị kết quả', required: false },
        { name: 'suggest_action', tool: null, description: 'Gợi ý hành động tiếp theo', required: false }
      ],
      
      wishlist_purchase: [
        { name: 'get_wishlist', tool: 'wishlist_tool', description: 'Lấy danh sách yêu thích', required: true },
        { name: 'select_item', tool: null, description: 'User chọn item', required: false },
        { name: 'add_to_cart', tool: 'cart_tool', description: 'Thêm vào giỏ hàng', required: true },
        { name: 'initiate_order', tool: 'optimized_ai_order_tool', description: 'Khởi tạo đặt hàng', required: true }
      ],
      
      category_browse: [
        { name: 'list_categories', tool: 'category_list_tool', description: 'Liệt kê danh mục', required: true },
        { name: 'search_products', tool: 'ai_product_search', description: 'Tìm kiếm sản phẩm AI', required: false },
        { name: 'add_to_cart', tool: 'cart_tool', description: 'Thêm vào giỏ hàng', required: false },
        { name: 'initiate_order', tool: 'optimized_ai_order_tool', description: 'Khởi tạo đặt hàng', required: false }
      ]
    };
    
    return stepDefinitions[type] || stepDefinitions.search;
  }

  /**
   * Get current workflow state
   */
  getWorkflowState(sessionId) {
    const workflow = this.workflows.get(sessionId);
    if (workflow) {
      workflow.lastActivity = Date.now(); // Update activity timestamp
    }
    return workflow;
  }

  /**
   * Update workflow to next step
   */
  advanceWorkflow(sessionId, stepData = {}) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      this.log(`❌ No workflow found for session ${sessionId}`);
      return null;
    }

    // Record current step in history
    const currentStepInfo = workflow.steps[workflow.currentStep];
    workflow.history.push({
      step: workflow.currentStep,
      stepName: currentStepInfo?.name || 'unknown',
      tool: currentStepInfo?.tool || null,
      data: { ...stepData },
      timestamp: Date.now(),
      duration: Date.now() - (workflow.history[workflow.history.length - 1]?.timestamp || workflow.data.startTime)
    });

    // Advance to next step
    workflow.currentStep += 1;
    workflow.data = { ...workflow.data, ...stepData };
    workflow.timestamp = Date.now();
    workflow.lastActivity = Date.now();

    const progress = (workflow.currentStep / workflow.steps.length) * 100;
    this.log(`📈 Workflow advanced: ${workflow.type} step ${workflow.currentStep}/${workflow.steps.length} (${progress.toFixed(1)}%)`);
    
    return workflow;
  }

  /**
   * Complete workflow
   */
  completeWorkflow(sessionId, result = {}) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      this.log(`❌ No workflow found for completion: ${sessionId}`);
      return null;
    }

    workflow.status = 'completed';
    workflow.data.completionTime = Date.now();
    workflow.data.duration = Date.now() - workflow.data.startTime;
    workflow.data.result = result;
    workflow.lastActivity = Date.now();

    // Calculate efficiency metrics
    const requiredSteps = workflow.steps.filter(step => step.required).length;
    const completedSteps = workflow.currentStep;
    workflow.data.efficiency = (requiredSteps / Math.max(completedSteps, 1)) * 100;

    this.log(`✅ Workflow completed: ${workflow.type} in ${workflow.data.duration}ms (${completedSteps} steps, ${workflow.data.efficiency.toFixed(1)}% efficiency)`);
    
    return workflow;
  }

  /**
   * Cancel workflow
   */
  cancelWorkflow(sessionId, reason = 'user_cancelled') {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      this.log(`❌ No workflow found for cancellation: ${sessionId}`);
      return null;
    }

    workflow.status = 'cancelled';
    workflow.data.cancellationReason = reason;
    workflow.data.cancellationTime = Date.now();
    workflow.data.duration = Date.now() - workflow.data.startTime;
    workflow.lastActivity = Date.now();

    this.log(`❌ Workflow cancelled: ${workflow.type} - ${reason} (after ${workflow.data.duration}ms)`);
    
    return workflow;
  }

  /**
   * Mark workflow as error
   */
  errorWorkflow(sessionId, error, stepData = {}) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) {
      this.log(`❌ No workflow found for error marking: ${sessionId}`);
      return null;
    }

    workflow.status = 'error';
    workflow.data.error = {
      message: error.message || error,
      step: workflow.currentStep,
      stepName: workflow.steps[workflow.currentStep]?.name,
      timestamp: Date.now(),
      data: stepData
    };
    workflow.data.duration = Date.now() - workflow.data.startTime;
    workflow.lastActivity = Date.now();

    this.logError(`❌ Workflow error: ${workflow.type} at step ${workflow.currentStep} - ${error.message || error}`);
    
    return workflow;
  }

  /**
   * Get current step info
   */
  getCurrentStepInfo(sessionId) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return null;

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep) return null;

    return {
      ...currentStep,
      stepNumber: workflow.currentStep + 1,
      totalSteps: workflow.steps.length,
      isLastStep: workflow.currentStep >= workflow.steps.length - 1,
      progress: ((workflow.currentStep + 1) / workflow.steps.length) * 100,
      timeInStep: Date.now() - (workflow.history[workflow.history.length - 1]?.timestamp || workflow.data.startTime)
    };
  }

  /**
   * Get next step info
   */
  getNextStepInfo(sessionId) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return null;

    const nextStepIndex = workflow.currentStep + 1;
    const nextStep = workflow.steps[nextStepIndex];
    
    if (!nextStep) return null;

    return {
      ...nextStep,
      stepNumber: nextStepIndex + 1,
      totalSteps: workflow.steps.length
    };
  }

  /**
   * Check if workflow should continue
   */
  shouldContinueWorkflow(sessionId) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return false;

    return workflow.status === 'active' && 
           workflow.currentStep < workflow.steps.length &&
           (Date.now() - workflow.lastActivity) < this.maxAge; // Not too old
  }

  /**
   * Check if workflow can be advanced to next step
   */
  canAdvanceWorkflow(sessionId, toolUsed = null) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return false;

    const currentStep = workflow.steps[workflow.currentStep];
    if (!currentStep) return false;

    // If step requires a specific tool and that tool was used
    if (currentStep.tool && toolUsed === currentStep.tool) {
      return true;
    }

    // If step doesn't require a tool (user interaction step)
    if (!currentStep.tool) {
      return true;
    }

    return false;
  }

  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics(sessionId) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return null;

    const duration = workflow.data.duration || (Date.now() - workflow.data.startTime);
    const progress = (workflow.currentStep / workflow.steps.length) * 100;

    return {
      id: workflow.id,
      sessionId: workflow.sessionId,
      type: workflow.type,
      status: workflow.status,
      currentStep: workflow.currentStep,
      totalSteps: workflow.steps.length,
      progress: Math.round(progress),
      duration: duration,
      efficiency: workflow.data.efficiency || null,
      
      // Step breakdown
      stepHistory: workflow.history.map(h => ({
        step: h.stepName,
        tool: h.tool,
        duration: h.duration,
        timestamp: h.timestamp
      })),
      
      // Current step info
      currentStepInfo: this.getCurrentStepInfo(sessionId),
      nextStepInfo: this.getNextStepInfo(sessionId),
      
      // Performance metrics
      averageStepDuration: workflow.history.length > 0 ? 
        workflow.history.reduce((sum, h) => sum + h.duration, 0) / workflow.history.length : 0,
        
      // Timestamps
      startTime: workflow.data.startTime,
      lastActivity: workflow.lastActivity,
      
      // Additional data
      userId: workflow.data.userId,
      originalMessage: workflow.data.originalMessage
    };
  }

  /**
   * Get workflow summary for multiple sessions
   */
  getWorkflowsSummary() {
    const summary = {
      total: this.workflows.size,
      active: 0,
      completed: 0,
      cancelled: 0,
      error: 0,
      byType: {},
      oldestWorkflow: null,
      newestWorkflow: null
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    for (const [sessionId, workflow] of this.workflows.entries()) {
      // Count by status
      summary[workflow.status]++;
      
      // Count by type
      if (!summary.byType[workflow.type]) {
        summary.byType[workflow.type] = { total: 0, active: 0, completed: 0, cancelled: 0, error: 0 };
      }
      summary.byType[workflow.type].total++;
      summary.byType[workflow.type][workflow.status]++;
      
      // Track oldest and newest
      if (workflow.data.startTime < oldestTime) {
        oldestTime = workflow.data.startTime;
        summary.oldestWorkflow = {
          sessionId,
          type: workflow.type,
          age: Date.now() - workflow.data.startTime
        };
      }
      
      if (workflow.data.startTime > newestTime) {
        newestTime = workflow.data.startTime;
        summary.newestWorkflow = {
          sessionId,
          type: workflow.type,
          age: Date.now() - workflow.data.startTime
        };
      }
    }

    return summary;
  }

  /**
   * Start cleanup timer for old workflows
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupOldWorkflows();
    }, this.cleanupInterval);
    
    this.log("🧹 Cleanup timer started");
  }

  /**
   * Cleanup old workflows
   */
  cleanupOldWorkflows() {
    const now = Date.now();
    let cleanedCount = 0;
    const beforeSize = this.workflows.size;

    // Clean by age
    for (const [sessionId, workflow] of this.workflows.entries()) {
      const age = now - workflow.lastActivity;
      
      if (age > this.maxAge) {
        this.workflows.delete(sessionId);
        cleanedCount++;
      }
    }

    // Clean by size if still too many
    if (this.workflows.size > this.maxWorkflows) {
      const workflowsByAge = Array.from(this.workflows.entries())
        .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
      
      const toRemove = this.workflows.size - this.maxWorkflows;
      for (let i = 0; i < toRemove; i++) {
        const [sessionId] = workflowsByAge[i];
        this.workflows.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.log(`🧹 Cleaned up ${cleanedCount} workflows (${beforeSize} → ${this.workflows.size})`);
    }
  }

  /**
   * Get all active workflows (for monitoring)
   */
  getActiveWorkflows() {
    const active = [];
    for (const [sessionId, workflow] of this.workflows.entries()) {
      if (workflow.status === 'active') {
        active.push({
          sessionId,
          type: workflow.type,
          currentStep: workflow.currentStep,
          totalSteps: workflow.steps.length,
          progress: Math.round((workflow.currentStep / workflow.steps.length) * 100),
          duration: Date.now() - workflow.data.startTime,
          lastActivity: workflow.lastActivity,
          userId: workflow.data.userId
        });
      }
    }
    return active.sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /**
   * Force cleanup all workflows (for testing/reset)
   */
  clearAllWorkflows() {
    const count = this.workflows.size;
    this.workflows.clear();
    this.log(`🧹 Cleared all workflows (${count} removed)`);
    return count;
  }

  /**
   * Get detailed workflow info for debugging
   */
  getWorkflowDetails(sessionId) {
    const workflow = this.workflows.get(sessionId);
    if (!workflow) return null;

    return {
      ...workflow,
      analytics: this.getWorkflowAnalytics(sessionId)
    };
  }
}

module.exports = WorkflowStateManager;
