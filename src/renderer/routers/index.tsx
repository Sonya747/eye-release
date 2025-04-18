import { ReactNode } from "react";
import { Navigate, NonIndexRouteObject } from "react-router";
import MainLayout from "../Layout/MainLayout";
import Camera from "../pages/Camera/Camera";
import {
  HomeOutlined,
  LineChartOutlined,
  SettingOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import Home from "../pages/Home/Home";
import Setting from "../pages/Setting/Setting";
import Dashboard from "../pages/Report/Dashboard";
//用于Router以及Menu
export interface RouteProp extends NonIndexRouteObject {
  label?: string;
  icon?: ReactNode;
  children?: RouteProp[];
}

export const routes: RouteProp[] = [
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "home",
        element: <Home />,
        label: "主页",
        icon: <HomeOutlined />,
      },
      {
        path: "camera",
        element: <Camera />,
        label: "监测模式",
        icon: <VideoCameraOutlined />,
      },
      {
        path: "report",
        // element: <Report />,
        element:<Dashboard />,
        label: "健康报告",
        icon: <LineChartOutlined />,
      },
      {
        path: "setting",
        element: <Setting />,
        label: "设置",
        icon: <SettingOutlined />,
      },
      {
        path: "/",
        element: <Navigate to={"home"} />
      }
    ],
  },
];
