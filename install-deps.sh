#!/bin/bash

echo "🚀 开始安装项目依赖..."

# 检查是否安装了Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查是否安装了npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
cd backend
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 后端依赖安装成功"
    else
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
else
    echo "❌ 后端 package.json 文件不存在"
    exit 1
fi

# 安装前端依赖
echo ""
echo "📦 安装前端依赖..."
cd ../frontend
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 前端依赖安装成功"
    else
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
else
    echo "❌ 前端 package.json 文件不存在"
    exit 1
fi

# 回到根目录
cd ..

echo ""
echo "🎉 所有依赖安装完成！"
echo ""
echo "📋 下一步操作："
echo "1. 启动后端服务: cd backend && npm start"
echo "2. 启动前端服务: cd frontend && npm run dev"
echo "3. 或者使用启动脚本: ./scripts/start.sh"
echo ""
echo "🌐 访问地址: http://localhost:3000"
