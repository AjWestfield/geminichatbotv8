import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Agent State Management for LangGraph.js Workflows
 * 
 * This module defines the state schemas and management functions for 
 * complex multi-step agentic workflows using LangGraph.js patterns.
 */

// Base agent state that includes message history and task tracking
export const AgentState = Annotation.Root({
  // Message conversation history
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  
  // Current task being executed
  currentTask: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  
  // Task execution context and metadata
  taskContext: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  
  // User's original request/input
  originalRequest: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  
  // Current workflow step
  currentStep: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  
  // Total number of steps in the workflow
  totalSteps: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  
  // Workflow execution status
  status: Annotation<'pending' | 'in_progress' | 'completed' | 'failed'>({
    reducer: (x, y) => y ?? x,
    default: () => 'pending',
  }),
  
  // Error information if workflow fails
  error: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  
  // Next action to take in the workflow
  next: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "start",
  }),
  
  // Intermediate results from workflow steps
  results: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  
  // MCP tools available for the workflow
  availableTools: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  
  // Generated todo tasks for tracking
  todoTasks: Annotation<Array<{
    id: string;
    content: string;
    status: string;
    priority: string;
  }>>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
});

// Multi-agent supervisor state for coordinating multiple agents
export const SupervisorState = Annotation.Root({
  ...AgentState.spec,
  
  // Active agent/worker name
  activeAgent: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "supervisor",
  }),
  
  // Available agents in the team
  teamMembers: Annotation<string[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  
  // Instructions for the current workflow
  instructions: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "Execute the user's request systematically.",
  }),
  
  // Handoff reason when switching between agents
  handoffReason: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

// Plan-Execute state for breaking down complex tasks
export const PlanExecuteState = Annotation.Root({
  // User's input/request
  input: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
  }),
  
  // Generated execution plan
  plan: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  
  // Completed steps with results
  pastSteps: Annotation<Array<[string, string]>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  
  // Final response
  response: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  
  // Current step being executed
  currentStepIndex: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  
  // Message history for plan execution
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// Tool execution state for MCP tool workflows
export const ToolExecutionState = Annotation.Root({
  // Tool call information
  toolCall: Annotation<{
    server: string;
    tool: string;
    arguments: Record<string, any>;
  } | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  
  // Tool execution result
  toolResult: Annotation<any>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  
  // Tool execution status
  toolStatus: Annotation<'pending' | 'executing' | 'completed' | 'failed'>({
    reducer: (x, y) => y ?? x,
    default: () => 'pending',
  }),
  
  // Tool execution error
  toolError: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
  
  // Message context for tool execution
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// State for document/content generation workflows
export const ContentGenerationState = Annotation.Root({
  // Content type (image, video, audio, text)
  contentType: Annotation<'image' | 'video' | 'audio' | 'text'>({
    reducer: (x, y) => y ?? x,
    default: () => 'text',
  }),
  
  // Generation prompt
  prompt: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  
  // Generation parameters
  parameters: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  
  // Generated content URLs/data
  generatedContent: Annotation<Array<{
    type: string;
    url: string;
    metadata: Record<string, any>;
  }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  
  // Generation status
  generationStatus: Annotation<'pending' | 'generating' | 'completed' | 'failed'>({
    reducer: (x, y) => y ?? x,
    default: () => 'pending',
  }),
  
  // Message history
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
});

// Utility functions for state management

/**
 * Creates initial state for a basic agent workflow
 */
export function createInitialAgentState(input: string): typeof AgentState.State {
  return {
    messages: [],
    currentTask: "",
    taskContext: {},
    originalRequest: input,
    currentStep: 0,
    totalSteps: 0,
    status: 'pending',
    error: null,
    next: "start",
    results: {},
    availableTools: [],
    todoTasks: [],
  };
}

/**
 * Creates initial state for supervisor workflows
 */
export function createInitialSupervisorState(
  input: string,
  teamMembers: string[]
): typeof SupervisorState.State {
  return {
    ...createInitialAgentState(input),
    activeAgent: "supervisor",
    teamMembers,
    instructions: "Execute the user's request systematically.",
    handoffReason: "",
  };
}

/**
 * Creates initial state for plan-execute workflows
 */
export function createInitialPlanExecuteState(input: string): typeof PlanExecuteState.State {
  return {
    input,
    plan: [],
    pastSteps: [],
    response: "",
    currentStepIndex: 0,
    messages: [],
  };
}

/**
 * Updates workflow progress
 */
export function updateWorkflowProgress(
  state: typeof AgentState.State,
  step: number,
  total: number,
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
): Partial<typeof AgentState.State> {
  return {
    currentStep: step,
    totalSteps: total,
    status,
  };
}

/**
 * Adds a result to the workflow state
 */
export function addWorkflowResult(
  state: typeof AgentState.State,
  key: string,
  value: any
): Partial<typeof AgentState.State> {
  return {
    results: { ...state.results, [key]: value },
  };
}

/**
 * Sets workflow error
 */
export function setWorkflowError(
  error: string
): Partial<typeof AgentState.State> {
  return {
    status: 'failed',
    error,
  };
}

/**
 * Completes workflow successfully
 */
export function completeWorkflow(
  finalResult?: any
): Partial<typeof AgentState.State> {
  const updates: Partial<typeof AgentState.State> = {
    status: 'completed',
    next: "end",
  };
  
  if (finalResult) {
    updates.results = { ...updates.results, final: finalResult };
  }
  
  return updates;
}

// Type exports for external use
export type AgentStateType = typeof AgentState.State;
export type SupervisorStateType = typeof SupervisorState.State;
export type PlanExecuteStateType = typeof PlanExecuteState.State;
export type ToolExecutionStateType = typeof ToolExecutionState.State;
export type ContentGenerationStateType = typeof ContentGenerationState.State;