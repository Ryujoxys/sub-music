const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 导入配置和服务
const config = require('./config/config');
const database = require('./database/database');
const taskRoutes = require('./routes/taskRoutes');
const textRoutes = require('./routes/textRoutes');
const ttsRoutes = require('./routes/ttsRoutes');
const audioRoutes = require('./routes/audioRoutes');
const TaskService = require('./services/TaskService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// 配置multer用于文件上传
const upload = multer({
  dest: path.join(__dirname, '../temp/uploads/'),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传音频文件'));
    }
  }
});

// 中间件
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/output', express.static(path.join(__dirname, '../output')));

// 初始化数据库
database.init();

// 初始化任务服务
const taskService = new TaskService(io);

// 路由
app.use('/api/tasks', taskRoutes(taskService));
app.use('/api/text', textRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/configs', require('./routes/configRoutes'));

// 文件下载路由
app.get('/api/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'temp', filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    console.log(`📁 下载文件: ${filename}`);
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// WebSocket连接处理
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = config.server.port || 8080;
const HOST = config.server.host || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Sub Music Server running on http://${HOST}:${PORT}`);
  console.log(`📱 Frontend: http://localhost:3000`);
  console.log(`🔧 API: http://${HOST}:${PORT}/api`);
});
