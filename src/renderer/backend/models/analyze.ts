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

export interface AnalysisError {
  error: string;
}

export async function analyzeVideoFrame(inputTensor: Float32Array,session: InferenceSession): Promise<AnalysisResult> {
  try {
    // TODO 放两个模型
    const positionResult = await processImage(inputTensor, session);
    
    // 返回分析结果
    return {
      detections: [], // TODO 距离
      position: positionResult
    };
  } catch (error) {
    console.error("分析失败:", error);
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 