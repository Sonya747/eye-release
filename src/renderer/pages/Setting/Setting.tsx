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
  const {userSettings, setUserSettings} = useStore();
  // 初始化摄像头
  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      message.error("无法访问摄像头");
      setVisible(false);
    }
  };

  // 开始校准流程
  const startCalibration = () => {
    setVisible(true);
    setmodalLoading(true);
  };

  // 关闭弹窗时清理资源
  const handleCancel = () => {
    setVisible(false);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    if (visible) {
      initCamera();
      // 5秒后完成校准
      const timer = setTimeout(() => {
        setmodalLoading(false);
        //TODO 
        message.success("校准完成");
        form.setFieldValue("pitchThreshold", 10);
        form.setFieldValue("rollThreshold", 8);
        form.setFieldValue("yawThreshold", 8);
        form.setFieldValue("distance", 15);
        handleCancel();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

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
      label: "前后倾斜阈值",
      value: "rollThreshold" as const,
      description: "头部前后倾斜的提醒阈值，数值越小提醒越灵敏",
      min: 0,
      max: 90,
      step: 1,
    },
    {
      label: "左右倾斜阈值",
      value: "pitchThreshold" as const,
      description: "头部左右倾斜的提醒阈值，数值越小提醒越灵敏",
      min: 0,
      max: 90,
      step: 1,
    },
    {
      label: "左右转动阈值",
      value: "yawThreshold" as const,
      description: "头部左右转动的提醒阈值，数值越小提醒越灵敏",
      min: 0,
      max: 90,
      step: 1,
    },
    {
      label: "距离阈值",
      value: "distance" as const,
      description: "眼睛到屏幕的距离阈值（厘米），数值越大提醒距离越远",
      min: 20,
      max: 100,
      step: 1,
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
                min={param.min}
                max={param.max}
                step={param.step}
                size="large"
                style={{
                  width: "100%",
                  borderRadius: 8,
                }}
                precision={1}
                formatter={(value) => `${Number(value).toFixed(0)}`}
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
                  style={{ width: "100%", maxWidth: 500 }}
                />

                <div style={{ marginTop: 20 }}>
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 24 }} spin />
                    }
                    spinning={loading}
                  />
                  <p style={{ marginTop: 10 }}>
                    {modalloading ? "校准中，请保持最佳姿势..." : "校准完成"}
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
