interface Settings {
  useSound: boolean;
  rollThreshold: number;
  pitchThreshold: number;
  yawThreshold: number;
  distance: number;
}

interface ElectronAPI {
  settings: {
    get: () => Promise<Settings>;
    save: (settings: Settings) => Promise<boolean>;
    onChanged: (callback: (event: any, data: { newValue: Settings; oldValue: Settings }) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {}; 