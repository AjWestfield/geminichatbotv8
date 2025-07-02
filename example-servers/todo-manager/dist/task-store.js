export class TaskStore {
    tasks = new Map();
    taskIdCounter = 1;
    constructor() { }
    getAllTasks() {
        return Array.from(this.tasks.values());
    }
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    createTasks(tasks) {
        const createdTasks = [];
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
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task)
            return undefined;
        const updatedTask = {
            ...task,
            ...updates
        };
        this.tasks.set(taskId, updatedTask);
        return updatedTask;
    }
    updateTaskStatus(taskId, status) {
        const task = this.tasks.get(taskId);
        if (!task)
            return undefined;
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
    updateSubtaskStatus(taskId, subtaskId, status) {
        const task = this.tasks.get(taskId);
        if (!task)
            return undefined;
        const updatedSubtasks = task.subtasks.map(st => st.id === subtaskId ? { ...st, status } : st);
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
    clearTasks() {
        this.tasks.clear();
        this.taskIdCounter = 1;
    }
    getNextPendingTask() {
        const tasks = this.getAllTasks();
        // First, find tasks with no dependencies
        const noDependencyTasks = tasks.filter(task => task.status === 'pending' &&
            task.dependencies.length === 0);
        if (noDependencyTasks.length > 0) {
            return noDependencyTasks[0];
        }
        // Then, find tasks whose dependencies are all completed
        return tasks.find(task => {
            if (task.status !== 'pending')
                return false;
            // Check if all dependencies are completed
            const allDepsCompleted = task.dependencies.every(depId => {
                const dep = this.tasks.get(depId);
                return dep && dep.status === 'completed';
            });
            return allDepsCompleted;
        });
    }
    getInProgressTasks() {
        return this.getAllTasks().filter(task => task.status === 'in-progress');
    }
    getCompletedTasksCount() {
        return this.getAllTasks().filter(task => task.status === 'completed').length;
    }
    getTotalTasksCount() {
        return this.tasks.size;
    }
    getProgress() {
        const total = this.getTotalTasksCount();
        if (total === 0)
            return 0;
        const completed = this.getCompletedTasksCount();
        return Math.round((completed / total) * 100);
    }
}
//# sourceMappingURL=task-store.js.map