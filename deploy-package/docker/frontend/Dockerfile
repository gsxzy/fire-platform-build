# ============================================================================
# 新致远智慧消防平台 - 前端容器化构建
# 技术栈: React 19 + Vite 7 + TypeScript 5.9 + Tailwind CSS 3.4
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: 构建阶段 (Build Stage)
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

# 设置构建时元数据
LABEL maintainer="xinzhiyuan-tech@xzy.cn"
LABEL description="智慧消防平台前端构建镜像"
LABEL version="2.0.0"

# 设置工作目录
WORKDIR /build

# 安装构建依赖（ Alpine 需要 g++ / make 用于原生模块编译）
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && npm config set registry https://registry.npmmirror.com

# 先复制依赖清单，利用 Docker 缓存层
# 只要 package.json / package-lock.json 不变，就不会重新安装依赖
COPY app/package.json app/package-lock.json* ./

# 安装生产依赖（CI=true 跳过 dev postinstall hooks）
RUN npm ci --prefer-offline --no-audit --no-fund \
    && npm cache clean --force

# 复制前端源码（.dockerignore 已排除 node_modules / dist）
COPY app/ ./

# 复制环境变量文件（Docker 构建时使用生产配置）
COPY config/.env.docker ./.env.production

# 执行构建
# --max_old_space_size=4096 防止大型项目构建时 OOM
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN npm run build

# 构建产物验证
RUN ls -la dist/ \
    && test -f dist/index.html \
    && echo "[BUILD] 前端构建成功" || (echo "[BUILD] 前端构建失败" && exit 1)


# ----------------------------------------------------------------------------
# Stage 2: 生产运行阶段 (Production Stage)
# ----------------------------------------------------------------------------
FROM nginx:1.25-alpine-slim AS production

LABEL maintainer="xinzhiyuan-tech@xzy.cn"
LABEL description="智慧消防平台前端生产镜像"
LABEL version="2.0.0"

# 安装安全更新和必要工具
RUN apk upgrade --no-cache \
    && apk add --no-cache \
        curl \
        ca-certificates \
    && rm -rf /var/cache/apk/*

# 创建非 root 运行用户（安全加固）
RUN addgroup -g 1001 -S nginx-group \
    && adduser -u 1001 -S nginx-user -G nginx-group

# 复制自定义 Nginx 配置
COPY docker/frontend/nginx.conf /etc/nginx/nginx.conf
COPY docker/frontend/security-headers.conf /etc/nginx/security-headers.conf

# 从前一阶段复制构建产物到 Nginx 服务目录
COPY --from=builder /build/dist /usr/share/nginx/html

# 设置文件权限
RUN chown -R nginx-user:nginx-group /usr/share/nginx/html \
    && chown -R nginx-user:nginx-group /var/cache/nginx \
    && chown -R nginx-user:nginx-group /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx-user:nginx-group /var/run/nginx.pid

# 健康检查：每 30 秒检查一次，超时 3 秒，连续 3 次失败视为 unhealthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fs http://localhost:80/health || exit 1

# 暴露端口
EXPOSE 80

# 切换非 root 用户运行
USER nginx-user

# 启动 Nginx（前台运行，确保容器不退出）
CMD ["nginx", "-g", "daemon off;"]
