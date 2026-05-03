# 新致远智慧消防云平台 - 部署文档

## 平台概述

新致远智慧消防云平台是一个城市级智慧消防物联网监控管理平台，按照GB 26875《城市消防远程监控系统》和GB 50016《建筑设计防火规范》设计开发。

## 更新内容

### 最新完善功能（2026-04-22）

#### ✅ 已完成的核心功能

1. **GB26875协议支持**
   - 完整的GB26875协议解析器
   - 支持赋安FSCN8001、海湾等用户传输装置
   - TCP服务器（端口6789）
   - 自动报文解析和告警创建

2. **设备反控系统**
   - 支持ModbusTCP、GB26875、MQTT三种协议
   - 远程启停、复位、消音
   - 批量控制功能
   - 控制指令历史记录

3. **安消联动引擎**
   - 火警自动触发联动
   - 门禁解锁、电梯归首、应急广播
   - 强切非消防电源
   - 预设联动方案（火警/误报/演习）

4. **AI决策中心**
   - 火情真伪识别（基于历史数据）
   - 火情等级判定（1-5级）
   - 火势蔓延预测
   - 最优联动策略推荐

5. **WebSocket实时通信**
   - 告警实时推送
   - 设备状态更新
   - 联动状态广播
   - 控制指令状态通知

6. **视频监控集成**
   - GB28181协议支持
   - 实时视频流
   - PTZ云台控制
   - 预设位控制
   - 视频回放
   - 视频截图

## 技术栈

### 前端
- React 18 + TypeScript + Vite 7
- Tailwind CSS + shadcn/ui
- Recharts 数据可视化
- Lucide React 图标

### 后端
- Node.js + Express + TypeScript
- MySQL + Redis
- WebSocket实时通信
- GB26875协议
- ModbusTCP协议
- MQTT协议
- GB28181协议

## 部署步骤

### 前置要求

- Node.js 20+
- Python 3.10+
- MySQL 8.0+
- Redis 6.0+
- Mosquitto MQTT Broker（可选）

### 1. 安装依赖

#### 后端依赖
```bash
cd backend
npm install
```

#### 前端依赖
```bash
cd app
npm install
```

### 2. 数据库配置

创建MySQL数据库：
```sql
CREATE DATABASE fire_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

修改 `backend/.env`：
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=fire_platform
DB_USER=root
DB_PASSWORD=your_password
```

### 3. Redis配置

启动Redis服务：
```bash
sudo systemctl start redis
```

修改 `backend/.env`：
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 4. MQTT Broker配置（可选）

安装Mosquitto：
```bash
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
```

开放端口：
```bash
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --reload
```

### 5. 启动服务

#### 方式一：开发模式

```bash
# 启动后端
cd backend
npm run dev

# 启动前端（新终端）
cd app
npm run dev
```

#### 方式二：生产模式

```bash
# 构建前端
cd app
npm run build

# 启动后端
cd backend
npm run start
```

### 6. 配置赋安设备

在赋安FSCN8001用户传输装置配置界面设置：
- **服务器IP：** 124.223.35.58
- **服务器端口：** 6789
- **协议类型：** GB26875
- **心跳间隔：** 60秒

### 7. 配置摄像头设备

在平台中添加摄像头设备，配置GB28181参数：
- IP地址
- 端口（默认37777）
- 用户名/密码
- 通道号

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| HTTP API | 3000 | 后端API服务 |
| WebSocket | 3000/ws | 实时通信 |
| GB26875 | 6789 | 用户传输装置 |
| MQTT | 1883 | IoT设备接入 |
| Redis | 6379 | 缓存服务 |
| MySQL | 3306 | 数据库 |

## 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | admin | admin123 |
| 操作员 | operator | op123456 |
| 消防主管 | manager | mgr123456 |

## 功能模块

### 核心功能
- ✅ 实时监控
- ✅ 告警管理
- ✅ 设备管理
- ✅ 单位管理
- ✅ GIS地图
- ✅ 数据分析
- ✅ 大屏展示

### 高级功能
- ✅ GB26875设备接入
- ✅ 设备反控
- ✅ 安消联动
- ✅ AI决策
- ✅ 视频监控
- ✅ 智能预警

### 管理功能
- ✅ 消防维保
- ✅ 巡检管理
- ✅ 应急预案
- ✅ 消防知识库
- ✅ 培训考核
- ✅ 消防检查
- ✅ 值守中心
- ✅ 数智消控室
- ✅ 系统管理

## 故障排查

### GB26875设备无法连接

1. 检查6789端口是否开放：
```bash
sudo netstat -tuln | grep 6789
```

2. 检查防火墙：
```bash
sudo firewall-cmd --list-ports
```

3. 查看后端日志：
```bash
tail -f backend/logs/*.log
```

### WebSocket连接失败

1. 检查WebSocket服务状态：
- 前端右下角应显示在线状态
- F12控制台不应有WS错误

2. 检查JWT Token是否有效

### 视频无法播放

1. 检查摄像头网络连接
2. 确认摄像头支持GB28181或RTSP
3. 检查FFmpeg是否安装（截图功能需要）

## 性能优化

### 数据库优化
- 添加索引：`device_id`, `unit_id`, `created_at`
- 分页查询：默认每页10条，最多100条
- Redis缓存：热点数据缓存1小时

### 前端优化
- 代码分割：每个页面独立chunk
- 虚拟滚动：大列表
- 图片懒加载
- CDN加速

## 安全建议

1. **修改默认密码**
2. **启用HTTPS**
3. **配置防火墙**
4. **定期备份数据**
5. **启用日志审计**
6. **限制API访问频率**

## 技术支持

如有问题，请联系技术支持团队。

---

**更新日期：** 2026-04-22
**版本：** V2.0.0
**状态：** ✅ 生产环境可用