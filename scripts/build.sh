#!/usr/bin/env bash
# ============================================================================
# 新致远智慧消防平台 - 统一构建脚本
# 功能: 构建前端、后端 Docker 镜像，支持多环境、版本标签、缓存优化
# 用法: ./scripts/build.sh [dev|test|prod] [版本号]
# ============================================================================

set -euo pipefail

# ── 颜色定义 ──
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ── 参数解析 ──
ENV=${1:-dev}
VERSION=${2:-$(git describe --tags --always --dirty 2>/dev/null || echo "2.0.0-$(date +%Y%m%d)")}
BUILD_TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# ── 环境校验 ──
case "$ENV" in
    dev|test|prod)
        echo -e "${BLUE}[BUILD] 构建环境: $ENV, 版本: $VERSION${NC}"
        ;;
    *)
        echo -e "${RED}[BUILD] 错误: 未知环境 '$ENV'，可选: dev | test | prod${NC}"
        exit 1
        ;;
esac

# ── 前置检查 ──
echo -e "${BLUE}[BUILD] 执行前置检查...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}[BUILD] 错误: Docker 未安装${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo -e "${RED}[BUILD] 错误: Docker Compose 未安装${NC}"; exit 1; }

# 检查必要的文件是否存在
for file in "docker/frontend/Dockerfile" "docker/backend/Dockerfile" "docker-compose.yml"; do
    if [[ ! -f "$file" ]]; then
        echo -e "${RED}[BUILD] 错误: 缺少文件 $file${NC}"
        exit 1
    fi
done

# 检查 node_modules 是否存在（本地开发构建时需要）
if [[ ! -d "app/node_modules" ]] || [[ ! -d "backend/node_modules" ]]; then
    echo -e "${YELLOW}[BUILD] 警告: 未找到 node_modules，将使用 Docker 内安装（较慢）${NC}"
fi

# ── 加载环境变量 ──
ENV_FILE="config/.env.$ENV"
if [[ -f "$ENV_FILE" ]]; then
    echo -e "${BLUE}[BUILD] 加载环境配置: $ENV_FILE${NC}"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${YELLOW}[BUILD] 警告: 未找到 $ENV_FILE，使用默认配置${NC}"
fi

# ── 设置构建参数 ──
export VERSION
export NODE_ENV=$ENV
export BUILD_TIMESTAMP
export GIT_COMMIT

# Docker 镜像标签
FRONTEND_IMAGE="xzy/fire-platform-frontend:${VERSION}"
BACKEND_IMAGE="xzy/fire-platform-backend:${VERSION}"
FRONTEND_IMAGE_LATEST="xzy/fire-platform-frontend:latest"
BACKEND_IMAGE_LATEST="xzy/fire-platform-backend:latest"

# ── 构建缓存策略 ──
# dev 环境不使用缓存以加速增量构建
# prod 环境使用缓存以加速构建
if [[ "$ENV" == "dev" ]]; then
    CACHE_ARG="--no-cache"
else
    CACHE_ARG=""
fi

# ── 构建前端镜像 ──
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           构建前端镜像: $FRONTEND_IMAGE            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

docker build \
    $CACHE_ARG \
    --build-arg NODE_ENV="$ENV" \
    --build-arg VERSION="$VERSION" \
    --build-arg BUILD_TIMESTAMP="$BUILD_TIMESTAMP" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    -f docker/frontend/Dockerfile \
    -t "$FRONTEND_IMAGE" \
    -t "$FRONTEND_IMAGE_LATEST" \
    .

echo -e "${GREEN}[BUILD] 前端镜像构建成功: $FRONTEND_IMAGE${NC}"

# ── 构建后端镜像 ──
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           构建后端镜像: $BACKEND_IMAGE             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

docker build \
    $CACHE_ARG \
    --build-arg NODE_ENV="$ENV" \
    --build-arg VERSION="$VERSION" \
    --build-arg BUILD_TIMESTAMP="$BUILD_TIMESTAMP" \
    --build-arg GIT_COMMIT="$GIT_COMMIT" \
    -f docker/backend/Dockerfile \
    -t "$BACKEND_IMAGE" \
    -t "$BACKEND_IMAGE_LATEST" \
    .

echo -e "${GREEN}[BUILD] 后端镜像构建成功: $BACKEND_IMAGE${NC}"

# ── 镜像信息 ──
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     构建完成摘要                              ║${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${BLUE}║  环境:        $ENV${NC}"
echo -e "${BLUE}║  版本:        $VERSION${NC}"
echo -e "${BLUE}║  Git Commit:  $GIT_COMMIT${NC}"
echo -e "${BLUE}║  构建时间:    $BUILD_TIMESTAMP${NC}"
echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  前端镜像:    $FRONTEND_IMAGE${NC}"
echo -e "${GREEN}║  后端镜像:    $BACKEND_IMAGE${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# ── 可选：保存镜像到文件（CI/CD 流水线使用）──
if [[ "${EXPORT_IMAGES:-false}" == "true" ]]; then
    echo -e "${BLUE}[BUILD] 导出镜像到文件...${NC}"
    mkdir -p dist/images
    docker save "$FRONTEND_IMAGE" | gzip > "dist/images/frontend-${VERSION}.tar.gz"
    docker save "$BACKEND_IMAGE" | gzip > "dist/images/backend-${VERSION}.tar.gz"
    echo -e "${GREEN}[BUILD] 镜像已导出到 dist/images/${NC}"
fi

# ── 可选：推送到镜像仓库 ──
if [[ -n "${DOCKER_REGISTRY:-}" ]]; then
    echo -e "${BLUE}[BUILD] 推送镜像到仓库: $DOCKER_REGISTRY${NC}"
    docker tag "$FRONTEND_IMAGE" "${DOCKER_REGISTRY}/${FRONTEND_IMAGE}"
    docker tag "$BACKEND_IMAGE" "${DOCKER_REGISTRY}/${BACKEND_IMAGE}"
    docker push "${DOCKER_REGISTRY}/${FRONTEND_IMAGE}"
    docker push "${DOCKER_REGISTRY}/${BACKEND_IMAGE}"
    echo -e "${GREEN}[BUILD] 镜像推送完成${NC}"
fi

echo -e "${GREEN}[BUILD] 全部构建完成！${NC}"
