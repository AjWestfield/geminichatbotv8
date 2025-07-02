import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Check if already running
    try {
      const checkResponse = await fetch('http://localhost:8002/docs', {
        method: 'HEAD'
      });
      
      if (checkResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Browser-use service is already running'
        });
      }
    } catch (e) {
      // Service not running, continue to start it
    }
    
    // Get the project root directory
    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, 'start-browser-use-background.sh');
    
    // Start the service
    const { stdout, stderr } = await execAsync(`cd ${projectRoot} && ${scriptPath}`);
    
    // Check if it started successfully
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    try {
      const verifyResponse = await fetch('http://localhost:8002/docs', {
        method: 'HEAD'
      });
      
      if (verifyResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Browser-use service started successfully',
          output: stdout
        });
      }
    } catch (e) {
      // Service still not running
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to start browser-use service',
      error: stderr || 'Unknown error'
    }, { status: 500 });
    
  } catch (error) {
    console.error('Error starting browser service:', error);
    return NextResponse.json({
      success: false,
      message: 'Error starting browser service',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const response = await fetch('http://localhost:8002/docs', {
      method: 'HEAD'
    });
    
    return NextResponse.json({
      running: response.ok,
      port: 8002,
      docs: 'http://localhost:8002/docs'
    });
  } catch (error) {
    return NextResponse.json({
      running: false,
      port: 8002,
      error: 'Service not responding'
    });
  }
}