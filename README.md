# 新致远智慧消防远程监控中心 V2.0

> 城市级智慧消防物联网监控管理平台，符合 GB 26875《城市消防远程监控系统》标准设计。

## 技术架构

### 前端
- **React 19.2** + **TypeScript 5.9** + **Vite 7.2**
- **Tailwind CSS 3.4** + shadcn/ui 组件库
- **Recharts** 数据可视化
- **HashRouter** 单页应用

### 后端
- **Node.js 20+** + **Express 4.19**
- **Sequelize 6.37** + **MySQL 8.0** + **Redis**
- **JWT** 认证 + **WebSocket** 实时推送
- **PM2** 进程管理（生产环境）

### 第三方服务
- **WVP-PRO** — GB28181 视频监控平台
- **ZLMediaKit** — 流媒体服务器
- **CTWing** — 天翼物联网平台（海康4G设备接入）

## 快速开始

### 环境要求
- Node.js >= 20.0.0
- MySQL 8.0
- Redis 7.x

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd app
npm install
```

### 2. 配置环境变量

```bash
# 后端：复制示例配置并修改
cp backend/.env.example backend/.env
# 编辑 backend/.env，填写数据库密码、JWT 密钥等必填项

# 前端：复制示例配置并修改
cp app/.env.example app/.env
# 编辑 app/.env，填写 API 地址、地图 Key 等
```

> ⚠️ **安全警告**：生产环境必须生成强密码和随机 JWT 密钥，切勿使用默认值。

### 3. 数据库迁移

```bash
cd backend

# 首次初始化（创建表结构）
npx sequelize-cli db:migrate

# 回滚最近一次迁移
npx sequelize-cli db:migrate:undo

# 查看迁移状态
npx sequelize-cli db:migrate:status
```

> 旧版 `npm run db:sync` 仍可用（开发环境），但生产环境请务必使用 migration。

### 4. 导入种子数据（可选）

```bash
cd backend
npm run seed
```

> 需先设置 `ADMIN_PASSWORD` 环境变量，否则将跳过管理员创建。

### 5. 启动服务

```bash
# 后端开发模式
cd backend
npm run dev

# 前端开发模式
cd app
npm run dev

# 生产构建
cd app
npm run build
```

### 6. 访问系统

- 前端开发地址：`http://localhost:5173`
- 后端 API 地址：`http://localhost:5003`

## 部署指南

### Docker Compose 部署

```bash
cd backend
# 1. 确保 .env 已配置
cp .env.example .env
# 2. 启动全部服务
docker-compose up -d
```

### 手动部署（生产环境）

详见 [DEPLOY.md](./DEPLOY.md)

## 项目结构

```
├── app/                    # 前端（React + Vite）
│   ├── src/
│   │   ├── sections/       # 页面模块
│   │   ├── components/     # 通用组件
│   │   ├── api/            # API 客户端
│   │   └── hooks/          # 自定义 Hooks
│   └── .env.example
├── backend/                # 后端（Express + Sequelize）
│   ├── src/
│   │   ├── controllers/    # 控制器
│   │   ├── services/       # 业务服务
│   │   ├── models/         # Sequelize 模型
│   │   ├── routes/         # 路由定义
│   │   ├── middleware/     # 中间件
│   │   ├── config/         # 配置文件
│   │   ├── seeders/        # 种子数据
│   │   └── utils/          # 工具函数
│   ├── sql/                # 数据库迁移文件（Sequelize CLI）
│   └── .env.example
├── deploy/                 # 部署脚本与资源
└── AGENTS.md               # Agent 工作记忆（架构/配置/密钥）
```

## 核心功能模块

| 模块 | 说明 |
|------|------|
| 监控中心 | 实时指标、告警弹窗、视频监控、消控室联动 |
| 告警管理 | 火警/故障/反馈全生命周期处理 |
| 单位管理 | 单位档案、建筑信息、消防设施 |
| 设备管理 | 设备档案、IoT 接入、生命周期、维保记录 |
| 巡检管理 | 巡检计划、任务派发、隐患整改 |
| 应急预案 | 预案库、演练记录 |
| 数据分析 | 报警趋势、统计报表、大屏展示 |
| 系统管理 | 用户/角色/权限、操作日志、系统配置 |

## 环境变量参考

### 后端必填项

| 变量 | 说明 |
|------|------|
| `DB_PASSWORD` | MySQL 密码（不能为空） |
| `JWT_SECRET` | JWT 签名密钥（建议 64 位随机字符串） |
| `ZLM_SECRET` | ZLMediaKit Secret |
| `HIKVISION_4G_API_KEY` | 海康4G设备接入鉴权密钥 |

### 前端必填项

| 变量 | 说明 |
|------|------|
| `VITE_API_BASE` | API 基础路径（如 `/api`） |
| `VITE_WS_URL` | WebSocket 地址 |
| `VITE_AMAP_KEY` | 高德地图 Key |

完整变量列表请参阅 `.env.example` 文件。

## 安全加固

1. **生产环境必须修改所有默认密码和密钥**
2. `.env`、`.env.production` 文件不应提交到版本控制
3. 定期轮换 `JWT_SECRET`、`ZLM_SECRET` 和数据库密码
4. IoT 接入建议配置 `IOT_IP_WHITELIST` 限制来源 IP

## 开发规范

- 前端遵循 React + TypeScript 规范，组件使用函数式 + Hooks
- 后端遵循 RESTful API 设计，统一响应格式 `{ code, message, data, timestamp }`
- 数据库变更必须通过 Sequelize Migration，禁止手工 ALTER 生产表
- 敏感配置（密码、密钥）必须走环境变量，禁止硬编码

## 许可证

COMMERCIAL — 新致远科技版权所有
