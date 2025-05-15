import { create } from 'zustand';
import storeService, { Settings } from '../services/store';

// 默认设置
const defaultSettings = {
  useSound: true,
  rollThreshold: 10,
  pitchThreshold: 20,
  yawThreshold: 10,
  distance: 100,
};

// 从数据库加载设置
const loadSettings = async () => {
  try {
    const savedSettings = await window.electron.settings.get();
    return savedSettings || defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

interface StoreState {
  userSettings: Settings;
  setUserSettings: (settings: Settings) => Promise<void>;
}

const useStore = create<StoreState>((set) => ({
  // 初始使用默认设置
  userSettings: {
    useSound: true,
    rollThreshold: 10,
    pitchThreshold: 20,
    yawThreshold: 10,
    distance: 100,
  },
  
  // 更新设置
  setUserSettings: async (settings) => {
    try {
      await storeService.saveSettings(settings);
      set({ userSettings: settings });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },
}));

// 初始化时加载设置
storeService.getSettings().then((settings) => {
  useStore.setState({ userSettings: settings });
});

// 监听设置变化
storeService.onSettingsChange((newValue) => {
  useStore.setState({ userSettings: newValue });
});

export default useStore;
