#!/bin/bash

# 🎵 Sub Music 项目打包脚本
# 用于创建可部署的项目包

set -e

echo "📦 Sub Music 项目打包"
echo "===================="

# 创建打包目录
PACKAGE_DIR="sub-music-package"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PACKAGE_NAME="sub-music-${TIMESTAMP}"

echo "🗂️ 创建打包目录: $PACKAGE_NAME"
rm -rf $PACKAGE_NAME
mkdir -p $PACKAGE_NAME

# 复制项目文件
echo "📁 复制项目文件..."

# 复制后端文件（排除node_modules）
echo "  - 后端文件"
rsync -av --exclude='node_modules' --exclude='*.log' --exclude='.DS_Store' backend/ $PACKAGE_NAME/backend/

# 复制前端文件（排除node_modules和dist）
echo "  - 前端文件"
rsync -av --exclude='node_modules' --exclude='dist' --exclude='*.log' --exclude='.DS_Store' frontend/ $PACKAGE_NAME/frontend/

# 复制音频素材
echo "  - 音频素材"
cp -r assets $PACKAGE_NAME/

# 复制配置文件
echo "  - 配置文件"
mkdir -p $PACKAGE_NAME/configs
cp deploy/config.yaml.template $PACKAGE_NAME/configs/

# 复制部署脚本
echo "  - 部署脚本"
cp -r deploy $PACKAGE_NAME/

# 创建必要目录
echo "📂 创建必要目录..."
mkdir -p $PACKAGE_NAME/{data,temp,output,logs,.pids}

# 创建README文件
echo "📝 创建README文件..."
cat > $PACKAGE_NAME/README.md << 'EOF'
# 🎵 Sub Music 项目

## 快速开始

1. **自动化部署**
   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

2. **配置API密钥**
   ```bash
   nano configs/config.yaml
   ```

3. **启动服务**
   ```bash
   ./deploy/start.sh
   ```

4. **访问应用**
   - 前端: http://localhost:3000
   - 后端: http://localhost:8080

## 详细说明

请查看 `deploy/DEPLOYMENT.md` 获取完整的部署指南。

## 管理命令

- 启动服务: `./deploy/start.sh`
- 停止服务: `./deploy/stop.sh`
- 重启服务: `./deploy/restart.sh`
- 检查环境: `./deploy/check-env.sh`
- 查看状态: `./deploy/status.sh`
EOF

# 设置脚本权限
echo "🔐 设置脚本权限..."
chmod +x $PACKAGE_NAME/deploy/*.sh

# 创建压缩包（保持权限）
echo "🗜️ 创建压缩包..."
tar -czpf "${PACKAGE_NAME}.tar.gz" $PACKAGE_NAME

# 显示结果
echo ""
echo "✅ 打包完成！"
echo "===================="
echo ""
echo "📦 打包文件:"
echo "  - 目录: $PACKAGE_NAME/"
echo "  - 压缩包: ${PACKAGE_NAME}.tar.gz"
echo ""
echo "📊 包大小:"
du -sh $PACKAGE_NAME
du -sh "${PACKAGE_NAME}.tar.gz"
echo ""
echo "🚀 部署说明:"
echo "1. 将 ${PACKAGE_NAME}.tar.gz 复制到目标电脑"
echo "2. 解压: tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "3. 进入目录: cd $PACKAGE_NAME"
echo "4. 运行部署: ./deploy/deploy.sh"
echo ""
echo "📖 详细说明请查看包内的 deploy/DEPLOYMENT.md"
