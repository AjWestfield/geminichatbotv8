import { StateGraph, START, END } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { MCPToolsContext } from "@/lib/mcp/mcp-tools-context";
import { 
  AgentState, 
  AgentStateType,
  createInitialAgentState,
  updateWorkflowProgress,
  addWorkflowResult,
  setWorkflowError,
  completeWorkflow
} from "./agent-state";

/**
 * Task Executor using LangGraph.js
 * 
 * This module implements a robust task execution system using LangGraph.js
 * StateGraph patterns for systematic multi-step workflow execution.
 */

export interface TaskExecutorConfig {
  model?: string;
  memory?: MemorySaver;
  maxRetries?: number;
  timeoutMs?: number;
  enableMCPTools?: boolean;
}

export class TaskExecutor {
  private graph: ReturnType<typeof StateGraph.prototype.compile>;
  private memory: MemorySaver;
  private config: TaskExecutorConfig;

  constructor(config: TaskExecutorConfig = {}) {
    this.config = {
      model: 'gemini-2.0-flash',
      maxRetries: 3,
      timeoutMs: 300000, // 5 minutes
      enableMCPTools: true,
      ...config
    };
    
    this.memory = config.memory || new MemorySaver();
    this.graph = this.buildWorkflow();
  }

  /**
   * Builds the LangGraph workflow for task execution
   */
  private buildWorkflow() {
    const workflow = new StateGraph(AgentState)
      // Core workflow nodes
      .addNode("planner", this.planStep.bind(this))
      .addNode("executor", this.executeStep.bind(this))
      .addNode("validator", this.validateStep.bind(this))
      .addNode("finalizer", this.finalizeStep.bind(this))
      
      // Error handling and recovery
      .addNode("error_handler", this.handleError.bind(this))
      .addNode("retry_step", this.retryStep.bind(this))
      
      // MCP tool integration
      .addNode("mcp_tool_executor", this.executeMCPTool.bind(this))
      
      // Define edges
      .addEdge(START, "planner")
      .addEdge("planner", "executor")
      .addConditionalEdges(
        "executor",
        this.shouldContinueExecution.bind(this),
        {
          "continue": "validator",
          "tool_call": "mcp_tool_executor", 
          "error": "error_handler",
          "complete": "finalizer"
        }
      )
      .addConditionalEdges(
        "validator",
        this.shouldRetryOrContinue.bind(this),
        {
          "continue": "executor",
          "retry": "retry_step",
          "complete": "finalizer",
          "error": "error_handler"
        }
      )
      .addEdge("mcp_tool_executor", "executor")
      .addEdge("retry_step", "executor")
      .addEdge("error_handler", END)
      .addEdge("finalizer", END);

    return workflow.compile({
      checkpointer: this.memory,
    });
  }

  /**
   * Planning step: Breaks down the task into actionable steps
   */
  private async planStep(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log("[TaskExecutor] Planning step started");
    
    try {
      // Create planning prompt
      const planningPrompt = `
You are an expert task planner. Break down the following request into specific, actionable steps:

Request: ${state.originalRequest}

Create a detailed plan with the following format:
1. First specific action step
2. Second specific action step  
3. Continue until complete

Each step should be:
- Concrete and actionable
- Include specific tools or actions needed
- Build upon previous steps
- Lead towards completing the original request

Provide ONLY the numbered plan, no additional commentary.`;

      const planningMessage = new SystemMessage({ content: planningPrompt });
      const userMessage = new HumanMessage({ content: state.originalRequest });
      
      // For now, create a simple plan structure
      // In a full implementation, this would use an LLM to generate the plan
      const simplePlan = [
        "Analyze the user's request and identify required actions",
        "Execute the primary task using available tools",
        "Validate the results and ensure completion",
        "Provide final response to user"
      ];
      
      return {
        messages: [planningMessage, userMessage],
        taskContext: { 
          plan: simplePlan,
          planningCompleted: true 
        },
        totalSteps: simplePlan.length,
        currentStep: 1,
        status: 'in_progress',
        next: "executor"
      };
      
    } catch (error) {
      console.error("[TaskExecutor] Planning failed:", error);
      return setWorkflowError(`Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execution step: Executes the current task step
   */
  private async executeStep(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log(`[TaskExecutor] Executing step ${state.currentStep}/${state.totalSteps}`);
    
    try {
      const plan = state.taskContext.plan as string[] || [];
      const currentStepDescription = plan[state.currentStep - 1];
      
      if (!currentStepDescription) {
        return completeWorkflow("All planned steps completed");
      }
      
      // Update current task
      const updates: Partial<AgentStateType> = {
        currentTask: currentStepDescription,
      };
      
      // Check if this step requires MCP tools
      if (this.requiresMCPTools(currentStepDescription)) {
        updates.next = "tool_call";
      } else {
        // Execute the step directly
        const stepResult = await this.executeDirectStep(currentStepDescription, state);
        updates.results = { ...state.results, [`step_${state.currentStep}`]: stepResult };
        updates.next = "continue";
      }
      
      return updates;
      
    } catch (error) {
      console.error("[TaskExecutor] Execution failed:", error);
      return setWorkflowError(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validation step: Validates the results of the current step
   */
  private async validateStep(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log(`[TaskExecutor] Validating step ${state.currentStep}`);
    
    try {
      const stepResult = state.results[`step_${state.currentStep}`];
      
      // Simple validation - check if step produced a result
      if (stepResult && stepResult !== null) {
        // Step completed successfully, move to next
        const nextStep = state.currentStep + 1;
        
        if (nextStep > state.totalSteps) {
          return completeWorkflow(state.results);
        } else {
          return updateWorkflowProgress(state, nextStep, state.totalSteps, 'in_progress');
        }
      } else {
        // Step needs retry
        return {
          next: "retry",
          taskContext: { 
            ...state.taskContext, 
            retryCount: (state.taskContext.retryCount || 0) + 1 
          }
        };
      }
      
    } catch (error) {
      console.error("[TaskExecutor] Validation failed:", error);
      return setWorkflowError(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finalizer step: Completes the workflow and prepares final response
   */
  private async finalizeStep(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log("[TaskExecutor] Finalizing workflow");
    
    try {
      // Compile final response from all step results
      const finalResponse = this.compileFinalResponse(state);
      
      return {
        status: 'completed',
        next: "end",
        results: { ...state.results, finalResponse },
        messages: [...state.messages, new AIMessage({ content: finalResponse })]
      };
      
    } catch (error) {
      console.error("[TaskExecutor] Finalization failed:", error);
      return setWorkflowError(`Finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Error handler: Handles workflow errors and decides on recovery strategy
   */
  private async handleError(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log("[TaskExecutor] Handling error:", state.error);
    
    const retryCount = state.taskContext.retryCount || 0;
    
    if (retryCount < this.config.maxRetries!) {
      return {
        status: 'in_progress',
        error: null,
        next: "retry",
        taskContext: { ...state.taskContext, retryCount: retryCount + 1 }
      };
    } else {
      return {
        status: 'failed',
        next: "end",
        messages: [
          ...state.messages, 
          new AIMessage({ 
            content: `Workflow failed after ${this.config.maxRetries} retries: ${state.error}` 
          })
        ]
      };
    }
  }

  /**
   * Retry step: Prepares for retrying a failed step
   */
  private async retryStep(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log(`[TaskExecutor] Retrying step ${state.currentStep}, attempt ${state.taskContext.retryCount}`);
    
    return {
      status: 'in_progress',
      error: null,
      next: "continue"
    };
  }

  /**
   * MCP tool executor: Executes MCP tools
   */
  private async executeMCPTool(
    state: AgentStateType,
    config?: RunnableConfig
  ): Promise<Partial<AgentStateType>> {
    console.log("[TaskExecutor] Executing MCP tool");
    
    try {
      if (!this.config.enableMCPTools) {
        throw new Error("MCP tools are disabled");
      }
      
      // Get available tools
      const toolsContext = await MCPToolsContext.getAvailableTools();
      
      if (toolsContext.tools.length === 0) {
        throw new Error("No MCP tools available");
      }
      
      // For now, return success - full MCP integration would be implemented here
      const toolResult = {
        success: true,
        message: "MCP tool execution placeholder",
        timestamp: new Date().toISOString()
      };
      
      return addWorkflowResult(state, `step_${state.currentStep}_tool`, toolResult);
      
    } catch (error) {
      console.error("[TaskExecutor] MCP tool execution failed:", error);
      return setWorkflowError(`MCP tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decision function for continuing execution
   */
  private shouldContinueExecution(state: AgentStateType): string {
    if (state.error) return "error";
    if (state.next === "tool_call") return "tool_call";
    if (state.currentStep > state.totalSteps) return "complete";
    return "continue";
  }

  /**
   * Decision function for retry or continue logic
   */
  private shouldRetryOrContinue(state: AgentStateType): string {
    if (state.error) return "error";
    if (state.next === "retry") return "retry";
    if (state.currentStep > state.totalSteps) return "complete";
    return "continue";
  }

  /**
   * Utility functions
   */

  private requiresMCPTools(stepDescription: string): boolean {
    const mcpKeywords = ['todo', 'task', 'file', 'search', 'fetch', 'api', 'server'];
    return mcpKeywords.some(keyword => 
      stepDescription.toLowerCase().includes(keyword)
    );
  }

  private async executeDirectStep(stepDescription: string, state: AgentStateType): Promise<any> {
    // Simple step execution - in a full implementation this would use LLMs
    return {
      description: stepDescription,
      completed: true,
      timestamp: new Date().toISOString(),
      result: `Executed: ${stepDescription}`
    };
  }

  private compileFinalResponse(state: AgentStateType): string {
    const stepResults = Object.entries(state.results)
      .filter(([key]) => key.startsWith('step_'))
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');
    
    return `Workflow completed successfully!\n\nOriginal request: ${state.originalRequest}\n\nSteps executed:\n${stepResults}`;
  }

  /**
   * Public API
   */

  /**
   * Executes a task using the LangGraph workflow
   */
  async executeTask(
    input: string,
    config: RunnableConfig = {}
  ): Promise<AgentStateType> {
    console.log("[TaskExecutor] Starting task execution:", input);
    
    const initialState = createInitialAgentState(input);
    
    try {
      const result = await this.graph.invoke(initialState, {
        ...config,
        configurable: {
          thread_id: config.configurable?.thread_id || `task_${Date.now()}`,
        }
      });
      
      console.log("[TaskExecutor] Task execution completed");
      return result;
      
    } catch (error) {
      console.error("[TaskExecutor] Task execution failed:", error);
      throw error;
    }
  }

  /**
   * Streams task execution with real-time updates
   */
  async *streamTask(
    input: string,
    config: RunnableConfig = {}
  ): AsyncGenerator<AgentStateType, void, unknown> {
    console.log("[TaskExecutor] Starting streamed task execution:", input);
    
    const initialState = createInitialAgentState(input);
    
    try {
      for await (const step of await this.graph.stream(initialState, {
        ...config,
        configurable: {
          thread_id: config.configurable?.thread_id || `task_${Date.now()}`,
        }
      })) {
        yield step;
      }
      
    } catch (error) {
      console.error("[TaskExecutor] Streamed task execution failed:", error);
      
      // Provide detailed error context
      if (error instanceof Error) {
        console.error("[TaskExecutor] Error details:", {
          message: error.message,
          stack: error.stack,
          graphInitialized: !!this.graph,
          configEnabled: this.config.enableMCPTools
        });
      }
      
      // Yield error state instead of throwing to allow graceful handling
      yield {
        input,
        status: 'failed',
        currentStep: 0,
        totalSteps: 1,
        error: error instanceof Error ? error.message : 'Unknown streaming error',
        messages: [{
          role: 'assistant',
          content: `Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        results: [],
        metadata: {
          startTime: Date.now(),
          endTime: Date.now(),
          errorOccurred: true
        }
      };
    }
  }

  /**
   * Gets the current state of a workflow by thread ID
   */
  async getWorkflowState(threadId: string): Promise<AgentStateType | null> {
    try {
      const state = await this.graph.getState({
        configurable: { thread_id: threadId }
      });
      return state.values;
    } catch (error) {
      console.error("[TaskExecutor] Failed to get workflow state:", error);
      return null;
    }
  }
}

// Export factory function for easy instantiation
export function createTaskExecutor(config?: TaskExecutorConfig): TaskExecutor {
  return new TaskExecutor(config);
}

// Export default instance
export const defaultTaskExecutor = createTaskExecutor();