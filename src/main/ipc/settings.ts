import { ipcMain } from 'electron';
import { getSettings, saveSettings, onSettingsChange, type Settings } from '../services/store';

export function setupSettingsIPC(mainWindow: Electron.BrowserWindow) {
  // 获取设置
  ipcMain.handle('get-settings', async () => {
    try {
      return await getSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  // 保存设置
  ipcMain.handle('save-settings', async (_, settings: Settings) => {
    try {
      await saveSettings(settings);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  });

  // 监听设置变化
  onSettingsChange((newValue, oldValue) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-changed', { newValue, oldValue });
    }
  }).catch(error => {
    console.error('Error setting up settings change listener:', error);
  });
} 