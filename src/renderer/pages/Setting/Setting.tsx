import { Form, InputNumber, Select, Button, Tooltip } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';  // 新增状态管理
import './index.css';
// import { getSetting } from '../../api/setting';

const { Option } = Select;

// 接口定义
export interface SettingData {
    alter_method: number;
    yall: number;
    roll: number;
    reminderMethod: 'music' | 'silence';  // 与后端 Enum 对应
}

const Setting = () => {
    const [form] = Form.useForm<SettingData>();
    const [loading, setLoading] = useState(false);  // 新增加载状态

    // 参数配置与后端字段对齐
    const params = [
        {
            label: "提醒方式",
            value: "reminderMethod" as const,
            description: "系统通知方式选择",
            options: [
                { label: '音乐提醒', value: 'music' },
                { label: '静默通知', value: 'silence' }
            ]
        },
        {
            label: "横向调节",
            value: "yall" as const,
            description: "水平方向灵敏度（0.0-1.0）",
            min: 0,
            max: 1,
            step: 0.1
        },
        {
            label: "纵向调节",
            value: "roll" as const,
            description: "垂直方向灵敏度（0.0-1.0）",
            min: 0,
            max: 1,
            step: 0.1
        }
    ];

    // 初始化数据获取
    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                // const data = await getSetting();
                const data ={
                    alter_method:1,

                }
                // if (!response.ok) throw new Error('No settings');
                form.setFieldsValue({
                    ...data,
                    reminderMethod: data.alter_method === 1 ? 'music' : 'silence'  // 转换后端数据
                });
            } catch (error) {
                console.log('使用默认设置', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [form]);

    // 表单提交
    // const onFinish = async (_values: SettingData) => {
    //     setLoading(true);
    //     try {
    //         // const payload = {
    //         //     alter_method: values.reminderMethod === 'music' ? 1 : 0,  // 转换枚举值
    //         //     yall: Number(values.yall.toFixed(1)),
    //         //     roll: Number(values.roll.toFixed(1))
    //         // };

    //         // const response = await fetch('/api/settings', {
    //         //     method: 'POST',
    //         //     headers: { 'Content-Type': 'application/json' },
    //         //     body: JSON.stringify(payload)
    //         // });

    //         // if (!response.ok) throw new Error('保存失败');

    //         // const result = await response.json();
    //         // form.setFieldsValue({
    //         //     ...result,
    //         //     reminderMethod: result.alter_method === 1 ? 'music' : 'silence'
    //         // });
    //     } catch (error) {
    //         console.error('保存错误:', error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    return (
        <div className="form-container">
            <Form
                form={form}
                // onFinish={onFinish}
                layout="vertical"
                disabled={loading}
            >
                {params.map(param => (
                    param.value === 'reminderMethod' ? (
                        <Form.Item
                            key={param.value}
                            label={
                                <span>
                                    {param.label}
                                    <Tooltip title={param.description}>
                                        <ExclamationCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name={param.value}
                            rules={[{ required: true }]}
                        >
                            <Select>
                                {param.options?.map(opt => (
                                    <Option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    ) : (
                        <Form.Item
                            key={param.value}
                            label={
                                <span>
                                    {param.label}
                                    <Tooltip title={param.description}>
                                        <ExclamationCircleOutlined style={{ marginLeft: 4 }} />
                                    </Tooltip>
                                </span>
                            }
                            name={param.value}
                            rules={[
                                { required: true },
                                { type: 'number', min: param.min, max: param.max }
                            ]}
                        >
                            <InputNumber
                                min={param.min}
                                max={param.max}
                                step={param.step}
                                style={{ width: '100%' }}
                                precision={1}
                                formatter={value => `${value ?? 0}%`}
                            // parser={value => value?.replace('%', '') ?? 0}
                            />
                        </Form.Item>
                    )
                ))}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                    >
                        {loading ? '保存中...' : '保存设置'}
                    </Button>
                    <Button
                        style={{ marginLeft: '8px' }}
                        onClick={() => form.resetFields()}
                        disabled={loading}
                    >
                        重置
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default Setting;