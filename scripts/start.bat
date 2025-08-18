@echo off
chcp 65001 >nul

echo 🎵 启动Sub Music服务...

REM 检查依赖
echo 检查依赖...

REM 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js 16+
    pause
    exit /b 1
)

REM 检查FFmpeg (可选)
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  FFmpeg未安装，音频处理功能将使用模拟模式
)

REM 创建配置文件
if not exist "configs\config.yaml" (
    echo 📝 创建配置文件...
    copy "configs\config.example.yaml" "configs\config.yaml" >nul
    echo ✅ 已创建 configs\config.yaml，请根据需要修改配置
)

REM 安装后端依赖
echo 📦 安装后端依赖...
cd backend
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 后端依赖安装失败
        pause
        exit /b 1
    )
)

REM 安装前端依赖
echo 📦 安装前端依赖...
cd ..\frontend
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 前端依赖安装失败
        pause
        exit /b 1
    )
)

REM 返回根目录
cd ..

REM 启动后端服务
echo 🚀 启动后端服务...
cd backend
start "Sub Music Backend" node server.js

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端服务
echo 🚀 启动前端服务...
cd ..\frontend
start "Sub Music Frontend" npm run dev

echo.
echo 🎉 服务启动成功！
echo 📱 前端地址: http://localhost:3000
echo 🔧 后端API: http://localhost:8080
echo.
echo 按任意键停止服务...
pause >nul

REM 停止服务
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im go.exe >nul 2>&1
echo 🛑 服务已停止
