# 新致远智慧消防平台 — 完整架构解析报告

> 生成时间：2026-04-22  
> 分析范围：全项目源码（`src/` + 配置文件）

---

## 一、项目目录结构 & 前后端技术栈

### 1.1 目录结构

```
app/
├── dist/                          # Vite 构建产物（静态文件）
│   ├── assets/                    # 哈希化 JS/CSS chunk
│   ├── index.html
│   └── logo.png
├── public/
│   └── logo.png
├── src/
│   ├── api/                       # API 统一层
│   │   ├── client.ts              # HTTP 客户端 + Mock 拦截 + 请求取消
│   │   ├── mock.ts                # Mock 路由处理器（IndexedDB + 通用 CRUD）
│   │   ├── services.ts            # 业务 Service + legacyApi 兼容层
│   │   └── legacyMockData.ts      # 旧格式静态 mock 数据
│   ├── components/                # shadcn/ui 组件库（~40+ 组件）
│   ├── core/                      # 核心基础设施
│   │   ├── platform/              # 模块引擎、注册表、消息总线
│   │   ├── DynamicRoutes.tsx      # 动态路由生成器
│   │   ├── ToastContext.tsx       # 全局 Toast
│   │   ├── LoadingContext.tsx     # 全局加载状态
│   │   ├── SidebarContext.tsx     # 侧边栏折叠状态
│   │   ├── PageTransition.tsx     # 页面过渡动画
│   │   └── PageBreadcrumb.tsx     # 面包屑导航
│   ├── db/                        # 浏览器端数据层
│   │   ├── Database.ts            # IndexedDB DAO（20 张表）
│   │   └── seeds.ts               # 种子数据（全 20 表）
│   ├── hooks/
│   │   └── useAuth.tsx            # 认证上下文
│   ├── sections/                  # 页面级组件（~50+ 页面）
│   │   ├── MainLayout.tsx         # 主布局（Sidebar + Header + Content）
│   │   ├── Sidebar.tsx            # 动态侧边栏（基于 ModuleEngine）
│   │   ├── Header.tsx / Footer.tsx
│   │   ├── LoginPage.tsx
│   │   └── *Page.tsx              # 各业务页面（懒加载）
│   ├── services/
│   │   └── websocket.service.ts   # WebSocket 客户端（未接入应用生命周期）
│   ├── types/                     # TypeScript 类型定义
│   │   ├── index.ts               # 旧体系类型（snake_case + number ID）
│   │   ├── db.ts                  # 新体系类型（camelCase + string ID）
│   │   └── bridge.ts              # 新旧类型桥接转换工具
│   ├── App.tsx                    # 根组件（AuthGuard + MainLayout）
│   ├── main.tsx                   # 应用入口
│   └── index.css                  # Tailwind 全局样式
├── .env / .env.production         # 环境变量
├── vite.config.ts                 # Vite 配置（含代码分割 + 构建分析）
├── tailwind.config.js             # Tailwind 主题配置
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── package.json
└── eslint.config.js
```

### 1.2 技术栈总览

| 层级 | 技术选型 | 版本 | 说明 |
|------|---------|------|------|
| **前端框架** | React | ^19.2.0 | 未启用 React Compiler |
| **语言** | TypeScript | ~5.9.3 | strict + noUnusedLocals |
| **构建工具** | Vite | ^7.2.4 | 开发服务器 port 3000 |
| **路由** | React Router | ^7.6.1 | HashRouter 模式（`/#/path`） |
| **UI 组件** | shadcn/ui + Radix UI | — | 40+ 原子组件 |
| **样式** | Tailwind CSS | ^3.4.19 | 暗色主题为主 |
| **状态管理** | React Context + Hooks | — | 无 Redux/Zustand |
| **表单** | React Hook Form + Zod | ^7.70.0 / ^4.3.5 | 校验方案 |
| **图表** | Recharts | ^2.15.4 | 数据分析/报表 |
| **数据层** | Browser IndexedDB | — | 纯前端存储，无后端 |
| **HTTP 客户端** | Native `fetch` 封装 | — | axios 已安装但**未使用** |
| **测试** | Vitest + jsdom | ^4.1.5 | `@testing-library/react` |
| **Lint** | ESLint 9 + typescript-eslint | ^9.39.1 | — |
| **图标** | Lucide React | ^0.562.0 | — |
| **日期** | date-fns | ^4.1.0 | — |
| **Toast** | Sonner | ^2.0.7 | — |

### 1.3 后端情况

**本项目是纯前端 SPA，没有真实后端服务器。**

所有 API 请求通过前端 Mock 层拦截：
- `USE_MOCK = true`（默认值）时，`fetch` 请求被 `mockHandler()` 拦截
- 数据存储在浏览器 **IndexedDB** 中（`SmartFirePlatformDB`）
- 首次访问时自动 `seedAll()` 注入 20 张表的演示数据
- 若切换到真实后端，需设置 `VITE_USE_MOCK=false` 并确保后端提供对应 REST API

---

## 二、所有接口路由 & 数据流转逻辑

### 2.1 接口路由全景

#### A. 新体系 Service 层路由（IndexedDB）

| 端点 | 方法 | 数据源 | 说明 |
|------|------|--------|------|
| `/units` / `/units/list` | GET, POST | IndexedDB | 单位列表/创建 |
| `/units/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 单位详情/更新/删除 |
| `/devices` / `/devices/list` | GET, POST | IndexedDB | 设备列表/创建 |
| `/devices/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 设备详情 |
| `/alarms` / `/alarms/list` | GET, POST | IndexedDB | 告警列表/创建 |
| `/alarms/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 告警详情 |
| `/alarms/stats` | GET | IndexedDB | 告警统计（按类型/状态聚合） |
| `/control-rooms` / `.../list` | GET, POST | IndexedDB | 消控室 |
| `/control-rooms/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 消控室详情 |
| `/work-orders` / `.../list` | GET, POST | IndexedDB | 维保工单 |
| `/work-orders/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 工单详情 |
| `/notifications` / `.../list` | GET | IndexedDB | 通知列表 |
| `/notifications/unread` | GET | IndexedDB | 未读通知 |
| `/notifications/:id/read` | POST | IndexedDB | 标记已读 |
| `/iot-devices` / `.../list` | GET, POST | IndexedDB | IoT 设备 |
| `/iot-devices/:id` | GET, PUT, PATCH, DELETE | IndexedDB | IoT 详情 |
| `/users` / `/users/list` | GET, POST | IndexedDB | 用户列表/创建 |
| `/users/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 用户详情 |
| `/roles` / `/plans` / `/drills` / `/inspections` / `/duty-schedules` / `/documents` / `/system-logs` / `/maint-records` / `/maint-contracts` / `/patrol-plans` / `/patrol-records` / `/hazards` | GET, POST | IndexedDB | 通用 CRUD（自动匹配 DAO） |
| `/:endpoint/:id` | GET, PUT, PATCH, DELETE | IndexedDB | 通用单资源操作 |
| `/dashboard/stats` | GET | IndexedDB | 仪表盘聚合统计 |
| `/db/stats` | GET | IndexedDB | 数据库表行数统计 |
| `/db/reset` | POST | IndexedDB | 清空所有表 |
| `/db/seed` | POST | IndexedDB | 重新注入种子数据 |

#### B. 旧体系 Legacy 路由（`legacyApi` + `legacyMockData`）

旧页面通过 `@/lib/api` → `legacyApi` → `legacyRaw` 访问，Mock 模式下**直接返回内存中的静态对象**，不走 IndexedDB。

| 端点 | 说明 |
|------|------|
| `/auth/login`, `/auth/register`, `/auth/profile`, `/auth/password` | 认证 |
| `/users`, `/roles`, `/permissions`, `/departments` | 用户/角色/权限/部门 |
| `/units`, `/units/stats` | 单位 |
| `/devices`, `/devices/stats`, `/devices/types` | 设备 |
| `/alarms`, `/alarms/stats`, `/alarms/recent`, `/alarms/trend`, `/alarms/:id/confirm`, `/alarms/:id/handle`, `/alarms/:id/dismiss` | 告警 |
| `/maintenance/companies`, `/maintenance/work-orders`, `/maintenance/stats` | 维保 |
| `/patrol/plans`, `/patrol/records`, `/patrol/hazards` | 巡检 |
| `/control-rooms`, `/control-rooms/hosts`, `/control-rooms/multiline`, `/control-rooms/bus-points`, `/control-rooms/command-logs`, `/control-rooms/silence`, `/control-rooms/reset`, `/control-rooms/mode` | 消控室 |
| `/plans`, `/drills`, `/knowledge`, `/knowledge/categories` | 预案/知识库 |
| `/iot/devices`, `/iot/protocols`, `/iot/pipelines` | IoT |
| `/ai/decisions`, `/ai/alerts` | AI 决策 |
| `/training/courses`, `/training/exams` | 培训 |
| `/inspections` | 检查 |
| `/system/config`, `/system/logs`, `/system/notify-templates`, `/system/screens`, `/system/modules`, `/system/dashboard` | 系统 |
| `/analysis/*` | 数据分析 |
| `/reports/*` | 报表 |
| `/gis/*` | GIS |
| `/monitor/overview`, `/bigscreen/data`, `/workbench` | 监控/大屏/工作台 |
| `/duty/*` | 值班 |

### 2.2 数据流转逻辑

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UI 组件层                                   │
│  sections/*Page.tsx  (旧页面用 @/lib/api，新页面用 @/api/services)   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         API 服务层                                   │
│  legacyApi ──→ legacyRaw ──→ legacyMockData.ts  (静态旧格式数据)     │
│  xxxService ──→ api / raw ──→ request() ──→ mockHandler()           │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Mock / HTTP 层                               │
│  USE_MOCK=true  → mock.ts → DAO (IndexedDB) / legacyMockData fallback│
│  USE_MOCK=false → fetch → 真实后端                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         数据存储层                                   │
│  IndexedDB (SmartFirePlatformDB)                                     │
│  ├── units, devices, alarms, control_rooms, work_orders             │
│  ├── users, roles, plans, drills, inspections                       │
│  ├── notifications, duty_schedules, documents, system_logs          │
│  ├── maint_records, maint_contracts, patrol_plans, patrol_records   │
│  ├── hazards, iot_devices                                           │
│  └── seeds.ts 首次访问自动填充                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 路由系统详解

**模块注册 → 动态路由生成**

1. `src/core/platform/ModuleRegistry.ts` 定义 **23 个业务模块**（工作台、监控中心、告警中心、设备管理、维保管理、巡检管理、预案管理、GIS 地图、数据分析、报表管理、知识库、大屏模式、设备反控、AI 决策、IoT 接入、智能预警、培训考核、消防检查、系统管理等）。
2. `ModuleEngine` 管理模块启用/禁用状态，持久化到 `localStorage`（key: `platform_module_status`）。
3. `DynamicRoutes.tsx` 订阅 `ModuleEngine` 变化，提取启用模块的所有 `path`，从静态映射表 `PAGE_COMPONENTS` 中匹配 `React.lazy()` 组件，生成 `<Route>` 列表。
4. 同时生成重定向路由（如 `/monitor` → `/monitor/realtime`）。

**⚠️ 已知 Bug：** `DynamicRoutes.tsx` 第 179 行 `useMemo(() => {...}, [])` 依赖数组为空，导致模块状态切换时 `forceUpdate` 虽触发重渲染，但路由列表不会重新计算，需刷新页面才能生效。

---

## 三、package.json 依赖、启动命令、环境配置

### 3.1 package.json 分析

```json
{
  "name": "my-app",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```

**Scripts 说明：**
- `npm run dev` — 启动开发服务器（port 3000）
- `npm run build` — TypeScript 编译 + Vite 生产构建
- `npm run lint` — ESLint 全项目检查
- `npm run preview` — 预览生产构建
- `npx vitest` — 运行单元测试（未在 scripts 中注册）

**关键依赖（38 个生产依赖）：**

| 依赖 | 用途 | 状态 |
|------|------|------|
| `react` / `react-dom` | 核心框架 | ✅ 使用 |
| `react-router` | 路由 | ✅ 使用 |
| `@radix-ui/*` (20+) | UI 底层原语 | ✅ 使用 |
| `react-hook-form` / `zod` | 表单 + 校验 | ✅ 使用 |
| `recharts` | 图表 | ✅ 使用 |
| `lucide-react` | 图标 | ✅ 使用 |
| `tailwind-merge` / `clsx` / `class-variance-authority` | 样式工具 | ✅ 使用 |
| `sonner` | Toast 通知 | ✅ 使用 |
| `date-fns` | 日期处理 | ✅ 使用 |
| `axios` | HTTP 客户端 | ⚠️ **已安装但完全未使用** |
| `next-themes` | 主题切换 | ⚠️ 已安装但代码中写死暗色主题 |
| `vaul` | Drawer 组件 | ✅ 使用 |
| `cmdk` | Command 菜单 | ✅ 使用 |
| `input-otp` | OTP 输入 | ? 可能未使用 |
| `embla-carousel-react` | 轮播 | ? 可能未使用 |

**开发依赖亮点：**
- `vitest` + `@vitest/ui` + `jsdom` / `happy-dom` — 测试框架
- `rollup-plugin-visualizer` — 构建产物可视化分析
- `kimi-plugin-inspect-react` — Kimi IDE 专用 React 检查插件

### 3.2 环境变量配置

| 变量 | 开发值 | 生产值 | 用途 |
|------|--------|--------|------|
| `VITE_APP_TITLE` | 新致远智慧消防远程监控中心 | 同左 | 页面标题 |
| `VITE_APP_VERSION` | 2.0.0 | 同左 | 版本号 |
| `VITE_API_BASE` | `/api` | `/api` | API 基础路径 |
| `VITE_WS_URL` | `ws://localhost:3000/ws` | `ws://localhost/ws` | WebSocket 地址 |
| `VITE_MQTT_HOST` | `ws://localhost:9001` | 同左 | MQTT Broker（代码中未使用） |
| `VITE_AMAP_KEY` | *(空)* | *(空)* | 高德地图 API Key |
| `VITE_USE_MOCK` | *(未定义，默认 true)* | *(未定义)* | 是否启用 Mock 拦截 |

**注意：**
- `VITE_USE_MOCK` 未在 `.env` 中显式定义，代码中默认 `true`（`import.meta.env.VITE_USE_MOCK !== 'false'`）
- 所有 `VITE_` 前缀变量都会在构建时注入前端 bundle，**不应包含敏感密钥**

---

## 四、跨域、部署、Nginx 配置问题排查

### 4.1 跨域问题

**当前状态：** 纯前端应用，开发时无跨域（所有请求被 Mock 拦截），生产环境需后端配合 CORS。

**切换真实后端时的跨域方案：**

| 方案 | 适用场景 | 配置方式 |
|------|---------|---------|
| **后端 CORS** | 推荐 | 后端设置 `Access-Control-Allow-Origin` |
| **Nginx 反向代理** | 前后端同域名 | `location /api { proxy_pass http://backend; }` |
| **Vite Dev Proxy** | 仅开发 | 在 `vite.config.ts` 中加 `server.proxy` |

### 4.2 部署方案

本项目是 **纯静态 SPA**，构建产物位于 `dist/` 目录：

```
dist/
├── index.html          # 入口 HTML
├── assets/
│   ├── index-xxx.js    # 主 chunk
│   ├── react-vendor-xxx.js
│   ├── ui-vendor-xxx.js
│   ├── chart-vendor-xxx.js
│   └── xxx-xxx.js      # 各页面懒加载 chunk
└── logo.png
```

**部署方式：** 任何静态文件服务器均可（Nginx、Apache、OSS、Vercel、Netlify、GitHub Pages 等）。

**注意：** 使用 `HashRouter`（`/#/path`），因此**不需要**服务器端配置 fallback 到 `index.html`。

### 4.3 Nginx 配置示例

```nginx
server {
    listen 80;
    server_name fire.example.com;
    root /var/www/fire-platform/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # 静态资源缓存（因为文件名有 hash）
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 反向代理（如使用真实后端）
    location /api/ {
        proxy_pass http://backend-server:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # CORS 头（如后端未配置）
        add_header Access-Control-Allow-Origin $http_origin always;
        add_header Access-Control-Allow-Credentials true always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    # 所有路由指向 index.html（HashRouter 可选）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4.4 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 构建后页面空白 | `base` 路径不匹配部署目录 | `vite.config.ts` 中 `base: './'` 已设为相对路径，适合任意子目录 |
| 图标/字体加载 404 | 资源引用用了绝对路径 | 检查是否使用 `import` 引用静态资源 |
| API 请求 404 | Mock 关闭但后端未启动 | 检查 `VITE_USE_MOCK` 和后端服务状态 |
| 构建产物过大 | 未代码分割 | 已配置 `manualChunks`，可用 `npm run build -- --mode analyze` 分析 |
| 首次加载慢 | 无懒加载/无缓存 | 已配置路由懒加载 + 静态资源长期缓存 |

---

## 五、代码冗余、安全隐患、性能优化建议

### 5.1 代码冗余 & 死代码

| 问题 | 位置 | 建议 |
|------|------|------|
| **axios 完全未使用** | `package.json` dependencies | 移除 `axios`，减少 bundle 体积 ~15KB |
| **next-themes 未使用** | `package.json` dependencies | 写死暗色主题，可移除或接入主题切换 |
| **WebSocket 服务死代码** | `src/services/websocket.service.ts` | 已完整实现但未在 `App.tsx` 中初始化，需接入或标记 TODO |
| **ErrorBoundary 未集成** | `src/components/ErrorBoundary.tsx` | 已创建但未在 `App.tsx` 的 `<Suspense>` 外包裹 |
| **input-otp / embla-carousel 可能未使用** | `package.json` | 检查并移除未使用依赖 |
| **动态导入重复** | `mock.ts` | `Database.ts` 被动态导入又被静态导入，Vite 已给出 warning |

### 5.2 安全隐患

| 等级 | 问题 | 说明 | 修复建议 |
|------|------|------|---------|
| 🔴 **高** | **Token 存储在 localStorage** | XSS 攻击可窃取 `token` 和 `userInfo` | 改为 `httpOnly` Cookie（需后端配合）；或至少对敏感操作加二次验证 |
| 🔴 **高** | **Mock 登录无密码验证** | 任何账号密码都能登录 | 切换到真实后端后自然解决；Mock 环境可加硬编码校验用于演示 |
| 🟡 **中** | **明文传输** | `fetch` 无 HTTPS 强制 | 生产环境强制 HTTPS，Nginx 配置 `return 301 https://$host$request_uri` |
| 🟡 **中** | **401 处理硬编码跳转** | `window.location.href = '/login'` | 使用 React Router 的 `navigate`，避免全页面刷新 |
| 🟡 **中** | **无请求重试机制** | 网络抖动导致请求失败 | 在 `client.ts` 中加指数退避重试 |
| 🟢 **低** | **AMap Key 暴露** | `VITE_AMAP_KEY` 会被打包进 bundle | 如使用高德地图，建议通过后端代理请求 |

### 5.3 性能优化建议

| 优先级 | 问题 | 当前状态 | 优化方案 |
|--------|------|---------|---------|
| 🔴 **高** | **IndexedDB 每次事务新建连接** | `BaseDAO.getDB()` 每次 `open` 新连接，`transaction()` 后 `close` | 使用单例连接池，或改用 `dexie` 等成熟库管理连接生命周期 |
| 🔴 **高** | **DAO `getAll()` 全量加载** | `paginated()` 先 `getAll()` 再内存切片 | 实现真正的 IndexedDB 分页游标（`IDBObjectStore.openCursor()` + `continue()`） |
| 🟡 **中** | **Legacy mock data 无缓存** | 每次请求重新生成对象 | 可缓存不可变数据 |
| 🟡 **中** | **Sourcemap 生产开启** | `vite.config.ts` 中 `sourcemap: mode !== 'production'` 逻辑反了 | 改为 `sourcemap: mode === 'development'` 或显式控制 |
| 🟡 **中** | **缺少 Service Worker** | 无 PWA/离线能力 | 可加 `vite-plugin-pwa` 实现离线缓存 |
| 🟢 **低** | **无虚拟滚动** | 大数据列表（如设备列表 1000+）全部渲染 | 大数据表格加 `react-window` 或 `@tanstack/react-virtual` |
| 🟢 **低** | **图片未优化** | `public/logo.png` 可能过大 | 使用 WebP/AVIF 格式，或加 `vite-plugin-image-optimizer` |

### 5.4 架构改进建议

| 建议 | 说明 |
|------|------|
| **统一类型系统** | 当前 `src/types/index.ts`（旧）和 `src/types/db.ts`（新）并存。建议逐步迁移旧页面到新类型，最终删除 `index.ts`。桥接文件 `bridge.ts` 已就绪。 |
| **接入真实后端** | 当前所有数据在浏览器端，无法多用户共享。后端建议技术栈：Node.js/NestJS + PostgreSQL/MongoDB + Redis（Session/缓存） |
| **接入 WebSocket** | `websocket.service.ts` 已就绪，需在 `App.tsx` 登录成功后调用 `initWebSocket(token)`，并在退出时 `closeWebSocket()` |
| **权限系统落地** | `UserInfo.permissions` 已定义，但路由守卫和按钮级权限均未实现。建议加 `<PermissionGuard required="system:user:create">` 组件 |
| **日志监控** | 当前仅有 `console.error`。建议接入 Sentry 或自建日志上报，捕获生产环境异常 |

---

## 附录：关键文件速查

| 文件 | 作用 |
|------|------|
| `src/api/client.ts` | 统一 HTTP 客户端 + Mock 拦截 + 请求取消 |
| `src/api/services.ts` | 业务 Service 层 + 旧兼容 API |
| `src/api/mock.ts` | Mock 路由处理器（IndexedDB + 通用 CRUD） |
| `src/db/Database.ts` | IndexedDB DAO 基类 + 20 张表定义 |
| `src/db/seeds.ts` | 全 20 表种子数据 |
| `src/core/platform/ModuleRegistry.ts` | 23 个业务模块注册表 |
| `src/core/DynamicRoutes.tsx` | 基于模块状态的动态路由生成 |
| `src/hooks/useAuth.tsx` | 认证上下文（localStorage 持久化） |
| `src/types/bridge.ts` | 新旧类型格式转换工具 |
| `vite.config.ts` | 构建配置 + 代码分割 + 构建分析 |
