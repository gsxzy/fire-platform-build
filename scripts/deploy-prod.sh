#!/usr/bin/env bash
# ============================================================================
# 新致远智慧消防平台 - 生产环境部署脚本
# 功能: 一键部署前后端到生产服务器（基于 PM2 + Nginx 现有架构）
# 用法: ./scripts/deploy-prod.sh [frontend|backend|all]
# ============================================================================

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

DEPLOY_TYPE=${1:-all}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/fire-platform-backup/${TIMESTAMP}"

log_info() { echo -e "${BLUE}[DEPLOY] $1${NC}"; }
log_ok()   { echo -e "${GREEN}[DEPLOY] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[DEPLOY] $1${NC}"; }
log_err()  { echo -e "${RED}[DEPLOY] $1${NC}"; }

deploy_backend() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "  部署后端服务"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 1. 备份当前版本
    log_info "备份当前后端版本到 ${BACKUP_DIR}"
    mkdir -p "$BACKUP_DIR"
    if [[ -d "/opt/my-fire-api-new/dist" ]]; then
        cp -r /opt/my-fire-api-new/dist "$BACKUP_DIR/backend-dist"
    fi

    # 2. 运行测试
    log_info "运行后端测试..."
    if ! (cd backend && npm test); then
        log_err "后端测试失败，终止部署"
        exit 1
    fi
    log_ok "后端测试通过"

    # 3. 复制新构建产物
    log_info "复制新构建产物到 /opt/my-fire-api-new/"
    if [[ ! -d "backend/dist" ]]; then
        log_err "后端构建产物 backend/dist 不存在，请先执行 npm run build"
        exit 1
    fi

    rm -rf /opt/my-fire-api-new/dist
    cp -r backend/dist /opt/my-fire-api-new/
    chown -R root:root /opt/my-fire-api-new/dist

    # 4. 重启 PM2 服务
    log_info "重启 PM2 后端服务..."
    pm2 restart fire-platform
    sleep 3

    # 5. 健康检查
    log_info "执行健康检查..."
    for i in {1..5}; do
        if curl -fs http://localhost:5003/api/health >/dev/null 2>&1; then
            log_ok "后端服务健康检查通过"
            return 0
        fi
        log_warn "健康检查第 $i 次重试..."
        sleep 2
    done

    log_err "后端服务健康检查失败，准备回滚..."
    rollback_backend
    exit 1
}

rollback_backend() {
    log_warn "执行后端回滚..."
    if [[ -d "$BACKUP_DIR/backend-dist" ]]; then
        rm -rf /opt/my-fire-api-new/dist
        cp -r "$BACKUP_DIR/backend-dist" /opt/my-fire-api-new/dist
        pm2 restart fire-platform
        log_ok "后端回滚完成"
    else
        log_err "无备份可回滚"
    fi
}

deploy_frontend() {
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "  部署前端服务"
    log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 1. 备份当前版本
    log_info "备份当前前端版本到 ${BACKUP_DIR}"
    mkdir -p "$BACKUP_DIR"
    if [[ -d "/www/wwwroot/fire-platform" ]]; then
        cp -r /www/wwwroot/fire-platform "$BACKUP_DIR/frontend-dist"
    fi

    # 2. 运行测试
    log_info "运行前端测试..."
    if ! (cd app && npm test); then
        log_err "前端测试失败，终止部署"
        exit 1
    fi
    log_ok "前端测试通过"

    # 3. 复制新构建产物
    log_info "复制新构建产物到 /www/wwwroot/fire-platform/"
    if [[ ! -d "app/dist" ]]; then
        log_err "前端构建产物 app/dist 不存在，请先执行 npm run build"
        exit 1
    fi

    rm -rf /www/wwwroot/fire-platform/*
    cp -r app/dist/* /www/wwwroot/fire-platform/

    # 3. 确保 index.html 存在
    if [[ ! -f "/www/wwwroot/fire-platform/index.html" ]]; then
        log_err "前端部署失败: index.html 不存在"
        rollback_frontend
        exit 1
    fi

    # 4. 重启 Nginx
    log_info "重载 Nginx 配置..."
    nginx -t && nginx -s reload

    log_ok "前端部署完成"
}

rollback_frontend() {
    log_warn "执行前端回滚..."
    if [[ -d "$BACKUP_DIR/frontend-dist" ]]; then
        rm -rf /www/wwwroot/fire-platform/*
        cp -r "$BACKUP_DIR/frontend-dist"/* /www/wwwroot/fire-platform/
        nginx -s reload
        log_ok "前端回滚完成"
    else
        log_err "无备份可回滚"
    fi
}

# ── 主逻辑 ──

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          新致远智慧消防平台 - 生产环境部署                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo -e "${BLUE}  部署类型: ${DEPLOY_TYPE} | 时间: ${TIMESTAMP}${NC}"
echo ""

case "$DEPLOY_TYPE" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        echo ""
        deploy_frontend
        ;;
    *)
        echo "用法: $0 [frontend|backend|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}  前端: https://<DOMAIN>${NC}"
echo -e "${GREEN}  后端: http://localhost:5003/api${NC}"
echo -e "${GREEN}  备份: ${BACKUP_DIR}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
