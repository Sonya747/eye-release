import { useEffect, useRef, useState } from "react";
import { VideoCameraOutlined } from "@ant-design/icons";
import "./index.css";
import { message } from "antd";
import useSound from "use-sound";
import sound from "../../assets/audio/notification.wav";
import { analyze_video, loadSession } from "@/backend";
//@ts-ignore
import modelPath from '@/assets/models/resnet34.onnx';
import { InferenceSession } from "onnxruntime-web/all";
import userSettingStore from "@/store";
import { PosePredictions } from "@/backend/models/head-predict";
import dayjs from "dayjs";
import { calculatePostureScore, saveSessionData } from "@/utils/postureCalculator";

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playSound] = useSound(sound, { volume: 0.5 });
  const playRef = useRef(false)
  const session = useRef<InferenceSession>()
  const { userSettings } = userSettingStore()

  /**
   * 会话统计数据累加器
   * - startTime: 监测会话开始时间，用于计算总监测时长
   * - pitchSum/yawSum/rollSum: 所有样本的角度累加值，用于计算平均值
   * - sampleCount: 样本总数，用于计算平均值和异常比例
   * - deviationCount: 偏离标准值的样本数量，用于统计提醒次数和异常判断
   * - hourlyMinutes: 按小时统计的监测分钟数，用于生成屏幕使用数据
   * 
   * 【内存优化】
   * - 不存储原始样本数组，只维护累加值
   * - 内存占用固定，不会随监测时长增长（监测1小时和24小时占用相同）
   * - 监测结束时一次性计算聚合数据并保存到数据库
   */
  const sessionStatsRef = useRef<{
    startTime: Date;
    pitchSum: number;
    yawSum: number;
    rollSum: number;
    sampleCount: number;
    deviationCount: number;
    hourlyMinutes: Record<string, number>;
  }>({
    startTime: new Date(),
    pitchSum: 0,
    yawSum: 0,
    rollSum: 0,
    sampleCount: 0,
    deviationCount: 0,
    hourlyMinutes: {},
  });

  /**
   * 重置会话统计数据
   * 1. 开始新的监测会话时初始化累加器
   * 2. 保存数据后清空累加器，准备下次监测
   * 3. 监测时长不足时丢弃数据并重置
   */
  const resetSessionStats = () => {
    sessionStatsRef.current = {
      startTime: new Date(),
      pitchSum: 0,
      yawSum: 0,
      rollSum: 0,
      sampleCount: 0,
      deviationCount: 0,
      hourlyMinutes: {},
    };
  };

  // const [eyeWidth, eyeHeight] = [10, 10]; // TODO :临时的坐标差值骇值

  //卸载释放定时器和session，并保存数据
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      session.current = null;
      
      // 组件卸载时，如果有未保存的数据，尝试保存
      if (sessionStatsRef.current.sampleCount > 0) {
        saveCurrentSessionData().catch((error) => {
          console.error("组件卸载时保存数据失败:", error);
        });
      }
    };
  }, []);

  /**
   * 保存当前会话数据到数据库
   * 
   * 数据聚合流程：
   * 1. 计算监测时长：结束时间 - 开始时间
   * 2. 数据有效性检查：至少监测1分钟且至少2个样本才保存
   * 3. 计算平均值：累加值 / 样本数量
   * 4. 计算姿势评分：基于平均值和用户设置的标准值
   * 5. 判断异常：偏离次数占比 > 30% 视为异常
   * 6. 转换小时数据：将分钟数转换为小时数
   * 保存三类数据到数据库：
   * - posture_metrics: 姿势数据（平均值、评分、异常标记）
   * - alert_correlations: 健康提醒数据（监测时长、提醒次数）
   * - screen_sessions: 屏幕使用数据（按小时统计的使用时长）
   * 
   * 数据库层面，使用 INSERT OR REPLACE，确保每天只有一条记录
   */
  const saveCurrentSessionData = async () => {
    const stats = sessionStatsRef.current;
    const endTime = new Date();
    const durationMs = endTime.getTime() - stats.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // 最小监测时长检查（至少1分钟，至少2个样本）
    // 避免保存无效的短时监测数据
    if (durationMs < 60000 || stats.sampleCount < 2) {
      resetSessionStats();
      return;
    }

    // 计算平均值：累加值 / 样本数量
    // 通过累加值反推平均值，不存储所有样本
    const avg_pitch = stats.pitchSum / stats.sampleCount;
    const avg_yaw = stats.yawSum / stats.sampleCount;
    const avg_roll = stats.rollSum / stats.sampleCount;

    // 计算姿势评分：基于平均值和用户设置的标准值计算综合评分（0-100）
    const posture_score = calculatePostureScore(
      avg_pitch,
      avg_yaw,
      avg_roll,
      userSettings
    );

    // 判断异常：偏离次数占比 > 30% 视为异常日
    // 用于在报告中标记需要关注的日期
    const anomaly = stats.deviationCount / stats.sampleCount > 0.3;

    // 计算小时使用数据：将分钟数转换为小时数
    // 用于生成屏幕使用报告（按小时展示使用时长）
    const hourly_usage: Record<string, number> = {};
    Object.keys(stats.hourlyMinutes).forEach((hour) => {
      hourly_usage[hour] = Number((stats.hourlyMinutes[hour] / 60).toFixed(2)); // 分钟转小时
    });

    // 保存数据到数据库（三个表：posture_metrics, alert_correlations, screen_sessions）
    const today = dayjs().format("YYYY-MM-DD");
    await saveSessionData({
      date: today,
      posture: {
        avg_pitch,
        avg_yaw,
        avg_roll,
        posture_score,
        anomaly,
      },
      alert: {
        total_duration_hours: durationHours,
        alert_count: stats.deviationCount,
      },
      screen: {
        hourly_usage,
      },
    });

    // 重置累加器，准备下次监测
    resetSessionStats();
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !session.current) {
      message.error("摄像头调用失败或模型加载失败，请重试")
      return Promise.reject();
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;
    try {
      // 设置 canvas 尺寸为模型输入尺寸
      canvas.width = 320;
      canvas.height = 320;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      // 获取图像数据并直接转换为模型输入格式
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const inputTensor = new Float32Array(1 * 3 * canvas.width * canvas.height);
      for (let c = 0; c < 3; c++) {
        for (let h = 0; h < canvas.height; h++) {
          for (let w = 0; w < canvas.width; w++) {
            const idx = (h * canvas.width + w) * 4 + c;
            const normalizedValue = data[idx] / 255.0;
            inputTensor[c * canvas.width * canvas.height + h * canvas.width + w] = normalizedValue;
          }
        }
      }
      // 直接传递处理后的张量数据 
      const position = await analyze_video(inputTensor, session.current);
      console.log("模型结果", position)

      // 判断是否偏离标准值
      const isDeviation = analyzePosition(position);
      if (isDeviation) {
        if (userSettings.useSound) {
          playSound();
        }
        message.warning("检测到头部姿态偏离标准值，请调整姿势");
      }

      // 更新会话统计数据
      const stats = sessionStatsRef.current;
      
      // 累加角度值（用于计算平均值）
      stats.pitchSum += position.pitch;
      stats.yawSum += position.yaw;
      stats.rollSum += position.roll;
      
      // 累加样本数
      stats.sampleCount += 1;
      
      // 累加偏离次数（用于统计提醒次数和异常判断）
      if (isDeviation) {
        stats.deviationCount += 1;
      }

      // 更新小时统计（用于屏幕使用数据）
      // 每次采样间隔5秒，即 5/60 分钟（约0.083分钟）
      // 按小时分组累加，用于生成按小时展示的使用时长报告
      const currentHour = new Date().getHours().toString().padStart(2, "0");
      stats.hourlyMinutes[currentHour] =
        (stats.hourlyMinutes[currentHour] || 0) + 5 / 60;

    } catch {
      (e) => {
        console.log("分析失败", e)
      }
    }
  }

  const stopCamera = async () => {
    if (stream && isCameraOn) {
      playRef.current = false;
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      session.current = null;

      // 保存会话数据
      try {
        await saveCurrentSessionData();
        message.info("监测模式结束，数据已保存");
      } catch (error) {
        console.error("保存会话数据失败:", error);
        message.info("监测模式结束");
      }
    }
  };

  const startCamera = async () => {
    if (isCameraOn && !stream) return;
    if (playRef.current) return;
    playRef.current = true;

    // 每次开始新的监测会话时，重置累加器并记录开始时间
    resetSessionStats();
    sessionStatsRef.current.startTime = new Date();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
      message.success("检测模式开启");
      // 设置定时器，每5秒发送一帧
      intervalRef.current = setInterval(analyzeFrame, 5000);
    } catch (err) {
      console.error("video stream error", err);
    }
    try {
      session.current = await loadSession(modelPath);
    } catch {
      (e) => {
        message.error("模型加载失败");
        console.log("模型加载失败", e);
      }
    }
  };

  const handleVideoConnect = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("视频自动播放失败:", error);
      });
    }
  };

  //判断角度是否偏离超过阈值 
  const analyzePosition = (position: PosePredictions) => {
    // 检查 pitch (左右倾斜)
    const pitchDeviation = Math.abs(userSettings.pitchStandard) > 0
      ? Math.abs(position.pitch - userSettings.pitchStandard) / Math.abs(userSettings.pitchStandard)
      : Math.abs(position.pitch - userSettings.pitchStandard);
    if (pitchDeviation > userSettings.sensitivity) {
      return true;
    }

    // 检查 roll (前后倾斜)
    const rollDeviation = Math.abs(userSettings.rollStandard) > 0
      ? Math.abs(position.roll - userSettings.rollStandard) / Math.abs(userSettings.rollStandard)
      : Math.abs(position.roll - userSettings.rollStandard);
    if (rollDeviation > userSettings.sensitivity) {
      return true;
    }

    // 检查 yaw (左右转动)
    const yawDeviation = Math.abs(userSettings.yawStandard) > 0
      ? Math.abs(position.yaw - userSettings.yawStandard) / Math.abs(userSettings.yawStandard)
      : Math.abs(position.yaw - userSettings.yawStandard);
    if (yawDeviation > userSettings.sensitivity) {
      return true;
    }

    return false;
  }

  return (
    <div
      className="camera-container"
      style={{ padding: 24, background: "#f0f2f5" }}
    >
      <div
        className="video-container"
        style={{
          position: "relative",
          maxWidth: 800,
          margin: "0 auto",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
          background: "#1a1a1a",
          aspectRatio: "16/9",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          className={`video-element ${isCameraOn ? "connected" : "disconnected"
            }`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
            cursor: "pointer",
            transform: isCameraOn ? "scale(1)" : "scale(0.95)",
          }}
          onCanPlay={handleVideoConnect}
          onClick={isCameraOn ? stopCamera : startCamera}
          onDoubleClick={() => { }}
        />

        {/* 状态指示层 */}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: isCameraOn ? "#52c41a" : "#ff4d4f",
              boxShadow: `0 0 8px ${isCameraOn ? "rgba(82, 196, 26, 0.4)" : "rgba(255, 77, 79, 0.4)"
                }`,
              animation: "breathing 1.5s infinite",
            }}
          />
          <span
            style={{
              color: "white",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              fontSize: 14,
            }}
          >
            {isCameraOn ? "监测中" : "已暂停"}
          </span>
        </div>

        {/* 中心控制按钮 */}
        <div
          className="control"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            cursor: "pointer",
            transition: "all 0.3s",
            opacity: 0.8,
            // ':hover': {
            //   opacity: 1,
            //   transform: 'translate(-50%, -50%) scale(1.1)'
            // }
          }}
        // onClick={isCameraOn ? stopCamera : startCamera}
        ></div>

        {/* 未连接时的占位符 */}
        {!isCameraOn && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "radial-gradient(circle, #434343 0%, #262626 100%)",
              cursor: "pointer",
            }}
            onClick={isCameraOn ? stopCamera : startCamera}
          >
            <VideoCameraOutlined
              style={{
                fontSize: 64,
                color: "rgba(255, 255, 255, 0.2)",
                animation: "pulse 2s infinite",
              }}
            />
          </div>
        )}
      </div>

      {/* 全局动画定义 */}
      <style>
        {`
          @keyframes breathing {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.6; }
            50% { transform: scale(1); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.6; }
          }
        `}
      </style>
    </div>
  );
};

export default Camera;