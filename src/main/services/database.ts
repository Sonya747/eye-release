import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

// 类型定义（与 renderer 中的类型保持一致）
export interface ScreenSessionData {
  date: string;
  hourly_usage: Record<string, number>;
}

export interface AlertCorrelation {
  date: string;
  total_duration_hours: number;
  alert_count: number;
}

export interface DailyPostureMetric {
  date: string;
  avg_pitch: number;
  avg_yaw: number;
  avg_roll: number;
  posture_score: number;
  anomaly?: boolean;
}

let db: Database.Database | null = null;

// 初始化数据库
const initDatabase = (): Database.Database => {
  if (db) {
    return db;
  }

  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'report_data.db');
  console.log("数据库路径",dbPath)
  db = new Database(dbPath);
  
  // 启用外键约束
  db.pragma('foreign_keys = ON');

  // 创建表结构
  //创建三个表：screen_sessions、alert_correlations、posture_metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS screen_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      hourly_usage TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alert_correlations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_duration_hours REAL NOT NULL,
      alert_count INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posture_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      avg_pitch REAL NOT NULL,
      avg_yaw REAL NOT NULL,
      avg_roll REAL NOT NULL,
      posture_score INTEGER NOT NULL,
      anomaly INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_screen_sessions_date ON screen_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_alert_correlations_date ON alert_correlations(date);
    CREATE INDEX IF NOT EXISTS idx_posture_metrics_date ON posture_metrics(date);
  `);

  return db;
};

// 获取数据库实例
const getDatabase = (): Database.Database => {
  return initDatabase();
};

// Screen Session Data 操作
export const getScreenData = (startDate: string, endDate: string): ScreenSessionData[] => {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT date, hourly_usage 
    FROM screen_sessions 
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `);
  
  const rows = stmt.all(startDate, endDate) as Array<{ date: string; hourly_usage: string }>;
  
  return rows.map(row => ({
    date: row.date,
    hourly_usage: JSON.parse(row.hourly_usage)
  }));
};

export const insertScreenData = (data: ScreenSessionData[]): void => {
  const database = getDatabase();
  
  const insertMany = database.transaction((items: ScreenSessionData[]) => {
    const insert = database.prepare(`
      INSERT OR REPLACE INTO screen_sessions (date, hourly_usage)
      VALUES (?, ?)
    `);
    for (const item of items) {
      insert.run(item.date, JSON.stringify(item.hourly_usage));
    }
  });
  
  insertMany(data);
};

export const hasScreenData = (startDate: string, endDate: string): boolean => {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT COUNT(*) as count 
    FROM screen_sessions 
    WHERE date >= ? AND date <= ?
  `);
  
  const result = stmt.get(startDate, endDate) as { count: number };
  return result.count > 0;
};

// Alert Correlation 操作
export const getAlertData = (startDate: string, endDate: string): AlertCorrelation[] => {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT date, total_duration_hours, alert_count 
    FROM alert_correlations 
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `);
  
  return stmt.all(startDate, endDate) as AlertCorrelation[];
};

export const insertAlertData = (data: AlertCorrelation[]): void => {
  const database = getDatabase();
  
  const insertMany = database.transaction((items: AlertCorrelation[]) => {
    const insert = database.prepare(`
      INSERT OR REPLACE INTO alert_correlations (date, total_duration_hours, alert_count)
      VALUES (?, ?, ?)
    `);
    for (const item of items) {
      insert.run(item.date, item.total_duration_hours, item.alert_count);
    }
  });
  
  insertMany(data);
};

export const hasAlertData = (startDate: string, endDate: string): boolean => {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT COUNT(*) as count 
    FROM alert_correlations 
    WHERE date >= ? AND date <= ?
  `);
  
  const result = stmt.get(startDate, endDate) as { count: number };
  return result.count > 0;
};

// Posture Metrics 操作
export const getPostureData = (startDate: string, endDate: string): DailyPostureMetric[] => {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT date, avg_pitch, avg_yaw, avg_roll, posture_score, anomaly
    FROM posture_metrics 
    WHERE date >= ? AND date <= ?
    ORDER BY date ASC
  `);
  
  const rows = stmt.all(startDate, endDate) as Array<{
    date: string;
    avg_pitch: number;
    avg_yaw: number;
    avg_roll: number;
    posture_score: number;
    anomaly: number;
  }>;
  
  return rows.map(row => ({
    date: row.date,
    avg_pitch: row.avg_pitch,
    avg_yaw: row.avg_yaw,
    avg_roll: row.avg_roll,
    posture_score: row.posture_score,
    anomaly: row.anomaly === 1
  }));
};

export const insertPostureData = (data: DailyPostureMetric[]): void => {
  const database = getDatabase();
  
  const insertMany = database.transaction((items: DailyPostureMetric[]) => {
    const insert = database.prepare(`
      INSERT OR REPLACE INTO posture_metrics (date, avg_pitch, avg_yaw, avg_roll, posture_score, anomaly)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const item of items) {
      insert.run(
        item.date,
        item.avg_pitch,
        item.avg_yaw,
        item.avg_roll,
        item.posture_score,
        item.anomaly ? 1 : 0
      );
    }
  });
  
  insertMany(data);
};

export const hasPostureData = (startDate: string, endDate: string): boolean => {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT COUNT(*) as count 
    FROM posture_metrics 
    WHERE date >= ? AND date <= ?
  `);
  
  const result = stmt.get(startDate, endDate) as { count: number };
  return result.count > 0;
};

// 清空所有数据
export const resetAllData = (): void => {
  const database = getDatabase();
  database.exec(`
    DELETE FROM screen_sessions;
    DELETE FROM alert_correlations;
    DELETE FROM posture_metrics;
  `);
};

// 关闭数据库连接
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

