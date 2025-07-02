import { StateGraph, START, END, Command } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { TaskExecutor, TaskExecutorConfig } from "./task-executor";
import { 
  AgentState, 
  SupervisorState,
  PlanExecuteState,
  AgentStateType,
  SupervisorStateType,
  createInitialAgentState,
  createInitialSupervisorState,
  createInitialPlanExecuteState
} from "./agent-state";
import { MCPToolsContext } from "@/lib/mcp/mcp-tools-context";
import { processMessageForMCPSync } from "@/lib/mcp-ui-bridge";

/**
 * Comprehensive Workflow Manager
 * 
 * This module provides a high-level interface for managing complex 
 * multi-step workflows using LangGraph.js patterns. It integrates
 * with the existing MCP tools and UI components.
 */

export interface WorkflowConfig {
  model?: string;
  memory?: MemorySaver;
  enableMCPSync?: boolean;
  maxConcurrentWorkflows?: number;
  defaultTimeout?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  type: 'sequential' | 'parallel' | 'conditional';
  estimatedDuration?: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'llm_call' | 'tool_call' | 'validation' | 'user_input' | 'conditional';
  parameters?: Record<string, any>;
  dependencies?: string[];
  retryable?: boolean;
  timeout?: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  totalSteps: number;
  startTime: Date;
  endTime?: Date;
  results: Record<string, any>;
  error?: string;
  threadId: string;
}

export class WorkflowManager {
  private config: WorkflowConfig;
  private memory: MemorySaver;
  private executions: Map<string, WorkflowExecution> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private taskExecutor: TaskExecutor;

  constructor(config: WorkflowConfig = {}) {
    this.config = {
      model: 'gemini-2.0-flash',
      enableMCPSync: true,
      maxConcurrentWorkflows: 10,
      defaultTimeout: 300000, // 5 minutes
      ...config
    };
    
    this.memory = config.memory || new MemorySaver();
    this.taskExecutor = new TaskExecutor({
      model: this.config.model,
      memory: this.memory,
      enableMCPTools: this.config.enableMCPSync
    });
    
    this.initializeBuiltInWorkflows();
  }

  /**
   * Initialize built-in workflow definitions
   */
  private initializeBuiltInWorkflows() {
    // Complex task workflow
    this.registerWorkflow({
      id: 'complex_task',
      name: 'Complex Task Execution',
      description: 'Systematic execution of multi-step tasks with MCP tools',
      type: 'sequential',
      estimatedDuration: 120000, // 2 minutes
      steps: [
        {
          id: 'analyze',
          name: 'Task Analysis',
          description: 'Analyze the user request and identify required steps',
          type: 'llm_call',
          retryable: true
        },
        {
          id: 'plan',
          name: 'Create Action Plan',
          description: 'Generate detailed action plan with TodoWrite',
          type: 'tool_call',
          parameters: { tool: 'TodoWrite' },
          retryable: true
        },
        {
          id: 'execute',
          name: 'Execute Tasks',
          description: 'Execute planned tasks systematically',
          type: 'tool_call',
          dependencies: ['plan'],
          retryable: true
        },
        {
          id: 'validate',
          name: 'Validate Results',
          description: 'Ensure all tasks completed successfully',
          type: 'validation',
          dependencies: ['execute'],
          retryable: false
        }
      ]
    });

    // Content generation workflow
    this.registerWorkflow({
      id: 'content_generation',
      name: 'Content Generation',
      description: 'Multi-modal content generation (images, videos, audio)',
      type: 'conditional',
      estimatedDuration: 180000, // 3 minutes
      steps: [
        {
          id: 'detect_type',
          name: 'Detect Content Type',
          description: 'Determine what type of content to generate',
          type: 'llm_call',
          retryable: true
        },
        {
          id: 'generate_content',
          name: 'Generate Content',
          description: 'Generate the requested content',
          type: 'tool_call',
          dependencies: ['detect_type'],
          retryable: true
        },
        {
          id: 'post_process',
          name: 'Post-process Results',
          description: 'Enhance and validate generated content',
          type: 'validation',
          dependencies: ['generate_content'],
          retryable: false
        }
      ]
    });

    // MCP server setup workflow
    this.registerWorkflow({
      id: 'mcp_setup',
      name: 'MCP Server Setup',
      description: 'Add and configure new MCP servers',
      type: 'sequential',
      estimatedDuration: 90000, // 1.5 minutes
      steps: [
        {
          id: 'research',
          name: 'Research Server',
          description: 'Find information about the requested MCP server',
          type: 'tool_call',
          parameters: { tool: 'web_search' },
          retryable: true
        },
        {
          id: 'configure',
          name: 'Configure Server',
          description: 'Add server configuration to mcp.config.json',
          type: 'tool_call',
          dependencies: ['research'],
          retryable: true
        },
        {
          id: 'test',
          name: 'Test Connection',
          description: 'Verify the server is working correctly',
          type: 'validation',
          dependencies: ['configure'],
          retryable: true
        }
      ]
    });
  }

  /**
   * Detects if a user request should trigger a workflow
   */
  detectWorkflow(input: string): WorkflowDefinition | null {
    const lowerInput = input.toLowerCase();
    
    // Complex task patterns
    if (this.isComplexTask(lowerInput)) {
      return this.workflows.get('complex_task') || null;
    }
    
    // Content generation patterns
    if (this.isContentGeneration(lowerInput)) {
      return this.workflows.get('content_generation') || null;
    }
    
    // MCP setup patterns
    if (this.isMCPSetup(lowerInput)) {
      return this.workflows.get('mcp_setup') || null;
    }
    
    return null;
  }

  /**
   * Executes a workflow for the given input
   */
  async executeWorkflow(
    input: string,
    workflowId?: string,
    config: RunnableConfig = {}
  ): Promise<WorkflowExecution> {
    let workflow: WorkflowDefinition | null = null;
    
    if (workflowId) {
      workflow = this.workflows.get(workflowId) || null;
    } else {
      workflow = this.detectWorkflow(input);
    }
    
    if (!workflow) {
      // Fallback to basic task execution
      const result = await this.taskExecutor.executeTask(input, config);
      return this.createBasicExecution(input, result);
    }
    
    // Create execution record
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: workflow.id,
      status: 'running',
      currentStep: 0,
      totalSteps: workflow.steps.length,
      startTime: new Date(),
      results: {},
      threadId: config.configurable?.thread_id || `workflow_${Date.now()}`
    };
    
    this.executions.set(execution.id, execution);
    
    try {
      // Build dynamic workflow graph
      const workflowGraph = this.buildWorkflowGraph(workflow);
      
      // Execute the workflow
      const initialState = this.createInitialState(workflow, input);
      const result = await workflowGraph.invoke(initialState, {
        ...config,
        configurable: {
          thread_id: execution.threadId,
        }
      });
      
      // Update execution record
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.results = result.results || {};
      
      // Sync with MCP if enabled
      if (this.config.enableMCPSync) {
        processMessageForMCPSync(JSON.stringify(result), execution.threadId);
      }
      
      return execution;
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`[WorkflowManager] Workflow ${workflow.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Streams workflow execution with real-time updates
   */
  async *streamWorkflow(
    input: string,
    workflowId?: string,
    config: RunnableConfig = {}
  ): AsyncGenerator<{ execution: WorkflowExecution; state?: any }, void, unknown> {
    let workflow: WorkflowDefinition | null = null;
    
    if (workflowId) {
      workflow = this.workflows.get(workflowId) || null;
    } else {
      workflow = this.detectWorkflow(input);
    }
    
    if (!workflow) {
      // Fallback to basic task execution
      for await (const state of this.taskExecutor.streamTask(input, config)) {
        const execution = this.createBasicExecution(input, state);
        yield { execution, state };
      }
      return;
    }
    
    // Create execution record
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId: workflow.id,
      status: 'running',
      currentStep: 0,
      totalSteps: workflow.steps.length,
      startTime: new Date(),
      results: {},
      threadId: config.configurable?.thread_id || `workflow_${Date.now()}`
    };
    
    this.executions.set(execution.id, execution);
    
    try {
      // Build dynamic workflow graph
      const workflowGraph = this.buildWorkflowGraph(workflow);
      
      // Stream the workflow execution
      const initialState = this.createInitialState(workflow, input);
      
      for await (const step of await workflowGraph.stream(initialState, {
        ...config,
        configurable: {
          thread_id: execution.threadId,
        }
      })) {
        // Update execution progress
        if (step.currentStep) {
          execution.currentStep = step.currentStep;
        }
        if (step.status) {
          execution.status = step.status;
        }
        if (step.results) {
          execution.results = { ...execution.results, ...step.results };
        }
        
        yield { execution: { ...execution }, state: step };
      }
      
      // Final update
      execution.status = 'completed';
      execution.endTime = new Date();
      
      // Sync with MCP if enabled
      if (this.config.enableMCPSync) {
        processMessageForMCPSync(JSON.stringify(execution.results), execution.threadId);
      }
      
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`[WorkflowManager] Workflow ${workflow.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Registers a new workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    console.log(`[WorkflowManager] Registered workflow: ${workflow.name}`);
  }

  /**
   * Gets all available workflows
   */
  getAvailableWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Gets execution status
   */
  getExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) || null;
  }

  /**
   * Gets all executions
   */
  getAllExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Utility methods
   */

  private isComplexTask(input: string): boolean {
    const complexPatterns = [
      /add.*mcp.*server/i,
      /set.*up.*server/i,
      /install.*configure/i,
      /multi.*step/i,
      /complex.*task/i,
      /help.*me.*with/i,
      /need.*to.*do/i,
      /please.*help/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(input)) ||
           input.split(' ').length > 10; // Long requests are likely complex
  }

  private isContentGeneration(input: string): boolean {
    const contentPatterns = [
      /generate.*image/i,
      /create.*video/i,
      /make.*audio/i,
      /produce.*content/i,
      /draw.*picture/i,
      /create.*animation/i
    ];
    
    return contentPatterns.some(pattern => pattern.test(input));
  }

  private isMCPSetup(input: string): boolean {
    const mcpPatterns = [
      /add.*mcp.*server/i,
      /install.*mcp/i,
      /configure.*server/i,
      /setup.*mcp/i,
      /github.*mcp/i,
      /filesystem.*mcp/i
    ];
    
    return mcpPatterns.some(pattern => pattern.test(input));
  }

  private buildWorkflowGraph(workflow: WorkflowDefinition) {
    // This would build a dynamic StateGraph based on the workflow definition
    // For now, return the basic task executor graph
    return this.taskExecutor['graph'];
  }

  private createInitialState(workflow: WorkflowDefinition, input: string) {
    return createInitialAgentState(input);
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createBasicExecution(input: string, result: any): WorkflowExecution {
    return {
      id: this.generateExecutionId(),
      workflowId: 'basic_task',
      status: result.status || 'completed',
      currentStep: result.currentStep || 1,
      totalSteps: result.totalSteps || 1,
      startTime: new Date(),
      endTime: new Date(),
      results: result.results || { output: result },
      threadId: `basic_${Date.now()}`
    };
  }
}

// Export factory function
export function createWorkflowManager(config?: WorkflowConfig): WorkflowManager {
  return new WorkflowManager(config);
}

// Export default instance
export const defaultWorkflowManager = createWorkflowManager();