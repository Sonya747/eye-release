import dayjs from "dayjs";

// types.ts
export interface ScreenSessionData {
  date: string;
  hourly_usage: Record<string, number>;
}

export interface PostureMetric {
  timestamp: string;
  pitch: number;
  yaw: number;
  roll: number;
}

export interface AlertCorrelation {
  date: string;
  total_duration_hours: number;
  alert_count: number;
}

export type DateRange = [dayjs.Dayjs, dayjs.Dayjs];
