#!/bin/bash

echo "🎵 启动Sub Music服务..."

# 检查依赖
echo "📋 检查系统依赖..."

# 检查Node.js (后端也需要)
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16+"
    echo "   安装方法: https://nodejs.org/"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

# 检查FFmpeg (可选)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg未安装，音频处理功能将使用模拟模式"
    echo "   安装方法: brew install ffmpeg (macOS) 或 apt install ffmpeg (Ubuntu)"
fi

echo "✅ 系统依赖检查完成"

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
    echo "   安装Node.js后端依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
    echo "✅ 后端依赖安装完成"
else
    echo "✅ 后端依赖已存在"
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd ../frontend

# 检查是否需要安装Material-UI
if [ ! -d "node_modules/@mui" ]; then
    echo "   检测到需要安装Material-UI组件库..."
    echo "   正在安装前端依赖和UI组件库..."

    # 安装基础依赖
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端基础依赖安装失败"
        exit 1
    fi

    # 安装Material-UI
    echo "   安装Material-UI组件库..."
    npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/lab
    if [ $? -ne 0 ]; then
        echo "❌ Material-UI安装失败"
        exit 1
    fi

    echo "✅ 前端依赖和UI组件库安装完成"
elif [ ! -d "node_modules" ]; then
    echo "   安装前端依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
    echo "✅ 前端依赖安装完成"
else
    echo "✅ 前端依赖已存在"
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
echo "🎉 Sub Music服务启动成功！"
echo ""
echo "📱 前端界面: http://localhost:3000 (或 http://localhost:3001)"
echo "🔧 后端API: http://localhost:8080"
echo "📚 项目文档: README.md"
echo ""
echo "🎨 界面特性:"
echo "   ✅ Material Design现代化界面"
echo "   ✅ 音频预览功能"
echo "   ✅ 实时任务进度"
echo "   ✅ 响应式设计"
echo ""
echo "🛑 按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# 保持脚本运行
wait
