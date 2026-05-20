# 新致远智慧消防平台 — 商用交付指南

> 本文档记录商用交付前的最终检查清单、部署步骤与验收标准。
> 最后更新：2026-05-19

---

## 一、交付物清单

| 类别 | 路径/文件 | 说明 |
|------|----------|------|
| 前端源码 | `app/src/` | React 19.2 + Vite 7.2 + Tailwind CSS 3.4 + TypeScript 5.9 |
| 前端构建产物 | `app/dist/` | Vite 生产构建输出 |
| 后端源码 | `backend/src/` | Express 4.19 + Sequelize 6.37 + TypeScript 5.9 |
| 后端构建产物 | `backend/dist/` | tsc 编译输出 |
| 数据库迁移 | `backend/sql/` | Flyway V001~V062 + Sequelize 4个JS迁移 |
| 数据库兼容版本 | `backend/sql/*_mysql57.sql` | MySQL 5.7 兼容迁移（V036~V045） |
| 部署脚本 | `scripts/build.sh`, `scripts/deploy.sh` | 前后端构建与部署 |
| 架构文档 | `AGENTS.md`, `README.md` | 运维与开发参考 |
| Docker 配置 | `docker-compose.yml`, `docker-compose.prod.yml` | 容器化部署 |

---

## 二、环境要求

### 服务器

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核+ |
| 内存 | 4GB | 8GB+ |
| 磁盘 | 50GB SSD | 100GB+ SSD |
| 操作系统 | OpenCloudOS 9 / CentOS 8 / Ubuntu 22.04 | OpenCloudOS 9.4 |
| Node.js | 20.x | 20.20.0 |
| MySQL | 5.7 / 8.0 | 8.0 |
| Redis | 6.x+ | 7.x |
| Nginx | 1.20+ | 1.24+ |
| Java | 17+ | 17（WVP-PRO 需要） |

### 端口需求

| 端口 | 用途 | 防火墙 |
|------|------|--------|
| 80/443 | HTTP/HTTPS（Nginx） | 公网开放 |
| 5003 | 后端 API（PM2） | 仅本机（Nginx 反向代理） |
| 3306 | MySQL（业务库） | 仅本机 |
| 3307 | MySQL（WVP 库，Docker） | 仅本机 |
| 6379 | Redis | 仅本机 |
| 18080 | WVP-PRO HTTP | 仅本机 |
| 5060 | WVP-PRO SIP（TCP/UDP） | 公网开放 |
| 8081 | ZLM HTTP（TCP/UDP） | 公网开放 |

---

## 三、部署前检查清单

### 3.1 环境变量配置

确保 `/opt/my-fire-api-new/.env` 已配置以下必填项：

```bash
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<强密码>
DB_NAME=fire_platform

# 服务
PORT=5003
JWT_SECRET=<64位以上随机字符串>

# 视频平台
WVP_PRO_URL=http://127.0.0.1:18080
WVP_PRO_USER=admin
WVP_PRO_SECRET=
ZLM_SECRET=<ZLM密钥>
ZLM_PLAY_HOST=<公网IP>

# IoT 设备接入
HIKVISION_4G_API_KEY=<海康4G密钥>
CTWING_API_KEY=<天翼物联网API密钥>

# 可选但强烈建议
IOT_IP_WHITELIST=<CTWing推送IP>,<海康推送IP>
TRUST_PROXY=1
```

### 3.2 安全检查

- [ ] `JWT_SECRET` 不是默认值 `xzy_fire_platform_secret_key_2024`
- [ ] `DB_PASSWORD` 不是默认值 `Fire_Pass_2024!`
- [ ] `.env` 文件权限为 `600`（`chmod 600 .env`）
- [ ] `CTWING_API_KEY` 已配置（否则签名验证被跳过）
- [ ] `HIKVISION_4G_API_KEY` 已配置（否则接口返回401）
- [ ] `IOT_IP_WHITELIST` 已配置（生产环境强烈建议）
- [ ] WVP `application.yml` 中 `media.sdp-ip` 为公网 IP

### 3.3 数据库检查

- [ ] MySQL `fire_platform` 数据库已创建
- [ ] MySQL `wvp` 数据库已创建（WVP-PRO 使用）
- [ ] 数据库字符集为 `utf8mb4`
- [ ] Flyway 迁移已执行到 V062（或最新版本）
- [ ] Sequelize 迁移已执行（4个JS文件）

### 3.4 依赖检查

- [ ] `backend/node_modules` 完整（生产环境无法访问 npm registry）
- [ ] `app/node_modules` 完整
- [ ] `pm2` 已全局安装

---

## 四、部署步骤

### 4.1 数据库备份（必做）

```bash
mysqldump -uroot -p<DB_PASSWORD> fire_platform > /backup/fire_platform_$(date +%Y%m%d_%H%M%S).sql
```

### 4.2 后端部署

```bash
cd /opt/my-fire-api-new

# 1. 拉取最新代码
git pull

# 2. 安装依赖（如 node_modules 不完整）
npm install

# 3. 构建
npm run build

# 4. 执行数据库迁移（Flyway）
/opt/flyway/flyway -configFiles=backend/flyway.conf migrate

# 5. 重启服务
pm2 restart fire-platform

# 6. 查看日志确认
tail -n 50 /opt/my-fire-api-new/logs/combined.log
```

### 4.3 前端部署

```bash
cd /www/wwwroot/fire-platform
rm -rf *
cp -r /opt/fire-platform-build/app/dist/* .
```

### 4.4 nginx 重载

```bash
nginx -t && nginx -s reload
```

### 4.5 健康检查

```bash
# 后端 API
curl http://127.0.0.1:5003/api/health

# 前端
curl -I http://127.0.0.1/

# WVP
curl http://127.0.0.1:18080/api/device/list
```

---

## 五、功能验收标准

### 5.1 认证模块

- [ ] 登录成功，Token 正确返回
- [ ] 密码强度校验（最少6位）
- [ ] 登录限流（15分钟内最多10次）
- [ ] Token 刷新正常
- [ ] 登出后 Token 失效

### 5.2 工作台

- [ ] 统计数据正确加载
- [ ] 图表正常显示
- [ ] 待办事项可勾选
- [ ] 快捷入口可跳转

### 5.3 单位管理

- [ ] 新增单位，所有字段保存成功
- [ ] 编辑单位，修改保存成功
- [ ] 删除单位后，关联设备的 unit_id 被清空
- [ ] 关联告警记录的 unit_id 被清空（保留历史记录）

### 5.4 设备档案

- [ ] 新增设备，自动生成 device_no
- [ ] 编辑设备，字段映射正确
- [ ] 批量选择翻页后不错乱
- [ ] 设备生命周期状态正确流转

### 5.5 设备接入（IoT）

- [ ] 海康4G设备自动注册
- [ ] CTWing 推送正常接收
- [ ] 告警自动创建
- [ ] 遥测数据保存

### 5.6 视频监控

- [ ] WVP 设备列表正常
- [ ] 通道列表正常
- [ ] 播放地址正确（无 127.0.0.1）
- [ ] 摄像头在线状态正确

### 5.7 告警中心

- [ ] 告警列表分页正常
- [ ] 告警确认/处理正常
- [ ] WebSocket 实时推送
- [ ] 告警详情弹窗信息完整

### 5.8 系统监控

- [ ] CPU/内存/在线率数据真实
- [ ] 日志查询正常

---

## 六、性能基准

| 指标 | 目标值 |
|------|--------|
| 前端首屏加载 | < 3s（4G网络） |
| API 响应时间（P95） | < 500ms |
| 登录接口响应 | < 200ms |
| 告警列表查询（1000条） | < 300ms |
| 设备列表查询（1000条） | < 300ms |
| WebSocket 告警推送延迟 | < 1s |
| 数据库连接池 | 10~20 |
| PM2 进程数 | 1（cluster模式可选） |

---

## 七、安全基线

| 项目 | 要求 |
|------|------|
| HTTPS | 生产环境强制启用 |
| JWT 密钥 | 64位以上随机字符串，定期轮换 |
| 数据库密码 | 强密码，定期轮换 |
| IoT 接口 | IP 白名单 + API Key 双重验证 |
| CTWing 推送 | MD5 签名验证（必须配置 CTWING_API_KEY） |
| 请求限流 | 全局 600/分钟，认证 10/15分钟，IoT 120/分钟 |
| 响应头 | Helmet 已启用（CSP、HSTS、X-Frame-Options 等） |
| SQL 注入 | Sequelize 参数化查询，全局防护 |
| XSS | React 自动转义 + Helmet CSP |
| 文件上传 | 限制类型和大小，非公开目录存储 |

---

## 八、故障速查

### 8.1 后端无法启动

```bash
# 检查日志
tail -n 50 /opt/my-fire-api-new/logs/error.log

# 常见原因
# 1. 数据库连接失败 → 检查 .env 中的 DB_HOST/DB_PORT/DB_PASSWORD
# 2. JWT_SECRET 为默认值 → 修改为随机字符串
# 3. 端口被占用 → lsof -i :5003
```

### 8.2 前端白屏

```bash
# 检查 nginx 配置
cat /www/server/nginx/conf/vhost/fire-platform.conf

# 确保 /api/ 转发到 5003
# 确保 dist 文件完整
ls -la /www/wwwroot/fire-platform/
```

### 8.3 视频无法播放

```bash
# 1. 检查 ZLM
curl http://<SERVER_IP>:8081/index/api/getServerConfig

# 2. 检查 WVP
ps aux | grep wvp-pro.jar

# 3. 检查 sdp-ip
grep sdp-ip /opt/wvp/application.yml

# 4. 检查后端 replaceLocalhost
grep replaceLocalhost /opt/my-fire-api-new/dist/services/video.service.js
```

### 8.4 CTWing 推送无响应

```bash
# 1. 检查后端日志
grep CTWing /opt/my-fire-api-new/logs/combined.log

# 2. 检查签名验证
grep "签名验证" /opt/my-fire-api-new/logs/combined.log

# 3. 检查白名单
grep IOT_IP_WHITELIST /opt/my-fire-api-new/.env

# 4. 检查数据库中 IoT 设备
echo "SELECT device_sn, ctwing_device_id, protocol_type FROM fire_iot_device WHERE protocol_type='CTWing';" | mysql -uroot -p fire_platform
```

---

## 九、联系与支持

- **项目文档**: `AGENTS.md`, `README.md`, `docs/`
- **架构报告**: `ARCHITECTURE_REPORT.md`
- **数据库迁移**: `backend/sql/README.md`

---

*本文档为商用交付最终版本，部署前请务必逐项核对检查清单。*
