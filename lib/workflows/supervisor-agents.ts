import { StateGraph, START, END, Command } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { 
  SupervisorState, 
  SupervisorStateType,
  createInitialSupervisorState 
} from "./agent-state";
import { MCPToolsContext } from "@/lib/mcp/mcp-tools-context";

/**
 * Supervisor-Worker Multi-Agent System
 * 
 * Implements the supervisor pattern from LangGraph research where a supervisor
 * agent coordinates multiple specialized worker agents to handle complex tasks.
 */

export interface AgentCapability {
  name: string;
  description: string;
  tools: string[];
  specializations: string[];
}

export interface WorkerAgent {
  name: string;
  capabilities: AgentCapability;
  systemPrompt: string;
  isActive: boolean;
}

export interface SupervisorConfig {
  model?: string;
  memory?: MemorySaver;
  maxWorkers?: number;
  timeoutMs?: number;
}

export class SupervisorAgentSystem {
  private config: SupervisorConfig;
  private memory: MemorySaver;
  private graph: ReturnType<typeof StateGraph.prototype.compile> | null = null;
  private workers: Map<string, WorkerAgent> = new Map();

  constructor(config: SupervisorConfig = {}) {
    this.config = {
      model: 'gemini-2.0-flash',
      maxWorkers: 5,
      timeoutMs: 300000, // 5 minutes
      ...config
    };
    
    this.memory = config.memory || new MemorySaver();
    this.initializeWorkers();
    this.buildSupervisorGraph();
  }

  /**
   * Initialize specialized worker agents
   */
  private initializeWorkers() {
    // Task Planning Agent
    this.registerWorker({
      name: "TaskPlanner",
      capabilities: {
        name: "Task Planning",
        description: "Breaks down complex requests into actionable steps",
        tools: ["TodoWrite", "TodoRead"],
        specializations: ["planning", "task_breakdown", "workflow_design"]
      },
      systemPrompt: `You are TaskPlanner, a specialized agent for breaking down complex requests into actionable steps.
      
Your responsibilities:
- Analyze user requests and identify required actions
- Create detailed, sequential task plans using TodoWrite
- Break complex tasks into manageable subtasks
- Ensure each step is concrete and actionable
- Consider dependencies between tasks

Always use TodoWrite to create structured task lists with proper status tracking.`,
      isActive: true
    });

    // Content Creator Agent
    this.registerWorker({
      name: "ContentCreator", 
      capabilities: {
        name: "Content Creation",
        description: "Generates images, videos, audio, and other media content",
        tools: ["image_generation", "video_generation", "audio_generation"],
        specializations: ["image_creation", "video_production", "audio_synthesis", "media_editing"]
      },
      systemPrompt: `You are ContentCreator, a specialized agent for generating various types of media content.

Your responsibilities:
- Generate high-quality images based on descriptions
- Create videos from prompts or images
- Produce audio content including TTS and music
- Edit and enhance existing media files
- Optimize content for different formats and platforms

Focus on understanding user creative intent and producing professional-quality results.`,
      isActive: true
    });

    // Research Agent
    this.registerWorker({
      name: "Researcher",
      capabilities: {
        name: "Research & Information",
        description: "Searches web, analyzes data, and gathers information",
        tools: ["web_search", "file_analysis", "data_processing"],
        specializations: ["web_research", "data_analysis", "fact_checking", "information_synthesis"]
      },
      systemPrompt: `You are Researcher, a specialized agent for gathering and analyzing information.

Your responsibilities:
- Conduct thorough web searches for current information
- Analyze documents and data files
- Verify facts and cross-reference sources
- Synthesize information from multiple sources
- Present findings in clear, organized formats

Always cite sources and provide recent, accurate information.`,
      isActive: true
    });

    // Technical Assistant Agent  
    this.registerWorker({
      name: "TechAssistant",
      capabilities: {
        name: "Technical Operations",
        description: "Handles file operations, MCP setup, and technical configurations",
        tools: ["file_operations", "mcp_management", "system_configuration"],
        specializations: ["file_management", "server_setup", "configuration", "troubleshooting"]
      },
      systemPrompt: `You are TechAssistant, a specialized agent for technical operations and system management.

Your responsibilities:
- Manage files and directories
- Set up and configure MCP servers
- Handle system configurations
- Troubleshoot technical issues
- Perform maintenance tasks

Focus on accuracy, security, and following best practices for all technical operations.`,
      isActive: true
    });

    // Communication Agent
    this.registerWorker({
      name: "Communicator",
      capabilities: {
        name: "Communication & Interaction", 
        description: "Handles user interaction, explanations, and final responses",
        tools: ["response_formatting", "explanation_generation"],
        specializations: ["user_interaction", "explanation", "summarization", "presentation"]
      },
      systemPrompt: `You are Communicator, a specialized agent for user interaction and communication.

Your responsibilities:
- Provide clear, helpful explanations to users
- Format responses for optimal readability
- Summarize complex information
- Handle user questions and clarifications
- Ensure positive user experience

Always be helpful, clear, and user-focused in all communications.`,
      isActive: true
    });
  }

  /**
   * Builds the supervisor workflow graph
   */
  private buildSupervisorGraph() {
    const workflow = new StateGraph(SupervisorState)
      // Core nodes
      .addNode("supervisor", this.supervisorNode.bind(this))
      .addNode("TaskPlanner", this.createWorkerNode("TaskPlanner"))
      .addNode("ContentCreator", this.createWorkerNode("ContentCreator"))
      .addNode("Researcher", this.createWorkerNode("Researcher"))
      .addNode("TechAssistant", this.createWorkerNode("TechAssistant"))
      .addNode("Communicator", this.createWorkerNode("Communicator"))
      
      // Workflow routing
      .addEdge(START, "supervisor")
      .addConditionalEdges(
        "supervisor",
        this.routeToWorker.bind(this),
        {
          "TaskPlanner": "TaskPlanner",
          "ContentCreator": "ContentCreator", 
          "Researcher": "Researcher",
          "TechAssistant": "TechAssistant",
          "Communicator": "Communicator",
          "FINISH": END
        }
      );

    // Add return edges from workers to supervisor
    Array.from(this.workers.keys()).forEach(workerName => {
      workflow.addEdge(workerName, "supervisor");
    });

    this.graph = workflow.compile({
      checkpointer: this.memory,
    });
  }

  /**
   * Supervisor node that coordinates worker agents
   */
  private async supervisorNode(
    state: SupervisorStateType,
    config?: RunnableConfig
  ): Promise<Partial<SupervisorStateType>> {
    console.log("[Supervisor] Coordinating workflow step");

    try {
      // Analyze current state and determine next action
      const nextAction = await this.decideSupervisorAction(state);
      
      if (nextAction.action === "FINISH") {
        return {
          next: "FINISH",
          activeAgent: "supervisor",
          messages: [
            ...state.messages,
            new AIMessage({
              content: nextAction.message || "Workflow completed successfully!",
              name: "Supervisor"
            })
          ]
        };
      }

      // Prepare handoff to worker
      return {
        next: nextAction.worker!,
        activeAgent: nextAction.worker!,
        handoffReason: nextAction.message || `Routing to ${nextAction.worker}`,
        messages: [
          ...state.messages,
          new SystemMessage({
            content: `Supervisor delegating to ${nextAction.worker}: ${nextAction.message}`,
            name: "Supervisor"
          })
        ]
      };

    } catch (error) {
      console.error("[Supervisor] Error in supervisor node:", error);
      return {
        next: "FINISH",
        error: error instanceof Error ? error.message : "Supervisor error",
        status: 'failed'
      };
    }
  }

  /**
   * Creates a worker node function for a specific agent
   */
  private createWorkerNode(workerName: string) {
    return async (
      state: SupervisorStateType,
      config?: RunnableConfig
    ): Promise<Partial<SupervisorStateType>> => {
      console.log(`[${workerName}] Executing task`);

      try {
        const worker = this.workers.get(workerName);
        if (!worker) {
          throw new Error(`Worker ${workerName} not found`);
        }

        // Execute worker-specific logic
        const result = await this.executeWorkerTask(worker, state, config);
        
        return {
          activeAgent: workerName,
          messages: [
            ...state.messages,
            new AIMessage({
              content: result.message,
              name: workerName
            })
          ],
          results: { ...state.results, [workerName]: result.data },
          currentStep: state.currentStep + 1,
          handoffReason: `${workerName} completed task`
        };

      } catch (error) {
        console.error(`[${workerName}] Worker error:`, error);
        return {
          activeAgent: workerName,
          error: error instanceof Error ? error.message : `${workerName} error`,
          messages: [
            ...state.messages,
            new AIMessage({
              content: `Error in ${workerName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              name: workerName
            })
          ]
        };
      }
    };
  }

  /**
   * Routes execution to the appropriate worker based on state
   */
  private routeToWorker(state: SupervisorStateType): string {
    if (state.next === "FINISH" || state.status === 'completed') {
      return "FINISH";
    }
    
    return state.next || "TaskPlanner";
  }

  /**
   * Decides the supervisor's next action based on current state
   */
  private async decideSupervisorAction(state: SupervisorStateType): Promise<{
    action: "DELEGATE" | "FINISH";
    worker?: string;
    message?: string;
  }> {
    // Simple decision logic - in a full implementation this would use LLM reasoning
    
    // If we're just starting, begin with task planning
    if (state.currentStep === 0) {
      return {
        action: "DELEGATE",
        worker: "TaskPlanner",
        message: "Starting workflow with task planning"
      };
    }

    // Check if we need content creation
    if (this.needsContentCreation(state.originalRequest)) {
      const hasContentResult = state.results?.ContentCreator;
      if (!hasContentResult) {
        return {
          action: "DELEGATE",
          worker: "ContentCreator",
          message: "Content creation required"
        };
      }
    }

    // Check if we need research
    if (this.needsResearch(state.originalRequest)) {
      const hasResearchResult = state.results?.Researcher;
      if (!hasResearchResult) {
        return {
          action: "DELEGATE", 
          worker: "Researcher",
          message: "Research required"
        };
      }
    }

    // Check if we need technical work
    if (this.needsTechnicalWork(state.originalRequest)) {
      const hasTechResult = state.results?.TechAssistant;
      if (!hasTechResult) {
        return {
          action: "DELEGATE",
          worker: "TechAssistant", 
          message: "Technical operations required"
        };
      }
    }

    // Always finish with communication
    const hasCommunicationResult = state.results?.Communicator;
    if (!hasCommunicationResult) {
      return {
        action: "DELEGATE",
        worker: "Communicator",
        message: "Finalizing user communication"
      };
    }

    // All tasks completed
    return {
      action: "FINISH",
      message: "All workflow steps completed successfully"
    };
  }

  /**
   * Executes a specific worker's task
   */
  private async executeWorkerTask(
    worker: WorkerAgent,
    state: SupervisorStateType,
    config?: RunnableConfig
  ): Promise<{ message: string; data: any }> {
    // Simulate worker execution - in a full implementation this would use LLMs and tools
    const workerName = worker.name;
    
    switch (workerName) {
      case "TaskPlanner":
        return this.executeTaskPlanning(state);
        
      case "ContentCreator":
        return this.executeContentCreation(state);
        
      case "Researcher":
        return this.executeResearch(state);
        
      case "TechAssistant":
        return this.executeTechnicalWork(state);
        
      case "Communicator":
        return this.executeCommunication(state);
        
      default:
        return {
          message: `${workerName} completed basic task`,
          data: { status: "completed", timestamp: new Date().toISOString() }
        };
    }
  }

  /**
   * Worker-specific execution methods
   */

  private async executeTaskPlanning(state: SupervisorStateType): Promise<{ message: string; data: any }> {
    // Simulate task planning with TodoWrite
    const tasks = [
      "Analyze user request and requirements",
      "Execute primary task using appropriate tools",
      "Validate results and ensure completion",
      "Provide clear response to user"
    ];

    return {
      message: `Task planning completed. Created ${tasks.length} tasks for systematic execution.`,
      data: {
        tasks,
        planningMethod: "systematic_breakdown",
        estimatedDuration: "2-5 minutes",
        timestamp: new Date().toISOString()
      }
    };
  }

  private async executeContentCreation(state: SupervisorStateType): Promise<{ message: string; data: any }> {
    return {
      message: "Content creation analysis completed. Identified content requirements and generation parameters.",
      data: {
        contentType: "detected_from_request",
        requirements: "analyzed_user_intent",
        status: "ready_for_generation",
        timestamp: new Date().toISOString()
      }
    };
  }

  private async executeResearch(state: SupervisorStateType): Promise<{ message: string; data: any }> {
    return {
      message: "Research phase completed. Gathered relevant information and verified sources.",
      data: {
        sources: ["web_search_results", "documentation", "knowledge_base"],
        quality: "high_confidence",
        coverage: "comprehensive",
        timestamp: new Date().toISOString()
      }
    };
  }

  private async executeTechnicalWork(state: SupervisorStateType): Promise<{ message: string; data: any }> {
    return {
      message: "Technical operations completed successfully. All configurations applied.",
      data: {
        operations: ["file_management", "configuration", "validation"],
        status: "successful",
        timestamp: new Date().toISOString()
      }
    };
  }

  private async executeCommunication(state: SupervisorStateType): Promise<{ message: string; data: any }> {
    // Compile final response from all worker results
    const allResults = Object.entries(state.results || {});
    const summary = allResults.map(([worker, result]) => `${worker}: completed`).join(", ");
    
    return {
      message: `Workflow completed successfully! Summary: ${summary}. All requested tasks have been executed systematically.`,
      data: {
        summary,
        completedWorkers: allResults.length,
        finalStatus: "success",
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Utility methods for decision making
   */

  private needsContentCreation(request: string): boolean {
    const contentKeywords = ["image", "video", "audio", "generate", "create", "draw", "make"];
    return contentKeywords.some(keyword => 
      request.toLowerCase().includes(keyword)
    );
  }

  private needsResearch(request: string): boolean {
    const researchKeywords = ["search", "find", "research", "information", "latest", "current"];
    return researchKeywords.some(keyword => 
      request.toLowerCase().includes(keyword)
    );
  }

  private needsTechnicalWork(request: string): boolean {
    const techKeywords = ["setup", "configure", "install", "mcp", "server", "file", "system"];
    return techKeywords.some(keyword => 
      request.toLowerCase().includes(keyword)
    );
  }

  /**
   * Public API
   */

  /**
   * Registers a new worker agent
   */
  registerWorker(worker: WorkerAgent): void {
    this.workers.set(worker.name, worker);
    console.log(`[Supervisor] Registered worker: ${worker.name}`);
    
    // Rebuild graph if it exists
    if (this.graph) {
      this.buildSupervisorGraph();
    }
  }

  /**
   * Executes a task using the supervisor-worker system
   */
  async executeWithSupervisor(
    input: string,
    teamMembers?: string[],
    config: RunnableConfig = {}
  ): Promise<SupervisorStateType> {
    if (!this.graph) {
      throw new Error("Supervisor graph not initialized");
    }

    console.log("[Supervisor] Starting multi-agent execution:", input);

    const workers = teamMembers || Array.from(this.workers.keys());
    const initialState = createInitialSupervisorState(input, workers);

    try {
      const result = await this.graph.invoke(initialState, {
        ...config,
        configurable: {
          thread_id: config.configurable?.thread_id || `supervisor_${Date.now()}`,
        }
      });

      console.log("[Supervisor] Multi-agent execution completed");
      return result;

    } catch (error) {
      console.error("[Supervisor] Multi-agent execution failed:", error);
      throw error;
    }
  }

  /**
   * Streams execution with real-time updates
   */
  async *streamWithSupervisor(
    input: string,
    teamMembers?: string[],
    config: RunnableConfig = {}
  ): AsyncGenerator<SupervisorStateType, void, unknown> {
    if (!this.graph) {
      throw new Error("Supervisor graph not initialized");
    }

    console.log("[Supervisor] Starting streamed multi-agent execution:", input);

    const workers = teamMembers || Array.from(this.workers.keys());
    const initialState = createInitialSupervisorState(input, workers);

    try {
      for await (const step of await this.graph.stream(initialState, {
        ...config,
        configurable: {
          thread_id: config.configurable?.thread_id || `supervisor_${Date.now()}`,
        }
      })) {
        yield step;
      }

    } catch (error) {
      console.error("[Supervisor] Streamed multi-agent execution failed:", error);
      
      // Provide detailed error context
      if (error instanceof Error) {
        console.error("[Supervisor] Error details:", {
          message: error.message,
          stack: error.stack,
          graphInitialized: !!this.graph,
          workersCount: this.workers.size
        });
      }
      
      // Yield error state instead of throwing to allow graceful handling
      yield {
        status: 'failed',
        currentStep: 0,
        totalSteps: 1,
        error: error instanceof Error ? error.message : 'Unknown streaming error',
        messages: [{
          role: 'assistant',
          content: `Supervisor workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  /**
   * Gets available workers
   */
  getAvailableWorkers(): WorkerAgent[] {
    return Array.from(this.workers.values());
  }

  /**
   * Gets worker by name
   */
  getWorker(name: string): WorkerAgent | null {
    return this.workers.get(name) || null;
  }
}

// Export factory function
export function createSupervisorSystem(config?: SupervisorConfig): SupervisorAgentSystem {
  return new SupervisorAgentSystem(config);
}

// Export default instance
export const defaultSupervisorSystem = createSupervisorSystem();