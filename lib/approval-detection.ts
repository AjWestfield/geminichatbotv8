/**
 * Approval Detection System
 * 
 * This module handles detection of user approval/rejection of agent tasks
 * and manages the transition between planning and execution phases.
 */

export interface ApprovalDetectionResult {
  isApprovingTasks: boolean;
  isRejectingTasks: boolean;
  isGeneralApproval: boolean;
  isGeneralRejection: boolean;
  confidence: number;
}

/**
 * Detects approval/rejection patterns in user messages
 */
export function detectApprovalStatus(messageContent: string): ApprovalDetectionResult {
  const lowerContent = messageContent.toLowerCase().trim();
  
  // High confidence approval patterns
  const highConfidenceApproval = [
    /^approve\s*&?\s*execute$/i,
    /^approve\s*and\s*execute$/i,
    /^approve\s*tasks?$/i,
    /^execute\s*tasks?$/i,
    /^proceed\s*with\s*tasks?$/i,
    /^start\s*execution$/i,
    /^begin\s*tasks?$/i,
    /^yes,?\s*proceed$/i,
    /^yes,?\s*execute$/i
  ];

  // Medium confidence approval patterns
  const mediumConfidenceApproval = [
    /approve.*execute/i,
    /approve.*tasks?/i,
    /proceed.*tasks?/i,
    /start.*tasks?/i,
    /execute.*plan/i,
    /^(yes|ok|okay|sure)$/i,
    /^go\s*ahead$/i,
    /^do\s*it$/i
  ];

  // High confidence rejection patterns
  const highConfidenceRejection = [
    /^cancel\s*tasks?$/i,
    /^reject\s*tasks?$/i,
    /^don'?t\s*execute$/i,
    /^don'?t\s*proceed$/i,
    /^stop$/i,
    /^cancel$/i,
    /^no$/i,
    /^abort$/i,
    /^not\s*now$/i
  ];

  // Medium confidence rejection patterns
  const mediumConfidenceRejection = [
    /cancel.*tasks?/i,
    /reject.*tasks?/i,
    /don'?t.*execute/i,
    /don'?t.*proceed/i,
    /not\s*ready/i,
    /wait/i,
    /hold\s*on/i,
    /never\s*mind/i
  ];

  let isApprovingTasks = false;
  let isRejectingTasks = false;
  let confidence = 0;

  // Check high confidence patterns first
  if (highConfidenceApproval.some(pattern => pattern.test(lowerContent))) {
    isApprovingTasks = true;
    confidence = 0.9;
  } else if (mediumConfidenceApproval.some(pattern => pattern.test(lowerContent))) {
    isApprovingTasks = true;
    confidence = 0.7;
  } else if (highConfidenceRejection.some(pattern => pattern.test(lowerContent))) {
    isRejectingTasks = true;
    confidence = 0.9;
  } else if (mediumConfidenceRejection.some(pattern => pattern.test(lowerContent))) {
    isRejectingTasks = true;
    confidence = 0.7;
  }

  return {
    isApprovingTasks,
    isRejectingTasks,
    isGeneralApproval: isApprovingTasks,
    isGeneralRejection: isRejectingTasks,
    confidence
  };
}

/**
 * Determines if the current context is in approval-waiting state
 */
export function isAwaitingApproval(): boolean {
  // Check if Agent Task Store is in approval waiting state
  try {
    const { useAgentTaskStore } = require('@/lib/stores/agent-task-store');
    const { awaitingApproval, tasks } = useAgentTaskStore.getState();
    return awaitingApproval && tasks.length > 0;
  } catch (error) {
    console.warn('[Approval Detection] Could not check agent task store state:', error);
    return false;
  }
}

/**
 * Checks if the last few messages indicate we're in planning phase
 */
export function isInPlanningPhase(recentMessages: any[]): boolean {
  if (!recentMessages || recentMessages.length === 0) {
    return false;
  }

  // Check last 3 messages for planning indicators
  const lastMessages = recentMessages.slice(-3);
  
  const planningIndicators = [
    /tasks created and awaiting approval/i,
    /\[AGENT_PLAN\]/i,
    /TodoWrite creating tasks/i,
    /please.*approve.*execute/i,
    /click.*approve.*execute/i,
    /review.*planned.*tasks/i
  ];

  return lastMessages.some(msg => 
    msg.role === 'assistant' && 
    planningIndicators.some(pattern => pattern.test(msg.content))
  );
}

/**
 * Enhanced approval detection that considers conversation context
 */
export function detectApprovalWithContext(
  messageContent: string, 
  recentMessages: any[] = []
): ApprovalDetectionResult {
  const basicDetection = detectApprovalStatus(messageContent);
  
  // Enhance confidence based on context
  const inPlanningPhase = isInPlanningPhase(recentMessages);
  const awaitingApproval = isAwaitingApproval();
  
  // Boost confidence if we're clearly in approval context
  if ((inPlanningPhase || awaitingApproval) && (basicDetection.isApprovingTasks || basicDetection.isRejectingTasks)) {
    basicDetection.confidence = Math.min(0.95, basicDetection.confidence + 0.2);
  }
  
  // Lower confidence if we're not in approval context
  if (!inPlanningPhase && !awaitingApproval && (basicDetection.isApprovingTasks || basicDetection.isRejectingTasks)) {
    basicDetection.confidence = Math.max(0.3, basicDetection.confidence - 0.2);
  }
  
  return basicDetection;
}

/**
 * Logs approval detection for debugging
 */
export function logApprovalDetection(result: ApprovalDetectionResult, context: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Approval Detection] ${context}:`, {
      approving: result.isApprovingTasks,
      rejecting: result.isRejectingTasks,
      confidence: result.confidence
    });
  }
}