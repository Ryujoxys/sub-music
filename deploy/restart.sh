#!/bin/bash

# 🎵 Sub Music 重启脚本

echo "🔄 重启 Sub Music 服务..."
echo "========================"

# 停止服务
./deploy/stop.sh

echo ""
echo "⏳ 等待服务完全停止..."
sleep 2

# 启动服务
./deploy/start.sh
