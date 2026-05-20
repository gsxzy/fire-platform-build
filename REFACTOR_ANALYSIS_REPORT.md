# 新致远智慧消防平台 — 结构分析报告

> 生成时间：2026-05-20  
> 分析范围：`backend/src/` (179 文件) + `app/src/` (284 文件)

---

## 一、目录架构总览

### 1.1 后端 (`backend/src/` — 179 文件)

```
backend/src/
├── controllers/     40 个控制器（核心 CRUD + 业务逻辑）
├── services/        29 个服务层（部分有，部分缺失）
├── models/          30 个模型 + associations + index
├── routes/          27 个路由文件（index.ts + modules/*.routes.ts + stub）
├── utils/           17 个工具函数
├── middleware/       8 个中间件
├── protocols/        7 个协议服务器（GB26875/FSCN8001/CANET）
├── config/           5 个配置文件
├── constants/        2 个常量文件
├── cron/             1 个定时任务
├── iot/              1 个 IoT 入口
├── __tests__/        4 个测试文件
├── test-utils/       2 个测试工具
├── websocket/        2 个 WebSocket 文件
├── types/            2 个类型声明
└── seeders/          1 个种子文件
```

**控制器清单（40 个）**：
- 核心域：auth, user, role, unit, device, alarm, system
- 消防业务：controlRoom, duty, dutyShift, dutyHandover, patrol, plan, inspection, maintenance, dispatch
- 智能设备：iot, iotProtocol, ctwing, hikvision4g, gb28181, video, deviceControl, deviceAllocation, deviceMaintenance
- AI/分析：ai, aiDecision, aiLearning, smartAlert, dashboard, linkage, subsystem
- 其他：knowledge, training, report, workbench

**服务层清单（29 个）**：
- 部分控制器有直接数据库操作（如 ai.controller.ts 中的 `decisionList/Create` 等），未下沉到 service
- 存在 stub 假数据服务：`stub.fakeData.service.ts`, `stub.oldTable.service.ts`

**路由统计**：
| 路由文件 | 路由数 |
|---------|-------|
| system.routes.ts | 40 |
| iot.routes.ts | 24 |
| alarm.routes.ts | 21 |
| controlRoom.routes.ts | 32 |
| duty.routes.ts | 22 |
| maintenance.routes.ts | 19 |
| video.routes.ts | 19 |
| ai.routes.ts | 18 |
| patrol.routes.ts | 15 |
| workbench.routes.ts | 11 |
| ... | ... |

### 1.2 前端 (`app/src/` — 284 文件)

```
app/src/
├── sections/        137 个页面/区块组件
├── components/       63 个 UI 组件（含 shadcn/ui 全套）
├── api/             29 个 API 客户端/服务
├── core/            14 个核心运行时（路由/状态/弹窗/加载）
├── hooks/            8 个自定义 Hook
├── styles/           8 个样式文件
├── types/            5 个类型声明
├── lib/              5 个工具库
├── __tests__/        3 个测试文件
├── services/         2 个服务（websocket）
├── shared/           2 个共享资源
├── constants/        1 个常量文件
├── utils/            1 个工具
├── db/               1 个数据库类型
└── test/             1 个测试
```

**路由清单（67 条懒加载路由）**：
```
/workbench, /workbench/todo, /workbench/notice
/monitor/realtime, /monitor/video, /monitor/control, /monitor/control/room/:roomId
/monitor/control/host-code, /monitor/linkage, /monitor/subsys
/alarm/center, /alarm/config, /duty/dispatch, /duty/log, /duty/shift, /duty/handover
/unit/general, /unit/key, /unit/nine-small, /unit/stats, /floor-plans
/device/archive, /device/access, /device/access/ctwing, /device/allocate
/device/config, /device/maintain, /device/control
/maintenance/contract, /maintenance/company, /maintenance/workorder
/maintenance/record, /maintenance/stats
/patrol/plan, /patrol/record, /patrol/hazard
/plan/library, /plan/drill
/system/config, /system/data, /system/log, /system/module
/system/monitor, /system/org, /system/personnel, /system/role, /system/user
/training/manage, /knowledge/base, /report/export
/iot/access, /iot/gb28181, /iot/pipeline, /iot/protocol
/subsystem/water, /subsystem/elec, /subsystem/vent
/smart/warning, /analysis/alarm, /analysis/device, /analysis/report, /analysis/trend
/map/gis, /bigscreen
```

---

## 二、技术栈

### 2.1 后端
| 层级 | 技术 |
|-----|------|
| 运行时 | Node.js 20.20.0 |
| 框架 | Express 4.19 |
| ORM | Sequelize 6.37 + sequelize-typescript |
| 数据库 | MySQL 8.0 (wvp-mysql Docker 3307) / MySQL 5.7兼容 |
| 缓存 | Redis 6.x (ioredis) |
| 日志 | Winston 3.13 + winston-daily-rotate-file |
| 协议 | MQTT 5.5, Modbus-Serial 8.0, Net-SNMP 3.12 |
| 安全 | bcryptjs, helmet, jsonwebtoken, joi |
| 工具 | dayjs, dotenv, multer, xlsx, uuid, node-cron |
| 部署 | PM2, nginx 反向代理 |

### 2.2 前端
| 层级 | 技术 |
|-----|------|
| 框架 | React 19.2 |
| 构建 | Vite 7.2 |
| 路由 | React Router (HashRouter) |
| 样式 | Tailwind CSS 3.4 |
| UI 库 | shadcn/ui (Radix UI 全套) |
| 状态 | React Context (Toast/Loading/AlarmPopup) |
| 图表 | Recharts (chart-vendor chunk 443KB) |
| 地图 | 高德 AMap 2.0 |
| 视频 | HLS.js 1.6 |
| 绘图 | Konva 10.2 |
| 日期 | date-fns 4.1, react-day-picker 9.13 |
| 部署 | nginx 静态文件 |

---

## 三、核心模块依赖关系

### 3.1 后端依赖图（关键链路）

```
HTTP Request → routes/index.ts → authMiddleware → 子路由 → Controller → Model/Service → Sequelize → MySQL
                                          ↓
                                    rateLimiter (Redis)
                                          ↓
                                    logger (Winston)
```

**关键依赖链**：
1. **设备管理**：DeviceController → Device/IoTDevice/Alarm/Unit → fire_device/fire_iot_device
2. **报警中心**：AlarmController → Alarm/Device/Unit → fire_alarm
3. **视频监控**：VideoController → WVPService/ZLMService → ZLMediaKit/WVP-PRO
4. **IoT 接入**：CTWingController/Hikvision4GController → IoTDevice → fire_iot_device
5. **消控室**：ControlRoomController → ControlRoom/ControlRoomVideo → fire_control_room

### 3.2 前端依赖图

```
App.tsx → DynamicRoutes (懒加载 67 页面)
        → MainLayout → Sidebar + Header + Outlet
        → ToastProvider/LoadingProvider/AlarmPopupProvider
```

**关键 Chunk 拆分**：
| Chunk | 大小 | 内容 |
|-------|------|------|
| chart-vendor | 443KB | Recharts |
| hls-vendor | 522KB | HLS.js |
| canvas-vendor | 312KB | Konva + 相关 |
| react-vendor | 254KB | React 核心 |
| index | 211KB | 主入口 |

---

## 四、冗余/风险点清单

### 4.1 🔴 高风险

| # | 风险 | 位置 | 影响 |
|---|------|------|------|
| 1 | **路由重复定义** | `routes/index.ts` + `routes/stub.routes.ts` + `routes/modules/*.routes.ts` | 同一个接口可能在多个位置定义，维护困难 |
| 2 | **Controller 直接操作数据库** | `ai.controller.ts` (decisionList/Create, alertList/Confirm/Handle) | 违反分层原则，测试困难 |
| 3 | **Sequelize 别名重复定义** | `associations.ts` + `floorPlan.model.ts` | 已加 `assoc()` 保护，但历史债务仍在 |
| 4 | **Stub 路由覆盖正式路由** | `stub.routes.ts` 中 `/old/bigscreen/data` 等 | 可能导致调试时误用假数据 |
| 5 | **前端 Chunk 过大** | `hls-vendor` 522KB, `chart-vendor` 443KB | 首屏加载慢 |

### 4.2 🟡 中风险

| # | 风险 | 位置 | 说明 |
|---|------|------|------|
| 6 | **大小写重复导出** | `protocols/` 目录 | `GB26875Server` + `gb26875Server`, `CanetServer` + `canetServer` 等 |
| 7 | **MySQL 5.7 兼容债务** | `backend/sql/` V036~V054 | `ADD COLUMN IF NOT EXISTS` 等语法在 MySQL 5.7 报错 |
| 8 | **前端 services.ts 已拆分** | `app/src/api/services/` | 原 `services.ts` 保留为 re-export，但仍有旧引用 |
| 9 | **Event Scheduler 未开启** | MySQL V053 创建的事件 | 日志 TTL 自动清理依赖 `event_scheduler=ON` |
| 10 | **CTWING_API_KEY 未配置** | `.env` | 签名验证被跳过，存在伪造推送风险 |

### 4.3 🟢 低风险/优化点

| # | 问题 | 位置 |
|---|------|------|
| 11 | **注释掉的旧代码块** | 多个控制器中存在 |
| 12 | **无效导入** | 部分文件中 import 了但未使用的变量 |
| 13 | **重复工具函数** | 前端可能有多个 `formatDate` 类似实现 |
| 14 | **空/几乎空文件** | 需进一步扫描 |
| 15 | **控制台日志未清理** | 前端开发时遗留的 `console.log` |

---

## 五、无用代码扫描结果（初筛）

### 5.1 后端

**确认存在但可能未使用的导出**：
- `stub.routes.ts` 中大量旧兼容路由（`/old/*`）
- `stub.fakeData.service.ts` / `stub.oldTable.service.ts` — 仅在 stub 路由中使用
- `routes/floorPlanApp.routes.ts` — 独立的平面图路由，与 `routes/modules/` 重复
- `controllers/controlRoom.controller.ts` — **控制器名为空 Methods**，可能是空壳或已迁移到 `controlRoom/` 子目录

**注释掉的旧代码**：
- 需逐文件扫描，初步估计约 15~20 处

### 5.2 前端

**未被路由引用的 sections 组件**（需确认是否通过其他方式使用）：
- `AIAssistant`, `AIDecisionPage`, `AlarmConfigPage`, `AlarmDetailModal`, `AlarmDispatchPage`
- `AnalysisReportPage`, `AnalysisTrendPage`, `DataImportExportPage`, `DataPipelinePage`
- `DeviceAccessRedirect`, `DeviceAnalysisPage`, `DeviceControlPage`
- `FireCheckPage`, `FloorPlanPage`, `GISMapPage`, `GlobalSearch`
- `MaintenanceStatsPage`, `ModuleConfigPage`, `NotifyTemplatePage`
- `ScreenDashboardPage`, `SmartAlertPage`, `SystemMonitorPage`
- `TrainingPage`, `UnitStatsPage`

> ⚠️ 注意：以上组件可能通过 `DynamicRoutes.tsx` 中的路径映射使用，需要进一步精确匹配。

**确认在 DynamicRoutes.tsx 中没有映射的组件**：
- `AIAssistant` — ❌ 未映射
- `AlarmDetailModal` — ❌ 未映射（作为子组件使用？）
- `Footer`, `ForbiddenPage`, `Header`, `KeyboardShortcuts`, `LoginPage`, `MainLayout`, `Sidebar` — ✅ 在 App.tsx 中直接 import

---

## 六、下一步行动建议

1. **Phase 1**: 精确扫描无用代码（使用 ESLint + 静态分析）
2. **Phase 2**: 删除确认的无用代码，保留向后兼容接口
3. **Phase 3**: 提取 Controller 中的重复数据库逻辑到 Service 层
4. **Phase 4**: 统一命名规范（消除大小写重复导出）
5. **Phase 5**: 优化前端 Chunk 拆分策略

---

*报告结束。如需继续执行优化，请确认进入下一阶段。*
