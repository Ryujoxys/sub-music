# 🎵 Sub Music 项目部署指南

## 📋 部署前准备

### 系统要求
- macOS 10.15+ 
- 至少 2GB 可用磁盘空间
- 网络连接（用于下载依赖）

### 端口要求
- 前端：3000 端口
- 后端：8080 端口

## 🚀 快速部署（推荐）

### 方法一：自动化部署脚本

1. **复制项目文件到新电脑**
   ```bash
   # 将整个项目文件夹复制到新电脑
   # 可以使用U盘、网络传输等方式
   ```

2. **运行自动化部署脚本**
   ```bash
   cd sub-music
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

3. **配置API密钥**
   ```bash
   # 编辑配置文件
   nano configs/config.yaml
   
   # 设置以下配置：
   # - Dify API密钥和工作流ID
   # - 科大讯飞TTS配置
   ```

4. **启动服务**
   ```bash
   ./deploy/start.sh
   ```

5. **访问应用**
   - 前端：http://localhost:3000
   - 后端API：http://localhost:8080

## 🛠️ 手动部署步骤

### 步骤1：安装Homebrew（如果未安装）
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 步骤2：安装Node.js和FFmpeg
```bash
# 安装Node.js (LTS版本)
brew install node

# 安装FFmpeg（音频处理必需）
brew install ffmpeg

# 验证安装
node --version
npm --version
ffmpeg -version
```

### 步骤3：安装项目依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 步骤4：配置项目
```bash
# 复制配置模板
cp configs/config.yaml.template configs/config.yaml

# 编辑配置文件
nano configs/config.yaml
```

### 步骤5：创建必要目录
```bash
mkdir -p data temp output
```

### 步骤6：启动服务
```bash
# 启动后端服务
cd backend
npm start &

# 启动前端服务
cd ../frontend
npm run dev
```

## ⚙️ 配置说明

### 必需配置项
在 `configs/config.yaml` 中设置：

```yaml
# Dify工作流配置
dify:
  api_key: "your-dify-api-key"
  base_url: "your-dify-base-url"
  workflow_id: "your-workflow-id"

# 科大讯飞TTS配置
xfyun:
  app_id: "your-app-id"
  api_key: "your-api-key"
  api_secret: "your-api-secret"
  host_url: "wss://tts-api.xfyun.cn/v2/tts"
  voice_name: "x4_yezi"
```

## 🔧 管理脚本

### 启动服务
```bash
./deploy/start.sh
```

### 停止服务
```bash
./deploy/stop.sh
```

### 检查环境
```bash
./deploy/check-env.sh
```

### 重启服务
```bash
./deploy/restart.sh
```

## 🐛 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 检查端口占用
   lsof -i :3000
   lsof -i :8080
   
   # 杀死占用进程
   kill -9 <PID>
   ```

2. **FFmpeg未找到**
   ```bash
   # 重新安装FFmpeg
   brew reinstall ffmpeg
   ```

3. **Node.js版本问题**
   ```bash
   # 检查Node.js版本（建议16+）
   node --version
   
   # 升级Node.js
   brew upgrade node
   ```

4. **权限问题**
   ```bash
   # 修复权限
   chmod -R 755 sub-music/
   ```

## 📁 项目结构
```
sub-music/
├── backend/          # 后端API服务
├── frontend/         # 前端React应用
├── assets/           # 音频素材文件
├── configs/          # 配置文件
├── deploy/           # 部署脚本
├── data/             # 数据库文件
├── temp/             # 临时文件
└── output/           # 输出文件
```

## 🎯 验证部署

1. **检查服务状态**
   ```bash
   curl http://localhost:8080/api/health
   ```

2. **测试前端访问**
   - 打开浏览器访问：http://localhost:3000

3. **测试音频预览**
   - 在前端界面测试BGM和白噪音预览功能

## 📞 技术支持

如果遇到问题，请检查：
1. 所有依赖是否正确安装
2. 配置文件是否正确设置
3. 端口是否被占用
4. 网络连接是否正常
