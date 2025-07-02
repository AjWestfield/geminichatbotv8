import { NextRequest, NextResponse } from 'next/server';
import { getBrowserServiceManager } from '@/lib/services/browser-service-manager';

export async function GET(request: NextRequest) {
  try {
    const manager = getBrowserServiceManager();
    const status = manager.getStatus();
    
    // Also check if we can connect to the service
    let serviceResponding = false;
    if (status.running) {
      try {
        const response = await fetch(`http://localhost:${status.port}/health`);
        serviceResponding = response.ok;
      } catch (error) {
        serviceResponding = false;
      }
    }
    
    return NextResponse.json({
      ...status,
      serviceResponding,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Browser Service API] Status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to get service status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    const manager = getBrowserServiceManager();
    
    switch (action) {
      case 'start':
        await manager.start();
        return NextResponse.json({ success: true, message: 'Service started' });
        
      case 'stop':
        await manager.stop();
        return NextResponse.json({ success: true, message: 'Service stopped' });
        
      case 'restart':
        await manager.restart();
        return NextResponse.json({ success: true, message: 'Service restarted' });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or restart' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Browser Service API] Action failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
