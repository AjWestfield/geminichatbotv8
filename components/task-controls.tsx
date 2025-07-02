'use client';

interface TaskControlsProps {
  taskId: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function TaskControls({ taskId, onPause, onResume, onStop }: TaskControlsProps) {
  if (!taskId) return null;

  return (
    <div className="flex space-x-2">
      <button
        onClick={onPause}
        className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors duration-200 flex items-center space-x-1"
        title="Pause current task"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span>Pause</span>
      </button>
      
      <button
        onClick={onResume}
        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors duration-200 flex items-center space-x-1"
        title="Resume paused task"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
        <span>Resume</span>
      </button>
      
      <button
        onClick={onStop}
        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors duration-200 flex items-center space-x-1"
        title="Stop current task"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
        </svg>
        <span>Stop</span>
      </button>
    </div>
  );
}
