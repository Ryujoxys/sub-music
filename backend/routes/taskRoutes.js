const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置multer
const upload = multer({
  dest: path.join(__dirname, '../../temp/uploads/'),
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

module.exports = (taskService) => {
  // 创建任务 (支持文件上传)
  router.post('/', upload.single('background_music'), async (req, res) => {
    try {
      const {
        user_input,
        sub_theme,
        duration,
        binaural_type,
        noise_type,
        voice_speed,
        volume_voice,
        volume_binaural,
        volume_background,
        volume_environment,
        audio_name
      } = req.body;

      if (!user_input) {
        return res.status(400).json({ error: 'user_input is required' });
      }

      const taskOptions = {
        userInput: user_input,
        subTheme: sub_theme || 'focus',
        duration: parseInt(duration) || 30,
        binauralType: binaural_type || 'alpha',
        noiseType: noise_type || 'rain',
        voiceSpeed: parseFloat(voice_speed) || 6,
        backgroundMusic: req.file ? req.file.path : null,
        audioName: audio_name || null,
        volumes: {
          voice: parseFloat(volume_voice) || 0.05,
          binaural: parseFloat(volume_binaural) || 0.1,
          background: parseFloat(volume_background) || 0.7,
          environment: parseFloat(volume_environment) || 0.5
        }
      };

      const task = await taskService.createTask(taskOptions);
      res.status(201).json(task);
    } catch (error) {
      console.error('Create task error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 获取任务详情
  router.get('/:id', async (req, res) => {
    try {
      const task = await taskService.getTask(req.params.id);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(task);
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 获取任务列表
  router.get('/', async (req, res) => {
    try {
      const tasks = await taskService.listTasks();
      res.json(tasks);
    } catch (error) {
      console.error('List tasks error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 删除所有任务
  router.delete('/', async (req, res) => {
    try {
      await taskService.clearAllTasks();
      res.json({ message: 'All tasks cleared successfully' });
    } catch (error) {
      console.error('Clear tasks error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 下载文件
  router.get('/download/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      console.log(`📥 下载请求: ${filename}`);

      const audioService = new (require('../services/AudioService'))();

      // 首先尝试从输出目录查找
      let filePath = path.join(audioService.outputDir, filename);
      console.log(`📁 检查输出目录: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        // 如果输出目录没有，尝试临时目录
        filePath = path.join(audioService.tempDir, filename);
        console.log(`📁 检查临时目录: ${filePath}`);
      }

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        console.log(`❌ 文件不存在: ${filePath}`);
        return res.status(404).json({ error: 'File not found' });
      }

      console.log(`✅ 找到文件，开始下载: ${filePath}`);

      // 设置下载头
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'audio/mpeg');

      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('❌ 下载失败:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download failed' });
          }
        } else {
          console.log(`✅ 下载完成: ${filename}`);
        }
      });
    } catch (error) {
      console.error('❌ 下载错误:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // 预览音频文件
  router.get('/preview/:type/:filename', async (req, res) => {
    try {
      const { type, filename } = req.params;
      console.log(`🎵 音频预览请求: type=${type}, filename=${filename}`);

      const audioService = new (require('../services/AudioService'))();

      let filePath;

      switch (type) {
        case 'bgm':
          filePath = audioService.getNaturalAudioFile(filename);
          break;
        case 'whitenoise':
          filePath = audioService.getWhiteNoiseFile(filename);
          break;
        case 'voice':
          filePath = path.join(audioService.tempDir, filename);
          break;
        case 'binaural':
          filePath = path.join(audioService.tempDir, filename);
          break;
        case 'output':
          filePath = path.join(audioService.outputDir, filename);
          break;
        default:
          console.log(`❌ 无效的音频类型: ${type}`);
          return res.status(400).json({ error: 'Invalid audio type' });
      }

      console.log(`📁 查找音频文件: ${filePath}`);

      if (!filePath || !fs.existsSync(filePath)) {
        console.log(`❌ 音频文件不存在: ${filePath}`);
        return res.status(404).json({ error: 'Audio file not found' });
      }

      console.log(`✅ 找到音频文件: ${filePath}`);

      // 设置正确的Content-Type
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'audio/mpeg';
      if (ext === '.wav') contentType = 'audio/wav';
      if (ext === '.mp3') contentType = 'audio/mpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');

      // 流式传输音频文件
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': contentType,
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      console.error('Preview audio error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 清空任务列表
  router.delete('/clear', async (req, res) => {
    try {
      const taskService = require('../services/TaskService');
      await taskService.clearAllTasks();
      res.json({ message: 'All tasks cleared successfully' });
    } catch (error) {
      console.error('Clear tasks error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
