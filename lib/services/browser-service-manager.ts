import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import net from 'net';

interface BrowserServiceConfig {
  pythonPath?: string;
  servicePath: string;
  port: number;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
}

export class BrowserServiceManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: Required<BrowserServiceConfig>;
  private isRunning = false;
  private retryCount = 0;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;
  private pidFile: string;

  constructor(config: BrowserServiceConfig) {
    super();
    this.config = {
      pythonPath: config.pythonPath || 'python3',
      servicePath: config.servicePath,
      port: config.port,
      maxRetries: config.maxRetries || 5,
      retryDelay: config.retryDelay || 3000,
      healthCheckInterval: config.healthCheckInterval || 30000
    };
    this.pidFile = path.join(process.cwd(), '.browser-service.pid');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[BrowserServiceManager] Service already running');
      return;
    }

    console.log('[BrowserServiceManager] Starting browser service...');
    
    // Check if service is already running
    if (await this.isServiceRunning()) {
      console.log('[BrowserServiceManager] Service already running on port', this.config.port);
      this.isRunning = true;
      this.startHealthCheck();
      this.emit('started');
      return;
    }

    try {
      await this.startProcess();
    } catch (error) {
      console.error('[BrowserServiceManager] Failed to start:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private async startProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(this.config.servicePath, 'browser_agent_service.py');
      
      // Check if Python script exists
      if (!fs.existsSync(pythonScript)) {
        reject(new Error(`Python script not found: ${pythonScript}`));
        return;
      }

      // Activate virtual environment if it exists
      const venvPath = path.join(this.config.servicePath, 'venv');
      const activateScript = process.platform === 'win32' 
        ? path.join(venvPath, 'Scripts', 'activate.bat')
        : path.join(venvPath, 'bin', 'activate');

      let command: string;
      let args: string[];

      if (fs.existsSync(venvPath)) {
        // Use virtual environment
        if (process.platform === 'win32') {
          command = 'cmd';
          args = ['/c', activateScript, '&&', 'python', pythonScript];
        } else {
          const pythonBin = path.join(venvPath, 'bin', 'python');
          command = pythonBin;
          args = [pythonScript];
        }
      } else {
        // Use system Python
        command = this.config.pythonPath;
        args = [pythonScript];
      }

      console.log('[BrowserServiceManager] Spawning process:', command, args);

      this.process = spawn(command, args, {
        cwd: this.config.servicePath,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          BROWSER_SERVICE_PORT: this.config.port.toString(),
          BROWSER_AGENT_PORT: this.config.port.toString() // For compatibility
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Save PID
      if (this.process.pid) {
        fs.writeFileSync(this.pidFile, this.process.pid.toString());
      }

      this.process.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        console.log('[BrowserService]', message);
        
        // Check for startup confirmation
        if (message.includes('Running on') || message.includes('Started')) {
          this.onProcessStarted();
          resolve();
        }
      });

      this.process.stderr?.on('data', (data) => {
        console.error('[BrowserService Error]', data.toString().trim());
      });

      this.process.on('error', (error) => {
        console.error('[BrowserServiceManager] Process error:', error);
        this.isRunning = false;
        this.emit('error', error);
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[BrowserServiceManager] Process exited with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.cleanupPidFile();
        
        if (code !== 0 && this.retryCount < this.config.maxRetries) {
          this.handleProcessExit();
        } else {
          this.emit('stopped');
        }
      });

      // Set a timeout for startup
      this.startupTimer = setTimeout(() => {
        if (!this.isRunning) {
          reject(new Error('Service failed to start within timeout'));
        }
      }, 30000);
    });
  }

  private onProcessStarted(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    
    this.isRunning = true;
    this.retryCount = 0;
    this.startHealthCheck();
    this.emit('started');
    console.log('[BrowserServiceManager] Service started successfully');
  }

  private handleProcessExit(): void {
    this.retryCount++;
    console.log(`[BrowserServiceManager] Attempting restart ${this.retryCount}/${this.config.maxRetries}...`);
    
    setTimeout(() => {
      this.start().catch((error) => {
        console.error('[BrowserServiceManager] Restart failed:', error);
      });
    }, this.config.retryDelay);
  }

  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      const isHealthy = await this.checkHealth();
      if (!isHealthy && this.isRunning) {
        console.log('[BrowserServiceManager] Health check failed, restarting...');
        await this.restart();
      }
    }, this.config.healthCheckInterval);
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${this.config.port}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async isServiceRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.connect(this.config.port, 'localhost');
    });
  }

  async stop(): Promise<void> {
    console.log('[BrowserServiceManager] Stopping service...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Give it time to shut down gracefully
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Force kill if still running
      if (this.process && !this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }

    this.cleanupPidFile();
    this.isRunning = false;
    this.emit('stopped');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  private cleanupPidFile(): void {
    if (fs.existsSync(this.pidFile)) {
      try {
        fs.unlinkSync(this.pidFile);
      } catch (error) {
        console.error('[BrowserServiceManager] Failed to cleanup PID file:', error);
      }
    }
  }

  getStatus(): { running: boolean; pid?: number; port: number } {
    return {
      running: this.isRunning,
      pid: this.process?.pid,
      port: this.config.port
    };
  }
}

// Singleton instance
let browserServiceManager: BrowserServiceManager | null = null;

export function getBrowserServiceManager(): BrowserServiceManager {
  if (!browserServiceManager) {
    browserServiceManager = new BrowserServiceManager({
      servicePath: path.join(process.cwd(), 'browser-agent'),
      port: parseInt(process.env.BROWSER_AGENT_PORT || '8001'), // Main API port
      maxRetries: 5,
      retryDelay: 3000,
      healthCheckInterval: 30000
    });
  }
  return browserServiceManager;
}
