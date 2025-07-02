#!/usr/bin/env node

/**
 * Live Demo: Autonomous Task Execution with Todo Manager
 * This demonstrates the working todo manager executing tasks
 */

import { spawn } from 'child_process';

class TodoManagerDemo {
  constructor() {
    this.server = null;
    this.requestId = 1;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sendRequest(method, params) {
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.requestId++
    };
    
    this.server.stdin.write(JSON.stringify(request) + '\n');
    
    return new Promise((resolve) => {
      this.server.stdout.once('data', (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  async startDemo() {
    console.log('🚀 Todo Manager Autonomous Execution Demo');
    console.log('=' .repeat(50));
    
    // Start the server
    console.log('\n📡 Starting Todo Manager MCP Server...');
    this.server = spawn('node', ['example-servers/todo-manager/dist/index.js']);
    
    this.server.stderr.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
    });
    
    await this.wait(1000);
    
    // Create tasks
    console.log('\n📝 Creating task list for autonomous execution...');
    const tasks = [
      {
        id: 'task-1',
        title: 'Search web for AI image generation trends',
        description: 'Find latest trends in AI-powered image generation for 2024',
        status: 'pending',
        priority: 'high',
        dependencies: []
      },
      {
        id: 'task-2', 
        title: 'Generate futuristic robot image',
        description: 'Create an image of a robot painting a masterpiece',
        status: 'pending',
        priority: 'high',
        dependencies: ['task-1']
      },
      {
        id: 'task-3',
        title: 'Animate the robot image',
        description: 'Create a short video animation from the generated image',
        status: 'pending',
        priority: 'medium',
        dependencies: ['task-2']
      }
    ];
    
    await this.sendRequest('tools/call', {
      name: 'todo_write',
      arguments: { tasks }
    });
    
    console.log('✅ Tasks created successfully!');
    
    // Show initial state
    console.log('\n📊 Initial Task Status:');
    const initialRead = await this.sendRequest('tools/call', {
      name: 'todo_read',
      arguments: {}
    });
    
    const initialTasks = JSON.parse(initialRead.result.content[0].text);
    initialTasks.tasks.forEach((task, i) => {
      console.log(`  ${i+1}. [${task.status}] ${task.title}`);
    });
    
    // Simulate autonomous execution
    console.log('\n🤖 Starting Autonomous Execution...');
    console.log('(Simulating what TaskExecutor would do)\n');
    
    for (let i = 0; i < 3; i++) {
      // Get next task
      const nextTaskResp = await this.sendRequest('tools/call', {
        name: 'todo_get_next',
        arguments: {}
      });
      
      const nextTaskData = JSON.parse(nextTaskResp.result.content[0].text);
      
      if (!nextTaskData.hasNext) {
        break;
      }
      
      const task = nextTaskData.task;
      console.log(`\n⚡ Executing: ${task.title}`);
      
      // Update to in-progress
      await this.sendRequest('tools/call', {
        name: 'todo_update_status',
        arguments: { taskId: task.id, status: 'in-progress' }
      });
      
      console.log(`  Status: pending → in-progress`);
      
      // Simulate execution
      console.log(`  Simulating ${task.title}...`);
      await this.wait(2000);
      
      // Mark as completed
      await this.sendRequest('tools/call', {
        name: 'todo_update_status',
        arguments: { taskId: task.id, status: 'completed' }
      });
      
      console.log(`  Status: in-progress → completed ✅`);
      
      // Show progress
      const statsResp = await this.sendRequest('tools/call', {
        name: 'todo_stats',
        arguments: {}
      });
      const stats = JSON.parse(statsResp.result.content[0].text);
      console.log(`  Progress: ${stats.completed}/${stats.total} (${stats.progress}%)`);
    }
    
    // Final status
    console.log('\n\n📊 Final Task Status:');
    const finalRead = await this.sendRequest('tools/call', {
      name: 'todo_read',
      arguments: {}
    });
    
    const finalTasks = JSON.parse(finalRead.result.content[0].text);
    finalTasks.tasks.forEach((task, i) => {
      const icon = task.status === 'completed' ? '✅' : '❌';
      console.log(`  ${i+1}. ${icon} [${task.status}] ${task.title}`);
    });
    
    console.log('\n✨ Autonomous Execution Complete!');
    console.log('\n💡 This demonstrates:');
    console.log('  1. Task creation with dependencies');
    console.log('  2. Automatic task selection respecting dependencies');
    console.log('  3. Status updates during execution');
    console.log('  4. Progress tracking');
    console.log('  5. Autonomous completion without user intervention');
    
    // Cleanup
    this.server.kill();
  }
}

// Run the demo
const demo = new TodoManagerDemo();
demo.startDemo().catch(console.error);