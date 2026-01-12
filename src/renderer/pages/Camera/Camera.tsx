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

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playSound] = useSound(sound, { volume: 0.5 });
  const playRef = useRef(false)
  const session = useRef<InferenceSession>()
  const { userSettings } = userSettingStore()

  // const [eyeWidth, eyeHeight] = [10, 10]; // TODO :临时的坐标差值骇值

  //卸载释放定时器和session
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      session.current = null
    };
  }, []);

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

    } catch {
      (e) => {
        console.log("分析失败", e)
      }
    }
  }

  const stopCamera = async () => {
    if (stream && isCameraOn) {
      playRef.current = false
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      session.current = null
      // const res = await endSession();
      message.info("监测模式结束");
      // console.log("endSession", res);
    }
  };

  const startCamera = async () => {
    if (isCameraOn && !stream) return;
    if (playRef.current) return;
    playRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
      message.success("检测模式开启");
      // 设置定时器，每1s发送一帧
      intervalRef.current = setInterval(analyzeFrame, 5000);
    } catch (err) {
      console.error("video stream error", err);
    }
    try {
      session.current = await loadSession(modelPath)

    } catch {
      (e) => {
        message.error("模型加载失败")
        console.log("模型加载失败", e)
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