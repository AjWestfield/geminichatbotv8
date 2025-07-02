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
export declare class TaskStore {
    private tasks;
    private taskIdCounter;
    constructor();
    getAllTasks(): Task[];
    getTask(taskId: string): Task | undefined;
    createTasks(tasks: Task[]): Task[];
    updateTask(taskId: string, updates: Partial<Task>): Task | undefined;
    updateTaskStatus(taskId: string, status: string): Task | undefined;
    updateSubtaskStatus(taskId: string, subtaskId: string, status: string): Task | undefined;
    clearTasks(): void;
    getNextPendingTask(): Task | undefined;
    getInProgressTasks(): Task[];
    getCompletedTasksCount(): number;
    getTotalTasksCount(): number;
    getProgress(): number;
}
//# sourceMappingURL=task-store.d.ts.map