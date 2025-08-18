#!/bin/bash

# 🎵 Sub Music 环境检查脚本

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

check_fail() {
    echo -e "${RED}❌ $1${NC}"
}

check_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🔍 Sub Music 环境检查"
echo "===================="
echo ""

# 检查操作系统
echo "📱 操作系统检查:"
if [[ "$OSTYPE" == "darwin"* ]]; then
    check_success "macOS 系统"
    echo "   版本: $(sw_vers -productVersion)"
else
    check_fail "不支持的操作系统: $OSTYPE"
fi
echo ""

# 检查Homebrew
echo "🍺 Homebrew 检查:"
if command -v brew &> /dev/null; then
    check_success "Homebrew 已安装"
    echo "   版本: $(brew --version | head -n 1)"
else
    check_fail "Homebrew 未安装"
    echo "   安装命令: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
fi
echo ""

# 检查Node.js
echo "🟢 Node.js 检查:"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_success "Node.js 已安装: $NODE_VERSION"
    
    # 检查版本是否符合要求
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 16 ]; then
        check_success "Node.js 版本符合要求 (>=16)"
    else
        check_warning "Node.js 版本过低，建议升级到16+"
    fi
else
    check_fail "Node.js 未安装"
    echo "   安装命令: brew install node"
fi
echo ""

# 检查npm
echo "📦 npm 检查:"
if command -v npm &> /dev/null; then
    check_success "npm 已安装: $(npm --version)"
else
    check_fail "npm 未安装"
fi
echo ""

# 检查FFmpeg
echo "🎬 FFmpeg 检查:"
if command -v ffmpeg &> /dev/null; then
    check_success "FFmpeg 已安装"
    echo "   版本: $(ffmpeg -version 2>&1 | head -n 1)"
else
    check_fail "FFmpeg 未安装"
    echo "   安装命令: brew install ffmpeg"
fi
echo ""

# 检查项目文件
echo "📁 项目文件检查:"
if [[ -f "backend/package.json" ]]; then
    check_success "后端项目文件存在"
else
    check_fail "后端项目文件缺失"
fi

if [[ -f "frontend/package.json" ]]; then
    check_success "前端项目文件存在"
else
    check_fail "前端项目文件缺失"
fi

if [[ -d "assets" ]]; then
    check_success "音频素材目录存在"
    ASSET_COUNT=$(find assets -name "*.mp3" | wc -l)
    echo "   音频文件数量: $ASSET_COUNT"
else
    check_fail "音频素材目录缺失"
fi
echo ""

# 检查配置文件
echo "⚙️ 配置文件检查:"
if [[ -f "configs/config.yaml" ]]; then
    check_success "配置文件存在"
    
    # 检查关键配置
    if grep -q "your-dify-api-key-here" configs/config.yaml; then
        check_warning "Dify API密钥未配置"
    else
        check_success "Dify API密钥已配置"
    fi
    
    if grep -q "your-xfyun-app-id-here" configs/config.yaml; then
        check_warning "科大讯飞配置未设置"
    else
        check_success "科大讯飞配置已设置"
    fi
else
    check_fail "配置文件不存在"
    echo "   创建命令: cp deploy/config.yaml.template configs/config.yaml"
fi
echo ""

# 检查目录结构
echo "📂 目录结构检查:"
for dir in "data" "temp" "output" "logs"; do
    if [[ -d "$dir" ]]; then
        check_success "$dir 目录存在"
    else
        check_warning "$dir 目录不存在"
        echo "   创建命令: mkdir -p $dir"
    fi
done
echo ""

# 检查端口占用
echo "🔌 端口检查:"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_warning "端口 8080 被占用"
    echo "   占用进程: $(lsof -ti:8080)"
else
    check_success "端口 8080 可用"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    check_warning "端口 3000 被占用"
    echo "   占用进程: $(lsof -ti:3000)"
else
    check_success "端口 3000 可用"
fi
echo ""

# 检查依赖安装
echo "📚 依赖检查:"
if [[ -d "backend/node_modules" ]]; then
    check_success "后端依赖已安装"
else
    check_warning "后端依赖未安装"
    echo "   安装命令: cd backend && npm install"
fi

if [[ -d "frontend/node_modules" ]]; then
    check_success "前端依赖已安装"
else
    check_warning "前端依赖未安装"
    echo "   安装命令: cd frontend && npm install"
fi
echo ""

# 检查服务状态
echo "🚀 服务状态检查:"
if [[ -f ".pids/backend.pid" ]]; then
    BACKEND_PID=$(cat .pids/backend.pid)
    if ps -p $BACKEND_PID > /dev/null; then
        check_success "后端服务运行中 (PID: $BACKEND_PID)"
    else
        check_warning "后端服务PID文件存在但进程未运行"
    fi
else
    check_info "后端服务未启动"
fi

if [[ -f ".pids/frontend.pid" ]]; then
    FRONTEND_PID=$(cat .pids/frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null; then
        check_success "前端服务运行中 (PID: $FRONTEND_PID)"
    else
        check_warning "前端服务PID文件存在但进程未运行"
    fi
else
    check_info "前端服务未启动"
fi

echo ""
echo "🎯 环境检查完成！"
echo ""
echo "💡 建议操作："
echo "1. 如有红色❌项目，请先解决这些问题"
echo "2. 如有黄色⚠️项目，建议处理以获得最佳体验"
echo "3. 配置API密钥: nano configs/config.yaml"
echo "4. 启动服务: ./deploy/start.sh"
