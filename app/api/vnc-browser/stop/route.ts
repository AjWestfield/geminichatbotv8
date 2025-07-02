import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Stop and remove the container
    const stopCommand = `docker stop ${sessionId}`;
    const removeCommand = `docker rm ${sessionId}`;

    try {
      // Stop the container
      await execAsync(stopCommand);
      console.log(`Container ${sessionId} stopped`);
    } catch (error) {
      console.warn(`Failed to stop container ${sessionId}:`, error.message);
    }

    try {
      // Remove the container
      await execAsync(removeCommand);
      console.log(`Container ${sessionId} removed`);
    } catch (error) {
      console.warn(`Failed to remove container ${sessionId}:`, error.message);
    }

    return NextResponse.json({
      sessionId,
      status: 'stopped',
      message: 'VNC browser session terminated successfully'
    });
  } catch (error) {
    console.error('Error stopping VNC browser:', error);
    return NextResponse.json(
      { error: 'Failed to stop VNC browser', details: error.message },
      { status: 500 }
    );
  }
}

// Get status of VNC browser session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if container is running
    const statusCommand = `docker ps --filter "name=${sessionId}" --format "{{.Status}}"`;
    
    try {
      const { stdout } = await execAsync(statusCommand);
      const isRunning = stdout.trim().length > 0;
      
      if (isRunning) {
        // Get container details
        const inspectCommand = `docker inspect ${sessionId}`;
        const { stdout: inspectOutput } = await execAsync(inspectCommand);
        const containerInfo = JSON.parse(inspectOutput)[0];
        
        const ports = containerInfo.NetworkSettings.Ports;
        const vncPort = ports['5901/tcp']?.[0]?.HostPort;
        const novncPort = ports['6901/tcp']?.[0]?.HostPort;

        return NextResponse.json({
          sessionId,
          status: 'running',
          vncUrl: `http://localhost:${novncPort}`,
          vncPort: novncPort,
          directVncPort: vncPort,
          uptime: containerInfo.State.StartedAt
        });
      } else {
        return NextResponse.json({
          sessionId,
          status: 'stopped'
        });
      }
    } catch (error) {
      return NextResponse.json({
        sessionId,
        status: 'not_found',
        error: 'Container not found'
      });
    }
  } catch (error) {
    console.error('Error checking VNC browser status:', error);
    return NextResponse.json(
      { error: 'Failed to check VNC browser status', details: error.message },
      { status: 500 }
    );
  }
}
