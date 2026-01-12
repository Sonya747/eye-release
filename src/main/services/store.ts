import type { BrowserWindow } from 'electron';

/**
 * 这里由于历史遗留，字段命名和前端状态src/renderer/store/index.ts中不一致
 * 字段意义依照注释
 */
// 定义设置的类型
export interface Settings {
  useSound: boolean;
  rollStandard: number;
  pitchStandard: number;
  yawStandard: number;
  sensitivity: number;
}

// 默认设置
const defaultSettings: Settings = {
  useSound: true,
  rollStandard: 10,
  pitchStandard: 20,
  yawStandard: 10,
  sensitivity: 0.5,
};

let store: any = null;

// 初始化 store
const initStore = async () => {
  if (!store) {
    const ElectronStore = (await import('electron-store')).default;
    store = new ElectronStore<Settings>({
      name: 'settings',
      defaults: defaultSettings,
      watch: true,
      schema: {
        useSound: { type: 'boolean', default: true },
        rollStandard: { type: 'number', default: 10 },
        pitchThreshold: { type: 'number', default: 20 },
        yawThreshold: { type: 'number', default: 10 },
        distance: { type: 'number', default: 100 },
      },
    });
  }
  return store;
};

// 获取设置
export const getSettings = async (): Promise<Settings> => {
  const storeInstance = await initStore();
  return storeInstance.store;
};

// 保存设置
export const saveSettings = async (settings: Settings): Promise<void> => {
  const storeInstance = await initStore();
  storeInstance.store = settings;
};

// 监听设置变化
export const onSettingsChange = async (callback: (newValue: Settings, oldValue: Settings) => void) => {
  const storeInstance = await initStore();
  return storeInstance.onDidChange('', callback);
};

export default {
  getSettings,
  saveSettings,
  onSettingsChange,
}; 