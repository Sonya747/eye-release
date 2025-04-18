import { useState } from "react";
import { Layout, Menu, MenuProps, theme } from "antd";
import { RouteProp, routes } from "../routers";
import { Outlet, useNavigate } from "react-router";

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const navigate = useNavigate()


  type MenuItem = Required<MenuProps>["items"][number];
  function getMenuItem(route: RouteProp): MenuItem {
    return {
      key: route.path,
      icon: route.icon,
      // label: <NavLink to={route.path} className={({isActive}) => isActive?"ant-menu-title-content":"ant-menu-title-content"}></NavLink>
      label: route.label,
      onClick: ({key}) => {navigate(key)},
    };
  }

  const menuitems = routes[0].children.filter(route => route.path!=='/').map((route) => getMenuItem(route));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        minWidth:'100wh',
        minHeight:'100vh'
      }}
    >
      <Layout style={{ height: "100%", width: "100%" }}>
        <Header style={{ padding: 0 }}>
          <div style={{ color: "white", fontWeight: "bolder", fontSize: 20 }}>
          “眸安”——智能屏幕健康守护者
          </div>
        </Header>
        <Layout>
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={(value) => setCollapsed(value)}
          >
            <Menu
              theme="dark"
              mode="inline"
              defaultSelectedKeys={["1"]}
              items={menuitems}
              style={{height:'100%'}}
            />
          </Sider>
          <Content
            style={{
              padding: "24px",
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

export default MainLayout;
