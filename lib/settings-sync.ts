/**
 * Settings synchronization utility
 * Ensures settings are consistent across components and storage
 */

type SettingsChangeCallback = (key: string, value: any) => void;

class SettingsSync {
  private listeners: Set<SettingsChangeCallback> = new Set();
  private syncTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Listen for storage events from other tabs/windows
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  /**
   * Subscribe to settings changes
   */
  subscribe(callback: SettingsChangeCallback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get a setting value with validation
   */
  get(key: string, defaultValue?: any): any {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      // First try to get from individual key
      let value = localStorage.getItem(key);
      
      // If not found, check if it's an image/video setting and look in unified storage
      if (!value) {
        if (key.startsWith('image')) {
          const unified = localStorage.getItem('imageGenerationSettings');
          if (unified) {
            try {
              // Validate JSON before parsing
              if (!unified.trim().startsWith('{') || !unified.trim().endsWith('}')) {
                console.warn(`[SettingsSync] Invalid JSON structure for imageGenerationSettings, clearing...`);
                localStorage.removeItem('imageGenerationSettings');
                return defaultValue;
              }
              
              const parsed = JSON.parse(unified);
              const fieldMap: Record<string, string> = {
                'imageGenerationModel': 'model',
                'imageEditingModel': 'editingModel',
                'imageStyle': 'style',
                'imageSize': 'size',
                'imageQuality': 'quality'
              };
              const field = fieldMap[key];
              if (field && parsed[field]) {
                value = parsed[field];
              }
            } catch (e) {
              console.error(`[SettingsSync] Failed to parse unified settings, clearing corrupted data:`, e);
              localStorage.removeItem('imageGenerationSettings');
            }
          }
        } else if (key.startsWith('video')) {
          const unified = localStorage.getItem('videoGenerationSettings');
          if (unified) {
            try {
              // Validate JSON before parsing
              if (!unified.trim().startsWith('{') || !unified.trim().endsWith('}')) {
                console.warn(`[SettingsSync] Invalid JSON structure for videoGenerationSettings, clearing...`);
                localStorage.removeItem('videoGenerationSettings');
                return defaultValue;
              }
              
              const parsed = JSON.parse(unified);
              const fieldMap: Record<string, string> = {
                'videoModel': 'model',
                'videoDuration': 'duration',
                'videoAspectRatio': 'aspectRatio'
              };
              const field = fieldMap[key];
              if (field && parsed[field]) {
                value = parsed[field];
              }
            } catch (e) {
              console.error(`[SettingsSync] Failed to parse unified settings, clearing corrupted data:`, e);
              localStorage.removeItem('videoGenerationSettings');
            }
          }
        }
      }
      
      // Log for debugging
      console.log(`[SettingsSync] Getting ${key}:`, value || defaultValue);
      
      return value || defaultValue;
    } catch (error) {
      console.error(`[SettingsSync] Unexpected error in get() for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set a setting value and notify listeners
   */
  set(key: string, value: any) {
    if (typeof window === 'undefined') return;
    
    const oldValue = this.get(key); // Use get to check both individual and unified
    
    // Only update if value actually changed
    if (oldValue !== value) {
      console.log(`[SettingsSync] Setting ${key}:`, value, '(was:', oldValue, ')');
      
      // Always set the individual key for backward compatibility
      localStorage.setItem(key, value);
      
      // Also update unified storage if it's an image/video setting
      if (key.startsWith('image')) {
        const fieldMap: Record<string, string> = {
          'imageGenerationModel': 'model',
          'imageEditingModel': 'editingModel',
          'imageStyle': 'style',
          'imageSize': 'size',
          'imageQuality': 'quality'
        };
        const field = fieldMap[key];
        if (field) {
          try {
            const unified = localStorage.getItem('imageGenerationSettings');
            let settings = {};
            
            if (unified) {
              try {
                // Validate JSON before parsing
                if (unified.trim().startsWith('{') && unified.trim().endsWith('}')) {
                  settings = JSON.parse(unified);
                } else {
                  console.warn(`[SettingsSync] Invalid JSON in imageGenerationSettings, resetting...`);
                }
              } catch (e) {
                console.warn(`[SettingsSync] Failed to parse existing settings, creating new:`, e);
              }
            }
            
            settings[field] = value;
            localStorage.setItem('imageGenerationSettings', JSON.stringify(settings));
            console.log(`[SettingsSync] Also updated unified imageGenerationSettings.${field}`);
          } catch (e) {
            console.error(`[SettingsSync] Failed to update unified settings:`, e);
          }
        }
      } else if (key.startsWith('video')) {
        const fieldMap: Record<string, string> = {
          'videoModel': 'model',
          'videoDuration': 'duration',
          'videoAspectRatio': 'aspectRatio'
        };
        const field = fieldMap[key];
        if (field) {
          try {
            const unified = localStorage.getItem('videoGenerationSettings');
            let settings = {};
            
            if (unified) {
              try {
                // Validate JSON before parsing
                if (unified.trim().startsWith('{') && unified.trim().endsWith('}')) {
                  settings = JSON.parse(unified);
                } else {
                  console.warn(`[SettingsSync] Invalid JSON in videoGenerationSettings, resetting...`);
                }
              } catch (e) {
                console.warn(`[SettingsSync] Failed to parse existing settings, creating new:`, e);
              }
            }
            
            settings[field] = value;
            localStorage.setItem('videoGenerationSettings', JSON.stringify(settings));
            console.log(`[SettingsSync] Also updated unified videoGenerationSettings.${field}`);
          } catch (e) {
            console.error(`[SettingsSync] Failed to update unified settings:`, e);
          }
        }
      }
      
      // Notify all listeners
      this.notifyListeners(key, value);
      
      // Force a sync check after a short delay
      this.scheduleSyncCheck();
    }
  }

  /**
   * Batch update multiple settings
   */
  batchSet(updates: Record<string, any>) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Handle storage changes from other tabs/windows
   */
  private handleStorageChange(event: StorageEvent) {
    try {
      if (event.key && event.newValue !== null) {
        console.log(`[SettingsSync] External change detected for ${event.key}:`, event.newValue);
        
        // Validate all JSON-like values before notifying listeners
        // Check if the value looks like it should be JSON (starts with { or [)
        const trimmedValue = event.newValue.trim();
        if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[') || 
            event.key === 'imageGenerationSettings' || 
            event.key === 'videoGenerationSettings' ||
            event.key === 'chatGenerationSettings' ||
            event.key.endsWith('Settings') ||
            event.key === 'chats' ||
            event.key === 'messages') {
          try {
            // Try to parse to validate
            JSON.parse(event.newValue);
          } catch (e) {
            console.error(`[SettingsSync] Invalid JSON in storage event for ${event.key}, clearing corrupted data:`, e);
            // Clear the corrupted data
            localStorage.removeItem(event.key);
            // Don't propagate invalid data
            return;
          }
        }
        
        this.notifyListeners(event.key, event.newValue);
      }
    } catch (error) {
      console.error('[SettingsSync] Error handling storage change:', error);
    }
  }

  /**
   * Notify all listeners of a change
   */
  private notifyListeners(key: string, value: any) {
    this.listeners.forEach(callback => {
      try {
        callback(key, value);
      } catch (error) {
        console.error('[SettingsSync] Error in listener:', error);
      }
    });
  }

  /**
   * Schedule a sync check to ensure consistency
   */
  private scheduleSyncCheck() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    this.syncTimeout = setTimeout(() => {
      this.validateSettings();
    }, 100);
  }

  /**
   * Validate and fix known settings issues
   */
  private validateSettings() {
    const validModels = [
      'gpt-image-1',
      'flux-kontext-max',
      'flux-kontext-pro',
      'flux-dev-ultra-fast'
    ];
    
    // Check image generation model
    const imageModel = this.get('imageGenerationModel');
    if (imageModel === 'wavespeed') {
      console.log('[SettingsSync] Fixing legacy "wavespeed" value');
      this.set('imageGenerationModel', 'flux-dev-ultra-fast');
    } else if (imageModel && !validModels.includes(imageModel)) {
      console.warn(`[SettingsSync] Invalid imageGenerationModel: ${imageModel}`);
    }
    
    // Check editing model
    const editModel = this.get('imageEditingModel');
    if (editModel === 'wavespeed') {
      console.log('[SettingsSync] Fixing legacy "wavespeed" value for editing model');
      this.set('imageEditingModel', 'flux-dev-ultra-fast');
    }
  }

  /**
   * Debug utility to log all current settings
   */
  debugLogAllSettings() {
    console.group('[SettingsSync] All Settings');
    console.log('imageGenerationModel:', this.get('imageGenerationModel', 'not set'));
    console.log('imageEditingModel:', this.get('imageEditingModel', 'not set'));
    console.log('imageStyle:', this.get('imageStyle', 'not set'));
    console.log('imageSize:', this.get('imageSize', 'not set'));
    console.log('imageQuality:', this.get('imageQuality', 'not set'));
    console.log('videoModel:', this.get('videoModel', 'not set'));
    console.log('videoDuration:', this.get('videoDuration', 'not set'));
    console.log('videoAspectRatio:', this.get('videoAspectRatio', 'not set'));
    console.log('selectedModel:', this.get('selectedModel', 'not set'));
    console.groupEnd();
  }
}

// Create singleton instance
export const settingsSync = new SettingsSync();

// Export for console debugging
if (typeof window !== 'undefined') {
  (window as any).settingsSync = settingsSync;
  console.log('[SettingsSync] Available in console as window.settingsSync');
  console.log('Try: settingsSync.debugLogAllSettings()');
}