import { RunnableConfig } from "@langchain/core/runnables";
import { MemorySaver } from "@langchain/langgraph";
import { WorkflowManager, WorkflowExecution } from "./workflow-manager";
import { SupervisorAgentSystem } from "./supervisor-agents";
import { TaskExecutor } from "./task-executor";
import { processMessageForMCPSync } from "@/lib/mcp-ui-bridge";
import { AgentStateType, SupervisorStateType } from "./agent-state";

/**
 * Agentic Workflow Orchestrator
 * 
 * Main orchestrator that coordinates all workflow systems and provides
 * a unified interface for complex agentic task execution.
 */

export interface OrchestrationConfig {
  model?: string;
  memory?: MemorySaver;
  enableSupervisorMode?: boolean;
  enableMCPSync?: boolean;
  enableUI?: boolean;
  maxConcurrentTasks?: number;
  planOnly?: boolean;
}

export interface OrchestrationResult {
  type: 'simple' | 'workflow' | 'supervisor';
  executionId: string;
  status: 'completed' | 'failed' | 'running';
  result: any;
  finalMessage: string;
  steps?: number;
  duration?: number;
  error?: string;
}

export class AgenticWorkflowOrchestrator {
  private config: OrchestrationConfig;
  private memory: MemorySaver;
  private workflowManager: WorkflowManager;
  private supervisorSystem: SupervisorAgentSystem;
  private taskExecutor: TaskExecutor;
  private activeExecutions: Map<string, any> = new Map();

  constructor(config: OrchestrationConfig = {}) {
    this.config = {
      model: 'gemini-2.0-flash',
      enableSupervisorMode: true,
      enableMCPSync: true,
      enableUI: true,
      maxConcurrentTasks: 5,
      ...config
    };

    this.memory = config.memory || new MemorySaver();
    
    // Initialize all systems
    this.workflowManager = new WorkflowManager({
      model: this.config.model,
      memory: this.memory,
      enableMCPSync: this.config.enableMCPSync
    });

    this.supervisorSystem = new SupervisorAgentSystem({
      model: this.config.model,
      memory: this.memory
    });

    this.taskExecutor = new TaskExecutor({
      model: this.config.model,
      memory: this.memory,
      enableMCPTools: this.config.enableMCPSync
    });
  }

  /**
   * Main execution method - intelligently routes to appropriate system
   */
  async execute(
    input: string,
    config: RunnableConfig = {}
  ): Promise<OrchestrationResult> {
    console.log("[Orchestrator] Starting execution:", input);
    const startTime = Date.now();

    try {
      // Check if we're in planning-only mode
      if (this.config.planOnly) {
        return await this.planWorkflow(input, config);
      }

      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(input);
      console.log(`[Orchestrator] Using strategy: ${strategy}`);

      let result: OrchestrationResult;

      switch (strategy) {
        case 'supervisor':
          result = await this.executeSupervisorWorkflow(input, config);
          break;
          
        case 'workflow':
          result = await this.executeWorkflow(input, config);
          break;
          
        case 'simple':
        default:
          result = await this.executeSimpleTask(input, config);
          break;
      }

      // Calculate duration
      result.duration = Date.now() - startTime;
      
      // Sync with MCP and UI if enabled
      if (this.config.enableMCPSync || this.config.enableUI) {
        await this.syncWithUI(result, config);
      }

      console.log(`[Orchestrator] Execution completed in ${result.duration}ms`);
      return result;

    } catch (error) {
      console.error("[Orchestrator] Execution failed:", error);
      
      return {
        type: 'simple',
        executionId: this.generateExecutionId(),
        status: 'failed',
        result: null,
        finalMessage: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Streaming execution with real-time updates
   */
  async *stream(
    input: string,
    config: RunnableConfig = {}
  ): AsyncGenerator<{ result: OrchestrationResult; state?: any }, void, unknown> {
    console.log("[Orchestrator] Starting streaming execution:", input);
    const startTime = Date.now();

    try {
      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(input);
      console.log(`[Orchestrator] Using streaming strategy: ${strategy}`);

      const executionId = this.generateExecutionId();

      switch (strategy) {
        case 'supervisor':
          yield* this.streamSupervisorWorkflow(input, executionId, config);
          break;
          
        case 'workflow':
          yield* this.streamWorkflow(input, executionId, config);
          break;
          
        case 'simple':
        default:
          yield* this.streamSimpleTask(input, executionId, config);
          break;
      }

    } catch (error) {
      console.error("[Orchestrator] Streaming execution failed:", error);
      
      yield {
        result: {
          type: 'simple',
          executionId: this.generateExecutionId(),
          status: 'failed',
          result: null,
          finalMessage: `Streaming execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Determines the best execution strategy for the input
   */
  private determineExecutionStrategy(input: string): 'simple' | 'workflow' | 'supervisor' {
    const lowerInput = input.toLowerCase();
    
    // Check for complex multi-agent scenarios
    if (this.config.enableSupervisorMode && this.requiresMultipleAgents(lowerInput)) {
      return 'supervisor';
    }
    
    // Check for structured workflow scenarios
    if (this.requiresStructuredWorkflow(lowerInput)) {
      return 'workflow';
    }
    
    // Default to simple execution
    return 'simple';
  }

  /**
   * Strategy implementations
   */

  private async executeSupervisorWorkflow(
    input: string,
    config: RunnableConfig
  ): Promise<OrchestrationResult> {
    const result = await this.supervisorSystem.executeWithSupervisor(input, undefined, config);
    
    return {
      type: 'supervisor',
      executionId: config.configurable?.thread_id || this.generateExecutionId(),
      status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'running',
      result: result.results,
      finalMessage: this.extractFinalMessage(result.messages),
      steps: result.currentStep,
      error: result.error || undefined
    };
  }

  private async executeWorkflow(
    input: string,
    config: RunnableConfig
  ): Promise<OrchestrationResult> {
    const execution = await this.workflowManager.executeWorkflow(input, undefined, config);
    
    return {
      type: 'workflow',
      executionId: execution.id,
      status: execution.status === 'completed' ? 'completed' : execution.status === 'failed' ? 'failed' : 'running',
      result: execution.results,
      finalMessage: this.extractWorkflowMessage(execution),
      steps: execution.totalSteps,
      error: execution.error
    };
  }

  private async executeSimpleTask(
    input: string,
    config: RunnableConfig
  ): Promise<OrchestrationResult> {
    const result = await this.taskExecutor.executeTask(input, config);
    
    return {
      type: 'simple',
      executionId: config.configurable?.thread_id || this.generateExecutionId(),
      status: result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'running',
      result: result.results,
      finalMessage: this.extractFinalMessage(result.messages),
      steps: result.totalSteps,
      error: result.error || undefined
    };
  }

  /**
   * Streaming implementations
   */

  private async *streamSupervisorWorkflow(
    input: string,
    executionId: string,
    config: RunnableConfig
  ): AsyncGenerator<{ result: OrchestrationResult; state?: any }, void, unknown> {
    for await (const step of this.supervisorSystem.streamWithSupervisor(input, undefined, config)) {
      const result: OrchestrationResult = {
        type: 'supervisor',
        executionId,
        status: step.status === 'completed' ? 'completed' : step.status === 'failed' ? 'failed' : 'running',
        result: step.results,
        finalMessage: this.extractFinalMessage(step.messages),
        steps: step.currentStep,
        error: step.error || undefined
      };
      
      yield { result, state: step };
      
      // Sync with UI in real-time
      if (this.config.enableMCPSync || this.config.enableUI) {
        await this.syncWithUI(result, config);
      }
    }
  }

  private async *streamWorkflow(
    input: string,
    executionId: string,
    config: RunnableConfig
  ): AsyncGenerator<{ result: OrchestrationResult; state?: any }, void, unknown> {
    for await (const step of this.workflowManager.streamWorkflow(input, undefined, config)) {
      const result: OrchestrationResult = {
        type: 'workflow',
        executionId: step.execution.id,
        status: step.execution.status === 'completed' ? 'completed' : step.execution.status === 'failed' ? 'failed' : 'running',
        result: step.execution.results,
        finalMessage: this.extractWorkflowMessage(step.execution),
        steps: step.execution.totalSteps,
        error: step.execution.error
      };
      
      yield { result, state: step.state };
      
      // Sync with UI in real-time
      if (this.config.enableMCPSync || this.config.enableUI) {
        await this.syncWithUI(result, config);
      }
    }
  }

  private async *streamSimpleTask(
    input: string,
    executionId: string,
    config: RunnableConfig
  ): AsyncGenerator<{ result: OrchestrationResult; state?: any }, void, unknown> {
    for await (const step of this.taskExecutor.streamTask(input, config)) {
      const result: OrchestrationResult = {
        type: 'simple',
        executionId,
        status: step.status === 'completed' ? 'completed' : step.status === 'failed' ? 'failed' : 'running',
        result: step.results,
        finalMessage: this.extractFinalMessage(step.messages),
        steps: step.totalSteps,
        error: step.error || undefined
      };
      
      yield { result, state: step };
      
      // Sync with UI in real-time
      if (this.config.enableMCPSync || this.config.enableUI) {
        await this.syncWithUI(result, config);
      }
    }
  }

  /**
   * Planning-only workflow that creates tasks without execution
   */
  private async planWorkflow(
    input: string,
    config: RunnableConfig
  ): Promise<OrchestrationResult> {
    console.log("[Orchestrator] Planning workflow (no execution):", input);
    const startTime = Date.now();
    
    try {
      // Create a planning message that instructs to create tasks only
      const planningPrompt = `You are in PLANNING MODE. Create a detailed task plan for the following request, but DO NOT execute any tasks. Only use TodoWrite to create the task list:

${input}

IMPORTANT: 
1. Create ALL tasks needed for this request using TodoWrite
2. Set task status to 'pending' 
3. Do NOT execute any actions - just plan
4. After creating tasks, respond with "Tasks created and awaiting approval."`;

      // Use simple task executor to create the plan
      const result = await this.taskExecutor.executeTask(planningPrompt, config);
      
      return {
        type: 'simple',
        executionId: config.configurable?.thread_id || this.generateExecutionId(),
        status: 'completed',
        result: result.results,
        finalMessage: "Tasks created and awaiting approval.",
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.error("[Orchestrator] Planning failed:", error);
      
      return {
        type: 'simple',
        executionId: this.generateExecutionId(),
        status: 'failed',
        result: null,
        finalMessage: `Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Utility methods
   */

  private requiresMultipleAgents(input: string): boolean {
    // Check for indicators of multi-agent needs
    const multiAgentPatterns = [
      /research.*and.*create/i,
      /find.*information.*then.*generate/i,
      /analyze.*then.*build/i,
      /complex.*multi.*step/i,
      /comprehensive.*analysis/i,
      /(image|video|audio).*and.*(research|search|analyze)/i,
      /setup.*and.*configure.*and.*test/i
    ];
    
    return multiAgentPatterns.some(pattern => pattern.test(input)) ||
           input.split(' ').length > 15; // Very long requests
  }

  private requiresStructuredWorkflow(input: string): boolean {
    // Check for indicators of structured workflow needs
    const workflowPatterns = [
      /step.*by.*step/i,
      /systematic.*approach/i,
      /structured.*process/i,
      /workflow/i,
      /process.*automation/i,
      /mcp.*server.*setup/i,
      /configuration.*management/i
    ];
    
    return workflowPatterns.some(pattern => pattern.test(input));
  }

  private extractFinalMessage(messages: any[]): string {
    if (!messages || messages.length === 0) {
      return "Task completed";
    }
    
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.content || "Task completed successfully";
  }

  private extractWorkflowMessage(execution: WorkflowExecution): string {
    if (execution.error) {
      return `Workflow failed: ${execution.error}`;
    }
    
    if (execution.status === 'completed') {
      return `Workflow completed successfully! Executed ${execution.totalSteps} steps.`;
    }
    
    return `Workflow running... Step ${execution.currentStep}/${execution.totalSteps}`;
  }

  private async syncWithUI(result: OrchestrationResult, config: RunnableConfig): Promise<void> {
    try {
      // Create a message that the UI parser can understand
      const syncMessage = this.createUISyncMessage(result);
      const threadId = config.configurable?.thread_id || result.executionId;
      
      processMessageForMCPSync(syncMessage, threadId);
      
    } catch (error) {
      console.error("[Orchestrator] Failed to sync with UI:", error);
    }
  }

  private createUISyncMessage(result: OrchestrationResult): string {
    // Create a message format that the enhanced parser can understand
    const tasks = this.createTasksFromResult(result);
    const statusMarkers = this.createStatusMarkers(result);
    
    return `[AGENT_PLAN]
${tasks.join('\n')}
[/AGENT_PLAN]

${statusMarkers}

Execution Type: ${result.type}
Status: ${result.status}
${result.finalMessage}`;
  }

  private createTasksFromResult(result: OrchestrationResult): string[] {
    const tasks = [];
    
    switch (result.type) {
      case 'supervisor':
        tasks.push(
          "1. Analyze user request with supervisor coordination",
          "2. Delegate to specialized worker agents",
          "3. Execute tasks with multi-agent collaboration",
          "4. Compile and validate final results"
        );
        break;
        
      case 'workflow':
        tasks.push(
          "1. Create structured execution plan",
          "2. Execute workflow steps systematically", 
          "3. Validate intermediate results",
          "4. Complete workflow and finalize output"
        );
        break;
        
      case 'simple':
      default:
        tasks.push(
          "1. Analyze user request",
          "2. Execute required actions",
          "3. Validate completion",
          "4. Provide final response"
        );
        break;
    }
    
    return tasks;
  }

  private createStatusMarkers(result: OrchestrationResult): string {
    const completedSteps = result.steps || 0;
    const markers = [];
    
    for (let i = 1; i <= 4; i++) {
      if (i <= completedSteps) {
        markers.push(`✅ Step ${i} completed`);
      } else if (i === completedSteps + 1 && result.status === 'running') {
        markers.push(`🔄 Step ${i} in progress`);
      }
    }
    
    return markers.join('\n');
  }

  private generateExecutionId(): string {
    return `orchestration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public API for external integration
   */

  /**
   * Gets available workflows
   */
  getAvailableWorkflows() {
    return this.workflowManager.getAvailableWorkflows();
  }

  /**
   * Gets available worker agents
   */
  getAvailableAgents() {
    return this.supervisorSystem.getAvailableWorkers();
  }

  /**
   * Gets execution status
   */
  getExecutionStatus(executionId: string) {
    return this.activeExecutions.get(executionId) || null;
  }

  /**
   * Configures the orchestrator
   */
  updateConfig(config: Partial<OrchestrationConfig>) {
    this.config = { ...this.config, ...config };
  }
}

// Export factory function
export function createOrchestrator(config?: OrchestrationConfig): AgenticWorkflowOrchestrator {
  return new AgenticWorkflowOrchestrator(config);
}

// Export default instance
export const defaultOrchestrator = createOrchestrator();