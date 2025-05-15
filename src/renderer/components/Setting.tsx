import React, { useEffect, useState } from 'react';
import { Form, InputNumber, Switch, Slider, message } from 'antd';
import { ipcRenderer } from 'electron';

interface Settings {
  useSound: boolean;
  rollThreshold: number;
  pitchThreshold: number;
  yawThreshold: number;
  distance: number;
}

const Setting: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await ipcRenderer.invoke('get-settings');
        form.setFieldsValue(settings);
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        message.error('加载设置失败');
        setLoading(false);
      }
    };

    loadSettings();

    // 监听设置变化
    const handleSettingsChange = (_: any, { newValue }: { newValue: Settings }) => {
      form.setFieldsValue(newValue);
    };

    ipcRenderer.on('settings-changed', handleSettingsChange);

    return () => {
      ipcRenderer.removeListener('settings-changed', handleSettingsChange);
    };
  }, [form]);

  const handleValuesChange = async (changedValues: Partial<Settings>, allValues: Settings) => {
    try {
      await ipcRenderer.invoke('save-settings', allValues);
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error('保存设置失败');
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleValuesChange}
      initialValues={{
        useSound: true,
        rollThreshold: 10,
        pitchThreshold: 20,
        yawThreshold: 10,
        distance: 100,
      }}
    >
      <Form.Item
        label="声音提示"
        name="useSound"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="Roll 阈值"
        name="rollThreshold"
        tooltip="当 Roll 角度超过此值时触发提示"
      >
        <Slider min={0} max={45} />
      </Form.Item>

      <Form.Item
        label="Pitch 阈值"
        name="pitchThreshold"
        tooltip="当 Pitch 角度超过此值时触发提示"
      >
        <Slider min={0} max={45} />
      </Form.Item>

      <Form.Item
        label="Yaw 阈值"
        name="yawThreshold"
        tooltip="当 Yaw 角度超过此值时触发提示"
      >
        <Slider min={0} max={45} />
      </Form.Item>

      <Form.Item
        label="距离阈值"
        name="distance"
        tooltip="当眼睛距离屏幕超过此值时触发提示"
      >
        <InputNumber min={0} max={200} />
      </Form.Item>
    </Form>
  );
};

export default Setting; 