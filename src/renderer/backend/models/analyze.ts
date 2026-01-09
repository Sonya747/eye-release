import { InferenceSession } from 'onnxruntime-web';
import { processImage } from './head-predict';

export interface AnalysisResult {
  detections: any[];  // TODO 距离
  position: {
    yaw: number;
    pitch: number;
    roll: number;
  };
}

export async function analyzeVideoFrame(inputTensor: Float32Array, session: InferenceSession): Promise<AnalysisResult> {
  try {
    const positionResult = await processImage(inputTensor, session);
    // 返回分析结果
    return {
      detections: [],
      position: positionResult
    };
  } catch (error) {
    console.error("分析失败:", error);
  }
} 