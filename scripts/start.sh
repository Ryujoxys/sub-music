#!/bin/bash

echo "🎵 启动Sub Music服务..."

# 检查依赖
echo "检查依赖..."

# 检查Node.js (后端也需要)
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16+"
    exit 1
fi



# 检查FFmpeg (可选)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg未安装，音频处理功能将使用模拟模式"
fi

# 创建配置文件
if [ ! -f "configs/config.yaml" ]; then
    echo "📝 创建配置文件..."
    cp configs/config.example.yaml configs/config.yaml
    echo "✅ 已创建 configs/config.yaml，请根据需要修改配置"
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
fi

# 返回根目录
cd ..

# 启动后端服务
echo "🚀 启动后端服务..."
cd backend
node server.js &
BACKEND_PID=$!
echo "后端服务PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 启动前端服务
echo "🚀 启动前端服务..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "前端服务PID: $FRONTEND_PID"

echo ""
echo "🎉 服务启动成功！"
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端API: http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
wait
