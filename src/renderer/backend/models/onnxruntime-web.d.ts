/**
 * 补充onnxruntime-web库的typescript类型定义
 */
declare module 'onnxruntime-web' {
  export interface InferenceSession {
    inputNames: string[];
    outputNames: string[];
    inputs: Array<{
      name: string;
      dims: number[];
      type: string;
    }>;
    outputs: Array<{
      name: string;
      dims: number[];
      type: string;
    }>;
    run(feeds: any): Promise<any>;
  }

  export interface Tensor {
    dims: number[];
    data: Float32Array;
    type: string;
  }

  export namespace InferenceSession {
    interface SessionOptions {
      enableCpuMemArena?: boolean;
      enableMemPattern?: boolean;
      enableProfiling?: boolean;
      executionMode?: 'parallel' | 'sequential';
      executionProviders?: string[];
      graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all';
      extra?: any
    }

    function create(modelPath: string, options?: SessionOptions): Promise<InferenceSession>;
  }

  export class Tensor {
    constructor(type: string, data: Float32Array, dims?: number[]);
  }
} 