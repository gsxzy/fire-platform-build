#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# 一键部署脚本：后端更新 + nginx WebSocket 修复
# 用法: cd /opt && bash deploy-patch/deploy.sh
# ═══════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="/opt/my-fire-api-new"
FRONTEND_DIR="/www/wwwroot/fire-platform"

echo "═══════════════════════════════════════════════════════════════"
echo "  新致远智慧消防平台 - 部署脚本"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 1. 部署后端 ──
echo "📦 [1/3] 部署后端..."
if [ -d "$SCRIPT_DIR/backend/dist" ]; then
    # 备份旧版本
    if [ -d "$BACKEND_DIR/dist" ]; then
        mv "$BACKEND_DIR/dist" "$BACKEND_DIR/dist.bak.$(date +%Y%m%d_%H%M%S)"
    fi
    cp -r "$SCRIPT_DIR/backend/dist" "$BACKEND_DIR/"
    echo "   ✅ 后端 dist 已更新"
else
    echo "   ⚠️  未找到 backend/dist，跳过后端部署"
fi

# ── 2. 重启后端服务 ──
echo "🔄 [2/3] 重启后端服务..."
if command -v pm2 &> /dev/null; then
    pm2 restart fire-platform
    echo "   ✅ pm2 已重启 fire-platform"
else
    echo "   ⚠️  pm2 未找到，请手动重启后端服务"
fi

# ── 3. 修复 nginx /ws 配置 ──
echo "🔧 [3/3] 修复 nginx WebSocket 代理配置..."
if [ -f "$SCRIPT_DIR/fix-nginx-ws.sh" ]; then
    bash "$SCRIPT_DIR/fix-nginx-ws.sh"
else
    echo "   ⚠️  未找到 fix-nginx-ws.sh，跳过 nginx 修复"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ 部署完成"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "验证步骤："
echo "  1. 检查后端日志: tail -n 20 $BACKEND_DIR/logs/combined.log"
echo "  2. 浏览器 F12 → Network → WS → 刷新页面"
echo "  3. 确认 ws?token=xxx 状态为 101 Switching Protocols"
echo "  4. 触发手报，检查弹窗是否正常显示"
echo ""
