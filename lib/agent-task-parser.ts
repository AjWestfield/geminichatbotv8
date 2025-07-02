import { Task, Subtask } from '@/components/ui/agent-plan';

// Patterns to detect task-related messages
const TASK_PATTERNS = {
  // Enhanced TodoWrite patterns to match MCP workflow outputs
  TODO_WRITE_CREATING: /\[TodoWrite(?:\s+creating)?\s+tasks?:?\s*\n((?:[-•*\d]+\.?\s*.+\n?)+)/i,
  TODO_WRITE_WITH: /\[TodoWrite\s+with\s+tasks?:?\s*\n((?:[-•*\d]+\.?\s*.+\n?)+)/i,
  TODO_WRITE_SIMPLE: /\[?TodoWrite\]?.*?(?:creating|updating|with)?\s*tasks?:?\s*\n((?:[-•*\d]+\.?\s*.+\n?)+)/i,
  TODO_UPDATE: /\[TodoWrite\s*-?\s*Update\s+task\s+(\d+)\s+to\s+"([^"]+)"\]/i,
  TODO_UPDATE_SIMPLE: /Update\s+task\s+(\d+)\s+to\s+"([^"]+)"/i,
  
  // Agent plan patterns
  AGENT_PLAN: /\[AGENT_PLAN\]([\s\S]*?)\[\/AGENT_PLAN\]/,
  PLAN_LIST: /(?:I'll|Let me)\s+(?:create|break down|organize)\s+(?:this|the)\s+(?:task|work|project)\s+into\s+(?:steps|tasks):\s*\n((?:\d+\.\s*.+\n?)+)/i,
  
  // Enhanced task status updates to match MCP workflow markers
  TASK_STARTED: /(?:Starting|Beginning|Working on|Now executing):\s*(.+)|(?:\[TodoWrite\s*-?\s*Update\s+task\s+\d+\s+to\s+"in_progress"\])/i,
  TASK_COMPLETED: /(?:Completed|Finished|Done with):\s*(.+)|✅\s*(.+)|(?:\[TodoWrite\s*-?\s*Update\s+task\s+\d+\s+to\s+"completed"\])/i,
  TASK_FAILED: /(?:Failed to|Error in|Could not complete):\s*(.+)|❌\s*(.+)|(?:\[TodoWrite\s*-?\s*Update\s+task\s+\d+\s+to\s+"failed"\])/i,
  
  // Multi-step task patterns
  MULTI_STEP: /(?:This\s+(?:requires|needs|involves)\s+(?:multiple|several)\s+steps|multi-step\s+task)/i,
  STEP_PATTERN: /Step\s+(\d+):\s*(.+)/i,
  
  // MCP workflow specific patterns
  MCP_TODO_WORKFLOW: /\[TodoWrite(?:\s+creating)?\s+tasks?:?\s*\n([\s\S]*?)(?=\[|$)/i,
  MCP_STATUS_UPDATE: /\[TodoWrite\s*-?\s*Update\s+task\s+(\d+)\s+to\s+"((?:pending|in_progress|completed|failed|need-help)?)"\]/gi,
  MCP_TASK_MARKER: /(?:\[TodoWrite.*?\])|(?:✅\s*All\s+tasks?\s+completed)|(?:Starting\s+execution:)/i,
  
  // Workflow planning patterns (actual output from workflow system)
  WORKFLOW_PLANNING: /\[WORKFLOW_PLANNING\]\s*Creating\s+task\s+plan\.{3}/i,
  WORKFLOW_APPROVED: /\[WORKFLOW_APPROVED\]\s*Executing\s+approved\s+tasks\.{3}/i,
  SUPERVISOR_WORKFLOW: /🔄\s*\*?\*?SUPERVISOR\s+Workflow\*?\*?/i,
  
  // Task creation from workflow responses
  WORKFLOW_TASK_LIST: /(?:Task\s+\d+\.?\s*[^,\n]+(?:,\s*)?)+/i,
  NUMBERED_TASK_LIST: /(?:Task\s+(\d+)\.?\s*([^,\n]+))+/gi,
};

export interface ParsedTaskUpdate {
  type: 'create' | 'update' | 'status' | 'plan';
  tasks?: Task[];
  taskId?: string;
  status?: string;
  title?: string;
  description?: string;
}

export function parseAgentTaskUpdate(content: string): ParsedTaskUpdate[] {
  const updates: ParsedTaskUpdate[] = [];
  
  // Check for AGENT_PLAN markers first (highest priority)
  const agentPlanMatch = content.match(TASK_PATTERNS.AGENT_PLAN);
  if (agentPlanMatch) {
    const planText = agentPlanMatch[1];
    const tasks = parseTaskList(planText);
    if (tasks.length > 0) {
      updates.push({ type: 'plan', tasks });
    }
  }
  
  // Check for various TodoWrite task creation patterns
  let todoWriteMatch = content.match(TASK_PATTERNS.TODO_WRITE_CREATING);
  if (!todoWriteMatch) {
    todoWriteMatch = content.match(TASK_PATTERNS.TODO_WRITE_WITH);
  }
  if (!todoWriteMatch) {
    todoWriteMatch = content.match(TASK_PATTERNS.TODO_WRITE_SIMPLE);
  }
  if (!todoWriteMatch) {
    todoWriteMatch = content.match(TASK_PATTERNS.MCP_TODO_WORKFLOW);
  }
  
  if (todoWriteMatch) {
    const taskText = todoWriteMatch[1];
    const tasks = parseTaskList(taskText);
    if (tasks.length > 0) {
      updates.push({ type: 'create', tasks });
    }
  }
  
  // Check for workflow planning patterns (actual workflow system output)
  if (content.match(TASK_PATTERNS.WORKFLOW_PLANNING)) {
    // Look for numbered task lists in the message
    const numberedTaskMatches = Array.from(content.matchAll(TASK_PATTERNS.NUMBERED_TASK_LIST));
    if (numberedTaskMatches.length > 0) {
      const tasks: Task[] = numberedTaskMatches.map((match, index) => ({
        id: `task-${index + 1}`,
        title: match[2].trim(),
        description: '',
        status: 'pending',
        priority: index === 0 ? 'high' : 'medium',
        level: 0,
        dependencies: index > 0 ? [`task-${index}`] : [],
        subtasks: []
      }));
      
      if (tasks.length > 0) {
        updates.push({ type: 'plan', tasks });
      }
    }
    
    // Also look for simple task patterns like "Task 1. multiply 5 × 5, Task 2. multiply 10 × 10"
    const workflowTaskMatch = content.match(TASK_PATTERNS.WORKFLOW_TASK_LIST);
    if (workflowTaskMatch && numberedTaskMatches.length === 0) {
      const taskText = workflowTaskMatch[0];
      const tasks = parseWorkflowTaskList(taskText);
      if (tasks.length > 0) {
        updates.push({ type: 'plan', tasks });
      }
    }
  }
  
  // Check for MCP-style status updates
  const mcpStatusMatches = content.matchAll(TASK_PATTERNS.MCP_STATUS_UPDATE);
  for (const match of mcpStatusMatches) {
    const taskId = `task-${match[1]}`;
    const status = match[2];
    if (status) {
      updates.push({ type: 'update', taskId, status: normalizeTaskStatus(status) });
    }
  }
  
  // Check for traditional TodoWrite status updates
  const todoUpdatePattern = new RegExp(TASK_PATTERNS.TODO_UPDATE.source, 'gi');
  const todoUpdateMatches = content.matchAll(todoUpdatePattern);
  for (const match of todoUpdateMatches) {
    const taskId = `task-${match[1]}`;
    const status = match[2];
    updates.push({ type: 'update', taskId, status: normalizeTaskStatus(status) });
  }
  
  // Check for simple status updates
  const simpleUpdatePattern = new RegExp(TASK_PATTERNS.TODO_UPDATE_SIMPLE.source, 'gi');
  const simpleUpdateMatches = content.matchAll(simpleUpdatePattern);
  for (const match of simpleUpdateMatches) {
    const taskId = `task-${match[1]}`;
    const status = match[2];
    updates.push({ type: 'update', taskId, status: normalizeTaskStatus(status) });
  }
  
  // Check for task completion markers
  const completedMatch = content.match(TASK_PATTERNS.TASK_COMPLETED);
  if (completedMatch) {
    const title = completedMatch[1] || completedMatch[2];
    if (title && !title.includes('TodoWrite') && !title.includes('task')) {
      updates.push({ type: 'status', title, status: 'completed' });
    }
  }
  
  // Check for task failure markers
  const failedMatch = content.match(TASK_PATTERNS.TASK_FAILED);
  if (failedMatch) {
    const title = failedMatch[1] || failedMatch[2];
    if (title && !title.includes('TodoWrite') && !title.includes('task')) {
      updates.push({ type: 'status', title, status: 'failed' });
    }
  }
  
  // Check for task start markers
  const startedMatch = content.match(TASK_PATTERNS.TASK_STARTED);
  if (startedMatch) {
    const title = startedMatch[1];
    if (title && !title.includes('TodoWrite') && !title.includes('task')) {
      updates.push({ type: 'status', title, status: 'in-progress' });
    }
  }
  
  // Check for informal task lists (only if no other patterns matched)
  const planListMatch = content.match(TASK_PATTERNS.PLAN_LIST);
  if (planListMatch && !agentPlanMatch && !todoWriteMatch) {
    const taskText = planListMatch[1];
    const tasks = parseTaskList(taskText);
    if (tasks.length > 0) {
      updates.push({ type: 'plan', tasks });
    }
  }
  
  return updates;
}

function parseTaskList(text: string): Task[] {
  const tasks: Task[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  lines.forEach((line, index) => {
    // Enhanced cleaning to handle various formats from MCP workflows
    let cleanLine = line
      .replace(/^[-•*➤▶️]\s*/, '') // Remove bullet points
      .replace(/^\d+\.?\s*/, '') // Remove numbered lists
      .replace(/^\[.*?\]\s*/, '') // Remove status indicators like [pending]
      .replace(/^>\s*/, '') // Remove quote markers
      .replace(/^\s*[-*•]\s*/, '') // Remove indented bullets
      .trim();
    
    // Skip empty lines and non-task content
    if (!cleanLine || 
        cleanLine.startsWith('[') || 
        cleanLine.includes('TodoWrite') ||
        cleanLine.includes('AGENT_PLAN') ||
        cleanLine.length < 3) {
      return;
    }
      
    // Extract subtasks if present (indented lines)
    const subtasks: Subtask[] = [];
    let description = '';
    
    // Check if line contains description in parentheses
    const descMatch = cleanLine.match(/^(.+?)\s*\((.+?)\)\s*$/);
    if (descMatch) {
      const title = descMatch[1].trim();
      description = descMatch[2].trim();
      
      tasks.push({
        id: `task-${tasks.length + 1}`,
        title,
        description,
        status: 'pending',
        priority: index === 0 ? 'high' : 'medium',
        level: 0,
        dependencies: [],
        subtasks
      });
    } else {
      // Handle status indicators in task titles
      let status = 'pending';
      if (cleanLine.includes('✅') || cleanLine.toLowerCase().includes('completed')) {
        status = 'completed';
        cleanLine = cleanLine.replace(/✅\s*/, '').replace(/\s*\(completed\)/i, '').trim();
      } else if (cleanLine.includes('🔄') || cleanLine.toLowerCase().includes('in progress')) {
        status = 'in-progress';
        cleanLine = cleanLine.replace(/🔄\s*/, '').replace(/\s*\(in progress\)/i, '').trim();
      }
      
      tasks.push({
        id: `task-${tasks.length + 1}`,
        title: cleanLine,
        description: '',
        status: status as any,
        priority: index === 0 ? 'high' : 'medium',
        level: 0,
        dependencies: [],
        subtasks
      });
    }
  });
  
  // Set dependencies based on order (only for sequential tasks)
  tasks.forEach((task, index) => {
    if (index > 0) {
      task.dependencies = [`task-${index}`];
    }
  });
  
  return tasks;
}

/**
 * Parse workflow task lists from user input like "Task 1. multiply 5 × 5, Task 2. multiply 10 × 10"
 */
function parseWorkflowTaskList(text: string): Task[] {
  const tasks: Task[] = [];
  
  // Split by commas and clean up each task
  const taskParts = text.split(/,\s*(?=Task\s+\d+)/);
  
  taskParts.forEach((part, index) => {
    const taskMatch = part.match(/Task\s+(\d+)\.?\s*(.+)/i);
    if (taskMatch) {
      const taskNumber = parseInt(taskMatch[1]);
      const taskTitle = taskMatch[2].trim();
      
      tasks.push({
        id: `task-${taskNumber}`,
        title: taskTitle,
        description: '',
        status: 'pending',
        priority: index === 0 ? 'high' : 'medium',
        level: 0,
        dependencies: index > 0 ? [`task-${index}`] : [],
        subtasks: []
      });
    }
  });
  
  return tasks;
}

// Extract task status from various formats
export function normalizeTaskStatus(status: string): string {
  const normalized = status.toLowerCase().trim();
  
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'in_progress': 'in-progress',
    'in-progress': 'in-progress',
    'inprogress': 'in-progress',
    'working': 'in-progress',
    'active': 'in-progress',
    'completed': 'completed',
    'complete': 'completed',
    'done': 'completed',
    'finished': 'completed',
    'failed': 'failed',
    'error': 'failed',
    'blocked': 'need-help',
    'need-help': 'need-help',
    'need_help': 'need-help',
    'needhelp': 'need-help',
    'waiting': 'need-help'
  };
  
  return statusMap[normalized] || 'pending';
}

// Match task by title (fuzzy matching)
export function findTaskByTitle(tasks: Task[], title: string): Task | null {
  const cleanTitle = title.toLowerCase().trim();
  
  // First try exact match
  const exactMatch = tasks.find(task => 
    task.title.toLowerCase().trim() === cleanTitle
  );
  if (exactMatch) return exactMatch;
  
  // Then try contains match
  const containsMatch = tasks.find(task => 
    task.title.toLowerCase().includes(cleanTitle) ||
    cleanTitle.includes(task.title.toLowerCase())
  );
  if (containsMatch) return containsMatch;
  
  // Finally try fuzzy match (first few words)
  const titleWords = cleanTitle.split(' ').slice(0, 3).join(' ');
  const fuzzyMatch = tasks.find(task => 
    task.title.toLowerCase().startsWith(titleWords)
  );
  
  return fuzzyMatch || null;
}