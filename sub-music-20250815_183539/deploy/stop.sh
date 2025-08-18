#!/bin/bash

# 🎵 Sub Music 停止脚本

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🛑 停止 Sub Music 服务..."
echo "========================"

# 停止后端服务
if [[ -f ".pids/backend.pid" ]]; then
    BACKEND_PID=$(cat .pids/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        log_info "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
        log_success "后端服务已停止"
    else
        log_info "后端服务未运行"
    fi
    rm -f .pids/backend.pid
else
    log_info "未找到后端服务PID文件"
fi

# 停止前端服务
if [[ -f ".pids/frontend.pid" ]]; then
    FRONTEND_PID=$(cat .pids/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        log_info "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
        log_success "前端服务已停止"
    else
        log_info "前端服务未运行"
    fi
    rm -f .pids/frontend.pid
else
    log_info "未找到前端服务PID文件"
fi

# 强制杀死可能残留的进程
log_info "检查残留进程..."
if lsof -ti:8080 >/dev/null 2>&1; then
    log_info "强制停止端口8080的进程..."
    lsof -ti:8080 | xargs kill -9
fi

if lsof -ti:3000 >/dev/null 2>&1; then
    log_info "强制停止端口3000的进程..."
    lsof -ti:3000 | xargs kill -9
fi

echo ""
echo "✅ Sub Music 服务已完全停止"
echo ""
echo "🔧 重新启动: ./deploy/start.sh"
