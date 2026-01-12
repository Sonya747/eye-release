/**
 * 姿势计算工具函数
 */

export interface UserSettings {
  pitchStandard: number;
  yawStandard: number;
  rollStandard: number;
  sensitivity: number;
}

/**
 * 计算姿势评分
 * @param pitch 俯仰角
 * @param yaw 偏航角
 * @param roll 翻滚角
 * @param settings 用户设置的标准值
 * @returns 姿势评分 (0-100)
 */
export function calculatePostureScore(
  pitch: number,
  yaw: number,
  roll: number,
  settings: UserSettings
): number {
  const { pitchStandard, yawStandard, rollStandard } = settings;

  // 计算偏差值
  const pitchDeviation = Math.abs(pitch - pitchStandard);
  const yawDeviation = Math.abs(yaw - yawStandard);
  const rollDeviation = Math.abs(roll - rollStandard);

  // 综合评分：100 - 加权偏差
  // 权重：pitch 1.2, yaw 2.0, roll 1.5
  const score =
    100 -
    (pitchDeviation * 1.2 + yawDeviation * 2.0 + rollDeviation * 1.5);

  // 限制在 0-100 范围内
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 保存会话数据到数据库
 */
export async function saveSessionData(data: {
  date: string;
  posture: {
    avg_pitch: number;
    avg_yaw: number;
    avg_roll: number;
    posture_score: number;
    anomaly: boolean;
  };
  alert: {
    total_duration_hours: number;
    alert_count: number;
  };
  screen: {
    hourly_usage: Record<string, number>;
  };
}): Promise<void> {
  try {
    // 保存姿势数据
    await window.electron.database.posture.insert([
      {
        date: data.date,
        avg_pitch: Number(data.posture.avg_pitch.toFixed(1)),
        avg_yaw: Number(data.posture.avg_yaw.toFixed(1)),
        avg_roll: Number(data.posture.avg_roll.toFixed(1)),
        posture_score: data.posture.posture_score,
        anomaly: data.posture.anomaly,
      },
    ]);

    // 保存健康提醒数据
    await window.electron.database.alert.insert([
      {
        date: data.date,
        total_duration_hours: Number(data.alert.total_duration_hours.toFixed(1)),
        alert_count: data.alert.alert_count,
      },
    ]);

    // 保存屏幕使用数据
    await window.electron.database.screen.insert([
      {
        date: data.date,
        hourly_usage: data.screen.hourly_usage,
      },
    ]);

    console.log('会话数据已保存:', data.date);
  } catch (error) {
    console.error('保存会话数据失败:', error);
    // 不抛出错误，避免影响监测功能
  }
}
