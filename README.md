# 新致远智慧消防远程监控中心 V2.0.0

## 系统概述

新致远智慧消防远程监控中心是一个城市级智慧消防物联网监控管理平台，按照GB 26875《城市消防远程监控系统》和GB 50016《建筑设计防火规范》设计开发，采用微服务架构、前后端分离技术方案。

## 技术架构

### 前端技术栈
- React 18 + TypeScript + Vite 7
- Tailwind CSS + shadcn/ui 组件库
- Recharts 数据可视化图表
- Lucide React 图标库

### 后端技术栈
- Python Flask + SQLite3
- JWT认证 (flask-jwt-extended)
- RESTful API设计

## 功能模块

### 1. 监控中心
- **实时监控**: 联网单位、消防设备、报警总数等核心指标实时展示
- **报警管理**: 火警/故障/反馈三类报警的接收、确认、处理、关闭全生命周期管理
- **视频监控**: GB28181协议摄像头管理，实时视频查看
- **控制界面**: 消音/复位/手自动切换/屏蔽等快捷控制操作
- **安消联动**: 联动规则配置、视频关联映射、联动记录查询、AI智能识别配置

### 2. 单位管理
- 单位档案管理（单位类型、建筑信息、消防设施、消防安全责任人）
- 单位统计与查询

### 3. 设备管理
- 设备档案（设备类型、设备编号、位置信息、生产厂家、安装日期）
- 设备配置与控制
- 设备维护记录

### 4. 巡检管理
- 巡检计划（日常巡检、专项检查、临时巡检）
- 巡检任务与记录
- 隐患管理（发现、上报、整改、验收）

### 5. 应急预案
- 预案库（建筑火灾、电气火灾、危化品火灾等类型）
- 预案启动与演练记录

### 6. 数据分析
- 报警分析（报警趋势、时段分布、类型统计）
- 趋势分析（月度数据趋势对比）
- 统计报表（设备类型分布、单位报警统计）

### 7. 系统管理
- 用户管理（系统管理员、管理员、操作员三级权限）
- 角色权限管理
- 组织架构管理
- 操作日志与登录日志
- 系统参数配置

## 安装与启动

### 环境要求
- Node.js 20+
- Python 3.10+
- SQLite3

### 安装依赖

```bash
# 前端依赖
cd app
npm install

# 后端依赖
cd backend
pip install -r requirements.txt
```

### 启动服务

```bash
# 一键启动（推荐）
chmod +x start.sh
./start.sh

# 或手动启动
# 1. 启动后端
cd backend
python app.py

# 2. 启动前端（开发模式）
cd app
npm run dev

# 3. 构建前端（生产模式）
cd app
npm run build
```

### 访问系统

- 前端地址: http://localhost:5173
- 后端API: http://localhost:5000

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin | admin123 |
| 操作员 | operator | op123456 |
| 消防主管 | manager | mgr123456 |

## API接口

系统提供完整的RESTful API，主要接口包括：

### 认证接口
- POST /api/auth/login - 用户登录
- GET /api/auth/current-user - 获取当前用户
- POST /api/auth/logout - 退出登录

### 控制接口
- POST /api/control/silence/confirm - 消音确认
- POST /api/control/reset/confirm - 复位确认
- GET /api/control/mode/{deviceId} - 获取手自动模式
- POST /api/control/mode/switch - 切换手自动模式
- GET/POST /api/control/shields - 屏蔽管理

### 报警接口
- GET /api/alarm/fire - 火警列表
- POST /api/alarm/fire/{eventCode}/confirm - 火警确认
- GET /api/alarm/fault - 故障列表
- GET /api/alarm/feedback - 反馈列表

### 联动接口
- GET/POST /api/linkage/rules - 联动规则
- GET /api/linkage/records - 联动记录
- GET/PUT /api/linkage/ai/configs - AI配置

### 设备接口
- GET /api/device/devices - 设备列表
- GET /api/device/types - 设备类型

### 单位接口
- GET /api/resource/units - 单位列表
- GET /api/resource/buildings - 建筑列表

## 数据库

系统使用SQLite3数据库，包含以下核心表：
- sys_user/sys_role/sys_menu - 用户权限
- dev_device/dev_type - 设备管理
- alarm_fire/alarm_fault/alarm_feedback - 报警管理
- ctrl_command/ctrl_shield/ctrl_mode_log - 控制操作
- link_rule/link_record/link_ai_config - 安消联动
- res_unit/res_building - 单位资源
- patrol_plan/patrol_task/patrol_hazard - 巡检管理
- plan_preplan/plan_record - 应急预案

## 开发规范

- 前端遵循React + TypeScript开发规范
- 后端遵循RESTful API设计规范
- 数据库操作使用参数化查询防止SQL注入
- JWT Token认证，过期时间24小时
- 统一API响应格式: { code, message, data, timestamp }
