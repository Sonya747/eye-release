import { InferenceSession, Tensor } from 'onnxruntime-web';
// import path from 'path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/namespace
import * as ort from 'onnxruntime-web';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import modelPath from '@/assets/models/resnet34.onnx';

interface PosePredictions {
  yaw: number;
  pitch: number;
  roll: number;
}


// 模型配置
const classInfo = {
  yaw: { num_classes: 19, step: 10, offset: -93 },
  pitch: { num_classes: 38, step: 5, offset: -93 },
  roll: { num_classes: 38, step: 5, offset: -93 }
};

const axes = ['yaw', 'pitch', 'roll'] as const;

// 加载模型
export async function loadModel(modelPath: string): Promise<InferenceSession> {
  try {
    // 设置 ONNX Runtime 选项
    const options: InferenceSession.SessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'sequential',
      extra: {
        session: {
          use_deterministic_compute: true
        }
      }
    };

    // 创建 ONNX 运行时会话
    console.log("正在加载模型:", modelPath);
    const session = await InferenceSession.create(modelPath, options);
    
    // 验证会话对象
    if (!session) {
      throw new Error("模型会话创建失败");
    }
    return session;
  } catch (error) {
    console.error("加载模型失败:", error);
    if (error instanceof Error) {
      console.error("错误详情:", {
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

// 预测姿态
async function predictPose(
  session: InferenceSession,
  inputTensor: Float32Array
): Promise<PosePredictions> {
  try {
    // Resize input tensor from 224x224 to 320x320
    const tensor = new Tensor('float32', inputTensor, [1, 3, 320, 320]);
    
    // 运行推理
    const results = await session.run({ input: tensor });
    
    // 处理预测结果
    const predictions: number[] = [];
    
    for (const axis of axes) {
      const axisIndex = axes.indexOf(axis);
      const outputName = session.outputNames[axisIndex];
      if (!outputName) {
        throw new Error(`找不到输出: ${axis}`);
      }
      
      const predAxis = results[outputName].data as Float32Array;

      // 应用 softmax
      const expValues = predAxis.map(x => Math.exp(x));
      const sumExp = expValues.reduce((a, b) => a + b, 0);
      const softmax = expValues.map(x => x / sumExp);

      // 计算角度
      const idxTensor = Array.from({ length: classInfo[axis].num_classes }, (_, i) => i);
      const step = classInfo[axis].step;
      const offset = classInfo[axis].offset;
      
      const degrees = softmax.reduce((sum, val, idx) => 
        sum + val * idxTensor[idx], 0) * step + offset;
      
      predictions.push(degrees);
    }
    console.log(predictions)
    // 返回结果
    return {
      yaw: predictions[0],
      pitch: predictions[1],
      roll: predictions[2]
    };
  } catch (error) {
    console.error("预测过程出错:", error);
    throw error;
  }
}

// 组合函数
export async function processImage(inputTensor: Float32Array, session: InferenceSession): Promise<PosePredictions> {
  try {
    // 直接使用预处理后的张量数据进行预测
    const posePredictions = await predictPose(session, inputTensor);
    
    return posePredictions;
  } catch (error) {
    console.error("模型推理失败:", error);
    throw error;
  }
}
