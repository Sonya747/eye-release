import { InferenceSession } from "onnxruntime-web";
import { loadModel, predictPose } from "./models/head-predict";
/**
 * 分析图像数据
 * @param frameData 图像数据
 * @param session 推理会话
 * @returns 分析结果
 */
export const analyze_video = async (frameData: Float32Array, session: InferenceSession) => {
  try {
    const positionResult = await predictPose(session, frameData);
    // 返回分析结果
    return positionResult
  } catch (error) {
    console.error("分析失败:", error);
  }
};

/**
 * 加载推理会话
 * @param modelPath 模型路径
 * @returns 推理会话
 */
export const loadSession = async (modelPath: string) => {
  const session = await loadModel(modelPath);
  return session;
};