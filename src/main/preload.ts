import { contextBridge, ipcRenderer } from 'electron';
import type { Settings } from './services/store';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    // ... existing exposed methods ...

    // Settings operations
    settings: {
      get: () => ipcRenderer.invoke('settings:get'),
      save: (settings: Settings) => ipcRenderer.invoke('settings:save', settings),
      onChanged: (callback: (newValue: Settings, oldValue: Settings) => void) => {
        const subscription = (_event: any, newValue: Settings, oldValue: Settings) => {
          callback(newValue, oldValue);
        };
        ipcRenderer.on('settings:changed', subscription);
        return () => {
          ipcRenderer.removeListener('settings:changed', subscription);
        };
      },
    },
  }
); 