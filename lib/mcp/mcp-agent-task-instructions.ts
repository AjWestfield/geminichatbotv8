export const MCP_AGENT_TASK_INSTRUCTIONS = `
APPROVAL: Complex tasks need user approval.
1. Plan with TodoWrite (status:'pending')
2. Don't execute until approved
3. End: "Tasks created and awaiting approval."

Status updates: ✅ Completed, ❌ Failed, Starting:`;