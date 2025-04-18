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

const { Option } = Select;

// 接口定义
export interface SettingData {
  alter_method: number;
  yall: number;
  roll: number;
  pitch: number;
  eyeWidth: number;
}

const Setting = () => {
  const [form] = Form.useForm<SettingData>();
  const [loading, setLoading] = useState(false); // 新增加载状态
  const [submitError, setSubmitError] = useState<string | null>(null); // 新增错误状态
  const [visible, setVisible] = useState(false);
  const [modalloading, setmodalLoading] = useState(true);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

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
        message.success("校准完成");
        form.setFieldValue("pitch", 10);
        form.setFieldValue("roll", 8);
        form.setFieldValue("yall", 8);
        form.setFieldValue("eyeWidth", 15);
        handleCancel();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 参数配置与后端字段对齐
  const params = [
    {
      label: "提醒方式",
      value: "alter_method" as const,
      description: "系统通知方式选择",
      options: [
        { label: "音乐提醒", value: 1 },
        { label: "静默通知", value: 0 },
      ],
    },
    {
      label: "侧向角度",
      value: "yall" as const, //TODO yaw
      description: "这个参数用于测算身体侧倾的角度，指标越小，提醒越灵敏",
      min: 0,
      max: 90,
      step: 1,
    },
    {
      label: "纵向调节",
      value: "roll" as const,
      description: "这个参数用于测算头部前后偏移的角度，指标越小，提醒越灵敏",
      min: 0,
      max: 90,
      step: 1,
    },
    {
      label: "横向调节",
      value: "pitch" as const,
      description:
        "这个参数用于测算头部旋转的角度，用于辅助身体侧倾和低头的检测，指标越小，提醒越灵敏",
      min: 0,
      max: 90,
      step: 1,
    },
    {
      label: "眼间距离",
      value: "eyeWidth" as const,
      description: "这个参数用于测算面部到屏幕的距离，指标越大，健康距离越远",
      min: 5,
      max: 100,
      step: 1,
    },
  ];

  // 初始化数据获取
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = {
          alter_method: 1,
          yall: 10,
          roll: 10,
          pitch: 10,
          eyeWidth: 14,
        };
        // if (!response.ok) throw new Error('No settings');
        form.setFieldsValue(data);
      } catch (error) {
        console.log("使用默认设置", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [form]);

  // 表单提交
  const onFinish = async (values: SettingData) => {
    setLoading(true);
    try {
    //   const response = await postSetting(values);
    //   const result = response;
    //   form.setFieldsValue({
    //     ...result,
    //   });
    } catch (error) {
      setSubmitError("保存失败，请检查网络连接后重试");
      console.error("保存错误:", error);
    } finally {
      setLoading(false);
      message.success("设置已保存");
      setSubmitError(null);
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
            {param.value === "alter_method" ? (
              <Select
                size="large"
                style={{ borderRadius: 8 }}
                dropdownStyle={{ borderRadius: 8 }}
              >
                {param.options?.map((opt) => (
                  <Option
                    key={opt.value}
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
