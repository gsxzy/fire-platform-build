#!/usr/bin/env bash
# ============================================================================
# 新致远智慧消防平台 - 统一启动/重启脚本
# 功能: 启动、停止、重启、状态查看、日志查看、数据库迁移
# 用法: ./scripts/run.sh [start|stop|restart|status|logs|migrate|clean]
# ============================================================================

set -euo pipefail

# ── 颜色定义 ──
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ── 配置 ──
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"
PROJECT_NAME="fire-platform"

# ── 函数定义 ──

show_help() {
    cat << EOF
${CYAN}新致远智慧消防平台 - 运维管理脚本${NC}

${YELLOW}用法:${NC} ./scripts/run.sh <命令> [选项]

${GREEN}命令:${NC}
    start       启动所有服务（首次启动会自动执行数据库迁移）
    stop        停止所有服务
    restart     重启所有服务或指定服务
    status      查看所有服务运行状态
    logs        查看日志（支持 -f 实时跟踪、-s <服务名> 指定服务）
    migrate     执行数据库迁移（Sequelize）
    clean       清理容器、卷、镜像（⚠️ 数据会丢失）
    shell       进入指定服务的容器 shell
    scale       扩缩容指定服务

${GREEN}示例:${NC}
    ./scripts/run.sh start              # 启动所有服务
    ./scripts/run.sh start --build      # 重新构建后启动
    ./scripts/run.sh logs -f            # 实时跟踪所有日志
    ./scripts/run.sh logs -s backend -f # 实时跟踪后端日志
    ./scripts/run.sh restart backend    # 仅重启后端服务
    ./scripts/run.sh shell backend      # 进入后端容器
    ./scripts/run.sh migrate            # 执行数据库迁移
EOF
}

check_docker() {
    command -v docker >/dev/null 2>&1 || { echo -e "${RED}[ERROR] Docker 未安装${NC}"; exit 1; }
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    elif docker-compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        echo -e "${RED}[ERROR] Docker Compose 未安装${NC}"
        exit 1
    fi
}

load_env() {
    if [[ -f "$ENV_FILE" ]]; then
        echo -e "${BLUE}[INFO] 加载环境变量: $ENV_FILE${NC}"
        export $(grep -v '^#' "$ENV_FILE" | xargs)
    else
        echo -e "${YELLOW}[WARN] 未找到 $ENV_FILE，使用默认配置${NC}"
        cp config/.env.docker "$ENV_FILE"
        echo -e "${GREEN}[INFO] 已创建默认配置文件 $ENV_FILE，请按需修改${NC}"
    fi
}

cmd_start() {
    local build_flag=""
    local profile=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            --build|-b) build_flag="--build" ;;
            --proxy|-p) profile="--profile proxy" ;;
            *) echo -e "${YELLOW}[WARN] 未知选项: $1${NC}" ;;
        esac
        shift
    done

    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              启动智慧消防平台服务                            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

    # 检查数据卷目录权限
    mkdir -p logs uploads mysql-backup

    if [[ -n "$build_flag" ]]; then
        echo -e "${BLUE}[START] 构建并启动服务...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" $profile up -d --build
    else
        echo -e "${BLUE}[START] 启动服务...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" $profile up -d
    fi

    # 等待服务就绪
    echo -e "${BLUE}[START] 等待服务就绪...${NC}"
    sleep 5

    # 检查健康状态
    cmd_status

    # 首次启动提示数据库迁移
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  服务已启动！${NC}"
    echo -e "${CYAN}  前端地址: http://localhost:${FRONTEND_PORT:-80}${NC}"
    echo -e "${CYAN}  后端 API: http://localhost:${BACKEND_PORT:-5003}/api${NC}"
    echo -e "${CYAN}  数据库:   localhost:${MYSQL_PORT:-3306}${NC}"
    echo -e "${CYAN}  Redis:    localhost:${REDIS_PORT:-6379}${NC}"
    echo -e "${YELLOW}  如需执行数据库迁移，请运行: ./scripts/run.sh migrate${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

cmd_stop() {
    echo -e "${BLUE}[STOP] 停止所有服务...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    echo -e "${GREEN}[STOP] 所有服务已停止${NC}"
}

cmd_restart() {
    local service=${1:-}
    if [[ -n "$service" ]]; then
        echo -e "${BLUE}[RESTART] 重启服务: $service${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart "$service"
    else
        echo -e "${BLUE}[RESTART] 重启所有服务...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart
    fi
    echo -e "${GREEN}[RESTART] 重启完成${NC}"
}

cmd_status() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                   服务运行状态                               ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    echo ""
    echo -e "${BLUE}[INFO] 资源使用情况:${NC}"
    docker stats --no-stream --format \
        "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.PIDs}}" \
        $(docker ps -q --filter "name=fire-platform") 2>/dev/null || true
}

cmd_logs() {
    local follow=""
    local service=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow) follow="-f" ;;
            -s|--service) service="$2"; shift ;;
            *) service="$1" ;;
        esac
        shift
    done

    if [[ -n "$service" ]]; then
        echo -e "${BLUE}[LOGS] 查看 $service 日志...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs $follow --tail=100 "$service"
    else
        echo -e "${BLUE}[LOGS] 查看所有服务日志...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs $follow --tail=100
    fi
}

cmd_migrate() {
    echo -e "${BLUE}[MIGRATE] 执行数据库迁移...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec backend npx sequelize-cli db:migrate
    echo -e "${GREEN}[MIGRATE] 数据库迁移完成${NC}"
}

cmd_clean() {
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}  ⚠️  警告: 此操作将删除所有容器、卷、镜像和数据！${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    read -p "确认继续? [y/N] " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}[CLEAN] 清理所有资源...${NC}"
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v --rmi all
        docker volume prune -f
        echo -e "${GREEN}[CLEAN] 清理完成${NC}"
    else
        echo -e "${YELLOW}[CLEAN] 操作已取消${NC}"
    fi
}

cmd_shell() {
    local service=${1:-backend}
    echo -e "${BLUE}[SHELL] 进入 $service 容器...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec "$service" /bin/sh
}

cmd_scale() {
    local service=${1:-}
    local count=${2:-1}
    if [[ -z "$service" ]]; then
        echo -e "${RED}[ERROR] 请指定服务名，例如: ./scripts/run.sh scale backend 3${NC}"
        exit 1
    fi
    echo -e "${BLUE}[SCALE] 将 $service 扩缩容到 $count 实例...${NC}"
    $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --scale "$service=$count"
    echo -e "${GREEN}[SCALE] 扩缩容完成${NC}"
}

# ── 主逻辑 ──

check_docker
load_env

COMMAND=${1:-help}
shift || true

case "$COMMAND" in
    start)   cmd_start "$@" ;;
    stop)    cmd_stop ;;
    restart) cmd_restart "$@" ;;
    status)  cmd_status ;;
    logs)    cmd_logs "$@" ;;
    migrate) cmd_migrate ;;
    clean)   cmd_clean ;;
    shell)   cmd_shell "$@" ;;
    scale)   cmd_scale "$@" ;;
    help|*)  show_help ;;
esac
