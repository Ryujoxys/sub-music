#!/bin/bash

# 🎵 Sub Music 状态检查脚本

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "📊 Sub Music 服务状态"
echo "===================="
echo ""

# 检查后端服务
echo "🔧 后端服务:"
if [[ -f ".pids/backend.pid" ]]; then
    BACKEND_PID=$(cat .pids/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        echo -e "${GREEN}✅ 运行中${NC} (PID: $BACKEND_PID)"
        echo "   端口: 8080"
        echo "   日志: logs/backend.log"
    else
        echo -e "${RED}❌ 未运行${NC} (PID文件存在但进程不存在)"
    fi
else
    echo -e "${RED}❌ 未启动${NC}"
fi
echo ""

# 检查前端服务
echo "🎨 前端服务:"
if [[ -f ".pids/frontend.pid" ]]; then
    FRONTEND_PID=$(cat .pids/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        echo -e "${GREEN}✅ 运行中${NC} (PID: $FRONTEND_PID)"
        echo "   端口: 3000"
        echo "   日志: logs/frontend.log"
    else
        echo -e "${RED}❌ 未运行${NC} (PID文件存在但进程不存在)"
    fi
else
    echo -e "${RED}❌ 未启动${NC}"
fi
echo ""

# 检查端口占用
echo "🔌 端口状态:"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 8080端口${NC} - 后端API"
else
    echo -e "${RED}❌ 8080端口${NC} - 未监听"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✅ 3000端口${NC} - 前端界面"
else
    echo -e "${RED}❌ 3000端口${NC} - 未监听"
fi
echo ""

# 检查API健康状态
echo "🏥 API健康检查:"
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端API${NC} - 响应正常"
else
    echo -e "${RED}❌ 后端API${NC} - 无响应"
fi
echo ""

# 显示访问地址
echo "🌐 访问地址:"
echo -e "${BLUE}前端界面:${NC} http://localhost:3000"
echo -e "${BLUE}后端API:${NC} http://localhost:8080"
echo ""

# 显示管理命令
echo "🔧 管理命令:"
echo "启动服务: ./deploy/start.sh"
echo "停止服务: ./deploy/stop.sh"
echo "重启服务: ./deploy/restart.sh"
echo "环境检查: ./deploy/check-env.sh"
