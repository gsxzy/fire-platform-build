#!/bin/bash
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/fire-platform-backup/${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"
echo "备份当前版本到 $BACKUP_DIR ..."
cp -r /opt/my-fire-api-new/dist "$BACKUP_DIR/backend-dist"
cp -r /www/wwwroot/fire-platform "$BACKUP_DIR/frontend-dist"
echo "备份完成"

echo "解压后端 dist ..."
rm -rf /opt/my-fire-api-new/dist
mkdir -p /opt/my-fire-api-new/dist
tar -xzf /tmp/backend-dist.tar.gz -C /opt/my-fire-api-new
echo "后端 dist 更新完成"

echo "解压前端 dist ..."
rm -rf /www/wwwroot/fire-platform/*
tar -xzf /tmp/frontend-dist.tar.gz -C /www/wwwroot/fire-platform --strip-components=1
echo "前端 dist 更新完成"

echo "重启 PM2 ..."
pm2 restart fire-platform

echo "重载 Nginx ..."
nginx -t && nginx -s reload

echo "健康检查 ..."
for i in {1..10}; do
    if curl -fs http://localhost:5003/api/health >/dev/null 2>&1; then
        echo "后端健康检查通过"
        break
    fi
    sleep 2
    if [[ $i -eq 10 ]]; then
        echo "后端健康检查失败"
        exit 1
    fi
done

echo ""
echo "========================================"
echo "部署完成！时间: $TIMESTAMP"
echo "备份: $BACKUP_DIR"
echo "========================================"
