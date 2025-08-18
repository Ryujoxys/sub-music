# Sub Music - 音频处理系统

基于AI的音频生成和处理系统，将文本转换为带有双耳节拍和背景音乐的音频文件。

## 功能特性

- 🤖 AI文本处理（Dify工作流集成）
- 🗣️ 文本转语音（科大讯飞TTS）
- 🎵 音频处理（FFmpeg）
- 🧠 双耳节拍添加
- 🎶 背景音乐混合
- 📱 Web界面操作

## 项目结构

```
sub-music/
├── frontend/          # React前端
├── backend/           # Go后端
├── assets/            # 音频资源
├── temp/              # 临时文件
├── output/            # 输出文件
├── configs/           # 配置文件
├── scripts/           # 启动脚本
└── data/              # 数据库文件
```

## 快速开始

### 环境要求
- Node.js 16+
- Go 1.19+
- FFmpeg

### 安装运行
```bash
# 安装依赖
cd backend && go mod tidy
cd ../frontend && npm install

# 启动服务
./scripts/start.sh  # Linux/Mac
# 或
./scripts/start.bat # Windows
```

### 访问地址
- 前端: http://localhost:3000
- 后端API: http://localhost:8080

## 配置

复制 `configs/config.example.yaml` 为 `configs/config.yaml` 并填入你的API密钥。

## 开发状态

🚧 项目正在开发中...

## 许可证

MIT License
