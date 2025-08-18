# 🎵 Sub Music - 智能潜意识音频生成平台

基于AI的专业音频生成系统，将用户输入转换为高质量的潜意识音频，集成双耳节拍、背景音乐和环境音效。

## ✨ 核心功能

### � 智能内容生成
- **Dify工作流集成** - AI智能扩写用户输入
- **多主题支持** - 专注、放松、学习、冥想等场景
- **内容优化** - 自动生成适合潜意识吸收的内容

### 🎙️ 高质量语音合成
- **科大讯飞TTS** - 专业级语音合成
- **多种音色** - 支持不同语音人选择
- **倍速处理** - 1x-10x可调节语音速度
- **智能截取** - 自动适配目标时长

### 🎵 专业音频处理
- **真正的双耳节拍** - Alpha/Beta/Theta/Delta脑波
- **34种BGM音频** - 丰富的背景音乐选择
- **5种白噪音** - 专业环境音效
- **4轨道混音** - 独立音量控制

### 🎛️ 用户友好界面
- **实时预览** - 每个音频组件都可预览
- **配置管理** - 保存和切换音量配置
- **任务管理** - 清空列表和直接下载
- **音频控制** - 播放/停止音频预览

## 📁 项目结构

```
sub-music/
├── frontend/          # React + TypeScript前端
│   ├── src/
│   │   ├── App.tsx    # 主应用组件
│   │   └── main.tsx   # 应用入口
│   └── package.json   # 前端依赖
├── backend/           # Node.js + Express后端
│   ├── services/      # 业务逻辑服务
│   │   ├── AudioService.js    # 音频处理服务
│   │   ├── TTSService.js      # 语音合成服务
│   │   └── TaskService.js     # 任务管理服务
│   ├── routes/        # API路由
│   ├── database/      # 数据库配置
│   ├── config/        # 配置管理
│   └── server.js      # 服务器入口
├── assets/            # 音频素材库
│   ├── bgm/          # 34种背景音乐
│   └── whitenoise/   # 5种白噪音
├── configs/           # 配置文件
│   └── config.yaml   # 主配置文件
├── deploy/            # 部署脚本
├── temp/              # 临时文件目录
├── output/            # 最终音频输出
└── data/              # SQLite数据库
```

## 🚀 快速开始

### 📋 环境要求
- **Node.js 16+** - JavaScript运行环境
- **FFmpeg** - 音频处理工具
- **macOS/Linux** - 推荐操作系统

### ⚡ 一键部署（推荐）
```bash
# 1. 解压项目包
tar -xzf sub-music-package.tar.gz
cd sub-music-package

# 2. 修复脚本权限（重要！）
chmod +x deploy/*.sh

# 3. 自动部署（安装所有依赖）
./deploy/deploy.sh

# 4. 配置API密钥
nano configs/config.yaml

# 5. 启动服务
./deploy/start.sh
```

### 🛠️ 手动安装
```bash
# 1. 安装Node.js和FFmpeg
brew install node ffmpeg  # macOS
# 或 apt-get install nodejs npm ffmpeg  # Ubuntu

# 2. 安装项目依赖
cd backend && npm install
cd ../frontend && npm install

# 3. 启动后端服务
cd backend && node server.js &

# 4. 启动前端服务
cd frontend && npm run dev
```

### 🌐 访问地址
- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:8080
- **API文档**: http://localhost:8080/api

## ⚙️ 配置说明

### 必需配置
编辑 `configs/config.yaml` 文件，设置以下API密钥：

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
  voice_name: "x4_yezi"
```

### 音量配置
```yaml
audio:
  volumes:
    voice: 0.05      # 语音音量 5%
    binaural: 0.1    # 双耳节拍音量 10%
    whitenoise: 0.7  # 白噪音音量 70%
    bgm: 0.9         # 背景音乐音量 90%
```

## 🔧 管理命令

```bash
# 启动服务
./deploy/start.sh

# 停止服务
./deploy/stop.sh

# 重启服务
./deploy/restart.sh

# 检查环境
./deploy/check-env.sh

# 查看状态
./deploy/status.sh
```

## 🎯 使用流程

1. **输入内容** - 在前端界面输入想要转换的文本
2. **选择参数** - 设置时长、双耳节拍类型、背景音乐等
3. **调节音量** - 使用4轨道音量控制器调节各音频音量
4. **生成音频** - 点击生成，系统自动处理所有步骤
5. **预览下载** - 预览各个音频组件，下载最终混合音频

## 🎵 音频类型说明

### 双耳节拍类型
- **Alpha (10Hz)** - 放松专注，适合学习工作
- **Beta (20Hz)** - 提高警觉性，增强注意力
- **Theta (6Hz)** - 深度放松，适合冥想
- **Delta (3Hz)** - 深度睡眠，促进休息

### 背景音乐分类
- **自然音效** - 雨声、海浪、森林等
- **器乐音乐** - 钢琴、吉他、弦乐等
- **环境音乐** - 咖啡厅、图书馆等

## 🚀 技术架构

```
用户输入 → Dify智能扩写 → TTS语音转换 → 倍速处理 → 双耳节拍生成 → 音频混合 → 高质量MP3输出
```

### 核心技术栈
- **前端**: React 18 + TypeScript + Ant Design
- **后端**: Node.js + Express + Socket.IO
- **数据库**: SQLite + Sequelize ORM
- **音频处理**: FFmpeg + fluent-ffmpeg
- **AI集成**: Dify工作流 + 科大讯飞TTS

## 📊 项目状态

✅ **已完成功能**
- 智能内容生成和扩写
- 高质量TTS语音合成
- 真正的双耳节拍生成
- 多轨道音频混合
- 实时音频预览
- 配置持久化管理
- 任务列表管理
- 完整的部署方案

� **持续优化**
- 更多音频素材
- 更多语音人选择
- 批量处理功能
- 音频效果增强

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目！

---

**Sub Music** - 让AI为你创造专属的潜意识音频体验 🎵✨
