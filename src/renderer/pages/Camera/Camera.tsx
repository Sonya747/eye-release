import { useEffect, useRef, useState } from "react";
import "./index.css";
import { message } from "antd";
import { VideoCameraOutlined } from "@ant-design/icons";
import useSound from "use-sound";
import sound from "../../assets/audio/notification.wav";
// import { EyeState } from "../../api/types";
// import { endSession, startSession } from "../../api/usage";
// import {  postPicture } from "../../api/video";

const Camera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [playSound] = useSound(sound, { volume: 0.5 });
  const playRef = useRef(false)

  // const [eyeWidth, eyeHeight] = [10, 10]; // TODO :临时的坐标差值骇值

  useEffect(() => {
    if (!isCameraOn) {
      stopCamera();
      return;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCameraOn]);

  const analyzeFrame = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    try {
      // const blob = await new Promise<Blob>((resolve) => {
      //   canvas.toBlob(
      //     (blob) => {
      //       if (blob) resolve(blob);
      //     },
      //     "image/jpeg",
      //     0.7
      //   );
      // });

      // const response = await postPicture(blob);

      const data = Math.random()
      if(data>0.5) {
        playSound(); //TODO 读取设置
        message.info("头部倾斜")
    }
      
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
      playRef.current=false
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraOn(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // const res = await endSession();
      message.info("监测模式结束");
      // console.log("endSession", res);
    }
  };

  const startCamera = async () => {
    if(isCameraOn&&!stream) return;
    if(playRef.current) return;
    playRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
      // const res = await startSession();
      // console.log("startSession", res);
      message.success("检测模式开启");
      // 设置定时器，每1s发送一帧
      intervalRef.current = setInterval(analyzeFrame, 5000);
    } catch (err) {
      console.error("video stream error", err);
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
          className={`video-element ${
            isCameraOn ? "connected" : "disconnected"
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
          onDoubleClick={()=>{}}
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
              boxShadow: `0 0 8px ${
                isCameraOn ? "rgba(82, 196, 26, 0.4)" : "rgba(255, 77, 79, 0.4)"
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
