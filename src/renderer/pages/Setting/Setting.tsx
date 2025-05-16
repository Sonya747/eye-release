import {
  Form,
  InputNumber,
  Select,
  Button,
  Tooltip,
  Card,
  Alert,
  Space,
  Modal,
  Spin,
  message,
} from "antd";
import { ExclamationCircleOutlined, LoadingOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react"; // 新增状态管理
import "./index.css";
// import useStore from "src/renderer/store";
import useStore from "../../store";
import { analyze_video, loadSession } from "../../backend";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import modelPath from '../../assets/models/head.onnx';

const { Option } = Select;

// 接口定义
export interface SettingData {
  useSound: boolean;
  rollThreshold: number;
  pitchThreshold: number;
  yawThreshold: number;
  distance: number;
}

const Setting = () => {
  const [form] = Form.useForm<SettingData>();
  const [loading, setLoading] = useState(false); // 新增加载状态
  const [submitError, setSubmitError] = useState<string | null>(null); // 新增错误状态
  const [visible, setVisible] = useState(false);
  const [modalloading, setmodalLoading] = useState(true);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const { userSettings, setUserSettings } = useStore();
  // 初始化摄像头
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // 确保视频开始播放
        await videoRef.current.play().catch(error => {
          console.error("视频播放失败:", error);
          message.error("视频播放失败");
        });
      }
      return stream;
    } catch (error) {
      console.error("摄像头访问失败:", error);
      message.error("无法访问摄像头");
      throw error;
    }
  };

  // 开始校准流程
  const startCalibration = async () => {
    setVisible(true);
    setmodalLoading(true);
    try {
      await initCamera();
      const session = await loadSession(modelPath);
      // 等待摄像头初始化完成
      if (!videoRef.current?.srcObject) {
        throw new Error("视频流未正确初始化");
      }
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas context 获取失败");

      // 设置 canvas 尺寸为模型输入尺寸
      canvas.width = 320;
      canvas.height = 320;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      // 获取图像数据并直接转换为模型输入格式
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const inputTensor = new Float32Array(1 * 3 * canvas.width * canvas.height);
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
      const position = result.position;
      console.log("校准结果", position)
      form.setFieldValue("pitchThreshold", position.pitch);
      form.setFieldValue("rollThreshold", position.roll);
      form.setFieldValue("yawThreshold", position.yaw);
      form.setFieldValue("distance", 42); //TODO
    } catch (error) {
      message.error(error.message);
      console.error("分析失败");
    } finally {
      setmodalLoading(false);
      setTimeout(() => {
        handleCancel();
      }, 500);
    }

  };

  // 关闭弹窗时清理资源
  const handleCancel = () => {
    setVisible(false);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };
  // 参数配置与后端字段对齐
  const params = [
    {
      label: "声音提醒",
      value: "useSound" as const,
      description: "开启或关闭声音提醒功能",
      options: [
        { label: "开启", value: true },
        { label: "关闭", value: false },
      ],
    },
    {
      label: "前后倾斜标准值",
      value: "rollThreshold" as const,
      description: "头部前后倾斜的提醒标准值，偏离该指标一定程度系统将进行提醒",
      // min: 0,
      // max: 90,
      // step: 1,
    },
    {
      label: "左右倾斜标准值",
      value: "pitchThreshold" as const,
      description: "头部左右倾斜的提醒标准值，偏离该指标一定程度系统将进行提醒",
      // min: 0,
      // max: 90,
      // step: 1,
    },
    {
      label: "左右转动标准值",
      value: "yawThreshold" as const,
      description: "头部左右转动的提醒标准值，偏离该指标一定程度系统将进行提醒",
      // min: 0,
      // max: 90,
      // step: 1,
    },
    {
      label: "距离标准值",
      value: "distance" as const,
      description: "眼睛到屏幕的距离标准值，偏离该指标一定程度系统将进行提醒",
      // min: 20,
      // max: 100,
      // step: 1,
    },
  ];

  // 初始化数据获取
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const initSettings = userSettings;
        form.setFieldValue("useSound", initSettings.useSound);
        form.setFieldValue("rollThreshold", initSettings.rollThreshold);
        form.setFieldValue("pitchThreshold", initSettings.pitchThreshold);
        form.setFieldValue("yawThreshold", initSettings.yawThreshold);
        form.setFieldValue("distance", initSettings.distance);
        // if (!response.ok) throw new Error('No settings');
      } catch (error) {
        console.log("使用默认设置", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [form]);

  // 表单提交
  const onFinish = (values: SettingData) => {
    setLoading(true);
    try {
      setUserSettings(values);
      message.success("设置已保存");
      setSubmitError(null);
    } catch (error) {
      setSubmitError("保存失败，请重试");
      console.error("保存错误:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="系统设置"
      className="settings-card"
      headStyle={{ borderBottom: "none" }}
    >
      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        disabled={loading}
      >
        {submitError && (
          <Alert
            message={submitError}
            type="error"
            showIcon
            closable
            style={{ marginBottom: 24 }}
          />
        )}

        {params.map((param) => (
          <Form.Item
            key={param.value}
            label={
              <span className="form-item-label">
                {param.label}
                <Tooltip
                  title={param.description}
                  color="#2db7f5"
                  overlayInnerStyle={{ borderRadius: 8 }}
                >
                  <ExclamationCircleOutlined
                    style={{
                      marginLeft: 8,
                      color: "#999",
                      cursor: "pointer",
                    }}
                  />
                </Tooltip>
              </span>
            }
            name={param.value}
            rules={[{ required: true }]}
            validateTrigger="onBlur"
          >
            {param.value === "useSound" ? (
              <Select
                size="large"
                style={{ borderRadius: 8 }}
                dropdownStyle={{ borderRadius: 8 }}
              >
                {param.options?.map((opt) => (
                  <Option
                    key={opt.value.toString()}
                    value={opt.value}
                    style={{ padding: "8px 16px" }}
                  >
                    {opt.label}
                  </Option>
                ))}
              </Select>
            ) : (
              <InputNumber
                // min={param.min}
                // max={param.max}
                // step={param.step}
                size="large"
                style={{
                  width: "100%",
                  borderRadius: 8,
                }}
                precision={2}
                formatter={(value) => `${Number(value).toFixed(2)}`}
              />
            )}
          </Form.Item>
        ))}

        <Form.Item style={{ marginTop: 32 }}>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              shape="round"
              style={{
                width: 120,
                background: "#1890ff",
                borderColor: "#1890ff",
              }}
            >
              保存设置
            </Button>
            <Button
              size="large"
              shape="round"
              onClick={startCalibration}
              disabled={loading}
              style={{ width: 120 }}
            >
              自动校准
            </Button>

            <Modal
              title="摄像头校准"
              visible={visible}
              onCancel={handleCancel}
              footer={null}
              closable={false}
              width={600}
            >
              <div style={{ textAlign: "center", minHeight: 300 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", maxWidth: 500, transform: "scaleX(-1)" }}
                />

                <div style={{ marginTop: 20 }}>
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 24 }} spin />
                    }
                    spinning={loading}
                  />
                  <p style={{ marginTop: 10 }}>
                    {modalloading ? '模型加载中' : "校准完成"}
                  </p>
                </div>
              </div>
            </Modal>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Setting;
