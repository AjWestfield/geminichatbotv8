import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { config, sessionId } = await request.json();

    // Docker command to start VNC browser container
    const dockerCommand = `
      docker run -d \
        --name ${sessionId} \
        --shm-size=512m \
        -p 0:5901 \
        -p 0:6901 \
        -e VNC_PW=${config.environment.VNC_PW} \
        -e STARTING_WEBSITE_URL=${config.environment.STARTING_WEBSITE_URL} \
        -e VNC_RESOLUTION=${config.environment.VNC_RESOLUTION} \
        ${config.image}
    `.replace(/\s+/g, ' ').trim();

    // Start the container
    const { stdout } = await execAsync(dockerCommand);
    const containerId = stdout.trim();

    // Get the mapped ports
    const portCommand = `docker port ${containerId}`;
    const { stdout: portOutput } = await execAsync(portCommand);
    
    // Parse port mappings
    const portLines = portOutput.split('\n');
    let vncPort = '';
    let novncPort = '';
    
    for (const line of portLines) {
      if (line.includes('5901/tcp')) {
        vncPort = line.split('->')[1]?.split(':')[1];
      }
      if (line.includes('6901/tcp')) {
        novncPort = line.split('->')[1]?.split(':')[1];
      }
    }

    // Wait a moment for the container to fully start
    await new Promise(resolve => setTimeout(resolve, 3000));

    const response = {
      sessionId,
      containerId,
      vncUrl: `http://localhost:${novncPort}`,
      vncPort: novncPort,
      directVncPort: vncPort,
      status: 'running'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error starting VNC browser:', error);
    return NextResponse.json(
      { error: 'Failed to start VNC browser', details: error.message },
      { status: 500 }
    );
  }
}

// Alternative implementation using Docker SDK (if you prefer)
/*
import Docker from 'dockerode';

export async function POST(request: NextRequest) {
  try {
    const { config, sessionId } = await request.json();
    const docker = new Docker();

    // Create container
    const container = await docker.createContainer({
      Image: config.image,
      name: sessionId,
      Env: [
        `VNC_PW=${config.environment.VNC_PW}`,
        `STARTING_WEBSITE_URL=${config.environment.STARTING_WEBSITE_URL}`,
        `VNC_RESOLUTION=${config.environment.VNC_RESOLUTION}`
      ],
      ExposedPorts: {
        '5901/tcp': {},
        '6901/tcp': {}
      },
      HostConfig: {
        PublishAllPorts: true,
        ShmSize: 512 * 1024 * 1024 // 512MB
      }
    });

    // Start container
    await container.start();

    // Get container info to find mapped ports
    const containerInfo = await container.inspect();
    const ports = containerInfo.NetworkSettings.Ports;
    
    const vncPort = ports['5901/tcp']?.[0]?.HostPort;
    const novncPort = ports['6901/tcp']?.[0]?.HostPort;

    const response = {
      sessionId,
      containerId: container.id,
      vncUrl: `http://localhost:${novncPort}`,
      vncPort: novncPort,
      directVncPort: vncPort,
      status: 'running'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error starting VNC browser:', error);
    return NextResponse.json(
      { error: 'Failed to start VNC browser', details: error.message },
      { status: 500 }
    );
  }
}
*/
