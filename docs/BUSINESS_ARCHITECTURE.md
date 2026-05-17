# 业务架构与数据流说明

> 供开发与重构参考。接口路径均以 `/api` 为前缀。

## 1. 核心业务域

| 域 | 模块 ID | 主表（Sequelize） | 主路由 | 关键流程 |
|----|---------|-------------------|--------|----------|
| 认证 | — | `sys_user`, `sys_role` | `/auth/*` | 登录 → JWT + Refresh → Redis 缓存权限 |
| 告警 | `alarm` | `fire_alarm` | `/alarms` | IoT/协议上报 → WS `new_alarm` → 确认/处理/关闭 |
| 设备 | `device` | `fire_device` | `/devices` | 草稿→入库→接入→分配→维保→报废 |
| 单位 | `unit` | `fire_unit` | `/units` | 单位档案、GIS 坐标、统计 |
| 消控室 | `monitor` | `fire_control_room*` | `/control-rooms` | 主机/多线盘/总线点/远程消音复位 |
| 视频 | `monitor` | WVP 外部 | `/video` | WVP 设备通道 → ZLM 播放地址 |
| IoT | `iot` | `fire_iot_device` | `/iot` | 协议配置、管道、Modbus/MQTT 控制 |
| 维保 | `maintenance` | `fire_maint_*` | `/maintenance` | 单位→合同→工单→记录 |
| 巡检 | `patrol` | `fire_patrol_*`, `fire_hazard` | `/patrol` | 计划→记录→隐患整改 |
| 值守 | `duty` | `fire_duty_*` | `/duty` | 排班、日志、交接班 |
| 预案 | `plan` | `fire_emergency_*` | `/plans` | 预案库、演练 |
| 反控 | `device-control` | `fire_control_command` | `/device-control` | 启停/复位/消音/批量 |
| 大屏/分析 | `analysis`, `bigscreen` | 聚合查询 | `/dashboard`, `/analysis` | 统计、趋势、导出 |
| 系统 | `system` | `sys_*` | `/system` | 用户/角色/组织/配置/日志 |

## 2. 设备生命周期（核心状态机）

```
draft(草稿) → registered(已入库) → accessed(已接入) → assigned(已分配)
     → maintenance(维保中) → scrapped(报废)
```

- **入库**：`POST /devices`，`archive_status=registered`
- **接入**：IoT 配置、`/iot/devices`、CTWing/海康4G 上报
- **分配**：`POST /device-allocations/allocate`，绑定单位/建筑/楼层
- **告警关联**：`device_id` + `unit_id` 写入 `fire_alarm`

## 3. 告警处理流

```
新建(0) → 已确认(1) → 已处理(2) / 已忽略(3)
```

- 协议接入：`gb26875` / `fscn8001` TCP、`/iot/ctwing/report`、`/iot/hikvision/report`
- 实时推送：`WebSocketService.broadcastSimple('new_alarm', payload)`
- 前端：`AlarmPopupContext` + `AlarmCenterPage`

## 4. 视频链路

```
前端 VideoMonitor / FireControlRoom
  → GET /video/devices → WVP-PRO
  → POST /video/stream → ZLM 播放 URL (HLS)
```

## 5. API 分层约定（重构后）

| 层 | 路径 | 职责 |
|----|------|------|
| `api/client.ts` | — | HTTP、Token 刷新、重试、GET 去重 |
| `api/services/*.service.ts` | 领域 | 类型化方法，禁止拼错路径 |
| `api/services/*.service.ts` | 领域 | `dashboard` `linkage` `auth` `controlRoom` `ai` `training` `floorPlan` 等 |
| `api/services/legacy.service.ts` | 兼容 | 仅保留未迁移调用，**业务页已全部迁出** |
| `hooks/useApiResource` | 页面 | PageTemplate 列表 CRUD |
| `hooks/useAsyncRequest` | 页面 | 单次请求 + 统一错误提示 |

## 6. 后端响应信封（统一）

```json
{
  "code": 200,
  "msg": "操作成功",
  "message": "操作成功",
  "data": {},
  "timestamp": 1735689600000,
  "requestId": "uuid"
}
```

- 成功：`success(data, msg, req.reqId)`
- 失败：`fail(msg, code, req.reqId)` 或 `throw new HttpError(msg, httpStatus)`
- 分页：`page(list, total, pageNum, pageSize, req.reqId)`

## 7. 兼容层（待逐步退役）

- `stub.routes.ts`：旧表名 CRUD（`work_orders` 等），与 `fire_*` 并存
- 新功能 **禁止** 依赖 stub；旧前端路径迁移完成后删除

## 8. 权限（RBAC）

| 层级 | 实现 |
|------|------|
| 后端 | `middleware/permission.ts` → `requirePermission('system:user:delete')` 等 |
| 前端菜单 | `core/permissions.ts` + `usePermission` → Sidebar 按模块 `*:view` 过滤 |
| 兼容 | 无 `permissions` 或 `admin` 角色：菜单与写操作默认放行 |

## 9. 外部依赖

| 服务 | 环境变量 | 用途 |
|------|----------|------|
| MySQL | `DB_*` | 业务库 `fire_platform` |
| Redis | `REDIS_*` | 权限缓存、会话 |
| WVP-PRO | `WVP_PRO_URL` | GB28181 |
| ZLM | `ZLM_SECRET`, `ZLM_PLAY_HOST` | 流媒体 |
| CTWing | `CTWING_API_KEY` | 天翼推送验签 |
