#!/bin/bash

# 🎨 Material-UI 安装脚本
echo "🎨 安装 Material-UI 组件库..."

# 安装核心依赖
echo "📦 安装 MUI 核心组件..."
npm install @mui/material @emotion/react @emotion/styled

# 安装图标库
echo "🎯 安装 MUI 图标库..."
npm install @mui/icons-material

# 安装实验性组件
echo "🧪 安装 MUI 实验性组件..."
npm install @mui/lab

# 安装日期选择器（如果需要）
echo "📅 安装日期选择器..."
npm install @mui/x-date-pickers

# 卸载 Ant Design（可选）
echo "🗑️ 卸载 Ant Design..."
npm uninstall antd

echo "✅ Material-UI 安装完成！"
echo ""
echo "🚀 现在可以启动开发服务器："
echo "npm run dev"
echo ""
echo "📖 Material-UI 文档："
echo "https://mui.com/material-ui/getting-started/"
