# 新致远智慧消防平台 - 容器化部署指南

> **版本**: 2.0.0  
> **适用环境**: Docker 24.0+ / Docker Compose 2.20+  
> **最后更新**: 2026-05-16

---

## 一、架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              宿主机 (Host)                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Nginx     │    │   前端容器   │    │   后端容器   │    │   MySQL     │  │
│  │  (可选入口) │───→│  React+Vite │───→│ Node+Express│───→│    8.0      │  │
│  │   :8080    │    │   :80      │    │   :5003    │    │   :3306    │  │
│  └─────────────┘    └─────────────┘    └──────┬──────┘    └─────────────┘  │
│                                                │                            │
│                                         ┌──────┴──────┐                    │
│                                         │    Redis    │                    │
│                                         │    7-alpine │                    │
│                                         │    :6379    │                    │
│                                         └─────────────┘                    │
│                                                                             │
│  网络: fire-platform-net (172.28.0.0/16)                                   │
│  卷:   mysql-data, redis-data, backend-logs, backend-uploads             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、快速开始

### 2.1 前置要求

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Docker | 24.0.0 | 容器引擎 |
| Docker Compose | 2.20.0 | 编排工具 |
| 内存 | 4GB | 生产环境建议 8GB+ |
| 磁盘 | 20GB | 含日志和数据 |

### 2.2 首次部署（5 分钟完成）

```bash
# 1. 克隆代码仓库
git clone <repository-url> fire-platform
cd fire-platform

# 2. 创建环境变量文件
cp config/.env.docker .env
# ⚠️ 编辑 .env 文件，修改数据库密码、JWT 密钥等敏感配置

# 3. 构建并启动（首次需要 5-10 分钟下载和构建）
./scripts/run.sh start --build

# 4. 执行数据库迁移（首次启动后必须执行）
./scripts/run.sh migrate

# 5. 查看服务状态
./scripts/run.sh status
```

### 2.3 访问验证

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端页面 | http://localhost | 智慧消防监控中心 |
| 后端 API | http://localhost:5003/api | RESTful API |
| 健康检查 | http://localhost:5003/api/health | 后端健康状态 |

---

## 三、服务详解

### 3.1 前端服务 (frontend)

- **基础镜像**: `node:20-alpine` → `nginx:1.25-alpine-slim`
- **构建方式**: 多阶段构建，最终镜像仅 ~25MB
- **端口**: `80` (容器内)
- **安全特性**:
  - 非 root 用户运行 (`nginx-user:1001`)
  - 安全响应头 (`X-Frame-Options`, `X-Content-Type-Options` 等)
  - 敏感文件访问禁止 (`.env`, `.git` 等)
- **Nginx 功能**:
  - 静态资源缓存 (JS/CSS 1年, 图片 30天, HTML 不缓存)
  - Gzip 压缩
  - API 反向代理到后端
  - WebSocket 代理
  - 速率限制 (`/api/` 100r/s, 登录 10r/m)
  - 后端不可用降级响应

### 3.2 后端服务 (backend)

- **基础镜像**: `node:20-alpine`
- **构建方式**: 三阶段构建 (deps → builder → production)
- **端口**: `5003`
- **安全特性**:
  - 非 root 用户运行 (`app-user:1002`)
  - 仅安装生产依赖 (减少攻击面)
- **功能模块**:
  - RESTful API (Express)
  - WebSocket 实时推送
  - IoT 协议接入 (GB26875, FSCN8001, Hikvision4G, CTWing)
  - 定时任务 (心跳检测、日志清理)
  - 数据库迁移 (Sequelize CLI)

### 3.3 MySQL 服务 (mysql)

- **镜像**: `mysql:8.0`
- **端口**: `3306`
- **持久化**: `mysql-data` 卷
- **优化配置**:
  - InnoDB Buffer Pool: 1GB
  - 最大连接数: 500
  - 慢查询日志: >2s
  - 二进制日志: 7 天保留
- **初始化**: `docker/mysql/init/` 目录下的 `.sql` 和 `.js` 文件自动执行

### 3.4 Redis 服务 (redis)

- **镜像**: `redis:7-alpine`
- **端口**: `6379`
- **持久化**: RDB + AOF 双保险
- **内存策略**: `allkeys-lru`, 最大 256MB
- **安全**: 禁用 `FLUSHDB`/`FLUSHALL` 危险命令

---

## 四、常用运维命令

### 4.1 服务生命周期

```bash
# 启动所有服务
./scripts/run.sh start

# 重新构建后启动（代码更新后使用）
./scripts/run.sh start --build

# 停止所有服务
./scripts/run.sh stop

# 重启全部/单个服务
./scripts/run.sh restart
./scripts/run.sh restart backend

# 查看运行状态
./scripts/run.sh status
```

### 4.2 日志管理

```bash
# 查看所有服务日志（最近 100 行）
./scripts/run.sh logs

# 实时跟踪日志（类似 tail -f）
./scripts/run.sh logs -f

# 查看指定服务日志
./scripts/run.sh logs -s backend
./scripts/run.sh logs -s mysql

# 查看容器内日志文件
docker exec fire-platform-backend tail -f /app/logs/combined.log
```

### 4.3 数据库操作

```bash
# 执行迁移
./scripts/run.sh migrate

# 进入 MySQL 容器
./scripts/run.sh shell mysql
mysql -u fire_user -p fire_platform

# 进入 Redis 容器
./scripts/run.sh shell redis
redis-cli

# 进入后端容器
./scripts/run.sh shell backend
```

### 4.4 数据备份

```bash
# 全量备份（数据库 + Redis + 上传文件 + 日志）
./scripts/backup.sh full

# 仅备份数据库
./scripts/backup.sh db

# 清理过期备份（默认保留 30 天）
./scripts/backup.sh cleanup
```

### 4.5 扩缩容

```bash
# 后端扩展到 3 实例（需配合负载均衡使用）
./scripts/run.sh scale backend 3

# 恢复单实例
./scripts/run.sh scale backend 1
```

---

## 五、网络与通信

### 5.1 容器间网络

所有服务通过 `fire-platform-net` Docker Bridge 网络通信：

| 服务 | 容器名 | 内部地址 | 访问方式 |
|------|--------|---------|---------|
| 前端 | fire-platform-frontend | 172.28.0.x | http://frontend:80 |
| 后端 | fire-platform-backend | 172.28.0.x | http://backend:5003 |
| MySQL | fire-platform-mysql | 172.28.0.x | mysql:3306 |
| Redis | fire-platform-redis | 172.28.0.x | redis:6379 |

### 5.2 服务发现

后端通过服务名访问数据库和缓存：

```yaml
# backend .env 中
DB_HOST=mysql        # 而非 127.0.0.1
REDIS_HOST=redis     # 而非 127.0.0.1
```

---

## 六、持久化存储

| 卷名 | 用途 | 宿主机路径 |
|------|------|-----------|
| `mysql-data` | MySQL 数据库文件 | Docker 管理卷 |
| `mysql-backup` | 数据库备份 | Docker 管理卷 |
| `redis-data` | Redis RDB/AOF | Docker 管理卷 |
| `backend-logs` | 后端应用日志 | Docker 管理卷 |
| `backend-uploads` | 用户上传文件 | Docker 管理卷 |

> ⚠️ **重要**: 删除卷会导致数据永久丢失。迁移服务器前务必备份。

---

## 七、安全加固

### 7.1 容器安全

- 所有服务均以非 root 用户运行
- 前端: `nginx-user:1001`
- 后端: `app-user:1002`
- MySQL/Redis: 使用官方镜像内置的安全用户

### 7.2 网络安全

- 内部网络隔离 (`fire-platform-net`)
- 仅暴露必要端口到宿主机
- Nginx 速率限制防止暴力破解

### 7.3 数据安全

- MySQL 使用 `utf8mb4` 字符集
- JWT 密钥通过环境变量注入（不硬编码）
- 数据库密码和 Redis 密码通过 `.env` 管理

### 7.4 生产环境建议

1. **修改默认密码**: 编辑 `.env` 文件中的所有密码
2. **启用 HTTPS**: 配置 SSL 证书到 `docker/nginx/ssl/`
3. **防火墙**: 仅开放 80/443 端口，关闭 5003/3306/6379 外网访问
4. **JWT 密钥**: 使用 `openssl rand -base64 64` 生成强密钥
5. **定期备份**: 配置 crontab 定时执行 `./scripts/backup.sh full`

---

## 八、故障排查

### 8.1 服务启动失败

```bash
# 查看具体错误
./scripts/run.sh logs -f

# 检查端口冲突
sudo lsof -i :80
sudo lsof -i :5003
sudo lsof -i :3306

# 重建容器
./scripts/run.sh stop
./scripts/run.sh start --build
```

### 8.2 数据库连接失败

```bash
# 检查 MySQL 健康状态
docker exec fire-platform-mysql mysqladmin ping -u root -p

# 检查后端数据库配置
./scripts/run.sh shell backend
cat .env | grep DB_
```

### 8.3 前端 502 错误

通常表示后端未就绪。检查：

```bash
./scripts/run.sh status
./scripts/run.sh logs -s backend
```

---

## 九、CI/CD 集成

### GitHub Actions 示例

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Images
        run: |
          export VERSION=${{ github.sha }}
          ./scripts/build.sh prod $VERSION

      - name: Push to Registry
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USER }}" --password-stdin
          docker tag xzy/fire-platform-backend:${{ github.sha }} registry.cn-hangzhou.aliyuncs.com/xzy/backend:${{ github.sha }}
          docker push registry.cn-hangzhou.aliyuncs.com/xzy/backend:${{ github.sha }}
```

---

## 十、附录

### A. 环境变量完整清单

见 `config/.env.docker` 文件。

### B. 资源限制参考

| 服务 | CPU 限制 | 内存限制 | 适用场景 |
|------|---------|---------|---------|
| 前端 | 0.5 核 | 256MB | 100 并发 |
| 后端 | 1.0 核 | 1GB | 500 QPS |
| MySQL | 1.5 核 | 2GB | 10万设备 |
| Redis | 0.5 核 | 512MB | 1000 并发连接 |

### C. 监控指标

| 指标 | 告警阈值 | 说明 |
|------|---------|------|
| 后端内存 | > 80% | OOM 风险 |
| MySQL 连接数 | > 400 | 接近 max_connections |
| Redis 内存 | > 200MB | 接近 maxmemory |
| 磁盘空间 | > 85% | 日志或数据膨胀 |
| Nginx 5xx | > 1% | 后端服务异常 |
