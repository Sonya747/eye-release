import type { ScreenSessionData, AlertCorrelation } from '../../renderer/pages/Report/types';

interface Settings {
  useSound: boolean;
  rollThreshold: number;
  pitchThreshold: number;
  yawThreshold: number;
  distance: number;
}

interface DailyPostureMetric {
  date: string;
  avg_pitch: number;
  avg_yaw: number;
  avg_roll: number;
  posture_score: number;
  anomaly?: boolean;
}

interface ElectronAPI {
  settings: {
    get: () => Promise<Settings>;
    save: (settings: Settings) => Promise<boolean>;
    onChanged: (callback: (event: any, data: { newValue: Settings; oldValue: Settings }) => void) => () => void;
  };
  database: {
    screen: {
      get: (startDate: string, endDate: string) => Promise<ScreenSessionData[]>;
      insert: (data: ScreenSessionData[]) => Promise<boolean>;
      has: (startDate: string, endDate: string) => Promise<boolean>;
    };
    alert: {
      get: (startDate: string, endDate: string) => Promise<AlertCorrelation[]>;
      insert: (data: AlertCorrelation[]) => Promise<boolean>;
      has: (startDate: string, endDate: string) => Promise<boolean>;
    };
    posture: {
      get: (startDate: string, endDate: string) => Promise<DailyPostureMetric[]>;
      insert: (data: DailyPostureMetric[]) => Promise<boolean>;
      has: (startDate: string, endDate: string) => Promise<boolean>;
    };
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {}; 