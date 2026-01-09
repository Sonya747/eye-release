import { IpcMainInvokeEvent, ipcMain } from "electron";
import {
  openDirectoryDialog,
  openFileDialog,
} from "./functions/electron/dialog";
import { isAFile, isDirectory } from "./functions/node/fileSystem";
import { getSettings, saveSettings, onSettingsChange, type Settings } from "./services/store";
import {
  getScreenData,
  insertScreenData,
  hasScreenData,
  getAlertData,
  insertAlertData,
  hasAlertData,
  getPostureData,
  insertPostureData,
  hasPostureData,
} from "./services/database";

// Wraps the 'main' process functions into a function that accepts electron
//  events of the type IpcMainInvokeEvent while allowing inputs from the
//  'renderer' process side of the application
function ipcEventWrapper<Input, Output>(mainProcessFn: (arg: Input) => Output) {
  return (_event: IpcMainInvokeEvent, args: Input) => mainProcessFn(args);
}

// The following functions were originally part of the the 'main.ts' file.
//    Along with the 'preload.ts', these functions are what allow the
//    'main' and 'renderer' processes to interact.
export default function ipcHandler(mainWindow: Electron.BrowserWindow) {
  // Open the DevTools. (comment in/out)
  // mainWindow.webContents.openDevTools();

  // Toggle resizable window (comment in/out)
  // mainWindow.setResizable(false);

  // IPC communication - electron:dialog
  ipcMain.handle("dialog:openDirectory", ipcEventWrapper(openDirectoryDialog));
  ipcMain.handle("dialog:openFile", ipcEventWrapper(openFileDialog));

  // IPC communication - node:fs
  ipcMain.handle("node:fs.statSync.isAFile", ipcEventWrapper(isAFile));
  ipcMain.handle("node:fs.statSync.isDirectory", ipcEventWrapper(isDirectory));

  // IPC communication - settings
  ipcMain.handle("settings:get", async () => {
    try {
      return await getSettings();
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  });

  ipcMain.handle("settings:save", async (_, settings: Settings) => {
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

  //注册 IPC 处理器 
  //为三个数据类型的数据库操作注册 IPC handlers
  //支持 get、insert、has

  ipcMain.handle("database:screen:get", async (_, startDate: string, endDate: string) => {
    try {
      return getScreenData(startDate, endDate);
    } catch (error) {
      console.error('Error getting screen data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:screen:insert", async (_, data: any[]) => {
    try {
      insertScreenData(data);
      return true;
    } catch (error) {
      console.error('Error inserting screen data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:screen:has", async (_, startDate: string, endDate: string) => {
    try {
      return hasScreenData(startDate, endDate);
    } catch (error) {
      console.error('Error checking screen data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:alert:get", async (_, startDate: string, endDate: string) => {
    try {
      return getAlertData(startDate, endDate);
    } catch (error) {
      console.error('Error getting alert data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:alert:insert", async (_, data: any[]) => {
    try {
      insertAlertData(data);
      return true;
    } catch (error) {
      console.error('Error inserting alert data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:alert:has", async (_, startDate: string, endDate: string) => {
    try {
      return hasAlertData(startDate, endDate);
    } catch (error) {
      console.error('Error checking alert data:', error);
      throw error;
    }
  });

  // IPC communication - database: posture metrics
  ipcMain.handle("database:posture:get", async (_, startDate: string, endDate: string) => {
    try {
      return getPostureData(startDate, endDate);
    } catch (error) {
      console.error('Error getting posture data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:posture:insert", async (_, data: any[]) => {
    try {
      insertPostureData(data);
      return true;
    } catch (error) {
      console.error('Error inserting posture data:', error);
      throw error;
    }
  });

  ipcMain.handle("database:posture:has", async (_, startDate: string, endDate: string) => {
    try {
      return hasPostureData(startDate, endDate);
    } catch (error) {
      console.error('Error checking posture data:', error);
      throw error;
    }
  });
}
