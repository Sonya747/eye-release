import type { Settings } from '../../main/services/store';

/**
 * 这里由于历史遗留，字段命名和前端状态src/renderer/store/index.ts中不一致
 * 字段意义依照注释
 */
// 默认设置
const defaultSettings: Settings = {
  useSound: true, //是否使用声音提示
  rollStandard: 10, //标准roll角度
  pitchStandard: 20, //标准pitch角度
  yawStandard: 10, //标准yaw角度
  sensitivity: 0.5, //偏移灵敏度
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
export const onSettingsChange = (callback: (event:any,data:{newValue: Settings, oldValue: Settings}) => void) => {
  return window.electron.settings.onChanged(callback);
};

export default {
  getSettings,
  saveSettings,
  onSettingsChange,
}; 