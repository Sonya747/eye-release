import type { BrowserWindow } from 'electron';

// 定义设置的类型
export interface Settings {
  useSound: boolean;
  rollThreshold: number;
  pitchThreshold: number;
  yawThreshold: number;
  distance: number;
}

// 默认设置
const defaultSettings: Settings = {
  useSound: true,
  rollThreshold: 10,
  pitchThreshold: 20,
  yawThreshold: 10,
  distance: 100,
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
        rollThreshold: { type: 'number', default: 10 },
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