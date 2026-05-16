#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# 新致远智慧消防平台 - 生产环境部署脚本
# 执行位置：本地项目根目录
# 目标服务器：root@124.223.35.58
# ═══════════════════════════════════════════════════════════════════

set -e

SERVER="root@124.223.35.58"
REMOTE_BACKEND_DIR="/opt/my-fire-api-new"
REMOTE_FRONTEND_DIR="/www/wwwroot/fire-platform"
REMOTE_WVP_DIR="/opt/wvp"
BACKEND_PORT="5003"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "═══════════════════════════════════════════════════════════════"
echo "  新致远智慧消防平台 - 生产部署"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# 步骤 0：确认环境变量已配置
# ═══════════════════════════════════════════════════════════════
if [ ! -f "backend/.env.production" ]; then
    log_warn "backend/.env.production 不存在，将使用 backend/.env"
    log_warn "建议先复制并配置生产环境变量："
    log_warn "  cp backend/.env.example backend/.env.production"
    log_warn "  # 编辑 backend/.env.production，填写真实密码和密钥"
    read -p "是否继续？ [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# ═══════════════════════════════════════════════════════════════
# 步骤 1：本地构建
# ═══════════════════════════════════════════════════════════════
log_info "步骤 1/6：本地构建..."

cd backend
log_info "安装后端依赖..."
npm install

log_info "构建后端..."
npm run build

cd ../app
log_info "安装前端依赖..."
npm install

log_info "构建前端..."
npm run build

cd ..

# ═══════════════════════════════════════════════════════════════
# 步骤 2：打包部署文件
# ═══════════════════════════════════════════════════════════════
log_info "步骤 2/6：打包部署文件..."

DEPLOY_TMP=$(mktemp -d)
mkdir -p "$DEPLOY_TMP/backend"
mkdir -p "$DEPLOY_TMP/app"

# 后端部署文件
cp -r backend/dist "$DEPLOY_TMP/backend/"
cp -r backend/sql "$DEPLOY_TMP/backend/"
cp backend/package.json "$DEPLOY_TMP/backend/"
cp backend/package-lock.json "$DEPLOY_TMP/backend/"
cp backend/ecosystem.config.js "$DEPLOY_TMP/backend/" 2>/dev/null || true

# 环境配置文件（优先使用 .env.production）
if [ -f "backend/.env.production" ]; then
    cp backend/.env.production "$DEPLOY_TMP/backend/.env"
else
    cp backend/.env "$DEPLOY_TMP/backend/.env" 2>/dev/null || true
fi

# 前端部署文件
cp -r app/dist/* "$DEPLOY_TMP/app/"

# 创建远程执行脚本
cat > "$DEPLOY_TMP/remote-deploy.sh" << 'REMOTESCRIPT'
#!/bin/bash
set -e

REMOTE_BACKEND_DIR="/opt/my-fire-api-new"
REMOTE_FRONTEND_DIR="/www/wwwroot/fire-platform"
BACKEND_PORT="5003"

log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[1;33m[WARN]\033[0m $1"; }

# 步骤 A：备份现有部署
log_info "备份现有后端..."
if [ -d "$REMOTE_BACKEND_DIR" ]; then
    tar czf "/opt/backup/my-fire-api-new_$(date +%Y%m%d_%H%M%S).tar.gz" -C "$REMOTE_BACKEND_DIR" . 2>/dev/null || true
fi

log_info "备份现有前端..."
if [ -d "$REMOTE_FRONTEND_DIR" ]; then
    tar czf "/opt/backup/fire-platform_$(date +%Y%m%d_%H%M%S).tar.gz" -C "$REMOTE_FRONTEND_DIR" . 2>/dev/null || true
fi

# 步骤 B：部署后端
log_info "部署后端文件..."
cd "$REMOTE_BACKEND_DIR"

# 保留 .env 和 uploads，其他替换
if [ -f ".env" ]; then
    cp .env /tmp/.env.backup
fi
if [ -d "uploads" ]; then
    cp -r uploads /tmp/uploads.backup
fi
if [ -d "logs" ]; then
    cp -r logs /tmp/logs.backup
fi

# 清理旧文件（保留 node_modules 以加速）
rm -rf dist sql

# 复制新文件
cp -r /tmp/deploy/backend/dist .
cp -r /tmp/deploy/backend/sql .
cp /tmp/deploy/backend/package.json .
cp /tmp/deploy/backend/package-lock.json .

# 恢复环境配置
if [ -f "/tmp/.env.backup" ]; then
    cp /tmp/.env.backup .env
else
    cp /tmp/deploy/backend/.env .env
fi

# 恢复 uploads 和 logs
if [ -d "/tmp/uploads.backup" ]; then
    cp -r /tmp/uploads.backup uploads
fi
if [ -d "/tmp/logs.backup" ]; then
    cp -r /tmp/logs.backup logs
fi

# 安装生产依赖
log_info "安装后端生产依赖..."
npm install --production

# 步骤 C：数据库迁移
log_info "执行数据库迁移..."
npx sequelize-cli db:migrate

# 步骤 D：部署前端
log_info "部署前端文件..."
rm -rf "$REMOTE_FRONTEND_DIR"/*
cp -r /tmp/deploy/app/* "$REMOTE_FRONTEND_DIR/"

# 步骤 E：重启后端服务
log_info "重启后端服务..."
pm2 restart fire-platform || pm2 start dist/app.js --name fire-platform --env production

# 步骤 F：健康检查
log_info "等待服务启动..."
sleep 3

if curl -sf "http://127.0.0.1:$BACKEND_PORT/health" > /dev/null 2>&1; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "\033[0;32m  ✅ 部署成功！\033[0m"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  后端 API: http://127.0.0.1:$BACKEND_PORT"
    echo "  前端站点: $REMOTE_FRONTEND_DIR"
    echo "  PM2 进程: fire-platform"
    echo ""
    echo "  查看日志:"
    echo "    tail -f $REMOTE_BACKEND_DIR/logs/combined.log"
    echo "    pm2 logs fire-platform"
    echo ""
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "\033[0;31m  ⚠️  健康检查未通过，请查看日志排查\033[0m"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "  查看日志:"
    echo "    tail -n 50 $REMOTE_BACKEND_DIR/logs/error.log"
    echo "    pm2 logs fire-platform"
    echo ""
    exit 1
fi
REMOTESCRIPT

chmod +x "$DEPLOY_TMP/remote-deploy.sh"

# 创建压缩包
DEPLOY_PKG="deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar czf "$DEPLOY_PKG" -C "$DEPLOY_TMP" .
rm -rf "$DEPLOY_TMP"

log_info "部署包已生成: $DEPLOY_PKG"

# ═══════════════════════════════════════════════════════════════
# 步骤 3：上传到服务器
# ═══════════════════════════════════════════════════════════════
log_info "步骤 3/6：上传部署包到服务器..."

ssh "$SERVER" "mkdir -p /tmp/deploy /opt/backup" 2>/dev/null || {
    log_error "SSH 连接失败，请检查服务器地址和密钥"
    exit 1
}

scp "$DEPLOY_PKG" "$SERVER:/tmp/$DEPLOY_PKG"

# ═══════════════════════════════════════════════════════════════
# 步骤 4：在服务器上解压并执行
# ═══════════════════════════════════════════════════════════════
log_info "步骤 4/6：在服务器上解压..."

ssh "$SERVER" "tar xzf /tmp/$DEPLOY_PKG -C /tmp/deploy"

# ═══════════════════════════════════════════════════════════════
# 步骤 5：执行远程部署
# ═══════════════════════════════════════════════════════════════
log_info "步骤 5/6：执行远程部署脚本..."

ssh -t "$SERVER" "bash /tmp/deploy/remote-deploy.sh"

# ═══════════════════════════════════════════════════════════════
# 步骤 6：清理
# ═══════════════════════════════════════════════════════════════
log_info "步骤 6/6：清理临时文件..."

ssh "$SERVER" "rm -rf /tmp/$DEPLOY_PKG /tmp/deploy"
rm -f "$DEPLOY_PKG"

log_info "部署流程结束"
