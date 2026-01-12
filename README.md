## 运行准备
环境要求：
- node
- 包管理工具npm/pnpm
先下载依赖再用包管理工具运行start脚本即本地运行
由于前期引入库的版本出现冲突，因此需要忽略冲突强制下载(--force)
如果报错`electron download failed`，挂梯子或配置electron镜像源(.npmrc文件中)
```
npm install --force
npm start
```
打包：
将模型放到src/renderer/assets/models路径下，运行`npm run make`，即可生成对应操作系统的应用
参照https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging

运行软件前要赋予应用访问摄像头的权利

## 技术栈

### 工程侧

#### electron-forge
Electron 应用的完整构建和打包解决方案，提供开箱即用的开发工具链。
- **功能**: 负责应用的开发、打包、分发全流程
  - 支持多平台打包（Windows、macOS、Linux）
  - 提供多种打包格式（Squirrel、ZIP、DEB、RPM）
  - 自动处理原生依赖和代码签名
- **在项目中的作用**: 管理应用的构建配置，实现跨平台打包和分发

#### vite
下一代前端构建工具，提供极速的开发体验和高效的构建性能。
- **功能**: 负责前端代码的编译、打包和热更新
- **特性**:
  - 基于 ES 模块的快速开发服务器
  - 按需编译，启动速度快
- **在本项目中的作用**: 
  - 分别构建主进程（main）、预加载脚本（preload）和渲染进程（renderer）
  - 提供开发时的热重载功能
  - 优化生产环境的代码打包

#### antd
企业级 React UI 组件库，提供丰富的组件和设计规范。


### 检测模块

#### onnxruntime-web
基于 WebAssembly 的 ONNX 模型推理运行时，可在浏览器环境中高效运行机器学习模型。
- **功能**: 在渲染进程中加载和运行 ONNX 格式的深度学习模型
- **特性**:
  - 支持 WebAssembly 执行提供，实现高性能推理
  - 支持模型优化和图优化
  - 提供 TypeScript 类型定义
  - 在 Web 环境中直接运行，无需 Node.js 后端
- **在本项目中的作用**: 
  - 加载 ResNet34 模型进行头部姿态检测
  - 实时分析摄像头视频帧，预测头部姿态角度（yaw、pitch、roll）
  - 使用 WASM 执行提供实现 CPU 推理，保证跨平台兼容性

### 数据模块
在src/main/services下定义

#### better-sqlite3
高性能的 SQLite3 数据库绑定库，提供同步 API 和更好的性能。
- **功能**: 提供本地关系型数据库存储能力
- **特性**:
  - 同步 API，使用简单
  - 性能优于异步 SQLite 绑定
  - 支持事务、预处理语句等高级特性
  - 提供 TypeScript 类型定义
- **在本项目中的作用**: 
  - 记录检测历史数据和统计信息
  - 提供持久化的本地数据存储方案
  - 支持复杂的数据查询和分析

#### 数据库存储

**数据库位置**
- 数据库文件：`report_data.db`
- 存储路径：`{用户数据目录}/report_data.db`
  - Windows: `%APPDATA%/{应用名}/report_data.db`
  - macOS: `~/Library/Application Support/{应用名}/report_data.db`
  - Linux: `~/.config/{应用名}/report_data.db`

**数据表结构**

使用三个数据表存储监测数据：

1. **screen_sessions** - 屏幕使用数据表
   ```sql
   CREATE TABLE screen_sessions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL UNIQUE,              -- 日期 (YYYY-MM-DD)
     hourly_usage TEXT NOT NULL,            -- 按小时使用时长 (JSON格式: {"00": 1.5, "01": 2.0, ...})
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
   - 存储每日按小时统计的屏幕使用时长
   - `hourly_usage` 字段为 JSON 字符串，包含 24 小时的使用数据

2. **alert_correlations** - 健康提醒数据表
   ```sql
   CREATE TABLE alert_correlations (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL UNIQUE,              -- 日期 (YYYY-MM-DD)
     total_duration_hours REAL NOT NULL,    -- 总监测时长（小时）
     alert_count INTEGER NOT NULL,          -- 提醒次数
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
   - 存储每日监测总时长和健康提醒次数

3. **posture_metrics** - 姿势监测数据表
   ```sql
   CREATE TABLE posture_metrics (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     date TEXT NOT NULL UNIQUE,              -- 日期 (YYYY-MM-DD)
     avg_pitch REAL NOT NULL,               -- 平均俯仰角（度）
     avg_yaw REAL NOT NULL,                 -- 平均偏航角（度）
     avg_roll REAL NOT NULL,                -- 平均翻滚角（度）
     posture_score INTEGER NOT NULL,        -- 姿势评分 (0-100)
     anomaly INTEGER DEFAULT 0,             -- 是否异常 (0/1)
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```
   - 存储每日平均头部姿态角度和综合评分
   - `anomaly` 字段标记异常日（偏离次数占比 > 30%）

**索引优化**
- 所有表都在 `date` 字段上创建了索引，优化日期范围查询性能

**数据收集机制**

1. **实时**（Camera.tsx）
   - 使用累加器模式收集数据，避免内存爆炸
   - 每 5 秒采样一次头部姿态数据
   - 累加器维护以下统计值：
     - `pitchSum/yawSum/rollSum`: 角度累加值
     - `sampleCount`: 样本总数
     - `deviationCount`: 偏离次数
     - `hourlyMinutes`: 按小时统计的监测分钟数

2. **数据聚合与存储**
   - 监测结束时（用户停止监测或应用关闭）触发数据保存
   - 至少 1 分钟且至少 2 个样本才保存
   - 数据聚合计算：
     - 平均值 = 累加值 / 样本数量
     - 姿势评分 = 基于平均值和用户设置的标准值计算（0-100）
     - 异常判断 = 偏离次数占比 > 30%
   - 使用 `INSERT OR REPLACE`，同一天多次监测会自动合并数据

**数据查询**

- **查询接口**: 通过 IPC 通信调用主进程的数据库操作函数
- **数据展示**: Dashboard 页面优先显示真实数据，缺失日期自动填充 0 值

**数据重置**

- 提供"重置数据"功能，可清空所有数据库表
- 操作：点击"重置数据"按钮 → 确认弹窗 → 清空所有数据

#### mock 
- 文件位置：`src/renderer/pages/Report/mockdata.ts`（生成/读取 mock 数据的工具）
- 如需启用 mock：
  - 在 `Dashboard.tsx` 中将数据加载函数改为调用 `fetchScreenData / fetchAlertData / fetchPostureData`（已在代码中用注释标明切换方式）
  - mock 数据会按当前时间范围生成

#### electron-store
简单易用的 Electron 应用数据持久化库，基于 JSON 文件存储。
- **功能**: 提供键值对形式的配置和设置存储
- **特性**:
  - 自动处理数据持久化，无需手动读写文件
  - 提供数据变化监听（watch）功能
  - 数据存储在用户配置目录，跨平台兼容
- **在本项目中的作用**: 
  - 存储用户设置和配置信息（声音开关、姿态阈值、距离）

### 进程间通信
ipc通信

## 代码文件结构

项目采用 Electron 多进程架构，代码主要位于 `src` 目录下，分为三个主要部分：

```
src/
├── main/              # 主进程代码
├── preload/           # 预加载脚本
└── renderer/          # 渲染进程代码（前端界面）
```

### main/ - 主进程

主进程负责应用生命周期管理、窗口创建和系统级 API 调用。

- **main.ts**: 应用入口文件，负责创建窗口和应用生命周期管理
- **ipcHanlder.ts**: IPC 通信处理器，注册所有主进程与渲染进程的通信接口
- **preload.ts**: 预加载脚本的构建入口（已废弃，实际使用 `src/preload/`）
- **functions/**: 主进程功能函数
  - **electron/**: Electron API 封装
    - `dialog.ts`: 文件对话框相关功能
  - **node/**: Node.js API 封装
    - `fileSystem.ts`: 文件系统操作
- **ipc/**: IPC 通信相关
  - `settings.ts`: 设置相关的 IPC 处理
- **services/**: 服务层
  - `store.ts`: 应用配置存储（使用 electron-store）
  - `database.ts`: 数据库操作（使用 better-sqlite3）
  - `electron.d.ts`: Electron 类型定义

### preload/ - 预加载脚本

预加载脚本在渲染进程和主进程之间建立通信桥梁。

- **preload.ts**: 预加载脚本主文件，暴露安全的 API 到渲染进程
- **index.ts**: 预加载脚本入口

### renderer/ - 渲染进程

渲染进程负责用户界面展示和交互，基于 React + TypeScript。

- **main.tsx**: React 应用入口
- **renderer.ts**: 渲染进程入口文件
- **App.tsx**: React 根组件
- **routers/**: 路由配置
- **Layout/**: 布局组件
  - `MainLayout.tsx`: 主布局组件，包含侧边栏导航
- **pages/**: 对应路由下四个页面的组件
- **backend/**: 后端业务逻辑
  - `index.ts`: 后端逻辑入口，导出分析函数
  - **models/**: 模型相关
    - `head-predict.ts`: 头部姿态预测模型加载和推理
    - `analyze.ts`: 视频帧分析逻辑
    - `onnxruntime-web.d.ts`: ONNX Runtime 类型定义补充
- **store/**: 前端全局状态管理，是用zustand
- **services/**: 前端服务
  - `store.ts`: 前端存储服务，与主进程通信获取设置
- **assets/**: 静态资源
  - **models/**: 机器学习模型文件
    - `resnet34.onnx`: ResNet34 头部姿态检测模型
  - **audio/**: 音频文件
    - `notification.wav`: 通知音效
- **types/**: TypeScript 类型定义
  - `electron.d.ts`: Electron API 类型定义
- **App.css**, **index.css**: 全局样式文件



