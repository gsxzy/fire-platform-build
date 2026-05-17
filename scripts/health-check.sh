#!/usr/bin/env bash
# ============================================================================
# 新致远智慧消防平台 - 健康检查脚本
# 功能: 检查所有服务健康状态，输出报告
# 用法: ./scripts/health-check.sh [--json]
# 返回码: 0=全部健康, 1=有服务异常
# ============================================================================

set -uo pipefail

# ── 颜色定义 ──
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# ── 配置 ──
FRONTEND_URL="http://localhost:80/health"
BACKEND_URL="http://localhost:5003/api/health"
MYSQL_CONTAINER="fire-platform-mysql"
REDIS_CONTAINER="fire-platform-redis"

JSON_MODE=false
[[ "${1:-}" == "--json" ]] && JSON_MODE=true

# ── 状态收集 ──
declare -A RESULTS
OVERALL_STATUS="healthy"

# ── 检查函数 ──

check_frontend() {
    local status
    if curl -fs "$FRONTEND_URL" >/dev/null 2>&1; then
        status="healthy"
    else
        status="unhealthy"
        OVERALL_STATUS="unhealthy"
    fi
    RESULTS["frontend"]="$status"
}

check_backend() {
    local status
    local response
    response=$(curl -fs "$BACKEND_URL" 2>/dev/null)
    if [[ $? -eq 0 ]] && echo "$response" | grep -q '"status":"ok"'; then
        status="healthy"
    else
        status="unhealthy"
        OVERALL_STATUS="unhealthy"
    fi
    RESULTS["backend"]="$status"
    RESULTS["backend_response"]="${response:-null}"
}

check_mysql() {
    local status
    if docker exec "$MYSQL_CONTAINER" mysqladmin ping -h localhost -u root -p"${MYSQL_ROOT_PASSWORD:-Root_Pass_2024!}" >/dev/null 2>&1; then
        status="healthy"
    else
        status="unhealthy"
        OVERALL_STATUS="unhealthy"
    fi
    RESULTS["mysql"]="$status"
}

check_redis() {
    local status
    if docker exec "$REDIS_CONTAINER" redis-cli ping | grep -q "PONG"; then
        status="healthy"
    else
        status="unhealthy"
        OVERALL_STATUS="unhealthy"
    fi
    RESULTS["redis"]="$status"
}

check_disk() {
    local usage
    usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    RESULTS["disk_usage"]="$usage"
    if [[ "$usage" -gt 90 ]]; then
        RESULTS["disk"]="critical"
        OVERALL_STATUS="unhealthy"
    elif [[ "$usage" -gt 80 ]]; then
        RESULTS["disk"]="warning"
    else
        RESULTS["disk"]="healthy"
    fi
}

check_memory() {
    local usage
    usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    RESULTS["memory_usage"]="$usage"
    if [[ "$usage" -gt 90 ]]; then
        RESULTS["memory"]="critical"
        OVERALL_STATUS="unhealthy"
    elif [[ "$usage" -gt 80 ]]; then
        RESULTS["memory"]="warning"
    else
        RESULTS["memory"]="healthy"
    fi
}

# ── 输出函数 ──

print_text_report() {
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║              智慧消防平台 - 健康检查报告                      ║${NC}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"

    local color
    for svc in frontend backend mysql redis disk memory; do
        case "${RESULTS[$svc]}" in
            healthy)   color="$GREEN" ;;
            warning)   color="$YELLOW" ;;
            *)         color="$RED" ;;
        esac
        printf "${BLUE}║${NC}  %-12s ${color}%-10s${NC}\n" "$svc:" "${RESULTS[$svc]}"
    done

    echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"
    printf "${BLUE}║${NC}  %-12s %s%%\n" "磁盘使用:" "${RESULTS[disk_usage]}"
    printf "${BLUE}║${NC}  %-12s %s%%\n" "内存使用:" "${RESULTS[memory_usage]}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════════════╣${NC}"

    if [[ "$OVERALL_STATUS" == "healthy" ]]; then
        echo -e "${BLUE}║${NC}  ${GREEN}✓ 所有服务正常运行${NC}"
    else
        echo -e "${BLUE}║${NC}  ${RED}✗ 检测到服务异常，请检查日志${NC}"
    fi
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

print_json_report() {
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "overall": "$OVERALL_STATUS",
  "services": {
    "frontend": "${RESULTS[frontend]}",
    "backend": "${RESULTS[backend]}",
    "mysql": "${RESULTS[mysql]}",
    "redis": "${RESULTS[redis]}",
    "disk": "${RESULTS[disk]}",
    "memory": "${RESULTS[memory]}"
  },
  "metrics": {
    "disk_usage_percent": ${RESULTS[disk_usage]},
    "memory_usage_percent": ${RESULTS[memory_usage]}
  }
}
EOF
}

# ── 主逻辑 ──

check_frontend
check_backend
check_mysql
check_redis
check_disk
check_memory

if [[ "$JSON_MODE" == true ]]; then
    print_json_report
else
    print_text_report
fi

[[ "$OVERALL_STATUS" == "healthy" ]] && exit 0 || exit 1
