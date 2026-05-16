#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# 新致远智慧消防平台 - 服务器端一键部署脚本
# 执行位置：服务器 /opt/my-fire-api-new 目录
# 前提：代码已通过 git pull / rsync / SFTP 同步到服务器
# ═══════════════════════════════════════════════════════════════════

set -e

BACKEND_DIR="/opt/my-fire-api-new"
FRONTEND_DIR="/www/wwwroot/fire-platform"
APP_SRC_DIR="/opt/fire-platform-build/app"  # 前端源码目录（若前端源码在服务器上）
BACKUP_DIR="/opt/backup"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  新致远智慧消防平台 - 服务器端部署"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# 步骤 0：环境检查
# ═══════════════════════════════════════════════════════════════
log_step "0/7 环境检查"

# 检查是否在正确目录
if [ "$(pwd)" != "$BACKEND_DIR" ]; then
    log_warn "当前目录不是 $BACKEND_DIR"
    log_warn "建议先执行: cd $BACKEND_DIR"
    read -p "是否继续在当前目录部署？ [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    BACKEND_DIR="$(pwd)"
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装"
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    log_error "Node.js 版本过低，需要 >= 18，当前 $(node -v)"
    exit 1
fi
log_info "Node.js 版本: $(node -v)"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    log_warn "PM2 未安装，尝试全局安装..."
    npm install -g pm2
fi

# 检查 MySQL
if ! command -v mysql &> /dev/null; then
    log_warn "MySQL 客户端未安装，跳过数据库检查"
fi

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# ═══════════════════════════════════════════════════════════════
# 步骤 1：备份
# ═══════════════════════════════════════════════════════════════
log_step "1/7 备份现有部署"

BACKUP_TAG=$(date +%Y%m%d_%H%M%S)

if [ -d "$BACKEND_DIR/dist" ]; then
    tar czf "$BACKUP_DIR/backend_${BACKUP_TAG}.tar.gz" -C "$BACKEND_DIR" dist sql .env 2>/dev/null || true
    log_info "后端已备份: $BACKUP_DIR/backend_${BACKUP_TAG}.tar.gz"
fi

if [ -d "$FRONTEND_DIR" ] && [ -f "$FRONTEND_DIR/index.html" ]; then
    tar czf "$BACKUP_DIR/frontend_${BACKUP_TAG}.tar.gz" -C "$FRONTEND_DIR" . 2>/dev/null || true
    log_info "前端已备份: $BACKUP_DIR/frontend_${BACKUP_TAG}.tar.gz"
fi

# ═══════════════════════════════════════════════════════════════
# 步骤 2：安装后端依赖并构建
# ═══════════════════════════════════════════════════════════════
log_step "2/7 后端构建"

cd "$BACKEND_DIR"

log_info "安装后端依赖..."
npm install

log_info "构建后端 TypeScript..."
npm run build

# ═══════════════════════════════════════════════════════════════
# 步骤 3：数据库迁移
# ═══════════════════════════════════════════════════════════════
log_step "3/7 数据库迁移"

if [ -f "$BACKEND_DIR/.env" ]; then
    # 检查 Sequelize CLI 是否安装
    if [ ! -f "$BACKEND_DIR/node_modules/.bin/sequelize-cli" ]; then
        log_warn "sequelize-cli 未安装，尝试安装..."
        cd "$BACKEND_DIR"
        npm install sequelize-cli --save
    fi

    log_info "执行数据库迁移..."
    cd "$BACKEND_DIR"
    npx sequelize-cli db:migrate --env production || {
        log_warn "数据库迁移失败，请检查数据库连接和 .env 配置"
        log_warn "如需跳过迁移，请手动执行: npx sequelize-cli db:migrate"
    }
else
    log_warn "后端 .env 文件不存在，跳过数据库迁移"
    log_warn "请确保已配置数据库环境变量"
fi

# ═══════════════════════════════════════════════════════════════
# 步骤 4：部署前端（如果前端源码在服务器上）
# ═══════════════════════════════════════════════════════════════
log_step "4/7 前端构建与部署"

if [ -d "$APP_SRC_DIR" ] && [ -f "$APP_SRC_DIR/package.json" ]; then
    log_info "检测到前端源码，开始构建..."
    cd "$APP_SRC_DIR"
    npm install
    npm run build

    log_info "复制前端构建产物到 $FRONTEND_DIR..."
    rm -rf "$FRONTEND_DIR"/*
    cp -r "$APP_SRC_DIR/dist/"* "$FRONTEND_DIR/"
    log_info "前端部署完成"
elif [ -d "app" ] && [ -f "app/package.json" ]; then
    # 如果后端目录下有 app 子目录
    log_info "检测到前端源码在当前目录 app/ 下，开始构建..."
    cd "$BACKEND_DIR/app"
    npm install
    npm run build

    log_info "复制前端构建产物到 $FRONTEND_DIR..."
    rm -rf "$FRONTEND_DIR"/*
    cp -r "$BACKEND_DIR/app/dist/"* "$FRONTEND_DIR/"
    log_info "前端部署完成"
else
    log_warn "未检测到前端源码，跳过前端构建"
    log_warn "如需部署前端，请将前端源码同步到服务器后重新执行"
fi

# ═══════════════════════════════════════════════════════════════
# 步骤 5：重启后端服务
# ═══════════════════════════════════════════════════════════════
log_step "5/7 重启后端服务"

cd "$BACKEND_DIR"

if pm2 describe fire-platform > /dev/null 2>&1; then
    log_info "PM2 进程 fire-platform 存在，执行重启..."
    pm2 restart fire-platform
else
    log_warn "PM2 进程 fire-platform 不存在，尝试启动..."
    pm2 start dist/app.js --name fire-platform --env production
fi

pm2 save

# ═══════════════════════════════════════════════════════════════
# 步骤 6：健康检查
# ═══════════════════════════════════════════════════════════════
log_step "6/7 健康检查"

sleep 3

HEALTH_URL="http://127.0.0.1:5003/health"
if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    log_info "后端健康检查通过 ✅"
elif curl -sf "http://127.0.0.1:5003/" > /dev/null 2>&1; then
    log_info "后端服务响应正常 ✅"
else
    log_warn "健康检查未通过，等待 5 秒后重试..."
    sleep 5
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log_info "后端健康检查通过 ✅"
    else
        log_warn "健康检查仍失败，请查看日志排查"
    fi
fi

# ═══════════════════════════════════════════════════════════════
# 步骤 7：状态汇总
# ═══════════════════════════════════════════════════════════════
log_step "7/7 部署状态汇总"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}  部署流程执行完毕${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  后端目录: $BACKEND_DIR"
echo "  前端目录: $FRONTEND_DIR"
echo "  备份目录: $BACKUP_DIR"
echo ""
echo "  常用命令:"
echo "    查看后端日志:   pm2 logs fire-platform"
echo "    查看后端状态:   pm2 status"
echo "    查看 API 日志:  tail -f $BACKEND_DIR/logs/combined.log"
echo "    查看错误日志:   tail -f $BACKEND_DIR/logs/error.log"
echo "    数据库迁移:     cd $BACKEND_DIR && npx sequelize-cli db:migrate"
echo "    回滚迁移:       cd $BACKEND_DIR && npx sequelize-cli db:migrate:undo"
echo ""
echo "═══════════════════════════════════════════════════════════════"
