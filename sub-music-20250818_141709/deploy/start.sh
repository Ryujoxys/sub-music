#!/bin/bash

# 🎵 Sub Music 启动脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "🎵 启动 Sub Music 服务..."
echo "=========================="

# 检查项目根目录
if [[ ! -f "backend/package.json" ]] || [[ ! -f "frontend/package.json" ]]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查配置文件
if [[ ! -f "configs/config.yaml" ]]; then
    log_warning "配置文件不存在，请先运行部署脚本或手动创建配置文件"
    exit 1
fi

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        log_warning "端口 $port 已被占用"
        echo "是否要杀死占用进程？(y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            lsof -ti:$port | xargs kill -9
            log_success "已杀死端口 $port 的占用进程"
        else
            echo "❌ 无法启动服务，端口被占用"
            exit 1
        fi
    fi
}

# 检查端口
log_info "检查端口占用..."
check_port 8080
check_port 3000

# 创建PID文件目录
mkdir -p .pids

# 启动后端服务
log_info "启动后端服务..."
cd backend
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../.pids/backend.pid
cd ..
log_success "后端服务已启动 (PID: $BACKEND_PID)"

# 等待后端服务启动
log_info "等待后端服务启动..."
sleep 3

# 检查后端服务是否正常启动
if ! curl -s http://localhost:8080 > /dev/null; then
    log_warning "后端服务可能未正常启动，请检查日志: logs/backend.log"
fi

# 启动前端服务
log_info "启动前端服务..."
cd frontend
nohup npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.pids/frontend.pid
cd ..
log_success "前端服务已启动 (PID: $FRONTEND_PID)"

# 创建日志目录
mkdir -p logs

echo ""
echo "🎉 Sub Music 服务启动完成！"
echo "=========================="
echo ""
echo "📱 访问地址："
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:8080"
echo ""
echo "📋 服务信息："
echo "  后端 PID: $BACKEND_PID"
echo "  前端 PID: $FRONTEND_PID"
echo ""
echo "📝 日志文件："
echo "  后端日志: logs/backend.log"
echo "  前端日志: logs/frontend.log"
echo ""
echo "🔧 管理命令："
echo "  停止服务: ./deploy/stop.sh"
echo "  重启服务: ./deploy/restart.sh"
echo "  查看状态: ./deploy/status.sh"
echo ""
echo "💡 提示: 首次启动可能需要等待1-2分钟"
