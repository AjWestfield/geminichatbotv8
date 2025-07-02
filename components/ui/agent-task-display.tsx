// @ts-nocheck
"use client";

// Agent Task Display feature disabled
export default function AgentTaskDisplay() {
  return null;
}

// Legacy code below retained for reference but ignored by TypeScript


import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, X, ListTodo } from "lucide-react";
import AgentPlan from "@/components/ui/agent-plan";
import { useAgentTaskStore } from "@/lib/stores/agent-task-store";
import { cn } from "@/lib/utils";
import { Task } from "@/components/ui/agent-plan";

export interface AgentTaskDisplayProps {
  className?: string;
  showDemo?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

// Demo tasks for preview
const demoTasks: Task[] = [
  {
    id: "demo-1",
    title: "Analyze user requirements",
    description: "Understanding what needs to be done",
    status: "completed",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: []
  },
  {
    id: "demo-2",
    title: "Process and execute task",
    description: "Working on the main objective",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: ["demo-1"],
    subtasks: []
  },
  {
    id: "demo-3",
    title: "Verify and complete",
    description: "Ensuring everything works correctly",
    status: "pending",
    priority: "medium",
    level: 0,
    dependencies: ["demo-2"],
    subtasks: []
  }
];

// AgentTaskDisplay has been disabled. Returning null to remove UI.
export default function AgentTaskDisplay({ className, showDemo = false, onApprove, onReject }: AgentTaskDisplayProps) {
  const { 
    tasks, 
    isVisible, 
    setVisible, 
    clearTasks, 
    updateTaskStatus,
    updateSubtaskStatus,
    getProgress,
    getCompletedTasksCount,
    getTotalTasksCount,
    alwaysShow,
    planningMode,
    awaitingApproval,
    approveTasks,
    rejectTasks
  } = useAgentTaskStore();

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [showPlaceholder, setShowPlaceholder] = React.useState(false);
  const [userHasInteracted, setUserHasInteracted] = React.useState(false);

  // Use demo tasks if showDemo is true or showPlaceholder is true
  const displayTasks = (showDemo || showPlaceholder) && tasks.length === 0 ? demoTasks : tasks;
  const isDemo = displayTasks === demoTasks;

  // Establish SSE connection once
  React.useEffect(() => {
    const es = new EventSource('/api/agent-tasks');
    es.onmessage = (event) => {
      if (!event.data) return;
      try {
        const evt = JSON.parse(event.data);
        if (evt.action === 'create' && evt.tasks) {
          useAgentTaskStore.getState().setTasks(evt.tasks);
        } else if (evt.action === 'update' && evt.taskId && evt.status) {
          useAgentTaskStore.getState().updateTaskStatus(evt.taskId, evt.status);
        } else if (evt.action === 'clear') {
          useAgentTaskStore.getState().clearTasks();
        }
      } catch (_) {}
    };
    es.onerror = () => {
      // Auto-reconnect by closing; useEffect cleanup will recreate on next render
      es.close();
    };
    return () => es.close();
  }, []);

  // Auto-expand when new tasks are created (unless user has manually collapsed)
  React.useEffect(() => {
    if (tasks.length > 0 && !userHasInteracted) {
      setIsExpanded(true);
    }
  }, [tasks.length, userHasInteracted]);

  // Show component if:
  // - alwaysShow is true (default)
  // - OR there are active tasks
  // - OR isVisible is true
  // - OR we're showing demo/placeholder
  const shouldShow = alwaysShow || isVisible || tasks.length > 0 || showDemo || showPlaceholder;
  
  if (!shouldShow) return null;

  // Calculate progress for demo or real tasks
  const progress = isDemo 
    ? Math.round((displayTasks.filter(t => t.status === 'completed').length / displayTasks.length) * 100)
    : getProgress();
  const completedCount = isDemo 
    ? displayTasks.filter(t => t.status === 'completed').length
    : getCompletedTasksCount();
  const totalCount = isDemo 
    ? displayTasks.length
    : getTotalTasksCount();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-sm overflow-hidden",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-muted/50">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => {
                setIsExpanded(!isExpanded);
                setUserHasInteracted(true);
              }}
              className="p-0.5 hover:bg-background/50 rounded transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </motion.button>
            
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {isDemo ? "Agent Task Preview" : "Agent Tasks"}
              </span>
              {!isDemo && (
                <span className="text-xs text-muted-foreground">
                  {completedCount}/{totalCount} completed
                </span>
              )}
              {isDemo && (
                <span className="text-xs text-muted-foreground italic">
                  (Demo)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress bar - only show when there are tasks */}
            {(displayTasks.length > 0) && (
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            )}

            {/* Close button - only show when there are real tasks or in demo mode */}
            {(tasks.length > 0 || isDemo) && (
              <motion.button
                onClick={() => {
                  if (isDemo) {
                    setShowPlaceholder(false);
                  } else {
                    setVisible(false);
                    // Clear tasks after animation completes
                    setTimeout(clearTasks, 200);
                  }
                }}
                className="p-0.5 hover:bg-background/50 rounded transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isDemo ? "Hide preview" : "Close tasks"}
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Task list */}
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              {/* Show tasks if available */}
              {displayTasks.length > 0 && (
                <>
                  <div className="max-h-64 overflow-y-auto">
                    <AgentPlan
                      tasks={displayTasks}
                      onTaskUpdate={isDemo ? undefined : (taskId, status) => updateTaskStatus(taskId, status)}
                      onSubtaskUpdate={isDemo ? undefined : (taskId, subtaskId, status) => updateSubtaskStatus(taskId, subtaskId, status)}
                      compact={true}
                      className="p-2"
                    />
                  </div>
                  
                  {/* Approval UI */}
                  {!isDemo && awaitingApproval && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-3">
                        Review the planned tasks above. Click &apos;Approve &amp; Execute&apos; to begin.
                      </p>
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => {
                            approveTasks()
                            onApprove?.()
                          }}
                          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Approve &amp; Execute
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            rejectTasks()
                            onReject?.()
                          }}
                          className="px-4 py-2 bg-background hover:bg-muted border border-border rounded-md transition-colors text-sm"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Show message when no real tasks */}
              {!isDemo && tasks.length === 0 && !showPlaceholder && (
                <div className="p-3 text-center space-y-2">
                  <ListTodo className="w-6 h-6 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Agent tasks will appear here when working on multi-step operations
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Try: &quot;Add the GitHub MCP server&quot; or &quot;Create a todo app&quot;
                  </p>
                  <motion.button
                    onClick={() => setShowPlaceholder(true)}
                    className="mt-2 text-xs text-primary hover:underline"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Show preview
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}