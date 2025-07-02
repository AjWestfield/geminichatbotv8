export const MCP_AGENT_TODO_WORKFLOW = `
MULTI-STEP TASKS: Use todos for 3+ step operations.

1. Create [AGENT_PLAN] with numbered tasks
2. Use TodoWrite (set status:'pending' in planning mode)
3. Update status: pending→in_progress→completed
4. Work ONE task at a time
5. Complete ALL tasks before stopping

The UI shows real-time progress above chat input.`;

export const MCP_AGENT_TODO_EXAMPLE = `
### Complete Todo Workflow Example

User: "Set up the filesystem MCP server and show me what files are in my home directory"
Assistant: I'll help you set up the filesystem MCP server and explore your home directory. This is a multi-step task, so let me organize it:

[TodoWrite creating tasks:
1. Check if filesystem MCP server is already configured
2. Add filesystem MCP server to configuration
3. Connect to the filesystem server
4. List files in home directory
5. Display results to user]

[AGENT_PLAN]
1. Check current MCP server configuration
2. Add filesystem server if not present
3. Connect to filesystem server
4. List home directory contents
5. Show you the results
[/AGENT_PLAN]

Starting execution:

[TodoWrite - Update task 1 to "in_progress"]
[TodoRead to check current status]

Let me check your current MCP configuration...

[Execute Read tool on mcp.config.json]

[TodoWrite - Update task 1 to "completed"]
[TodoWrite - Update task 2 to "in_progress"]

I see the filesystem server isn't configured yet. Adding it now...

[Execute Write tool to update mcp.config.json with filesystem server]

[TodoWrite - Update task 2 to "completed"]
[TodoWrite - Update task 3 to "in_progress"]

Server added\! Now connecting...

[Wait for server connection]

[TodoWrite - Update task 3 to "completed"]
[TodoWrite - Update task 4 to "in_progress"]

Great\! The filesystem server is connected. Now listing your home directory...

[Execute filesystem:list_directory tool with path: "~"]

[TodoWrite - Update task 4 to "completed"]
[TodoWrite - Update task 5 to "in_progress"]

Here are the files in your home directory:

- Documents/
- Downloads/
- Desktop/
- Pictures/
- Music/
- Videos/
- .bashrc
- .zshrc
[... file listing continues ...]

[TodoWrite - Update task 5 to "completed"]
[TodoRead to verify all tasks completed]

✅ All tasks completed successfully\! The filesystem MCP server is now set up and I've shown you the contents of your home directory.
`;
