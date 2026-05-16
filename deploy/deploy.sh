#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# 设备生命周期优化部署脚本
# 使用方式：将 deploy.zip 上传到服务器 /root/ 后执行
# ═══════════════════════════════════════════════════════════════════

set -e

DEPLOY_DIR="/root/deploy"
BACKEND_DIR="/opt/my-fire-api-new"
FRONTEND_DIR="/www/wwwroot/fire-platform"
DB_NAME="fire_platform"
DB_USER="root"
DB_PASS="Zhangcong2255"

echo "[1/5] 备份现有版本..."
cd "$BACKEND_DIR"
cp -r dist "dist.bak.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
cd "$FRONTEND_DIR"
cp -r assets "assets.bak.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
cp index.html "index.html.bak.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

echo "[2/5] 执行数据库脚本..."
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$DEPLOY_DIR/device_lifecycle_v2.sql"

echo "[3/5] 部署后端..."
rsync -av --delete "$DEPLOY_DIR/backend-dist/" "$BACKEND_DIR/dist/"

echo "[4/5] 部署前端..."
rsync -av --delete "$DEPLOY_DIR/frontend-dist/" "$FRONTEND_DIR/"

echo "[5/5] 重启服务..."
pm2 restart fire-platform || pm2 start "$BACKEND_DIR/dist/app.js" --name fire-platform

echo "✅ 部署完成！"
echo ""
echo "验证方式："
echo "  后端日志：tail -f $BACKEND_DIR/logs/combined.log"
echo "  PM2 状态：pm2 status"
echo "  前端访问：http://124.223.35.58"
