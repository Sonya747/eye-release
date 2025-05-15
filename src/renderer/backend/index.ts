import { InferenceSession } from "onnxruntime-web";
import { analyzeVideoFrame } from "./models/analyze";
import { loadModel } from "./models/head-predict";
export const analyze_video = async (frameData: Float32Array,session: InferenceSession) => {
  const result = await analyzeVideoFrame(frameData,session);
  return result;
};

export const loadSession = async (modelPath: string) => {
  const session = await loadModel(modelPath);
  return session;
};