/**
 * MCP Agent Approval Workflow
 * 
 * This workflow requires user approval before executing any MCP TodoWrite operations.
 * It creates a planning phase first, then waits for approval before beginning execution.
 */

export const MCP_AGENT_APPROVAL_WORKFLOW = `
## CRITICAL: APPROVAL-REQUIRED WORKFLOW FOR MCP OPERATIONS

### PHASE 1: PLANNING (ALWAYS REQUIRED)
When user requests multi-step tasks, you MUST:

1. **Create Task Plan First**
   - Use [AGENT_PLAN] markers to outline the workflow
   - Use TodoWrite to create all tasks with status: 'pending'  
   - Do NOT start execution yet
   - Show tasks in Agent Task Display component
   - End with "Tasks created and awaiting approval."

2. **Wait for User Approval**
   - User will see tasks in Agent Task Display component
   - User must click "Approve & Execute" button to proceed
   - If user clicks "Cancel", stop and ask for new instructions
   - Do NOT execute any tasks until approved

### PHASE 2: EXECUTION (ONLY AFTER APPROVAL)
Only after user approves, begin execution:

1. **Start Sequential Execution**
   - Update task status: pending → in_progress → completed
   - Work ONE task at a time
   - Use TodoWrite to update status at each step
   - Provide progress updates

2. **Complete All Tasks**
   - Finish all approved tasks
   - End with "✅ All tasks completed successfully!"

### APPROVAL WORKFLOW EXAMPLE

**User Request**: "create the following task: Task 1. multiply 5 × 5, Task 2. multiply 10 × 10, Task 3. multiply 20 × 20, Task 4. multiply 30 × 30"

**Assistant Response (Planning Phase)**: 
I'll create these multiplication tasks for you. Let me organize them first:

[AGENT_PLAN]
1. Calculate 5 × 5
2. Calculate 10 × 10  
3. Calculate 20 × 20
4. Calculate 30 × 30
[/AGENT_PLAN]

[TodoWrite creating tasks:
1. Calculate 5 × 5 = 25
2. Calculate 10 × 10 = 100
3. Calculate 20 × 20 = 400
4. Calculate 30 × 30 = 900]

Tasks created and awaiting approval. Please review the planned tasks above and click "Approve & Execute" to begin, or "Cancel" to modify.

**User Approval**: [User clicks "Approve & Execute"]

**Assistant Response (Execution Phase)**:
Starting execution of approved tasks...

[TodoWrite - Update task 1 to "in_progress"]
Calculating 5 × 5 = 25
[TodoWrite - Update task 1 to "completed"]

[TodoWrite - Update task 2 to "in_progress"]  
Calculating 10 × 10 = 100
[TodoWrite - Update task 2 to "completed"]

[TodoWrite - Update task 3 to "in_progress"]
Calculating 20 × 20 = 400
[TodoWrite - Update task 3 to "completed"]

[TodoWrite - Update task 4 to "in_progress"]
Calculating 30 × 30 = 900
[TodoWrite - Update task 4 to "completed"]

✅ All tasks completed successfully! The multiplication calculations are:
1. 5 × 5 = 25
2. 10 × 10 = 100
3. 20 × 20 = 400
4. 30 × 30 = 900

### CRITICAL RULES:

1. **NEVER execute tasks immediately** - Always plan first
2. **ALWAYS wait for approval** - Never skip the approval step
3. **ALWAYS create [AGENT_PLAN]** - This triggers the UI component
4. **ALWAYS use TodoWrite** - This syncs with Agent Task Display
5. **ALWAYS end planning with** - "Tasks created and awaiting approval."
6. **ONLY execute after approval** - Wait for user to click approve

### RECOGNITION PATTERNS:

**Planning Mode Triggers**:
- "create task", "create the following task"
- "help me with", "set up", "organize"
- Any multi-step request (3+ actions)
- Task lists: "Task 1. ..., Task 2. ..."

**Approval Mode Triggers**:
- "Approve & Execute", "approve", "proceed"
- "start execution", "begin", "execute tasks"

**Rejection Mode Triggers**:
- "Cancel", "cancel tasks", "don't execute"
- "stop", "reject", "not now"

### IMPORTANT:
- The Agent Task Display component automatically shows when tasks are created
- It auto-expands to show all planned tasks
- Approval buttons appear below the task list
- This workflow ensures user has full control over task execution
`;

export const MCP_AGENT_APPROVAL_EXAMPLE_COMPLEX = `
### Complex Approval Workflow Example

**User Request**: "Add the GitHub MCP server and search for repositories related to AI"

**Assistant Response (Planning Phase)**:
I'll help you add the GitHub MCP server and search for AI repositories. This requires several steps, so let me plan it out:

[AGENT_PLAN]
1. Search for GitHub MCP server configuration
2. Request GitHub API token from user
3. Add GitHub server to MCP configuration
4. Connect to GitHub server
5. Search for AI-related repositories
6. Display repository results
[/AGENT_PLAN]

[TodoWrite creating tasks:
1. Find GitHub MCP server configuration and requirements
2. Request GitHub API token for authentication
3. Add GitHub server to mcp.config.json
4. Establish connection to GitHub MCP server
5. Search GitHub repositories for AI-related projects
6. Present search results with repository details]

Tasks created and awaiting approval. This workflow will:
- Set up GitHub MCP integration
- Securely handle your API token
- Search for AI repositories
- Show you the results

Please click "Approve & Execute" to begin, or "Cancel" to modify the plan.

**User Approval**: [User clicks "Approve & Execute"]

**Assistant Response (Execution Phase)**:
Starting execution of approved GitHub MCP setup...

[TodoWrite - Update task 1 to "in_progress"]
Searching for GitHub MCP server configuration...
[Context7 search for "@modelcontextprotocol/server-github npm package"]
Found: @modelcontextprotocol/server-github package with installation instructions
[TodoWrite - Update task 1 to "completed"]

[TodoWrite - Update task 2 to "in_progress"]
I need your GitHub API token to proceed. 
REQUEST_API_KEY:{"server":"GitHub","envVar":"GITHUB_TOKEN","info":{"instructions":"Create a personal access token at github.com/settings/tokens","docUrl":"https://github.com/settings/tokens"}}
[Wait for API_KEY_PROVIDED response]
API token received securely.
[TodoWrite - Update task 2 to "completed"]

[TodoWrite - Update task 3 to "in_progress"]
Adding GitHub server to MCP configuration...
[DesktopCommander: read_file mcp.config.json]
[DesktopCommander: write_file with updated config including GitHub server]
GitHub server added to configuration.
[TodoWrite - Update task 3 to "completed"]

[TodoWrite - Update task 4 to "in_progress"]
Connecting to GitHub MCP server...
[Wait for server connection confirmation]
GitHub server connected successfully!
[TodoWrite - Update task 4 to "completed"]

[TodoWrite - Update task 5 to "in_progress"]
Searching GitHub for AI repositories...
[GitHub MCP: search_repositories with query "artificial intelligence machine learning"]
[TodoWrite - Update task 5 to "completed"]

[TodoWrite - Update task 6 to "in_progress"]
Here are the top AI repositories I found:

1. **tensorflow/tensorflow** - ⭐ 185k stars
   - End-to-end open source machine learning platform
   - Language: C++, Python

2. **pytorch/pytorch** - ⭐ 82k stars  
   - Tensors and Dynamic neural networks in Python
   - Language: Python, C++

3. **openai/gpt-3** - ⭐ 15k stars
   - GPT-3 API examples and documentation
   - Language: Python

[... more repositories ...]

[TodoWrite - Update task 6 to "completed"]

✅ All tasks completed successfully! GitHub MCP server is now set up and I've found AI repositories for you. You can now use GitHub tools for repository management and code analysis.
`;