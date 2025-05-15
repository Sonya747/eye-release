import { InferenceSession, Tensor } from 'onnxruntime-web';
// import path from 'path';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line import/namespace
import * as ort from 'onnxruntime-web';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import modelPath from '../../assets/models/head.onnx';

// 打印模型路径信息
console.log("模型文件路径:", {
  importPath: modelPath,
  type: typeof modelPath,
  isString: typeof modelPath === 'string',
  length: typeof modelPath === 'string' ? modelPath.length : 0
});

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

// Initialize ONNX Runtime WASM
// const initOrt = async () => {
//   try {
//     // Set the WASM path using the correct method
//     env.wasm.wasmPaths = {
//       'ort-wasm-simd-threaded.wasm': '/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm'
//     };
//     console.log("ONNX Runtime WASM paths configured");
//   } catch (error) {
//     console.error("Failed to initialize ONNX Runtime WASM:", error);
//     throw error;
//   }
// };

// Add helper function for tensor resizing
function resizeTensor(input: Float32Array, fromHeight: number, fromWidth: number, toHeight: number, toWidth: number): Float32Array {
  const channels = 3;
  const output = new Float32Array(channels * toHeight * toWidth);
  
  // Calculate scaling factors
  const scaleX = fromWidth / toWidth;
  const scaleY = fromHeight / toHeight;
  
  // For each output pixel
  for (let c = 0; c < channels; c++) {
    for (let y = 0; y < toHeight; y++) {
      for (let x = 0; x < toWidth; x++) {
        // Calculate corresponding position in input
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        
        // Get input pixel value
        const inputIndex = c * fromHeight * fromWidth + srcY * fromWidth + srcX;
        const outputIndex = c * toHeight * toWidth + y * toWidth + x;
        output[outputIndex] = input[inputIndex];
      }
    }
  }
  
  return output;
}

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
    // const resizedData = resizeTensor(inputTensor, 224, 224, 320, 320);
    
    // Create input tensor with model's expected dimensions
    const tensor = new Tensor('float32', inputTensor, [1, 3, 320, 320]);
    
    // console.log("Created input tensor:", {
    //   shape: tensor.dims,
    //   type: tensor.type,
    //   dataLength: tensor.data.length,
    //   expectedLength: 1 * 3 * 320 * 320,
    //   // Log a few sample values to verify normalization
    //   sampleValues: Array.from(tensor.data.slice(0, 5)).map(v => v.toFixed(3))
    // });
    
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
    // 加载模型
    // const session = await loadModel(modelPath);
    
    // 直接使用预处理后的张量数据进行预测
    const posePredictions = await predictPose(session, inputTensor);
    
    return posePredictions;
  } catch (error) {
    console.error("模型推理失败:", error);
    throw error;
  }
}
