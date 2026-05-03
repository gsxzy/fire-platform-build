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
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript" alt="TypeScript">
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
```

### 3. 后端启动

```bash
cd backend
npm install

# 配置环境变量（参考 .env.example）
cp .env.example .env
# 编辑 .env 填写数据库连接信息

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

## 🏗️ 技术架构

### 前端架构

```
src/
├── api/           # API 客户端 + Mock 层
├── components/    # 公共组件（shadcn/ui + 自定义）
├── core/          # 全局状态（Toast/Alarm/Sidebar/Auth）
├── db/            # IndexedDB 前端数据库（开发期 Mock）
├── hooks/         # 自定义 React Hooks
├── lib/           # 工具函数
├── pages/         # 路由页面（懒加载）
├── sections/      # 业务页面模块
├── services/      # 业务服务层
├── styles/        # 全局 CSS / Design Tokens
└── types/         # TypeScript 类型定义
```

### 后端架构

```
backend/
├── server.js           # API 服务入口（Express + JWT + 连接池）
├── fireHostApi.js      # 核心 RESTful API 路由
├── gb26875Server.js    # GB/T 26875 国标 TCP 服务器
├── fscn8001Server.js   # 赋安 FSCN8001 私有协议 TCP 服务器
├── fire-platform.conf  # Nginx 反向代理配置
└── *.sql               # 数据库 Schema / 优化脚本
```

### 数据库架构

- **MySQL 8.0**：核心关系型数据库，30+ 张业务表
- **IndexedDB**：前端本地缓存 / 开发期 Mock 数据
- **Redis**（可选）：热点数据缓存、会话存储

---

## 📦 项目脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 编译 + Vite 生产构建 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 预览生产构建 |

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

## 📚 相关文档

- [`ARCHITECTURE_REPORT.md`](ARCHITECTURE_REPORT.md) — 完整架构设计报告
- [`DESIGN.md`](DESIGN.md) — 数据库设计与 API 接口规范
- [`backend/fire-platform.conf`](backend/fire-platform.conf) — Nginx 生产配置

---

## 📄 许可

Copyright © 2025 新致远科技. All rights reserved.

---

<p align="center">
  built with ❤️ by 新致远研发团队
</p>
