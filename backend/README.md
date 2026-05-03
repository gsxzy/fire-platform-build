# 新致远智慧消防云平台 - 后端服务

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | Node.js 20 + TypeScript |
| Web框架 | Express 4.19 |
| 数据库 | MySQL 8.0 + Sequelize ORM |
| 缓存 | Redis 7 (ioredis) |
| 消息队列 | Redis Pub/Sub |
| 实时通信 | WebSocket (ws) |
| IoT接入 | MQTT (mqtt.js) + Modbus TCP + SNMP |
| 定时任务 | node-cron |
| 日志 | Winston + DailyRotateFile |
| 部署 | Docker + Docker Compose |

## 项目结构

```
backend/
├── src/
│   ├── app.ts              # 服务入口
│   ├── config/
│   │   ├── database.ts     # MySQL连接配置
│   │   ├── redis.ts        # Redis连接配置
│   │   └── logger.ts       # 日志配置
│   ├── models/             # 30+张数据库模型
│   ├── controllers/        # 业务控制器 (16个模块)
│   ├── routes/             # RESTful路由定义
│   ├── services/           # 业务逻辑层
│   ├── middleware/         # 认证/权限/日志/上传
│   ├── utils/              # JWT/响应格式
│   ├── websocket/          # WebSocket实时推送
│   ├── iot/                # IoT设备接入网关
│   ├── cron/               # 定时任务
│   └── seeders/            # 数据库种子数据
├── docker/
│   ├── nginx/              # Nginx反向代理配置
│   ├── mosquitto/          # MQTT Broker配置
│   └── mysql/              # MySQL配置文件
├── docker-compose.yml      # 一键部署配置
├── Dockerfile              # 后端服务镜像
└── package.json
```

## 快速开始

### 1. 环境准备

```bash
# 安装Node.js 20+ 和 MySQL 8.0+、Redis 7+
# 或使用Docker一键部署
docker-compose up -d
```

### 2. 本地开发

```bash
cd backend
npm install

# 初始化数据库
npm run db:sync

# 导入种子数据
npm run seed

# 启动开发服务
npm run dev
```

### 3. API接口文档

启动后访问 `http://localhost:3000/health` 检查服务状态。

完整API列表：

| 模块 | 基础路径 | 说明 |
|------|---------|------|
| 认证 | `/api/auth/*` | 登录/注册/个人信息 |
| 用户管理 | `/api/users/*` | CRUD/重置密码 |
| 角色权限 | `/api/roles/*` | 角色/权限管理 |
| 组织架构 | `/api/departments/*` | 部门管理 |
| 单位管理 | `/api/units/*` | 消防单位CRUD |
| 设备管理 | `/api/devices/*` | 设备档案/状态统计 |
| 告警中心 | `/api/alarms/*` | 告警/确认/处理/趋势 |
| 维保管理 | `/api/maintenance/*` | 单位/合同/工单 |
| 巡检管理 | `/api/patrol/*` | 计划/记录/隐患 |
| 消控室 | `/api/control-rooms/*` | 消控室管理 |
| 应急预案 | `/api/plans/*` / `/api/drills/*` | 预案/演练 |
| 知识库 | `/api/knowledge/*` | 文档管理 |
| IoT接入 | `/api/iot/*` | 设备/协议/管道 |
| AI决策 | `/api/ai/*` | 决策/智能预警 |
| 培训考核 | `/api/training/*` | 课程/考试 |
| 消防检查 | `/api/inspections/*` | 检查记录 |
| 系统管理 | `/api/system/*` | 配置/日志/大屏/模块 |

## 认证说明

所有API（除登录注册外）需要在请求头中携带JWT Token：

```
Authorization: Bearer <token>
```

Token通过 `/api/auth/login` 接口获取。

## WebSocket实时推送

连接地址：`ws://localhost:3000/ws`

支持事件：
- `alarm` - 新告警推送
- `device_status` - 设备状态变更
- `workorder` - 工单通知

## IoT设备接入

支持协议：
- **MQTT** - 通过MQTT Broker接入，订阅主题 `fire/{unitId}/{deviceSn}`
- **Modbus TCP** - 通过 `iot/modbus/read` 接口读取寄存器
- **SNMP** - 通过 `iot/snmp/read` 接口读取OID
- **HTTP/HTTPS** - 设备主动上报

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 3000 |
| DB_HOST | MySQL主机 | 127.0.0.1 |
| DB_NAME | 数据库名 | fire_platform |
| DB_USER | 数据库用户 | fire_user |
| DB_PASSWORD | 数据库密码 | Fire_Pass_2024! |
| REDIS_HOST | Redis主机 | 127.0.0.1 |
| JWT_SECRET | JWT密钥 | xzy_fire_platform_secret_key_2024 |
| ADMIN_USERNAME | 超级管理员账号 | admin |
| ADMIN_PASSWORD | 超级管理员密码 | admin123 |

## 生产部署

```bash
# 使用Docker Compose一键部署
docker-compose up -d

# 查看日志
docker logs -f fire_backend

# 查看服务状态
curl http://localhost:3000/health
```

## 许可证

商用授权 - 新致远消防科技
