# 新致远智慧消防平台 - 运维手册

> **版本**: 2.0.0  
> **适用角色**: 运维工程师 / DevOps / 系统管理员  
> **最后更新**: 2026-05-16

---

## 一、日常运维检查清单

### 每日检查（5 分钟）

```bash
# 1. 服务状态
./scripts/run.sh status

# 2. 检查错误日志（最近 1 小时）
./scripts/run.sh logs -s backend | grep -i "error\|fail" | tail -20

# 3. 检查磁盘空间
df -h | grep -E "Filesystem|/dev/"

# 4. 检查告警数量（通过 API）
curl -s http://localhost:5003/api/alarms/today | jq '.data'
```

### 每周检查（15 分钟）

- [ ] 备份文件完整性验证（随机抽取恢复测试）
- [ ] 慢查询日志分析（>2s 的 SQL）
- [ ] 容器镜像安全扫描 `docker scan xzy/fire-platform-backend`
- [ ] SSL 证书到期检查
- [ ] 日志磁盘占用检查

### 每月检查（30 分钟）

- [ ] 数据库表空间分析（碎片整理）
- [ ] Redis 内存使用趋势分析
- [ ] 访问日志分析（异常 IP、攻击模式）
- [ ] 依赖安全更新检查 `npm audit`
- [ ] 备份策略有效性验证

---

## 二、生产环境部署流程

### 2.1 部署前准备

```bash
# 1. 确认当前版本
cat VERSION
git log --oneline -5

# 2. 全量备份
./scripts/backup.sh full

# 3. 检查数据库迁移状态
docker exec fire-platform-backend npx sequelize-cli db:migrate:status

# 4. 通知相关方（微信/钉钉群）
# "智慧消防平台将于 02:00 进行版本升级，预计停机 5 分钟"
```

### 2.2 滚动部署（零停机）

```bash
# 方式一: 蓝绿部署（推荐，需要 2x 资源）
# 1. 部署新版本到 green 环境
NODE_ENV=prod docker-compose -f docker-compose.yml -f docker-compose.green.yml up -d

# 2. 验证 green 环境健康
curl -fs http://green-backend:5003/api/health

# 3. 切换 Nginx 上游到 green
# 4. 观察 5 分钟无异常后关闭 blue

# 方式二: 快速重启（适用于小版本更新）
./scripts/run.sh start --build
sleep 10
./scripts/run.sh status
```

### 2.3 部署后验证

```bash
# 1. 服务健康检查
curl -fs http://localhost/api/health
curl -fs http://localhost:5003/api/health

# 2. 核心功能验证
curl -s http://localhost:5003/api/alarms/today | jq '.code'  # 应为 200
curl -s http://localhost:5003/api/devices/stats | jq '.code'  # 应为 200

# 3. 登录测试
curl -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"***"}' | jq '.code'

# 4. WebSocket 连接测试
wscat -c ws://localhost:5003/ws

# 5. 数据库迁移验证
docker exec fire-platform-mysql mysql -u fire_user -p -e "SHOW TABLES;" fire_platform
```

### 2.4 回滚流程

```bash
# 紧急回滚到上一版本
# 1. 停止当前服务
./scripts/run.sh stop

# 2. 回滚代码
git checkout v2.0.0

# 3. 重新构建（或使用历史镜像）
docker tag xzy/fire-platform-backend:2.0.0 xzy/fire-platform-backend:latest
docker tag xzy/fire-platform-frontend:2.0.0 xzy/fire-platform-frontend:latest

# 4. 启动
./scripts/run.sh start

# 5. 数据库回滚（如需要）
docker exec fire-platform-backend npx sequelize-cli db:migrate:undo
```

---

## 三、监控与告警

### 3.1 关键监控指标

| 指标 | 采集方式 | 告警阈值 | 告警级别 |
|------|---------|---------|---------|
| 后端服务状态 | HTTP /api/health | 连续 3 次失败 | P0-紧急 |
| 前端服务状态 | HTTP /health | 连续 3 次失败 | P0-紧急 |
| MySQL 连接数 | MySQL `SHOW STATUS` | > 400 | P1-高 |
| Redis 内存使用 | Redis `INFO memory` | > 200MB | P1-高 |
| 磁盘空间 | `df -h` | > 85% | P1-高 |
| Nginx 5xx 率 | Nginx access log | > 1% | P1-高 |
| 后端内存使用 | Docker stats | > 80% | P2-中 |
| 后端 CPU 使用 | Docker stats | > 80% | P2-中 |
| 慢查询数量 | MySQL slow log | > 10/小时 | P2-中 |
| 未处理告警数 | API /alarms/unhandled | > 50 | P2-中 |

### 3.2 告警通知渠道

- **P0 紧急**: 电话 + 短信 + 钉钉
- **P1 高**: 钉钉 + 邮件
- **P2 中**: 钉钉群
- **P3 低**: 邮件日报

### 3.3 Prometheus + Grafana 监控配置（推荐）

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:v2.45
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.0
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/dashboards:/etc/grafana/provisioning/dashboards
    ports:
      - "3000:3000"

  node-exporter:
    image: prom/node-exporter:v1.6
    ports:
      - "9100:9100"
```

---

## 四、数据备份与恢复

### 4.1 自动备份（crontab）

```bash
# 编辑定时任务
crontab -e

# 每日凌晨 2 点全量备份
0 2 * * * cd /opt/fire-platform && ./scripts/backup.sh full >> /var/log/fire-platform-backup.log 2>&1

# 每小时增量备份数据库
0 * * * * cd /opt/fire-platform && ./scripts/backup.sh db >> /var/log/fire-platform-backup.log 2>&1

# 每周日清理过期备份
0 3 * * 0 cd /opt/fire-platform && ./scripts/backup.sh cleanup >> /var/log/fire-platform-backup.log 2>&1
```

### 4.2 数据库恢复

```bash
# 1. 停止后端服务（防止写入）
./scripts/run.sh stop backend

# 2. 恢复数据库
# 方式一: 从 SQL 文件恢复
gunzip -c backups/db_fire_platform_20260516_020000.sql.gz | \
  docker exec -i fire-platform-mysql mysql -u root -p fire_platform

# 方式二: 从卷快照恢复（如果使用 LVM/ZFS）
# lvconvert --merge /dev/vg0/mysql-snapshot

# 3. 重启服务
./scripts/run.sh start

# 4. 验证数据完整性
docker exec fire-platform-mysql mysql -u fire_user -p -e \
  "SELECT COUNT(*) FROM fire_alarm;" fire_platform
```

### 4.3 灾难恢复（完整重建）

```bash
# 场景: 服务器完全损坏，在新服务器恢复

# 1. 安装 Docker 和 Docker Compose
# 2. 克隆代码仓库
git clone <repo> /opt/fire-platform
cd /opt/fire-platform

# 3. 恢复配置文件
cp /backup/.env /opt/fire-platform/.env

# 4. 启动基础设施（MySQL + Redis）
docker-compose up -d mysql redis

# 5. 等待 MySQL 就绪
sleep 30

# 6. 恢复数据库
gunzip -c /backup/db_fire_platform_*.sql.gz | \
  docker exec -i fire-platform-mysql mysql -u root -p fire_platform

# 7. 恢复 Redis
docker cp /backup/redis_*.rdb fire-platform-redis:/data/dump.rdb

# 8. 恢复上传文件
tar -xzf /backup/uploads_*.tar.gz -C backend/

# 9. 启动所有服务
./scripts/run.sh start
```

---

## 五、性能调优

### 5.1 MySQL 调优

```sql
-- 查看当前连接数
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 查看锁等待
SHOW ENGINE INNODB STATUS;

-- 查看表碎片
SELECT table_name, data_free/1024/1024 AS frag_mb
FROM information_schema.tables
WHERE table_schema = 'fire_platform' AND data_free > 0;

-- 优化表（在线执行）
OPTIMIZE TABLE fire_alarm;
```

### 5.2 Redis 调优

```bash
# 进入 Redis
docker exec -it fire-platform-redis redis-cli

# 查看内存使用
INFO memory

# 查看大 Key
redis-cli --bigkeys

# 查看慢查询
SLOWLOG GET 10

# 清空缓存（谨慎操作）
# FLUSHDB  # 已禁用，如需执行需先修改配置
```

### 5.3 后端性能分析

```bash
# 使用 clinic.js 进行性能分析
npm install -g clinic

# 生成火焰图
clinic doctor -- node dist/app.js

# 生成气泡图（事件循环延迟）
clinic bubbleprof -- node dist/app.js

# 使用 0x 生成火焰图
npx 0x dist/app.js
```

---

## 六、安全运维

### 6.1 定期安全审计

```bash
# 1. 容器镜像漏洞扫描
docker scan xzy/fire-platform-backend:latest
docker scan xzy/fire-platform-frontend:latest

# 2. 依赖漏洞扫描
cd backend && npm audit
cd app && npm audit

# 3. 敏感信息检查
git log --all --full-history -p -S 'password'  # 检查密码是否进入 git 历史
grep -r "AKIA" .  # 检查 AWS 密钥泄露
grep -r "private_key" .  # 检查私钥泄露

# 4. 端口安全检查
nmap -sT localhost
ss -tlnp
```

### 6.2 访问控制

```bash
# 查看最近登录失败的 IP
docker logs fire-platform-backend 2>&1 | \
  grep "登录失败" | \
  awk '{print $NF}' | \
  sort | uniq -c | sort -rn | head -10

# 查看异常请求（非 200/304 状态码超过 10% 的 IP）
docker logs fire-platform-frontend 2>&1 | \
  jq -r 'select(.status != 200 and .status != 304) | .remote_addr' | \
  sort | uniq -c | sort -rn | head -10
```

### 6.3 SSL/TLS 配置

```nginx
# docker/nginx/ssl.conf
server {
    listen 443 ssl http2;
    server_name xzyzh.top;

    ssl_certificate /etc/nginx/ssl/xzyzh.top.crt;
    ssl_certificate_key /etc/nginx/ssl/xzyzh.top.key;

    # 安全协议和加密套件
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

## 七、扩容方案

### 7.1 垂直扩容（单机升级）

```bash
# 修改 docker-compose.yml 中的资源限制
# backend: memory 1GB → 2GB, cpus 1.0 → 2.0
# mysql: memory 2GB → 4GB, cpus 1.5 → 2.0

./scripts/run.sh stop
# 升级服务器硬件（内存/CPU）
./scripts/run.sh start
```

### 7.2 水平扩容（多实例 + 负载均衡）

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      # 使用 Redis 存储 Session，实现多实例共享

  nginx:
    volumes:
      - ./docker/nginx/upstream.conf:/etc/nginx/conf.d/upstream.conf
```

```nginx
# upstream.conf
upstream backend_api {
    least_conn;
    server backend_1:5003;
    server backend_2:5003;
    server backend_3:5003;
    keepalive 32;
}
```

### 7.3 数据库读写分离

```yaml
# docker-compose.db-replica.yml
services:
  mysql-master:
    image: mysql:8.0
    # 主库配置

  mysql-slave:
    image: mysql:8.0
    # 从库配置（只读）
```

---

## 八、常见问题 FAQ

### Q1: 前端访问提示 "后端服务暂时不可用"

**排查步骤:**
1. `docker ps` 检查 backend 容器是否运行
2. `./scripts/run.sh logs -s backend` 查看错误日志
3. `docker exec fire-platform-backend curl localhost:5003/api/health` 容器内测试
4. 检查 MySQL 和 Redis 是否健康

### Q2: MySQL 容器反复重启

**排查步骤:**
1. `docker logs fire-platform-mysql` 查看错误
2. 检查数据卷权限: `docker volume inspect fire-platform_mysql-data`
3. 检查磁盘空间: `df -h`
4. 检查 my.cnf 配置语法

### Q3: Redis 内存耗尽

**解决方案:**
1. 检查大 Key: `redis-cli --bigkeys`
2. 调整 maxmemory: 修改 `docker/redis/redis.conf`
3. 检查是否有 Key 未设置过期时间
4. 临时扩容: 修改 docker-compose.yml 中 Redis 的 memory limit

### Q4: 上传文件失败

**排查步骤:**
1. 检查后端 uploads 目录权限
2. 检查 Nginx `client_max_body_size` 配置
3. 检查后端 `UPLOAD_MAX_SIZE` 环境变量
4. 检查磁盘空间

### Q5: WebSocket 连接断开

**排查步骤:**
1. 检查 Nginx 代理配置中的 `proxy_read_timeout`
2. 检查防火墙是否拦截 WebSocket 端口
3. 检查后端 WebSocket 服务是否运行
4. 查看浏览器控制台网络请求

---

## 九、联系与升级

### 升级路径

| 当前版本 | 目标版本 | 注意事项 |
|---------|---------|---------|
| 1.x | 2.0.0 | 数据库结构大改，需全量迁移 |
| 2.0.0 | 2.1.0 | 新增 CTWing 字段，增量迁移即可 |
| 2.x | 3.0.0 | 待规划（预计引入微服务拆分） |

### 技术支持

- **文档**: https://docs.xzyzh.top
- **Issues**: https://github.com/xzy/fire-platform/issues
- **邮箱**: support@xzy.cn
- **紧急联系**: 400-xxx-xxxx (7x24)
