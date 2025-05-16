import { useEffect, useRef, useState } from "react";
import "./index.css";
import { message } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import useSound from "use-sound";
import sound from "../../assets/audio/notification.wav";
import { analyze_video, loadSession } from "../../backend";
import { InferenceSession } from "onnxruntime-web";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import modelPath from '../../assets/models/head.onnx';
import useStore from "../../store";

// import { EyeState } from "../../api/types";
// import { endSession, startSession } from "../../api/usage";
// import {  postPicture } from "../../api/video";

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playSound] = useSound(sound, { volume: 0.5 });
  const playRef = useRef(false);
  const [session, setSession] = useState<InferenceSession | null>(null);
  const sessionRef = useRef<InferenceSession | null>(null);
  const { userSettings, setUserSettings } = useStore();


  // const [eyeWidth, eyeHeight] = [10, 10]; // TODO :临时的坐标差值骇值

  // 清理函数
  const cleanup = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current = null;
      } catch (error) {
        console.error("Error ending session:", error);
      }
      sessionRef.current = null;
      setSession(null);
    }
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // 当 isCameraOn 改变时清理
  useEffect(() => {
    if (!isCameraOn) {
      cleanup();
    }
  }, [isCameraOn]);

  const analyzeFrame = async (session: InferenceSession) => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    // 设置 canvas 尺寸为模型输入尺寸
    canvas.width = 320;
    canvas.height = 320;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    try {
      // 获取图像数据并直接转换为模型输入格式
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 转换为模型输入格式 (NCHW)
      const inputTensor = new Float32Array(1 * 3 * canvas.width * canvas.height);

      // 归一化并转换为 NCHW 格式
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
      const result = await analyze_video(inputTensor, session);
      console.log("分析结果:", result.position);

      const position = result.position;

      // const response = await postPicture(blob);

      // const data = Math.random();
      if (Math.abs(userSettings.yawThreshold - position.yaw) > 5) {
        userSettings.useSound && playSound();
        message.info({
          content: (
            <span>
              ⚠️🐢
              小龟提醒：检测到头部侧倾啦！端正坐姿可以保护我们的小颈椎哟～😊ﾉ
            </span>
          ),
          style: { color: "#ff6b6b" },
        });
      } else if (Math.abs(userSettings.pitchThreshold - position.pitch) > 5) {
        userSettings.useSound && playSound();
        message.info({
          content: (
            <span>
              🐢 安全距离警报！太靠近屏幕会让小龟都紧张啦～ 后退一点点吧😄
            </span>
          ),
          style: { color: "#ff922b" },
        });
      } else if (Math.abs(userSettings.rollThreshold - position.roll) > 5) {
        userSettings.useSound && playSound();
        message.info({
          content: (
            <span>
              ⚠️🐢
              小龟提醒：检测到头部侧倾啦！端正坐姿可以保护我们的小颈椎哟～😊ﾉ
            </span>
          ),
          style: { color: "#51cf66" },
        });
      }

      // const result = await analyze_video(blob);
      // console.log("分析结果:", result);


      // console.log("分析结果:", data,data.position);
      // if(data>0.5) {
      //   //TODO 眼睛处理
      // }
      // if(Math.abs(data.position.pitch)>10){
      //   playSound(); //TODO 读取设置
      //   message.info("头部倾斜")
      // }
    } catch (error) {
      console.error("分析失败:", error);
    }
  };

  const stopCamera = async () => {
    if (stream && isCameraOn) {
      playRef.current = false;
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
      await cleanup();
      message.info("监测模式结束");
    }
  };

  const startCamera = async () => {
    if (isCameraOn && !stream) return;
    if (playRef.current) return;
    playRef.current = true;
    try {
      await cleanup();

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);

      // 创建新的 session
      const newSession = await loadSession(modelPath);
      sessionRef.current = newSession;
      setSession(newSession);

      message.success("检测模式开启");
      intervalRef.current = setInterval(() => analyzeFrame(newSession), 2000);
    } catch (err) {
      console.error("video stream error", err);
      cleanup();
    }
  };

  const handleVideoConnect = () => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("视频自动播放失败:", error);
      });
    }
  };

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
          onDoubleClick={() => { return }}
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
