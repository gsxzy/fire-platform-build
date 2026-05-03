# 智慧消防平台 - 数据库及API接口设计文档

## 一、数据库设计

### 1.1 ER关系图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   units      │1   N│   devices    │1   N│   alarms     │
│  (单位表)     │─────│  (设备表)     │─────│  (告警表)     │
└──────────────┘     └──────────────┘     └──────────────┘
       │ 1                    │ 1
       │                      │
       │ N                    │ N
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│control_rooms │     │work_orders   │     │patrol_plans  │
│  (消控室)     │     │  (维保工单)   │     │  (巡检计划)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                      │                    │
       │                      │                    │
       │ N                    │ N                  │ N
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  iot_devices │     │maint_records │     │patrol_records│
│ (IoT设备接入) │     │  (维保记录)   │     │  (巡检记录)   │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │    roles     │     │   hazards    │
│  (用户表)     │     │  (角色表)     │     │  (隐患表)     │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    plans     │     │   drills     │     │  inspections │
│  (预案表)     │     │  (演练表)     │     │  (检查表)     │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ notifications│     │duty_schedules│     │  documents   │
│  (通知表)     │     │  (值班表)     │     │  (知识库)     │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐
│ system_logs  │
│  (系统日志)   │
└──────────────┘
```

### 1.2 数据表清单 (20张表)

| # | 表名 | 说明 | 核心字段 |
|---|------|------|----------|
| 1 | `units` | 单位表 | id, name, type, address, risk_level, lat, lng |
| 2 | `devices` | 设备表 | id, name, type, unit_id, location, status, online_status |
| 3 | `alarms` | 告警表 | id, type, level, device_id, unit_id, status, handler |
| 4 | `control_rooms` | 消控室表 | id, unit_id, host_model, device_count, duty_count |
| 5 | `work_orders` | 维保工单表 | id, type, unit_id, title, staff, status |
| 6 | `maint_records` | 维保记录表 | id, unit_id, type, content, staff, date |
| 7 | `maint_contracts` | 维保合同表 | id, name, unit_id, company, amount, status |
| 8 | `patrol_plans` | 巡检计划表 | id, name, unit_id, cycle, next_date |
| 9 | `patrol_records` | 巡检记录表 | id, plan_id, unit_id, passed, failed |
| 10 | `hazards` | 隐患表 | id, unit_id, description, level, deadline |
| 11 | `users` | 用户表 | id, username, real_name, role, status |
| 12 | `roles` | 角色表 | id, name, code, description, perms |
| 13 | `plans` | 预案表 | id, name, unit_id, type, level, status |
| 14 | `drills` | 演练表 | id, name, unit_id, date, result |
| 15 | `inspections` | 检查表 | id, name, unit_id, checker, result |
| 16 | `notifications` | 通知表 | id, type, title, content, is_read |
| 17 | `duty_schedules` | 值班表 | id, name, date, shift, status |
| 18 | `documents` | 知识库表 | id, title, category, version, status |
| 19 | `system_logs` | 系统日志表 | id, user_id, action, module, detail |
| 20 | `iot_devices` | IoT设备表 | id, name, category, protocol, unit_id, online_status |

---

## 二、API接口设计

### 2.1 接口规范

- **基础路径**: `/api`
- **响应格式**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1713510000000
}
```

### 2.2 通用查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | number | 页码，默认1 |
| `pageSize` | number | 每页条数，默认10 |
| `keyword` | string | 关键词搜索 |
| `sortBy` | string | 排序字段 |
| `sortOrder` | asc/desc | 排序方向 |

### 2.3 单位管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/units/list?page=1&pageSize=10` | 分页查询单位列表 |
| GET | `/api/units/UN-001` | 根据ID获取单位详情 |
| POST | `/api/units` | 新增单位 |
| PUT | `/api/units/UN-001` | 全量更新单位 |
| PATCH | `/api/units/UN-001` | 部分更新单位 |
| DELETE | `/api/units/UN-001` | 删除单位 |

### 2.4 设备管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/devices/list` | 分页查询设备 |
| GET | `/api/devices/DEV-001` | 设备详情 |
| GET | `/api/devices?unitId=UN-001` | 按单位查询设备 |
| POST | `/api/devices` | 新增设备 |
| PUT | `/api/devices/DEV-001` | 更新设备 |
| DELETE | `/api/devices/DEV-001` | 删除设备 |

### 2.5 告警管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/alarms/list` | 分页查询告警 |
| GET | `/api/alarms/ALM-001` | 告警详情 |
| GET | `/api/alarms/stats` | 告警统计 |
| POST | `/api/alarms` | 新增告警 |
| PATCH | `/api/alarms/ALM-001` | 更新告警状态 |
| DELETE | `/api/alarms/ALM-001` | 删除告警 |

**告警确认/处理**:
```
PATCH /api/alarms/{id}
Body: { "status": "confirmed", "handler": "张三", "handleNote": "已确认" }
```

### 2.6 消控室接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/control-rooms/list` | 分页查询消控室 |
| GET | `/api/control-rooms/CR-001` | 消控室详情 |
| POST | `/api/control-rooms` | 新增消控室 |
| PUT | `/api/control-rooms/CR-001` | 更新消控室 |
| DELETE | `/api/control-rooms/CR-001` | 删除消控室 |

### 2.7 维保工单接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/work-orders/list` | 分页查询工单 |
| POST | `/api/work-orders` | 新增工单 |
| PUT | `/api/work-orders/WO-001` | 更新工单 |
| DELETE | `/api/work-orders/WO-001` | 删除工单 |

### 2.8 IoT设备接入接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/iot-devices/list` | 分页查询IoT设备 |
| GET | `/api/iot-devices/stats` | IoT设备统计 |
| POST | `/api/iot-devices` | 新增IoT设备 |
| PUT | `/api/iot-devices/IOT-001` | 更新IoT设备 |
| DELETE | `/api/iot-devices/IOT-001` | 删除IoT设备 |

### 2.9 通知接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications/list` | 分页查询通知 |
| GET | `/api/notifications/unread` | 获取未读通知 |
| POST | `/api/notifications/{id}/read` | 标记已读 |

### 2.10 仪表盘接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard/stats` | 获取仪表盘统计数据 |

**返回示例**:
```json
{
  "code": 200,
  "data": {
    "unitCount": 10,
    "deviceCount": 3256,
    "onlineDeviceCount": 3198,
    "alarmCount24h": 23,
    "unhandledAlarmCount": 3,
    "controlRoomCount": 8,
    "pendingWorkOrderCount": 5,
    "deviceOnlineRate": "98.2"
  }
}
```

### 2.11 数据库管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/db/stats` | 获取各表数据量统计 |
| POST | `/api/db/seed` | 重新导入种子数据 |
| POST | `/api/db/reset` | 清空所有表数据 |

---

## 三、架构设计

### 3.1 数据流图

```
UI Components
     │
     ▼
API Services (api/services.ts)
     │
     ▼
API Client (api/client.ts)
     │
     ├── USE_MOCK=true ──▶ Mock Handler (api/mock.ts)
     │                          │
     │                          ▼
     │                     IndexedDB (db/Database.ts)
     │                          │
     │                          ▼
     │                     Seeds Data (db/seeds.ts)
     │
     └── USE_MOCK=false ──▶ Real HTTP Backend
```

### 3.2 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 路由 | React Router v7 |
| 状态管理 | React Context + Hooks |
| UI组件 | shadcn/ui + Tailwind CSS |
| 图表 | Recharts |
| 本地数据库 | IndexedDB |
| HTTP请求 | Fetch API |
| 数据可视化 | ECharts/Recharts |
| 地图 | 高德地图 JS API 2.0 |

### 3.3 目录结构

```
src/
├── api/
│   ├── client.ts          # HTTP客户端
│   ├── mock.ts            # Mock拦截器
│   └── services.ts        # 业务API服务
├── db/
│   ├── Database.ts        # IndexedDB DAO层
│   └── seeds.ts           # 种子数据
├── types/
│   └── db.ts              # 数据库类型定义
├── core/
│   ├── ToastContext.tsx    # 通知系统
│   ├── LoadingContext.tsx  # 加载状态
│   ├── ModuleContext.tsx   # 模块管理
│   ├── ModuleRegistry.ts   # 模块注册表
│   └── PageTransition.tsx  # 页面过渡
├── components/
│   ├── ui/                # shadcn组件
│   └── Skeleton.tsx       # 骨架屏
├── hooks/
│   └── useAuth.tsx        # 认证Hook
├── sections/              # 页面组件(92个)
└── App.tsx                # 应用入口
```

---

## 四、状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 请求参数错误 |
| 401 | 未认证/登录过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | 服务暂不可用 |

---

*文档版本: V1.0 | 更新日期: 2026-04-19 | 作者: 新致远科技*
