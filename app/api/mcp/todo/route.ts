import { NextRequest, NextResponse } from 'next/server'
import { spawn, ChildProcess } from 'child_process'
import { Task } from '@/lib/stores/agent-task-store'

// Singleton MCP server instance
let todoServerProcess: ChildProcess | null = null
let requestId = 1

interface MCPRequest {
  jsonrpc: string
  method: string
  params: any
  id: number
}

interface MCPResponse {
  jsonrpc: string
  result?: any
  error?: any
  id: number
}

// Initialize the MCP server
async function initializeTodoServer(): Promise<void> {
  if (todoServerProcess) return

  return new Promise((resolve, reject) => {
    try {
      todoServerProcess = spawn('node', ['example-servers/todo-manager/dist/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      todoServerProcess.stderr?.on('data', (data) => {
        console.log('[TodoServer]', data.toString().trim())
      })

      todoServerProcess.on('error', (error) => {
        console.error('[TodoServer] Failed to start:', error)
        todoServerProcess = null
        reject(error)
      })

      todoServerProcess.on('exit', (code) => {
        console.log(`[TodoServer] Exited with code ${code}`)
        todoServerProcess = null
      })

      // Wait for server to be ready
      setTimeout(() => resolve(), 1000)
    } catch (error) {
      reject(error)
    }
  })
}

// Send request to MCP server
async function sendMCPRequest(method: string, params: any): Promise<any> {
  if (!todoServerProcess) {
    await initializeTodoServer()
  }

  const request: MCPRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id: requestId++
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MCP request timeout'))
    }, 5000)

    const handleResponse = (data: Buffer) => {
      try {
        const response: MCPResponse = JSON.parse(data.toString())
        clearTimeout(timeout)
        todoServerProcess?.stdout?.off('data', handleResponse)
        
        if (response.error) {
          reject(new Error(response.error.message || 'MCP request failed'))
        } else {
          resolve(response.result)
        }
      } catch (error) {
        // Continue listening if parse fails (partial data)
      }
    }

    todoServerProcess?.stdout?.on('data', handleResponse)
    todoServerProcess?.stdin?.write(JSON.stringify(request) + '\n')
  })
}

// API route handlers
export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'read':
        const readResult = await sendMCPRequest('tools/call', {
          name: 'todo_read',
          arguments: {}
        })
        const tasks = JSON.parse(readResult.content[0].text)
        return NextResponse.json({ success: true, data: tasks })

      case 'write':
        const writeResult = await sendMCPRequest('tools/call', {
          name: 'todo_write',
          arguments: { tasks: data.tasks }
        })
        return NextResponse.json({ success: true, data: writeResult })

      case 'update_status':
        const updateResult = await sendMCPRequest('tools/call', {
          name: 'todo_update_status',
          arguments: { taskId: data.taskId, status: data.status }
        })
        return NextResponse.json({ success: true, data: updateResult })

      case 'get_next':
        const nextResult = await sendMCPRequest('tools/call', {
          name: 'todo_get_next',
          arguments: {}
        })
        const nextData = JSON.parse(nextResult.content[0].text)
        return NextResponse.json({ success: true, data: nextData })

      case 'stats':
        const statsResult = await sendMCPRequest('tools/call', {
          name: 'todo_stats',
          arguments: {}
        })
        const stats = JSON.parse(statsResult.content[0].text)
        return NextResponse.json({ success: true, data: stats })

      case 'clear':
        const clearResult = await sendMCPRequest('tools/call', {
          name: 'todo_clear',
          arguments: {}
        })
        return NextResponse.json({ success: true, data: clearResult })

      case 'list_tools':
        const toolsResult = await sendMCPRequest('tools/list', {})
        return NextResponse.json({ success: true, data: toolsResult })

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[TodoAPI] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// Cleanup on server shutdown
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (todoServerProcess) {
      todoServerProcess.kill()
    }
  })
}