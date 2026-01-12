import { create } from 'zustand';
import storeService from '../services/store';
import { message } from 'antd';

export interface userSettings {
  useSound: boolean;
  rollStandard: number;
  pitchStandard: number;
  yawStandard: number;
  sensitivity: number;
}

// 默认设置
const defaultSettings = {
  useSound: true,
  rollStandard: 10,
  pitchStandard: 20,
  yawStandard: 10,
  sensitivity: 0.5,
};


interface StoreState {
  userSettings: userSettings;
  loadSettings: () => Promise<userSettings>;
  setUserSettings: (settings: userSettings) => Promise<void>;
}

const userSettingStore = create<StoreState>((set) => ({
  // 初始使用默认设置
  userSettings: defaultSettings,

  // 更新设置到全局store
  setUserSettings: async (settings) => {
    try {
      await storeService.saveSettings(settings);
      set({ userSettings: settings });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },
  // 从数据库加载到状态
  loadSettings: async () => {
    try {
      const savedSettings = await window.electron.settings.get();
      if (savedSettings) {
        set({ userSettings: savedSettings });
        console.log(savedSettings)
        return savedSettings;
      } else {
        // 如果数据库中没有设置，则新建一个默认设置
        set({ userSettings: defaultSettings });
        await storeService.saveSettings(defaultSettings);
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      message.error('Error loading settings:', error);
      return defaultSettings;
    }
  },
}));

// 初始化时加载设置
storeService.getSettings().then((settings) => {
  userSettingStore.setState({ userSettings: settings });
});

// 监听设置变化
storeService.onSettingsChange((newValue) => {
  userSettingStore.setState({ userSettings: newValue });
});

export default userSettingStore;
