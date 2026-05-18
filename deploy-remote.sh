#!/usr/bin/env bash
# ============================================================================
# 新致远智慧消防平台 — 服务器端一键部署脚本
# 用法: 上传 deploy-dist.zip 到 /tmp 后执行此脚本
# ============================================================================

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/fire-platform-backup/${TIMESTAMP}"
DEPLOY_ZIP="/tmp/deploy-dist.zip"

log_info() { echo -e "${BLUE}[DEPLOY] $1${NC}"; }
log_ok()   { echo -e "${GREEN}[DEPLOY] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[DEPLOY] $1${NC}"; }
log_err()  { echo -e "${RED}[DEPLOY] $1${NC}"; }

# ── 前置检查 ──
if [[ ! -f "$DEPLOY_ZIP" ]]; then
    log_err "部署包不存在: $DEPLOY_ZIP"
    log_info "请先将 deploy-dist.zip 上传到 /tmp/"
    exit 1
fi

if [[ $EUID -ne 0 ]]; then
    log_warn "建议以 root 用户执行此脚本"
fi

# ── 解压到临时目录 ──
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

log_info "解压部署包到 $TMP_DIR ..."
unzip -q "$DEPLOY_ZIP" -d "$TMP_DIR"

# ── 备份 ──
log_info "备份当前版本到 $BACKUP_DIR ..."
mkdir -p "$BACKUP_DIR"
[[ -d "/opt/my-fire-api-new/dist" ]] && cp -r /opt/my-fire-api-new/dist "$BACKUP_DIR/backend-dist"
[[ -d "/www/wwwroot/fire-platform" ]] && cp -r /www/wwwroot/fire-platform "$BACKUP_DIR/frontend-dist"

# ── 部署后端 ──
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "  部署后端服务"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -d "$TMP_DIR/backend/dist" ]]; then
    rm -rf /opt/my-fire-api-new/dist
    cp -r "$TMP_DIR/backend/dist" /opt/my-fire-api-new/
    chown -R root:root /opt/my-fire-api-new/dist
    log_ok "后端 dist 已复制"
else
    log_warn "后端 dist 不存在于部署包中，跳过"
fi

# ── 重启后端 ──
log_info "重启 PM2 服务..."
pm2 restart fire-platform || { log_err "PM2 重启失败"; exit 1; }

# ── 健康检查 ──
log_info "后端健康检查..."
for i in {1..10}; do
    if curl -fs http://localhost:5003/api/health >/dev/null 2>&1; then
        log_ok "后端服务健康检查通过"
        break
    fi
    sleep 2
    if [[ $i -eq 10 ]]; then
        log_err "后端健康检查失败"
        exit 1
    fi
done

# ── 部署前端 ──
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "  部署前端服务"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ -d "$TMP_DIR/app/dist" ]]; then
    rm -rf /www/wwwroot/fire-platform/*
    cp -r "$TMP_DIR/app/dist"/* /www/wwwroot/fire-platform/
    log_ok "前端 dist 已复制"
else
    log_warn "前端 dist 不存在于部署包中，跳过"
fi

# ── 重载 Nginx ──
log_info "重载 Nginx..."
nginx -t && nginx -s reload || log_warn "Nginx 重载失败，请手动检查"

# ── 完成 ──
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}  时间: ${TIMESTAMP}${NC}"
echo -e "${GREEN}  备份: ${BACKUP_DIR}${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
