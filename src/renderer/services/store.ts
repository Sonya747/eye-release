import ElectronStore from 'electron-store';

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

// 创建 store 实例
const store = new ElectronStore<Settings>({
  name: 'settings', // 存储文件名
  defaults: defaultSettings, // 默认值
  watch: true, // 启用文件监视
  schema: {
    useSound: { type: 'boolean', default: true },
    rollThreshold: { type: 'number', default: 10 },
    pitchThreshold: { type: 'number', default: 20 },
    yawThreshold: { type: 'number', default: 10 },
    distance: { type: 'number', default: 100 },
  },
});

// 获取设置
export const getSettings = (): Settings => {
  const settings = store.get('') as Settings;
  return settings || defaultSettings;
};

// 保存设置
export const saveSettings = (settings: Settings): void => {
  Object.entries(settings).forEach(([key, value]) => {
    store.set(key, value);
  });
};

// 监听设置变化
export const onSettingsChange = (callback: (newValue: Settings, oldValue: Settings) => void) => {
  const unsubscribe = store.onDidAnyChange((newValue, oldValue) => {
    callback(newValue as Settings, oldValue as Settings);
  });
  return unsubscribe;
};

export default {
  getSettings,
  saveSettings,
  onSettingsChange,
}; 