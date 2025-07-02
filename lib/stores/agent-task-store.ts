import { create } from 'zustand';
import { Task, Subtask } from '@/components/ui/agent-plan';

interface AgentTaskStore {
  // State
  tasks: Task[];
  isVisible: boolean;
  activeMessageId: string | null;
  alwaysShow: boolean;
  planningMode: boolean;
  awaitingApproval: boolean;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
  updateSubtaskStatus: (taskId: string, subtaskId: string, status: string) => void;
  addTask: (task: Task) => void;
  addSubtask: (taskId: string, subtask: Subtask) => void;
  clearTasks: () => void;
  setVisible: (visible: boolean) => void;
  setActiveMessageId: (messageId: string | null) => void;
  setAlwaysShow: (alwaysShow: boolean) => void;
  setPlanningMode: (planningMode: boolean) => void;
  setAwaitingApproval: (awaitingApproval: boolean) => void;
  approveTasks: () => void;
  rejectTasks: () => void;
  
  // Computed
  getInProgressTasks: () => Task[];
  getCompletedTasksCount: () => number;
  getTotalTasksCount: () => number;
  getProgress: () => number;
}

export const useAgentTaskStore = create<AgentTaskStore>((set, get) => ({
  tasks: [],
  isVisible: false,
  activeMessageId: null,
  alwaysShow: true, // Always show the panel (collapsed) even before tasks
  planningMode: false,
  awaitingApproval: false,

  setTasks: (tasks) => {
    console.log('[Agent Task Store] Setting tasks:', tasks.length);
    const multiStep = tasks.length >= 2;
    set({ 
      tasks, 
      isVisible: multiStep,
      // Show planning / approval UI only for multi-step plans
      planningMode: multiStep,
      awaitingApproval: multiStep && tasks.every(t => t.status === 'pending')
    });
  },

  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    )
  })),

  updateTaskStatus: (taskId, status) => set((state) => {
    const updatedTasks = state.tasks.map(task => {
      if (task.id === taskId) {
        // If task is being completed, mark all subtasks as completed
        const updatedSubtasks = status === 'completed' 
          ? task.subtasks.map(st => ({ ...st, status: 'completed' }))
          : task.subtasks;

        return { ...task, status, subtasks: updatedSubtasks };
      }
      return task;
    });

    // Check if all tasks are completed and hide if so
    const allCompleted = updatedTasks.every(t => t.status === 'completed');
    
    return { 
      tasks: updatedTasks,
      isVisible: !allCompleted && updatedTasks.length > 0
    };
  }),

  updateSubtaskStatus: (taskId, subtaskId, status) => set((state) => {
    const updatedTasks = state.tasks.map(task => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === subtaskId ? { ...subtask, status } : subtask
        );

        // If all subtasks are completed, mark parent task as completed
        const allSubtasksCompleted = updatedSubtasks.every(st => st.status === 'completed');
        const taskStatus = allSubtasksCompleted ? 'completed' : task.status;

        return { ...task, subtasks: updatedSubtasks, status: taskStatus };
      }
      return task;
    });

    return { tasks: updatedTasks };
  }),

  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task],
    isVisible: true
  })),

  addSubtask: (taskId, subtask) => set((state) => ({
    tasks: state.tasks.map(task =>
      task.id === taskId 
        ? { ...task, subtasks: [...task.subtasks, subtask] }
        : task
    )
  })),

  clearTasks: () => set({ 
    tasks: [], 
    isVisible: false, 
    activeMessageId: null,
    planningMode: false,
    awaitingApproval: false
  }),

  setVisible: (visible) => set({ isVisible: visible }),

  setActiveMessageId: (messageId) => set({ activeMessageId: messageId }),

  setAlwaysShow: (alwaysShow) => set({ alwaysShow }),

  setPlanningMode: (planningMode) => set({ planningMode }),

  setAwaitingApproval: (awaitingApproval) => set({ awaitingApproval }),

  approveTasks: () => {
    console.log('[Agent Task Store] Tasks approved - transitioning to execution mode');
    const state = get();
    
    // Update all tasks to 'pending' status from 'planned'
    const updatedTasks = state.tasks.map(task => ({ 
      ...task, 
      status: task.status === 'planned' ? 'pending' : task.status 
    }));
    
    set({
      awaitingApproval: false,
      planningMode: false,
      tasks: updatedTasks
    });

    // Kick off execution via Todo Manager MCP
    import('@/lib/agent/agent-task-executor').then(m => {
      m.runAgentTasksViaTodoManager().catch(err => {
        console.error('[Agent Task Store] Task execution error:', err);
      });
    });

    console.log('[Agent Task Store] Tasks execution started');
  },

  rejectTasks: () => {
    console.log('[Agent Task Store] Tasks rejected - clearing all tasks');
    set({
      tasks: [],
      isVisible: false,
      activeMessageId: null,
      planningMode: false,
      awaitingApproval: false
    });
  },

  // Computed getters
  getInProgressTasks: () => {
    const state = get();
    return state.tasks.filter(task => task.status === 'in-progress');
  },

  getCompletedTasksCount: () => {
    const state = get();
    return state.tasks.filter(task => task.status === 'completed').length;
  },

  getTotalTasksCount: () => {
    const state = get();
    return state.tasks.length;
  },

  getProgress: () => {
    const state = get();
    if (state.tasks.length === 0) return 0;
    
    const completedCount = state.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedCount / state.tasks.length) * 100);
  }
}));