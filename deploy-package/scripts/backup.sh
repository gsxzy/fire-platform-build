#!/usr/bin/env bash
# ============================================================================
# 新致远智慧消防平台 - 数据备份脚本
# 功能: 全量备份 MySQL + Redis + 上传文件 + 日志归档
# 用法: ./scripts/backup.sh [full|db|redis|uploads|logs]
# 备份策略: 每日全量 + 每周清理过期备份
# ============================================================================

set -euo pipefail

# ── 颜色定义 ──
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# ── 配置 ──
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE=$(date +%Y%m%d)

# 数据库连接（从 docker-compose 环境变量读取）
DB_CONTAINER="fire-platform-mysql"
DB_NAME=${DB_NAME:-fire_platform}
DB_USER=${DB_USER:-root}
DB_PASSWORD=${MYSQL_ROOT_PASSWORD:-Root_Pass_2024!}
REDIS_CONTAINER="fire-platform-redis"

mkdir -p "$BACKUP_DIR"

# ── 函数定义 ──

log_info() { echo -e "${BLUE}[BACKUP] $1${NC}"; }
log_ok()   { echo -e "${GREEN}[BACKUP] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[BACKUP] $1${NC}"; }
log_err()  { echo -e "${RED}[BACKUP] $1${NC}"; }

backup_mysql() {
    log_info "开始备份 MySQL 数据库: $DB_NAME"
    local backup_file="$BACKUP_DIR/db_${DB_NAME}_${TIMESTAMP}.sql"
    local gz_file="${backup_file}.gz"

    if docker ps -q -f "name=$DB_CONTAINER" | grep -q .; then
        docker exec "$DB_CONTAINER" mysqldump \
            -u "$DB_USER" \
            -p"$DB_PASSWORD" \
            --single-transaction \
            --routines \
            --triggers \
            --events \
            --hex-blob \
            --skip-lock-tables \
            "$DB_NAME" > "$backup_file"

        gzip -f "$backup_file"
        local size=$(du -h "$gz_file" | cut -f1)
        log_ok "数据库备份完成: $gz_file ($size)"
    else
        log_err "MySQL 容器未运行，跳过数据库备份"
        return 1
    fi
}

backup_redis() {
    log_info "开始备份 Redis 数据"
    local backup_file="$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

    if docker ps -q -f "name=$REDIS_CONTAINER" | grep -q .; then
        docker exec "$REDIS_CONTAINER" redis-cli BGSAVE
        sleep 2
        docker cp "$REDIS_CONTAINER:/data/dump.rdb" "$backup_file"
        local size=$(du -h "$backup_file" | cut -f1)
        log_ok "Redis 备份完成: $backup_file ($size)"
    else
        log_err "Redis 容器未运行，跳过 Redis 备份"
        return 1
    fi
}

backup_uploads() {
    log_info "开始备份上传文件"
    local backup_file="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

    if [[ -d "backend/uploads" ]] && [[ "$(ls -A backend/uploads 2>/dev/null)" ]]; then
        tar -czf "$backup_file" -C backend uploads
        local size=$(du -h "$backup_file" | cut -f1)
        log_ok "上传文件备份完成: $backup_file ($size)"
    else
        log_warn "上传目录为空或不存在，跳过"
    fi
}

backup_logs() {
    log_info "开始归档日志"
    local backup_file="$BACKUP_DIR/logs_${TIMESTAMP}.tar.gz"

    if [[ -d "backend/logs" ]] && [[ "$(ls -A backend/logs 2>/dev/null)" ]]; then
        tar -czf "$backup_file" -C backend logs
        local size=$(du -h "$backup_file" | cut -f1)
        log_ok "日志归档完成: $backup_file ($size)"
    else
        log_warn "日志目录为空或不存在，跳过"
    fi
}

cleanup_old_backups() {
    log_info "清理 $RETENTION_DAYS 天前的过期备份..."
    local count_before=$(find "$BACKUP_DIR" -type f | wc -l)
    find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete
    local count_after=$(find "$BACKUP_DIR" -type f | wc -l)
    local deleted=$((count_before - count_after))
    log_ok "已清理 $deleted 个过期备份文件"
}

generate_report() {
    local report_file="$BACKUP_DIR/backup_report_${TIMESTAMP}.txt"
    {
        echo "=========================================="
        echo "  智慧消防平台备份报告"
        echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=========================================="
        echo ""
        echo "备份目录: $BACKUP_DIR"
        echo "保留策略: $RETENTION_DAYS 天"
        echo ""
        echo "本次备份文件:"
        ls -lh "$BACKUP_DIR"/*_${TIMESTAMP}* 2>/dev/null || echo "  无"
        echo ""
        echo "备份目录总大小:"
        du -sh "$BACKUP_DIR"
        echo ""
        echo "备份目录文件列表:"
        ls -lt "$BACKUP_DIR" | head -20
    } > "$report_file"
    log_ok "备份报告已生成: $report_file"
}

# ── 主逻辑 ──

MODE=${1:-full}

log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "  智慧消防平台数据备份"
log_info "  模式: $MODE | 时间: $TIMESTAMP"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

case "$MODE" in
    full)
        backup_mysql
        backup_redis
        backup_uploads
        backup_logs
        cleanup_old_backups
        generate_report
        ;;
    db|mysql)
        backup_mysql
        ;;
    redis)
        backup_redis
        ;;
    uploads)
        backup_uploads
        ;;
    logs)
        backup_logs
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        echo "用法: $0 [full|db|redis|uploads|logs|cleanup]"
        exit 1
        ;;
esac

log_ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_ok "  备份操作完成！"
log_ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
