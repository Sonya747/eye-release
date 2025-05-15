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
    const savedSettings = await window.Electron.settings.get();
    return savedSettings || defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

interface StoreState {
  userSettings: Settings;
  setUserSettings: (settings: Settings) => void;
}

const useStore = create<StoreState>((set) => ({
  // 初始化时从 electron-store 加载设置
  userSettings: storeService.getSettings(),
  
  // 更新设置
  setUserSettings: (settings) => {
    // 保存到 electron-store
    storeService.saveSettings(settings);
    // 更新状态
    set({ userSettings: settings });
  },
}));

// 监听设置变化
storeService.onSettingsChange((newValue) => {
  useStore.setState({ userSettings: newValue });
});

// 初始化时加载设置
loadSettings().then((settings) => {
  useStore.setState({ userSettings: settings });
});

export default useStore;
