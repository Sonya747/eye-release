import dayjs from "dayjs";
import { ScreenSessionData, AlertCorrelation } from "./types";

// 增强版时间范围处理（支持动态模式）
const adjustTimeRange = (timeRange: [dayjs.Dayjs, dayjs.Dayjs]) => {
  const maxRangeStart = dayjs().subtract(90, 'day'); // 最大允许查询3个月
  const [start, end] = timeRange;
  
  return {
    adjustedStart: start.isBefore(maxRangeStart) ? maxRangeStart : start,
    adjustedEnd: end.isAfter(dayjs()) ? dayjs() : end
  };
};

// 智能数据生成器
const generateScreenData = (days: number, startDate: dayjs.Dayjs) => {
  return Array.from({ length: days }, (_, i) => {
    const currentDate = startDate.add(i, 'day');
    const isWeekend = [0, 6].includes(currentDate.day());
    const isHoliday = Math.random() < 0.1; // 10%概率生成节假日模式

    return {
      date: currentDate.format("YYYY-MM-DD"),
      hourly_usage: Object.fromEntries(
        Array.from({ length: 24 }, (_, hour) => {
          let value = 0;
          
          // 生成逻辑优化
          if (isHoliday) {
            value = hour >= 10 && hour <= 22 ? 
              Number((Math.random() * 4 + 2).toFixed(2)) : 
              Math.random() * 1.5;
          } else if (isWeekend) {
            value = hour >= 9 && hour <= 23 ? 
              Number((Math.random() * 3 + 1).toFixed(2)) : 
              Math.random() * 0.8;
          } else {
            value = hour >= 8 && hour <= 19 ? 
              Number((Math.random() * 3.5 + 0.5).toFixed(2)) : 
              Math.random() * 0.3;
          }

          // 添加随机异常峰值
          if (Math.random() < 0.05) {
            value *= (2 + Math.random() * 3);
            value =Number(Math.min(value, 24).toFixed(2));
          }

          return [hour.toString().padStart(2, "0"), Number(value)];
        })
      )
    };
  });
};

export type DailyPostureMetric = {
  date: string;
  avg_pitch: number;    // 俯仰角 (15-35度范围)
  avg_yaw: number;      // 偏航角 (-15-15度) 
  avg_roll: number;     // 翻滚角 (10-30度)
  posture_score: number;
  anomaly?: boolean;
};

export const generateDailyPostureData = (start: dayjs.Dayjs, end: dayjs.Dayjs): DailyPostureMetric[] => {
  const days = end.diff(start, 'day') + 1;
  let baseValues = {
    pitch: 25,
    yaw: 0,
    roll: 20
  };

  return Array.from({ length: days }, (_, i) => {
    const currentDate = start.add(i, 'day');
    const dayOfWeek = currentDate.day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // ==== 独立波动模式 ====
    // 俯仰角：日间波动 + 长期趋势
    const pitchVariation = 
      // 日周期波动（每天工作时段低头）
      5 * Math.sin((i % 7) * Math.PI / 3.5) +
      // 周趋势（每周后期逐渐低头）
      0.3 * (i % 14) +
      // 随机噪声
      (Math.random() - 0.5) * 2;

    // 偏航角：低频波动 + 随机跳跃
    const yawVariation =
      // 月周期波动
      8 * Math.sin(i / 30 * Math.PI * 2) +
      // 每小时微小变化（模拟自然晃动）
      3 * Math.sin(i * Math.PI / 6) +
      // 突发性偏移（10%概率）
      (Math.random() < 0.1 ? (Math.random() - 0.5) * 10 : 0);

    // 翻滚角：缓慢漂移 + 脉冲变化
    const rollVariation =
      // 季度趋势
      0.1 * Math.sin(i / 90 * Math.PI) +
      // 每周重置趋势
      2 * Math.cos((i % 7) * Math.PI / 3) +
      // 异常脉冲（5%概率）
      (Math.random() < 0.05 ? (Math.random() - 0.5) * 15 : 0);

    // ==== 动态基准调整 ====
    // 每月基准变化
    if (i % 30 === 0) {
      baseValues = {
        pitch: 22 + Math.random() * 6,
        yaw: (Math.random() - 0.5) * 4,
        roll: 18 + Math.random() * 4
      };
    }

    // ==== 计算最终值 ====
    const calculateValue = (base: number, variation: number, range: [number, number]) => {
      let value = base + variation;
      // 应用周末效应
      if (isWeekend) {
        value += dayOfWeek === 0 ? 2 : -1; // 周日抬头，周六轻微低头
      }
      // 限制生理范围
      return Math.min(Math.max(value, range[0]), range[1]);
    };

    const avg_pitch = calculateValue(baseValues.pitch, pitchVariation, [15, 35]);
    const avg_yaw = calculateValue(baseValues.yaw, yawVariation, [-15, 15]);
    const avg_roll = calculateValue(baseValues.roll, rollVariation, [10, 30]);

    // ==== 异常检测 ====
    const isAnomaly = (
      Math.abs(avg_pitch - baseValues.pitch) > 8 ||
      Math.abs(avg_yaw) > 12 ||
      Math.abs(avg_roll - baseValues.roll) > 10
    );

    // ==== 综合评分 ====
    const deviationScore = 
      100 - 
      (Math.abs(avg_pitch - 25) * 1.2 + 
       Math.abs(avg_yaw) * 2 +
       Math.abs(avg_roll - 20) * 1.5);
    const posture_score = Math.max(0, Math.min(100, Math.round(deviationScore)));

    return {
      date: currentDate.format("YYYY-MM-DD"),
      avg_pitch: Number(avg_pitch.toFixed(1)),
      avg_yaw: Number(avg_yaw.toFixed(1)),
      avg_roll: Number(avg_roll.toFixed(1)),
      posture_score,
      anomaly: isAnomaly
    };
  });
};

// 健康数据生成器（带动态相关性）
const generateAlertData = (days: number, startDate: dayjs.Dayjs) => {
  const baseData = Array.from({ length: days }, (_, i) => {
    const date = startDate.add(i, 'day');
    const baseValue = Math.random() * 8 + 4;
    const correlationFactor = 0.7 + Math.random() * 0.3; // 动态相关系数
    
    return {
      date: date.format("YYYY-MM-DD"),
      total_duration_hours: Number(baseValue.toFixed(1)),
      alert_count: Math.floor(
        Math.pow(baseValue * correlationFactor, 1.5) + Math.random() * 3
      )
    };
  });

  // 智能插入异常点
  const insertAnomalies = (data: AlertCorrelation[]) => {
    const anomalyDays = Math.floor(days * 0.1); // 10%异常日
    for (let i = 0; i < anomalyDays; i++) {
      const index = Math.floor(Math.random() * days);
      data[index] = {
        date: data[index].date,
        total_duration_hours: Number((Math.random() * 15 + 6).toFixed(1)),
        alert_count: Math.floor(Math.random() * 20 + 10)
      };
    }
    return data;
  };

  return insertAnomalies(baseData);
};

const mockRequest = <T>(data: T): Promise<T> => 
  new Promise((resolve) => 
    setTimeout(() => 
      resolve(data) ,
      Math.random() * 800 + 200 // 200-1000ms延迟
    )
  );

export const fetchScreenData = (
  timeRange: [dayjs.Dayjs, dayjs.Dayjs]
): Promise<ScreenSessionData[]> => {
  const { adjustedStart, adjustedEnd } = adjustTimeRange(timeRange);
  const days = adjustedEnd.diff(adjustedStart, 'day') + 1;
  return mockRequest(generateScreenData(days, adjustedStart));
};


export const fetchAlertData = (
  timeRange: [dayjs.Dayjs, dayjs.Dayjs]
): Promise<AlertCorrelation[]> => {
  const { adjustedStart, adjustedEnd } = adjustTimeRange(timeRange);
  const days = adjustedEnd.diff(adjustedStart, 'day') + 1;
  return mockRequest(generateAlertData(days, adjustedStart));
};

// API请求函数修改
export const fetchPostureData = (
  timeRange: [dayjs.Dayjs, dayjs.Dayjs]
): Promise<DailyPostureMetric[]> => {
  const { adjustedStart, adjustedEnd } = adjustTimeRange(timeRange);
  return mockRequest(
    generateDailyPostureData(adjustedStart, adjustedEnd)
  );
};