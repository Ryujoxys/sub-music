#!/bin/bash

# 🔧 Sub Music 权限修复脚本
# 如果脚本无法执行，请先运行: bash deploy/fix-permissions.sh

echo "🔧 修复 Sub Music 脚本权限..."
echo "=============================="

# 给所有脚本添加执行权限
chmod +x deploy/*.sh

echo "✅ 权限修复完成！"
echo ""
echo "现在可以运行以下命令："
echo "  ./deploy/deploy.sh    # 自动部署"
echo "  ./deploy/start.sh     # 启动服务"
echo "  ./deploy/stop.sh      # 停止服务"
echo "  ./deploy/check-env.sh # 检查环境"
