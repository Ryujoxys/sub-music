#!/bin/bash

# 🎵 Sub Music 自动化部署脚本
# 适用于 macOS 系统

set -e  # 遇到错误立即退出

echo "🎵 Sub Music 自动化部署开始..."
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    log_error "此脚本仅支持 macOS 系统"
    exit 1
fi

# 检查项目根目录
if [[ ! -f "backend/package.json" ]] || [[ ! -f "frontend/package.json" ]]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "检测到项目文件，开始部署..."

# 1. 检查并安装 Homebrew
log_info "检查 Homebrew..."
if ! command -v brew &> /dev/null; then
    log_warning "Homebrew 未安装，正在安装..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # 添加 Homebrew 到 PATH
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
    
    log_success "Homebrew 安装完成"
else
    log_success "Homebrew 已安装"
fi

# 2. 检查并安装 Node.js
log_info "检查 Node.js..."
if ! command -v node &> /dev/null; then
    log_warning "Node.js 未安装，正在安装..."
    brew install node
    log_success "Node.js 安装完成"
else
    NODE_VERSION=$(node --version)
    log_success "Node.js 已安装: $NODE_VERSION"
fi

# 3. 检查并安装 FFmpeg
log_info "检查 FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    log_warning "FFmpeg 未安装，正在安装..."
    brew install ffmpeg
    log_success "FFmpeg 安装完成"
else
    log_success "FFmpeg 已安装"
fi

# 4. 创建必要目录
log_info "创建项目目录..."
mkdir -p data temp output
log_success "目录创建完成"

# 5. 安装后端依赖
log_info "安装后端依赖..."
cd backend
npm install
cd ..
log_success "后端依赖安装完成"

# 6. 安装前端依赖
log_info "安装前端依赖..."
cd frontend
npm install
cd ..
log_success "前端依赖安装完成"

# 7. 复制配置文件模板
log_info "设置配置文件..."
if [[ ! -f "configs/config.yaml" ]]; then
    if [[ -f "deploy/config.yaml.template" ]]; then
        cp deploy/config.yaml.template configs/config.yaml
        log_success "配置文件模板已复制"
    else
        log_warning "配置文件模板不存在，使用默认配置"
    fi
else
    log_success "配置文件已存在"
fi

# 8. 设置脚本权限
log_info "设置脚本权限..."
chmod +x deploy/*.sh
log_success "脚本权限设置完成"

# 9. 验证安装
log_info "验证安装..."
echo "Node.js 版本: $(node --version)"
echo "npm 版本: $(npm --version)"
echo "FFmpeg 版本: $(ffmpeg -version 2>&1 | head -n 1)"

echo ""
echo "🎉 部署完成！"
echo "=================================="
echo ""
echo "📝 下一步操作："
echo "1. 编辑配置文件: nano configs/config.yaml"
echo "2. 设置 Dify API 密钥和科大讯飞 TTS 配置"
echo "3. 启动服务: ./deploy/start.sh"
echo "4. 访问应用: http://localhost:3000"
echo ""
echo "🔧 管理命令："
echo "- 启动服务: ./deploy/start.sh"
echo "- 停止服务: ./deploy/stop.sh"
echo "- 重启服务: ./deploy/restart.sh"
echo "- 检查环境: ./deploy/check-env.sh"
echo ""
echo "📖 详细说明请查看: deploy/DEPLOYMENT.md"
