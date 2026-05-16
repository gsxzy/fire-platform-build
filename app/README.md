# 新致远智慧消防远程监控中心

<p align="center">
  <img src="public/logo.png" width="120" alt="新致远智慧消防">
</p>

<p align="center">
  <b>新一代智慧消防物联网监控平台</b><br>
  集设备接入、实时监控、告警处置、运维管理于一体的消防数字化解决方案
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql" alt="MySQL">
</p>

---

## 📋 项目简介

新致远智慧消防平台是一款面向消防重点单位、消防维保企业和消防监管部门的**全场景智慧消防 SaaS 平台**。平台支持多协议设备接入（GB/T 26875、FSCN8001、GB28181、MQTT），提供实时告警监测、智能巡检、维保工单、值班管理、视频监控等核心能力。

### 核心特性

- 🔥 **多协议设备接入**：支持国标 GB/T 26875、赋安 FSCN8001、国标视频 GB28181、IoT 传感器
- 📡 **实时告警监测**：秒级火警/故障/屏蔽告警推送，支持 135 应急响应流程
- 🏢 **单位档案管理**：消防重点单位数字化建档，一企一档
- 🔧 **维保运维闭环**：从巡检计划、工单派发、维修记录到验收评价全流程
- 📹 **视频联动核查**：火警自动关联视频，支持云台控制、录像回放
- 📊 **数据可视化大屏**：实时数据总览、趋势分析、统计报表
- 🗺️ **GIS 地图监控**：基于高德地图的设备点位可视化与告警定位
- 🏗️ **建筑平面图**：支持消防平面图绘制与设备点位标注

---

## 🏗️ 项目结构

```
app/
├── src/                          # 前端源码
│   ├── api/                      # API 统一层
│   │   ├── client.ts             # HTTP 客户端 + Mock 拦截 + 请求取消
│   │   ├── mock.ts               # Mock 路由处理器（IndexedDB + 通用 CRUD）
│   │   ├── services.ts           # 业务 Service + legacyApi 兼容层
│   │   ├── legacyMockData.ts     # 旧格式静态 mock 数据
│   │   ├── fireHostService.ts    # 消防主机业务服务
│   │   ├── videoService.ts       # 视频服务封装
│   │   └── wvpClient.ts          # WVP 视频平台客户端
│   ├── components/               # 公共组件（shadcn/ui + 自定义）
│   ├── core/                     # 核心基础设施
│   │   ├── platform/             # 模块引擎、注册表、消息总线
│   │   ├── DynamicRoutes.tsx     # 动态路由生成器
│   │   ├── ToastContext.tsx      # 全局 Toast
│   │   ├── LoadingContext.tsx    # 全局加载状态
│   │   ├── AlarmPopupContext.tsx # 告警弹窗上下文
│   │   ├── SidebarContext.tsx    # 侧边栏折叠状态
│   │   ├── PageTransition.tsx    # 页面过渡动画
│   │   └── PageBreadcrumb.tsx    # 面包屑导航
│   ├── db/                       # 浏览器端 IndexedDB 数据层
│   │   ├── Database.ts           # IndexedDB DAO（20 张表）
│   │   └── seeds.ts              # 种子数据（全 20 表）
│   ├── hooks/                    # 自定义 React Hooks
│   ├── lib/                      # 工具函数
│   ├── pages/                    # 路由页面
│   ├── sections/                 # 业务页面模块（~100+ 页面）
│   ├── services/                 # 业务服务层（WebSocket 等）
│   ├── styles/                   # 全局 CSS / Design Tokens
│   ├── types/                    # TypeScript 类型定义
│   ├── App.tsx                   # 根组件（AuthGuard + MainLayout）
│   └── main.tsx                  # 应用入口
├── backend/                      # 后端服务（Node.js + Express）
│   ├── server.js                 # API 服务入口（Express + JWT + 连接池）
│   ├── fireHostApi.js            # 核心 RESTful API 路由
│   ├── gb26875Server.js          # GB/T 26875 国标 TCP 服务器（端口 5200）
│   ├── fscn8001Server.js         # 赋安 FSCN8001 私有协议 TCP 服务器（端口 5201）
│   ├── routes/                   # API 路由模块
│   ├── services/                 # 业务服务层
│   ├── middleware/               # Express 中间件
│   ├── config/                   # 配置文件
│   ├── scripts/                  # 运维脚本
│   ├── uploads/                  # 上传文件目录
│   ├── utils/                    # 工具函数
│   ├── sql/                      # 后端数据库脚本
│   ├── .env.example              # 环境变量模板
│   └── fire-platform.conf        # Nginx 反向代理配置
├── sql/                          # 数据库 Schema / 升级脚本（全平台）
├── public/                       # 静态资源（logo 等）
├── dist/                         # Vite 构建产物
├── .env / .env.production        # 前端环境变量
├── vite.config.ts                # Vite 配置（代码分割 + 构建分析）
└── package.json                  # 前端依赖与脚本
```

---

## 🚀 快速启动

### 环境要求

- Node.js ≥ 20
- MySQL ≥ 8.0
- Nginx（生产环境推荐）

### 1. 克隆项目

```bash
git clone <repository-url>
cd fire-platform-build/app
```

### 2. 前端启动

```bash
# 安装依赖
npm install

# 开发模式（端口 3000）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 3. 后端启动

```bash
cd backend
npm install

# 配置环境变量（参考 .env.example）
cp .env.example .env
# 编辑 .env 填写数据库连接信息、JWT_SECRET 等

# 启动服务
node server.js
```

后端默认监听 `0.0.0.0:5003`，同时启动：
- Express HTTP API 服务
- GB/T 26875 TCP 接收服务（端口 5200）
- FSCN8001 TCP 接收服务（端口 5201）

### 4. Nginx 配置（生产环境）

参考 `backend/fire-platform.conf` 配置反向代理：

```nginx
server {
    listen 80;
    server_name 124.223.35.58;
    root /www/wwwroot/fire-platform;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5003/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🧱 技术架构

### 前端架构

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **前端框架** | React | ^19.2.0 | 函数组件 + Hooks |
| **语言** | TypeScript | ~5.9.3 | strict + noUnusedLocals |
| **构建工具** | Vite | ^7.2.4 | 开发服务器 port 3000 |
| **路由** | React Router | ^7.6.1 | HashRouter 模式（`/#/path`） |
| **UI 组件** | shadcn/ui + Radix UI | — | 40+ 原子组件 |
| **样式** | Tailwind CSS | ^3.4.19 | 暗色主题为主 |
| **状态管理** | React Context + Hooks | — | 无 Redux/Zustand |
| **表单** | React Hook Form + Zod | ^7.70.0 / ^4.3.5 | 校验方案 |
| **图表** | Recharts | ^2.15.4 | 数据分析/报表 |
| **本地数据层** | Browser IndexedDB | — | 开发期 Mock / 前端缓存 |
| **HTTP 客户端** | Native `fetch` 封装 | — | axios 已安装但**未使用** |
| **测试** | Vitest + jsdom | ^4.1.5 | `@testing-library/react` |
| **Lint** | ESLint 9 + typescript-eslint | ^9.39.1 | — |
| **图标** | Lucide React | ^0.562.0 | — |
| **日期** | date-fns | ^4.1.0 | — |
| **Toast** | Sonner | ^2.0.7 | — |
| **视频播放** | hls.js | ^1.6.16 | HLS 视频流 |
| **平面图** | Konva + react-konva | ^10.2.5 | Canvas 消防平面图绘制 |

### 后端架构

| 层级 | 技术 | 说明 |
|------|------|------|
| **运行时** | Node.js 20+ | CommonJS 模式 |
| **Web 框架** | Express 4.x | RESTful API |
| **数据库** | MySQL 8.0 | mysql2 驱动 + 连接池 |
| **认证** | JWT (jsonwebtoken) + bcryptjs | Bearer Token + 密码哈希 |
| **安全** | Helmet + express-rate-limit | 安全响应头 + 速率限制 |
| **校验** | express-validator | 请求参数校验 |
| **文件上传** | multer |  multipart 上传 |
| **Modbus** | jsmodbus | 设备 Modbus 通信 |
| **MQTT** | mqtt | IoT 设备接入 |
| **Excel** | xlsx | 数据导入导出 |

### 数据库架构

- **MySQL 8.0**：核心关系型数据库，30+ 张业务表
- **IndexedDB**：前端本地缓存 / 开发期 Mock 数据（`SmartFirePlatformDB`，20 张表）

---

## 📦 项目脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（port 3000） |
| `npm run build` | TypeScript 编译 + Vite 生产构建 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 预览生产构建 |
| `npx vitest` | 运行单元测试 |

### 部署脚本

```bash
# 前端部署（上传到 124.223.35.58）
python deploy_dist.py

# 后端部署 + PM2 重启
python deploy_backend.py

# 数据库更新
python deploy_db.py
```

---

## 🔐 安全配置

### 环境变量（必须配置）

| 变量 | 说明 | 示例 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥（生产必须修改） | `your-random-secret-key` |
| `DB_PASSWORD` | MySQL 密码 | `StrongP@ssw0rd` |
| `CORS_ORIGIN` | 允许的跨域来源 | `https://your-domain.com` |
| `NODE_ENV` | 运行环境 | `production` |

⚠️ **警告**：生产环境务必修改 `JWT_SECRET`，切勿使用默认值。

### 安全特性

- JWT Bearer Token 认证
- bcryptjs 密码哈希（10 rounds）
- SQL 注入防护（参数化查询 + LIKE 过滤）
- Express Rate Limit 速率限制
- Helmet 安全响应头

---

## 🧩 业务模块

平台通过 `src/core/platform/ModuleRegistry.ts` 注册 **23+ 业务模块**，支持动态启用/禁用：

| 模块 | 说明 |
|------|------|
| 工作台 | 个人待办、快捷入口、通知中心 |
| 监控中心 | 实时设备状态、火警监控 |
| 告警中心 | 告警列表、告警确认/处理/派发 |
| 设备管理 | 设备台账、设备反控、设备接入 |
| 维保管理 | 维保工单、维保记录、维保合同、维保公司 |
| 巡检管理 | 巡检计划、巡检记录、隐患管理 |
| 消控室 | 消防主机监控、多线盘、总线盘 |
| 预案管理 | 应急预案、演练记录 |
| 消防检查 | 日常检查、检查记录 |
| GIS 地图 | 设备点位、告警定位 |
| 数据分析 | 告警趋势、设备分析、报表导出 |
| 大屏模式 | 数据可视化大屏 |
| AI 决策 | 智能预警、AI 辅助决策 |
| IoT 接入 | IoT 设备、协议配置、数据管道 |
| 视频中心 | GB28181 国标视频、HLS 播放、云台控制 |
| 值班管理 | 排班计划、交接班、值班日志 |
| 知识库 | 消防知识、文档管理 |
| 培训考核 | 培训课程、在线考试 |
| 系统管理 | 用户/角色/权限/部门/配置/日志 |

---

## 📚 相关文档

- [`ARCHITECTURE_REPORT.md`](ARCHITECTURE_REPORT.md) — 完整架构设计报告（前端源码分析、依赖清单、性能优化建议）
- [`DESIGN.md`](DESIGN.md) — 数据库设计与 API 接口规范（20 张表定义、RESTful API 说明）
- [`backend/fire-platform.conf`](backend/fire-platform.conf) — Nginx 生产配置
- [`sql/`](sql/) — 数据库初始化与升级脚本

---

## 📄 许可

Copyright © 2025 新致远科技. All rights reserved.

---

<p align="center">
  built with ❤️ by 新致远研发团队
</p>
