import { InferenceSession } from "onnxruntime-web";
import { analyzeVideoFrame } from "./models/analyze";
import { loadModel } from "./models/head-predict";
/**
 * 分析图像数据
 * @param frameData 图像数据
 * @param session 推理会话
 * @returns 分析结果
 */
export const analyze_video = async (frameData: Float32Array,session: InferenceSession) => {
  const result = await analyzeVideoFrame(frameData,session);
  return result;
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