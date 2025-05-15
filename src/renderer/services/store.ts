import type { Settings } from '../../main/services/store';

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

// 获取设置
export const getSettings = async (): Promise<Settings> => {
  try {
    const settings = await window.electron.settings.get();
    return settings || defaultSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
};

// 保存设置
export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    await window.electron.settings.save(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

// 监听设置变化
export const onSettingsChange = (callback: (newValue: Settings, oldValue: Settings) => void) => {
  return window.electron.settings.onChanged(callback);
};

export default {
  getSettings,
  saveSettings,
  onSettingsChange,
}; 