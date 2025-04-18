import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Spin,
  Tabs,
} from "antd";
import { Line, DualAxes } from "@ant-design/charts";
import dayjs from "dayjs";
// import {
//   fetchScreenSessions,
//   fetchPostureMetrics,
//   fetchAlertCorrelation,
// } from "../../api/usage";
import type {
  ScreenSessionData,
  AlertCorrelation,
  DateRange,
} from "./types";
import { Typography } from "antd";
import { AlertOutlined, DashboardOutlined, LaptopOutlined, UserOutlined } from "@ant-design/icons";
import { Grid } from "antd";
import { debounce } from "lodash";
import { DailyPostureMetric, fetchAlertData, fetchPostureData, fetchScreenData } from "./mockdata";

// 新增样式常量
const CHART_HEIGHT = 400;
const CARD_GRADIENT = "linear-gradient(145deg, #434343 0%, #2c3e50 100%)";
// const HEATMAP_COLORS = ["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"];

const { Text } = Typography;

const { RangePicker } = DatePicker;

const Dashboard: React.FC = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();

  const [dateRange, setDateRange] = useState<DateRange>([
    dayjs().subtract(7, "days"),
    dayjs(),
  ]);
  const [screenData, setScreenData] = useState<ScreenSessionData[]>([]);
  const [postureData, setPostureData] = useState<DailyPostureMetric[]>([]);
  const [alertData, setAlertData] = useState<AlertCorrelation[]>([]);
  type DataState = "loading" | "empty" | "error" | "success";
  const [screenDataState, setScreenDataState] = useState<DataState>("loading");
  const [postureDataState, setPostureDataState] =
    useState<DataState>("loading");
  const [alertDataState, setAlertDataState] = useState<DataState>("loading");
  const [key, setKey] = useState<string>("1");

  useEffect(() => {
    switch (key) {
      case "1":
        loadScreenData();
        break;
      case "2":
        loadAlertData();
        break;
      case "3":
        loadPostureData();
        break;
      default:
        break;
    }
  }, [dateRange, key]);

  const loadScreenData = async () => {
    setScreenDataState("loading");
    try {
      // const screenRes = await fetchScreenSessions(dateRange[0], dateRange[1]);
      const screenRes = await fetchScreenData(dateRange)
      if (screenRes.length === 0) {
        setScreenDataState("empty");
        message.warning("屏幕使用数据为空");
      } else {
        setScreenDataState("success");
        setScreenData(screenRes);
      }
    } catch (error) {
      setScreenDataState("error");
      console.error("屏幕使用数据加载失败:", error);
    }
  };

  const loadPostureData = async () => {
    try {
      setPostureDataState("loading")
      // const postureRes = await fetchPostureMetrics();
      const postureRes = await fetchPostureData(dateRange)
      if (postureRes.length === 0) {
        setPostureDataState("empty");
        message.warning("姿态监测数据为空");
      } else {
        setPostureDataState("success");
        setPostureData(postureRes);
      }
    } catch (error) {
      setPostureDataState("error");
      console.error("姿态监测数据加载失败:", error);
    }
  };

  const loadAlertData = async () => {
    try {
      // const alertRes = await fetchAlertCorrelation();
      setAlertDataState("loading")
      const alertRes = await fetchAlertData(dateRange)
      if (alertRes.length === 0) {
        setAlertDataState("empty");
        message.warning("健康提醒数据为空");
      } else {
        setAlertDataState("success");
        setAlertData(alertRes);
      }
    } catch (error) {
      setAlertDataState("error");
      console.error("健康提醒数据加载失败:", error);
    }
  };

  const screenLineData = screenData.flatMap(day =>
    Object.entries(day.hourly_usage).map(([hour, value]) => ({
      date: day.date,
      hour: `${hour.padStart(2, '0')}:00`,
      value: Number(value.toFixed(2)),
      dayOfWeek: dayjs(day.date).format('ddd')
    }))
  );


  const renderAlertData = () => {
    switch (alertDataState) {
      case "loading":
        return <Spin spinning={true} tip="加载中..." />;
      case "empty":
        // return <Text type="warning">暂无健康提醒数据</Text>;
        return (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                当前没有可用数据
                <br />
                请检查设备连接或调整时间范围
              </span>
            }
          >
            <Button type="primary" onClick={loadAlertData}>
              重新加载
            </Button>
          </Empty>
        );
      case "error":
        return <Text type="danger">加载健康提醒数据失败</Text>;
      case "success":
        return (
          <DualAxes
            data={[alertData, alertData]}
            xField="date"
            yField={['total_duration_hours', 'alert_count']}
            geometryOptions={[
              {
                geometry: 'column',
                color: '#1890ff',
                columnWidthRatio: 0.4,
                pattern: { type: 'line', cfg: { stroke: '#096dd9' } },
                label: {
                  position: 'top',
                  style: { fill: '#1890ff' },
                  formatter: (v) => {
                    return `${v.total_duration_hours}小时`
                  }
                }
              },
              {
                geometry: 'line',
                color: '#ff4d4f',
                smooth: true,
                point: {
                  size: 4,
                  style: {
                    fill: '#fff',
                    lineWidth: 2,
                    shadowColor: 'rgba(0,0,0,0.12)',
                    shadowBlur: 6
                  }
                }
              }
            ]}
            annotations={[
              {
                type: "regionFilter",
                start: ["min", 0],
                end: ["max", "max"],
                color: "#f6ffed",
                apply: ["line"]
              }
            ]}
            height={CHART_HEIGHT}
            padding="auto"
            slider={{ start: 0.1, end: 0.9 }}
            animation={{
              appear: {
                duration: 800,
                easing: "easeQuadOut"
              }
            }}
          />
          // <TestChart/>
        );
    }
  };

  const renderScreenData = () => {
    switch (screenDataState) {
      case "loading":
        return <Spin spinning={true} tip="加载中..." />;
      case "empty":
        return (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                当前没有可用数据
                <br />
                请检查设备连接或调整时间范围
              </span>
            }
          >
            <Button type="primary" onClick={loadAlertData}>
              重新加载
            </Button>
          </Empty>
        );
      case "error":
        return <Text type="danger">加载屏幕使用数据失败</Text>;
      case "success":
        return (
          // 渲染组件
          <Line
            data={screenLineData}
            xField="hour"
            yField="value"
            seriesField="date"
            facet={{
              type: 'rect',
              fields: ['dayOfWeek'],
              columnTitle: {
                style: {
                  fontSize: 14,
                  fill: '#666'
                }
              },
              eachView: (_view, facet) => {
                return {
                  animation: true,
                  axes: facet.rowIndex === 1 ? {} : false
                };
              }
            }}
            height={CHART_HEIGHT}
            meta={{
              hour: { alias: '时间段' },
              value: { alias: '使用时长 (小时)' },
              dayOfWeek: {
                alias: '星期',
                values: {
                  'Mon': '周一',
                  'Tue': '周二',
                  'Wed': '周三',
                  'Thu': '周四',
                  'Fri': '周五',
                  'Sat': '周六',
                  'Sun': '周日'
                }
              }
            }}
            padding="auto"
            // tooltip={{
            //   title: (_title, datum) => dayjs(datum.date).format('MMM DD'),
            //   fields: ['hour', 'value'],
            // }}
            interactions={[{ type: 'element-active' }, { type: 'brush' }]}
            animation={{
              appear: {
                animation: 'path-in',
                duration: 2000
              }
            }}
          />
        );
    }
  };

  const renderPostureData = () => {
    switch (postureDataState) {
      case "loading":
        return <Spin spinning={true} tip="加载中..." />;
      case "empty":
        return (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                当前没有可用数据
                <br />
                请检查设备连接或调整时间范围
              </span>
            }
          >
            <Button type="primary" onClick={loadAlertData}>
              重新加载
            </Button>
          </Empty>
        );
      case "error":
        return <Text type="danger">加载姿态监测数据失败</Text>;
      case "success":
        return (
          <DualAxes
          data={[
            postureData.flatMap(d => [
              { date: d.date, type: '俯仰角', value: d.avg_pitch },
              { date: d.date, type: '偏航角', value: d.avg_yaw },
              { date: d.date, type: '翻滚角', value: d.avg_roll }
            ]),
            postureData.map(d => ({ 
              date: d.date, 
              score: d.posture_score,
              anomaly: d.anomaly
            }))
          ]}
          xField="date"
          yField={['value', 'score']}
          geometryOptions={[
            // 左轴配置（角度数据）
            {
              geometry: 'line',
              seriesField: 'type',
              color: ['#1890ff', '#ff4d4f', '#52c41a'],
              lineStyle: {
                lineWidth: 2,
                opacity: 0.8
              },
              point: {
                size: 3,
                shape: 'circle',
                style: {
                  fill: '#fff',
                  stroke: ({ type }) => ({
                    '俯仰角': '#1890ff',
                    '偏航角': '#ff4d4f',
                    '翻滚角': '#52c41a'
                  }[type]),
                  lineWidth: 1.5
                }
              }
            },
            // 右轴配置（评分数据）
            {
              geometry: 'line',
              color: '#722ed1',
              lineStyle: {
                lineWidth: 3,
                lineDash: [4, 4]
              },
              point: {
                size: 4,
                shape: 'diamond',
                style: {
                  fill: '#fff',
                  stroke: '#722ed1',
                  lineWidth: 2
                }
              }
            }
          ]}
          meta={{
            date: {
              type: 'timeCat',
              formatter: (val) => dayjs(val).format('MM/DD'),
              range: [0.05, 0.95]
            },
            value: {
              alias: '角度值 (°)',
              formatter: (v) => `${v.toFixed(1)}°`
            },
            score: {
              alias: '姿势评分',
              min: 0,
              max: 100,
              formatter: (v) => `${v}分`
            }
          }}
          yAxis={[
            // 左轴
            {
              title: {
                text: '角度值 (°)',
                style: { fill: '#666' }
              },
              grid: { line: { style: { stroke: '#f0f0f0' } } }
            },
            // 右轴
            {
              title: {
                text: '姿势评分',
                style: { fill: '#722ed1' }
              },
              position: 'right',
              grid: null,
              label: {
                formatter: (v) => `${v}`
              }
            }
          ]}
          legend={{
            position: 'top',
            itemName: {
              formatter: (text) => ({
                '俯仰角': '俯仰角 (Pitch)',
                '偏航角': '偏航角 (Yaw)',
                '翻滚角': '翻滚角 (Roll)',
                'score': '综合姿势评分'
              }[text])
            },
            marker: (text, _index, item) => ({
              symbol: text === 'score' ? 'square' : 'circle',
              style: {
                fill: text === 'score' ? 'transparent' : item?.color,
                stroke: text === 'score' ? '#722ed1' : item?.color
              }
            })
          }}
          annotations={[
            // 异常日标注
            ...postureData.filter(d => d.anomaly).map(d => ({
              type: 'region',
              start: [d.date, 'min'],
              end: [d.date, 'max'],
              style: {
                fill: '#ff4d4f',
                opacity: 0.1
              }
            })),
          ]}
        />
        );
    }
  };


  return (
    <div style={{
      padding: screens.md ? 24 : 16,
      background: "#f0f2f5",
      minHeight: "100vh"
    }}>
      <Card
        bordered={false}
        style={{
          background: CARD_GRADIENT,
          borderRadius: 12,
          boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
          marginBottom: 24
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: screens.md ? "row" : "column",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Typography.Title
            level={2}
            style={{
              color: "white",
              margin: 0,
              fontSize: screens.md ? 28 : 20,
              fontWeight: 500,
              textShadow: "0 2px 4px rgba(0,0,0,0.12)"
            }}
          >
            <DashboardOutlined style={{ marginRight: 12 }} />
            健康行为分析报告
          </Typography.Title>
          <Text style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: screens.md ? 14 : 12,
            marginTop: screens.md ? 0 : 8
          }}>
            {`统计周期：${dateRange[0].format("MM/DD")} - ${dateRange[1].format("MM/DD")}`}
          </Text>
        </div>
      </Card>

      {/* 优化后的主卡片 */}
      <Card
        title={
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center"
          }}>
            <span style={{
              fontSize: screens.md ? 18 : 16,
              whiteSpace: "nowrap"
            }}>
              📈 数据分析看板
            </span>
            <RangePicker
              disabledDate={(date) => { return date.isAfter(dayjs()) }}
              value={dateRange}
              onChange={debounce((dates) =>
                dates && setDateRange(dates as DateRange), 300)}
              style={{ width: screens.md ? 256 : "100%" }}
              allowClear={false}
            />
          </div>
        }
        bordered={false}
        styles={{
          body: {
            paddingTop: 0,
            background: "transparent"
          }
        }}
      >
        <Tabs
          destroyInactiveTabPane
          activeKey={key}
          onChange={setKey}
          tabBarStyle={{
            marginBottom: 24,
            borderBottom: "1px solid #f0f0f0"
          }}
          items={[
            {
              key: "1",
              label: (
                <span style={{ padding: "8px 16px" }}>
                  <LaptopOutlined />
                  屏幕使用
                </span>
              ),
              children: renderScreenData()
            },
            {
              key: "2",
              label: (
                <span style={{ padding: "8px 16px" }}>
                  <AlertOutlined />
                  健康提醒
                </span>
              ),
              children: renderAlertData()
            },
            {
              key: "3",
              label: (
                <span style={{ padding: "8px 16px" }}>
                  <UserOutlined />
                  姿势监测
                </span>
              ),
              children: renderPostureData()
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
