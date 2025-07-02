# Agent Task System Documentation

## Overview

The Agent Task System provides real-time visual feedback for multi-step AI operations, allowing users to track progress as the AI assistant works through complex tasks. This system integrates with the MCP (Model Context Protocol) todo manager to provide a seamless experience.

## Architecture

### Components

1. **Agent Task Display Component** (`components/ui/agent-task-display.tsx`)
   - Visual UI component that appears above the chat input
   - Shows task progress with a progress bar and task count
   - Starts collapsed by default, expands when tasks are active
   - Provides real-time updates as tasks change status

2. **Agent Task Parser** (`lib/agent-task-parser.ts`)
   - Parses AI responses for task-related patterns
   - Extracts tasks from [AGENT_PLAN] markers
   - Handles TodoWrite operations and status updates
   - Supports multiple formats for maximum flexibility

3. **Agent Task Store** (`lib/stores/agent-task-store.ts`)
   - Zustand store for managing task state
   - Handles task creation, updates, and deletion
   - Calculates progress and completion statistics
   - Syncs with MCP todo server

4. **MCP Todo Sync** (`lib/mcp-todo-sync.ts`)
   - Synchronizes tasks between UI and MCP server
   - Handles bi-directional updates
   - Maintains consistency across systems

5. **Todo Manager MCP Server** (`example-servers/todo-manager/`)
   - Standalone Node.js server for task management
   - Provides TodoRead and TodoWrite tools
   - Maintains task state across the session

## How It Works

### Task Creation Flow

1. **User Request**: User submits a complex request requiring multiple steps
2. **AI Analysis**: AI identifies this as a multi-step task (3+ steps)
3. **Task Planning**: AI creates tasks using one of these methods:
   ```
   [AGENT_PLAN]
   1. First task
   2. Second task
   3. Third task
   [/AGENT_PLAN]
   ```
   Or:
   ```
   [TodoWrite creating tasks:
   1. First task
   2. Second task]
   ```
4. **UI Update**: Agent Task Display component appears and shows tasks
5. **Execution**: AI works through tasks systematically
6. **Progress Updates**: UI updates in real-time as tasks complete

### Status Transitions

Tasks move through these statuses:
- `pending` → Initial state for new tasks
- `in-progress` → Task is being actively worked on
- `completed` → Task finished successfully
- `failed` → Task encountered an error
- `need-help` → Task requires user input

### Status Update Formats

The AI can update task status using various formats:

1. **Starting a task**:
   - `Starting: [task description]`
   - `[TodoWrite] - Update task 1 to "in-progress"`

2. **Completing a task**:
   - `✅ Completed: [task description]`
   - `[TodoWrite] - Update task 1 to "completed"`

3. **Task failure**:
   - `❌ Failed: [task description]`
   - `[TodoWrite] - Update task 1 to "failed"`

## When Tasks Are Used

The agent will use the task system for:

1. **Complex Multi-Step Operations** (3+ steps)
   - File system operations
   - Code refactoring
   - Project setup

2. **MCP Server Management** (Always)
   - Adding new servers
   - Configuring servers
   - Removing servers

3. **Systematic Workflows**
   - Data analysis
   - Report generation
   - Environment setup

## User Interface

### Component Features

1. **Collapsed by Default**: Doesn't clutter the interface
2. **Progress Bar**: Visual indication of completion
3. **Task Count**: "2/5 completed" format
4. **Expand/Collapse**: Click chevron to see task details
5. **Close Button**: Dismiss completed tasks
6. **Auto-Hide**: Component hides when no tasks exist

### Visual States

- **No Tasks**: Shows helpful message about when tasks appear
- **Demo Mode**: "Show preview" button demonstrates functionality
- **Active Tasks**: Real-time progress with animations
- **Completed**: All tasks done, ready to close

## Agent Instructions

The AI agent receives detailed instructions through:

1. **MCP_AGENT_TODO_WORKFLOW**: Core workflow instructions
2. **MCP_AGENT_INSTRUCTIONS_ENHANCED**: Enhanced capabilities and UI integration
3. **Agent Task Display Integration**: Specific UI component instructions

Key instructions include:
- Always use todos for 3+ step tasks
- Update status immediately when starting/completing
- Work systematically through all tasks
- Never stop mid-workflow unless blocked

## Testing

### E2E Test Coverage

The `tests/e2e/agent-tasks.spec.ts` file tests:

1. **Basic Multi-Step Tasks**: Verifies task creation and execution
2. **MCP Server Installation**: Tests the complete workflow
3. **Status Transitions**: Validates all status changes
4. **UI Behavior**: Tests expand/collapse/close functionality
5. **Error Handling**: Verifies failed task scenarios
6. **Real-time Sync**: Confirms UI updates match task changes

### Running Tests

```bash
# Run all agent task tests
npm run test:e2e tests/e2e/agent-tasks.spec.ts

# Run with UI for debugging
npm run test:e2e:ui tests/e2e/agent-tasks.spec.ts

# Run specific test
npx playwright test tests/e2e/agent-tasks.spec.ts -g "Basic multi-step"
```

## Troubleshooting

### Common Issues

1. **Tasks Not Appearing**
   - Ensure using Claude Sonnet 4 model
   - Check if request has 3+ steps
   - Verify todo manager MCP is configured

2. **Tasks Not Updating**
   - Check browser console for errors
   - Verify MCP server is running
   - Ensure proper status format is used

3. **Component Not Visible**
   - Check if collapsed (click chevron)
   - Verify tasks were created
   - Look for parse errors in console

### Debug Tips

1. **Enable Console Logging**:
   ```javascript
   // In agent-task-parser.ts
   console.log('Parsed tasks:', tasks);
   ```

2. **Check MCP Server**:
   ```bash
   # Verify todo manager is in config
   cat mcp.config.json | grep todo-manager
   ```

3. **Monitor Network**:
   - Check DevTools Network tab for `/api/mcp/todo` calls
   - Verify responses contain expected data

## Best Practices

### For Developers

1. **Task Descriptions**: Keep concise but descriptive
2. **Status Updates**: Update immediately, not in batches
3. **Error Handling**: Mark as failed/need-help appropriately
4. **Testing**: Always test multi-step workflows

### For Users

1. **Complex Requests**: Be specific about multi-step needs
2. **Monitoring**: Expand component to see detailed progress
3. **Patience**: Some tasks take time to complete
4. **Feedback**: Report issues with specific task descriptions

## Integration Examples

### Example 1: Code Refactoring

```
User: "Refactor the authentication system to use JWT tokens"

AI Response:
I'll help you refactor the authentication system to use JWT tokens. This is a complex task that requires multiple steps:

[AGENT_PLAN]
1. Analyze current authentication implementation
2. Install required JWT dependencies
3. Create JWT token generation utilities
4. Update authentication middleware
5. Modify login/logout endpoints
6. Update client-side token handling
7. Test the new authentication flow
[/AGENT_PLAN]

[TodoWrite] - Update task 1 to "in-progress"
Starting: Analyze current authentication implementation
...
```

### Example 2: MCP Server Addition

```
User: "Add the GitHub MCP server"

AI Response:
I'll help you add the GitHub MCP server to your configuration. Let me organize this task:

[TodoWrite creating tasks:
1. Search for GitHub MCP server documentation
2. Extract configuration details
3. Check for API key requirements
4. Update mcp.config.json
5. Verify server was added successfully]

Now searching for the GitHub MCP server configuration...
```

## Future Enhancements

Potential improvements to consider:

1. **Persistence**: Save task history across sessions
2. **Subtasks**: Support nested task hierarchies
3. **Time Estimates**: Show estimated completion time
4. **Task Templates**: Reusable task patterns
5. **Export**: Download task execution logs
6. **Notifications**: Alert when tasks complete

## Conclusion

The Agent Task System provides transparency and control over complex AI operations. By visualizing progress and maintaining systematic workflows, it ensures reliable execution of multi-step tasks while keeping users informed throughout the process.