# 新致远智慧消防平台 - 工程化规范

> **版本**: 2.0.0  
> **规范级别**: 企业级  
> **适用范围**: 前端 (React+Vite) + 后端 (Node.js+Express)

---

## 一、项目目录结构

```
fire-platform/                          # 项目根目录
│
├── 📁 app/                             # 前端应用
│   ├── 📁 public/                      # 静态资源（不经过构建）
│   │   ├── logo.png
│   │   └── header-title.png
│   ├── 📁 src/                         # 源码
│   │   ├── 📁 api/                     # API 接口封装
│   │   │   ├── client.ts               # HTTP 客户端配置
│   │   │   └── services/               # 业务 API 服务
│   │   ├── 📁 components/              # 通用组件
│   │   │   ├── ui/                     # 基础 UI 组件（Button/Input/Modal 等）
│   │   │   └── common/                 # 业务通用组件
│   │   ├── 📁 core/                    # 核心逻辑
│   │   │   ├── DynamicRoutes.tsx       # 动态路由
│   │   │   └── AuthGuard.tsx           # 权限守卫
│   │   ├── 📁 hooks/                   # 自定义 Hooks
│   │   ├── 📁 lib/                     # 工具库封装
│   │   ├── 📁 sections/                # 页面级组件
│   │   │   ├── FireControlRoomPage.tsx # 消控室
│   │   │   ├── ScreenDashboardPage.tsx # 大屏
│   │   │   └── ...
│   │   ├── 📁 services/                # 前端业务服务
│   │   ├── 📁 styles/                  # 全局样式
│   │   │   ├── index.css
│   │   │   └── fire-control-room.css
│   │   ├── 📁 types/                   # TypeScript 类型定义
│   │   └── 📁 test/                    # 测试配置
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── 📁 backend/                         # 后端服务
│   ├── 📁 src/
│   │   ├── 📁 config/                  # 配置文件
│   │   │   ├── database.ts             # 数据库配置
│   │   │   ├── redis.ts                # Redis 配置
│   │   │   ├── logger.ts               # 日志配置
│   │   │   └── corsOptions.ts          # CORS 配置
│   │   ├── 📁 constants/               # 常量定义
│   │   │   └── deviceLifecycle.ts
│   │   ├── 📁 controllers/             # 控制器（路由处理）
│   │   │   ├── alarm.controller.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── ...
│   │   ├── 📁 cron/                    # 定时任务
│   │   ├── 📁 iot/                     # IoT 设备接入
│   │   ├── 📁 middleware/              # 中间件
│   │   │   ├── auth.ts                 # JWT 鉴权
│   │   │   ├── logger.ts               # 请求日志
│   │   │   ├── rateLimit.ts            # 限流
│   │   │   └── requestTracer.ts        # 请求追踪
│   │   ├── 📁 models/                  # 数据模型 (Sequelize)
│   │   │   ├── device.model.ts
│   │   │   ├── alarm.model.ts
│   │   │   └── associations.ts         # 模型关联
│   │   ├── 📁 protocols/               # 设备协议服务器
│   │   │   ├── gb26875.server.ts       # GB26875 协议
│   │   │   └── fscn8001.server.ts      # FSCN8001 协议
│   │   ├── 📁 routes/                  # 路由定义
│   │   │   ├── index.ts
│   │   │   └── modules/
│   │   ├── 📁 seeders/                 # 数据种子
│   │   ├── 📁 services/                # 业务逻辑层
│   │   │   ├── alarm.service.ts
│   │   │   ├── video.service.ts
│   │   │   └── ...
│   │   ├── 📁 types/                   # 类型定义
│   │   ├── 📁 utils/                   # 工具函数
│   │   │   ├── jwt.ts
│   │   │   ├── response.ts
│   │   │   └── isnb.parser.ts
│   │   ├── 📁 websocket/               # WebSocket 服务
│   │   └── app.ts                      # 应用入口
│   ├── 📁 sql/                         # 数据库迁移和脚本
│   │   ├── migrations/                 # Sequelize 迁移
│   │   └── V001__*.sql                 # Flyway 迁移（旧）
│   ├── package.json
│   └── tsconfig.json
│
├── 📁 docker/                          # 容器化配置
│   ├── 📁 frontend/
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   ├── 📁 backend/
│   │   └── Dockerfile
│   ├── 📁 mysql/
│   │   ├── my.cnf
│   │   └── init/
│   └── 📁 redis/
│       └── redis.conf
│
├── 📁 config/                          # 统一配置
│   ├── .env.docker                     # Docker 环境变量模板
│   ├── .env.development                # 开发环境配置
│   └── .env.production                 # 生产环境配置
│
├── 📁 scripts/                         # 运维脚本
│   ├── build.sh                        # 统一构建
│   ├── run.sh                          # 启动/停止/重启
│   ├── backup.sh                       # 数据备份
│   └── health-check.sh                 # 健康检查
│
├── 📁 docs/                            # 文档
│   ├── CONTAINERIZATION.md             # 容器化部署指南
│   ├── ENGINEERING.md                  # 工程化规范（本文档）
│   └── OPERATIONS.md                   # 运维手册
│
├── docker-compose.yml                  # Docker Compose 编排
├── .dockerignore                       # Docker 构建忽略
├── .env                                # 环境变量（gitignore，手动创建）
└── VERSION                             # 版本号文件
```

---

## 二、版本管理规范

### 2.1 版本号规则 (SemVer)

```
主版本号.次版本号.修订号[-预发布标识]

示例:
  2.0.0        # 正式发布
  2.1.0-beta   # 预发布版本
  2.1.1-hotfix # 热修复
```

| 版本变化 | 触发条件 | 示例 |
|---------|---------|------|
| 主版本号 (X.0.0) | 不兼容的 API 变更 | 数据库结构大改、认证方式变更 |
| 次版本号 (0.X.0) | 向下兼容的功能新增 | 新增报警主机协议支持 |
| 修订号 (0.0.X) | 向下兼容的问题修复 | Bug 修复、性能优化 |

### 2.2 Git 分支策略 (Git Flow)

```
main          ← 生产分支，只接受 hotfix 和 release 合并
  │
  ├─ develop  ← 开发分支，日常开发基于此
  │   ├─ feature/gb28181-unit-assign
  │   ├─ feature/alarm-batch-delete
  │   └─ feature/iot-ctwing-enhance
  │
  ├─ release/v2.1.0  ← 发布分支，冻结功能，只修 Bug
  │
  └─ hotfix/v2.0.1   ← 热修复分支，从 main 切出，修复后合并回 main + develop
```

### 2.3 提交信息规范 (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(alarm): 新增批量确认告警接口` |
| `fix` | Bug 修复 | `fix(device): 修复设备编号竞态问题` |
| `perf` | 性能优化 | `perf(alarm): 优化告警趋势查询 SQL` |
| `refactor` | 代码重构 | `refactor(auth): 权限查询改为 Redis 缓存` |
| `docs` | 文档更新 | `docs(deploy): 更新容器化部署指南` |
| `chore` | 构建/工具 | `chore(docker): 优化多阶段构建缓存` |
| `security` | 安全修复 | `security(logger): 添加请求体脱敏` |

**示例:**

```
feat(iot): CTWing 推送增加 ISNB 协议解析

- 新增 isnb.parser.ts 协议解析器
- 支持水压/液位/烟感数据解析
- 支持告警和故障事件检测

Closes #123
```

---

## 三、编码规范

### 3.1 后端 (TypeScript + Node.js)

#### 文件命名

- 控制器: `{name}.controller.ts`
- 服务: `{name}.service.ts`
- 模型: `{name}.model.ts`
- 中间件: `{name}.ts` (位于 `middleware/`)
- 工具: `{name}.ts` (位于 `utils/`)

#### 代码风格

```typescript
// ✅ 使用 async/await，避免回调地狱
async function getAlarmDetail(id: number): Promise<AlarmDetail> {
  const alarm = await Alarm.findByPk(id);
  if (!alarm) throw new HttpError(404, '告警不存在');
  return alarm;
}

// ✅ 统一的错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json(fail(err.message, err.status));
  }
  logger.error('Unhandled error', { err, path: req.path });
  return res.status(500).json(fail('服务器内部错误', 500));
});

// ✅ 敏感信息脱敏
function sanitizeBody(body: Record<string, any>): Record<string, any> {
  const clone = { ...body };
  ['password', 'token', 'secret', 'apiKey'].forEach(k => {
    if (k in clone) clone[k] = '***';
  });
  return clone;
}
```

#### API 响应格式

```typescript
// 成功响应
{ "code": 200, "data": { ... }, "message": "操作成功" }

// 失败响应
{ "code": 400, "data": null, "message": "参数错误: 设备编号不能为空" }

// 分页响应
{
  "code": 200,
  "data": {
    "list": [...],
    "pagination": { "page": 1, "pageSize": 20, "total": 156 }
  },
  "message": "查询成功"
}
```

### 3.2 前端 (TypeScript + React)

#### 组件规范

```typescript
// ✅ 使用函数组件 + Hooks
import { useState, useEffect, useCallback } from 'react';

// 组件名使用 PascalCase
export default function AlarmTable({ alarms, onConfirm }: AlarmTableProps) {
  // 状态命名: [名词, set + 名词]
  const [loading, setLoading] = useState(false);

  // 事件处理: handle + 动作 + 对象
  const handleConfirmAlarm = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await confirmAlarm(id);
      toast.success('确认成功');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="alarm-table">
      {/* 组件内容 */}
    </div>
  );
}
```

#### 样式规范

```typescript
// ✅ 使用 Tailwind CSS 工具类
// 优先级: Tailwind 内置类 > 自定义类 (styles/*.css) > inline style

// ✅ 响应式设计
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ 状态颜色语义化
// 火警: red / 故障: amber / 正常: emerald / 信息: blue
```

---

## 四、日志规范

### 4.1 日志级别使用

| 级别 | 使用场景 | 示例 |
|------|---------|------|
| `error` | 影响功能的错误 | 数据库连接失败、API 异常 |
| `warn` | 警告但不影响功能 | 设备心跳超时、签名验证失败 |
| `info` | 关键业务流程 | 用户登录、设备注册、告警触发 |
| `debug` | 调试信息 | SQL 语句、请求参数、返回值 |

### 4.2 日志格式 (JSON)

```json
{
  "timestamp": "2026-05-16T14:30:00.123+08:00",
  "level": "info",
  "message": "[Auth] 用户登录成功",
  "service": "fire-platform-backend",
  "version": "2.0.0",
  "traceId": "abc123-def456",
  "context": {
    "userId": 123,
    "username": "admin",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 4.3 日志轮转

- 后端: `winston-daily-rotate-file`，每日切割，保留 30 天
- Nginx: Docker 内置 `json-file` driver，单文件最大 50MB，保留 3 个
- MySQL: 错误日志和慢查询日志保留 7 天

---

## 五、依赖管理

### 5.1 后端依赖

```bash
# 安装生产依赖
npm install <package>

# 安装开发依赖
npm install -D <package>

# 更新依赖（使用 npm-check-updates）
npx ncu -u
npm install

# 安全审计
npm audit
npm audit fix
```

### 5.2 前端依赖

```bash
# 安装依赖
npm install <package>

# 构建产物分析
npm run build -- --mode analyze
```

### 5.3 依赖锁定

- 必须提交 `package-lock.json` 到版本控制
- CI/CD 构建使用 `npm ci` 以确保一致性

---

## 六、构建与发布流程

### 6.1 开发环境

```bash
# 启动开发服务器（热重载）
cd backend && npm run dev    # 后端: http://localhost:5003
cd app && npm run dev        # 前端: http://localhost:3000
```

### 6.2 测试环境

```bash
# 1. 构建镜像
./scripts/build.sh test

# 2. 启动测试环境
NODE_ENV=test ./scripts/run.sh start

# 3. 执行集成测试
npm run test:e2e
```

### 6.3 生产环境

```bash
# 1. 切到发布分支
git checkout -b release/v2.1.0

# 2. 更新版本号
# - 修改 package.json version
# - 修改 VERSION 文件
# - 修改 app/.env.production VITE_APP_VERSION

# 3. 构建并推送镜像
./scripts/build.sh prod 2.1.0

# 4. 打 Tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0

# 5. 生产服务器部署
ssh prod-server "cd /opt/fire-platform && git pull && ./scripts/run.sh start --build"
```

---

## 七、代码审查清单

### PR 提交前自查

- [ ] 代码通过 ESLint / TypeScript 编译
- [ ] 新增功能包含对应测试
- [ ] 敏感信息（密码、密钥）未硬编码
- [ ] 数据库变更包含迁移文件
- [ ] API 变更包含接口文档更新
- [ ] 日志中包含必要的 traceId
- [ ] 性能关键点已评估（N+1 查询、大表扫描等）

---

## 八、附录

### A. 常用命令速查

```bash
# 前端
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run lint         # ESLint 检查

# 后端
npm run dev          # 开发模式（热重载）
npm run build        # TypeScript 编译
npm run start        # 生产启动
npm run db:migrate   # 数据库迁移
npm run db:sync      # 同步模型（开发用）

# Docker
./scripts/build.sh   # 构建镜像
./scripts/run.sh     # 服务管理
./scripts/backup.sh  # 数据备份
```

### B. 技术栈版本

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 19.2 |
| 构建工具 | Vite | 7.2 |
| UI 组件 | Radix UI + Tailwind CSS | 3.4 |
| 后端框架 | Express | 4.19 |
| ORM | Sequelize | 6.37 |
| 数据库 | MySQL | 8.0 |
| 缓存 | Redis | 7 |
| 容器 | Docker | 24.0+ |
