# ============================================================================
# 新致远智慧消防平台 - 后端容器化构建
# 技术栈: Node.js 20 + Express 4.19 + TypeScript 5.4 + Sequelize 6.37
# 功能: RESTful API + WebSocket + IoT 协议接入 + 定时任务
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: 依赖安装阶段 (Dependencies Stage)
# 利用 Docker 缓存，分离依赖安装和源码构建
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

LABEL maintainer="xinzhiyuan-tech@xzy.cn"
LABEL description="智慧消防平台后端依赖镜像"
LABEL version="2.0.0"

WORKDIR /deps

# 安装编译原生模块所需的系统依赖
# - python3/make/g++: 用于 bcrypt、sqlite3 等原生模块编译
# - tzdata: 时区数据
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    tzdata \
    && npm config set registry https://registry.npmmirror.com

# 设置时区
ENV TZ=Asia/Shanghai
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 仅复制依赖清单，最大化缓存命中率
COPY backend/package.json backend/package-lock.json* ./

# 安装生产依赖（排除 devDependencies）
RUN npm ci --omit=dev --prefer-offline --no-audit --no-fund \
    && npm cache clean --force


# ----------------------------------------------------------------------------
# Stage 2: 编译构建阶段 (Build Stage)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /build

RUN apk add --no-cache python3 make g++ git \
    && npm config set registry https://registry.npmmirror.com

# 复制完整依赖（含 devDependencies，用于 TypeScript 编译）
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund

# 复制后端源码
COPY backend/ ./

# TypeScript 编译
RUN npm run build

# 验证构建产物
RUN ls -la dist/app.js \
    && test -f dist/app.js \
    && echo "[BUILD] 后端构建成功" || (echo "[BUILD] 后端构建失败" && exit 1)


# ----------------------------------------------------------------------------
# Stage 3: 生产运行阶段 (Production Stage)
# 最小化镜像，仅包含运行所需内容
# ----------------------------------------------------------------------------
FROM node:20-alpine AS production

LABEL maintainer="xinzhiyuan-tech@xzy.cn"
LABEL description="智慧消防平台后端生产镜像"
LABEL version="2.0.0"

# 安装运行时依赖
RUN apk add --no-cache \
    curl \
    tzdata \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# 设置时区
ENV TZ=Asia/Shanghai
RUN cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 创建非 root 运行用户
RUN addgroup -g 1002 -S app-group \
    && adduser -u 1002 -S app-user -G app-group

# 设置工作目录
WORKDIR /app

# 复制生产依赖（从 deps 阶段）
COPY --from=deps /deps/node_modules ./node_modules

# 复制构建产物（从 builder 阶段）
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./

# 复制必要的运行时文件
COPY --from=builder /build/sql ./sql
COPY --from=builder /build/seeders ./seeders

# 创建持久化目录并设置权限
RUN mkdir -p /app/logs /app/uploads /app/tmp \
    && chown -R app-user:app-group /app

# 设置 Node.js 生产环境优化
ENV NODE_ENV=production
ENV PORT=5003
ENV LOG_DIR=/app/logs
ENV UPLOAD_DIR=/app/uploads

# 健康检查：检查 HTTP API 健康端点
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fs http://localhost:5003/api/health || exit 1

# 暴露端口
EXPOSE 5003

# 切换非 root 用户
USER app-user

# 启动应用（不使用 PM2，由 Docker/K8s 负责进程管理）
CMD ["node", "dist/app.js"]
