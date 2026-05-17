# ============================================================================
# 新致远智慧消防平台 - Makefile
# 用途: 提供简化的命令入口，降低运维学习成本
# 用法: make <target>
# ============================================================================

.PHONY: help build start stop restart status logs migrate backup clean health lint test

# 默认显示帮助
help:
	@echo "新致远智慧消防平台 - 可用命令"
	@echo ""
	@echo "  make build        构建 Docker 镜像"
	@echo "  make start        启动所有服务"
	@echo "  make start-build  重新构建并启动"
	@echo "  make stop         停止所有服务"
	@echo "  make restart      重启服务"
	@echo "  make status       查看服务状态"
	@echo "  make logs         查看日志"
	@echo "  make logs-backend 查看后端日志"
	@echo "  make migrate      执行数据库迁移"
	@echo "  make backup       全量备份"
	@echo "  make clean        清理所有资源"
	@echo "  make health       健康检查"
	@echo ""

build:
	@./scripts/build.sh prod

start:
	@./scripts/run.sh start

start-build:
	@./scripts/run.sh start --build

stop:
	@./scripts/run.sh stop

restart:
	@./scripts/run.sh restart

status:
	@./scripts/run.sh status

logs:
	@./scripts/run.sh logs -f

logs-backend:
	@./scripts/run.sh logs -s backend -f

migrate:
	@./scripts/run.sh migrate

backup:
	@./scripts/backup.sh full

clean:
	@./scripts/run.sh clean

health:
	@./scripts/health-check.sh

test:
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  后端测试"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd backend && npm test
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "  前端测试"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@cd app && npm test
