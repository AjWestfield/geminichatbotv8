export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}

export class TaskStore {
  private tasks: Map<string, Task> = new Map();
  private taskIdCounter: number = 1;

  constructor() {}

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  createTasks(tasks: Task[]): Task[] {
    const createdTasks: Task[] = [];
    
    for (const task of tasks) {
      // Generate ID if not provided
      const taskWithId = {
        ...task,
        id: task.id || `task-${this.taskIdCounter++}`,
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        level: task.level || 0,
        dependencies: task.dependencies || [],
        subtasks: task.subtasks || []
      };
      
      this.tasks.set(taskWithId.id, taskWithId);
      createdTasks.push(taskWithId);
    }
    
    return createdTasks;
  }

  updateTask(taskId: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const updatedTask = {
      ...task,
      ...updates
    };
    
    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  updateTaskStatus(taskId: string, status: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    // If marking task as completed, also complete all subtasks
    if (status === 'completed') {
      task.subtasks = task.subtasks.map(st => ({ ...st, status: 'completed' }));
    }
    
    const updatedTask = {
      ...task,
      status
    };
    
    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  updateSubtaskStatus(taskId: string, subtaskId: string, status: string): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, status } : st
    );
    
    // If all subtasks are completed, mark parent task as completed
    const allSubtasksCompleted = updatedSubtasks.every(st => st.status === 'completed');
    const taskStatus = allSubtasksCompleted ? 'completed' : task.status;
    
    const updatedTask = {
      ...task,
      subtasks: updatedSubtasks,
      status: taskStatus
    };
    
    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  clearTasks(): void {
    this.tasks.clear();
    this.taskIdCounter = 1;
  }

  getNextPendingTask(): Task | undefined {
    const tasks = this.getAllTasks();
    
    // First, find tasks with no dependencies
    const noDependencyTasks = tasks.filter(task => 
      task.status === 'pending' && 
      task.dependencies.length === 0
    );
    
    if (noDependencyTasks.length > 0) {
      return noDependencyTasks[0];
    }
    
    // Then, find tasks whose dependencies are all completed
    return tasks.find(task => {
      if (task.status !== 'pending') return false;
      
      // Check if all dependencies are completed
      const allDepsCompleted = task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });
      
      return allDepsCompleted;
    });
  }

  getInProgressTasks(): Task[] {
    return this.getAllTasks().filter(task => task.status === 'in-progress');
  }

  getCompletedTasksCount(): number {
    return this.getAllTasks().filter(task => task.status === 'completed').length;
  }

  getTotalTasksCount(): number {
    return this.tasks.size;
  }

  getProgress(): number {
    const total = this.getTotalTasksCount();
    if (total === 0) return 0;
    
    const completed = this.getCompletedTasksCount();
    return Math.round((completed / total) * 100);
  }
}