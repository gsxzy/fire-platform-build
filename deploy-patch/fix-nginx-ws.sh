#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# 修复宝塔面板 nginx 缺少 /ws WebSocket 代理配置
# ═══════════════════════════════════════════════════════════════════

set -e

NGINX_CONF="/www/server/nginx/conf/vhost/fire-platform.conf"

if [ ! -f "$NGINX_CONF" ]; then
    echo "❌ 未找到 nginx 配置文件: $NGINX_CONF"
    echo "   请手动在站点配置中添加 /ws 代理规则"
    exit 1
fi

# 检查是否已有 /ws 配置
if grep -q "location /ws" "$NGINX_CONF"; then
    echo "✅ /ws 代理配置已存在，跳过"
    exit 0
fi

# 备份原配置
cp "$NGINX_CONF" "${NGINX_CONF}.bak.$(date +%Y%m%d_%H%M%S)"

echo "🔧 正在添加 /ws WebSocket 代理配置到 $NGINX_CONF ..."

# 在最后一个 } 之前插入 /ws 配置
# 使用 sed 在文件末尾的最后一个 } 之前插入
cat >> "$NGINX_CONF" <<'EOF'

    # WebSocket 代理（自动修复添加）
    location /ws {
        proxy_pass http://127.0.0.1:5003/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
    }
EOF

echo "🔍 检查 nginx 配置语法..."
nginx -t

echo "🔄 重载 nginx..."
if command -v systemctl &> /dev/null; then
    systemctl reload nginx || /etc/init.d/nginx reload
else
    /etc/init.d/nginx reload
fi

echo "✅ nginx /ws 代理配置修复完成！"
echo ""
echo "验证方式："
echo "  1. 浏览器 F12 → Network → WS 标签"
echo "  2. 刷新页面，确认 ws?token=xxx 连接状态为 101"
echo "  3. 触发手报，检查弹窗是否正常显示"
