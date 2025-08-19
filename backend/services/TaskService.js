const { v4: uuidv4 } = require('uuid');
const { Task, AudioFile } = require('../database/database');
const TextService = require('./TextService');
const TTSService = require('./TTSService');
const AudioService = require('./AudioService');

class TaskService {
  constructor(io) {
    this.io = io;
    this.textService = new TextService();
    this.ttsService = new TTSService();
    this.audioService = new AudioService();
  }

  async createTask(options) {
    const {
      userInput,
      subTheme = 'focus',
      duration = 30,
      binauralType = 'alpha',
      noiseTypes = ['rain'],
      voiceSpeed = 6,
      backgroundMusic = null,
      volumes = { voice: 0.05, binaural: 0.1, background: 0.7 },
      audioName = null
    } = options;

    // 检查是否有其他任务正在处理，如果有则清理temp文件
    await this.cleanupTempFilesIfNeeded();

    const task = await Task.create({
      id: uuidv4(),
      userInput,
      subTheme,
      status: 'pending',
      currentStep: 'outline',
      progress: 0,
      startTime: new Date() // 添加开始处理时间
    });

    // 异步处理任务
    this.processTaskAsync(task.id, {
      duration,
      binauralType,
      noiseTypes,
      voiceSpeed,
      backgroundMusic,
      volumes,
      audioName
    });

    return task;
  }

  async getTask(id) {
    const task = await Task.findByPk(id, {
      include: [{ model: AudioFile, as: 'audioFiles' }]
    });
    return task;
  }

  async listTasks() {
    const tasks = await Task.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return tasks;
  }

  async clearAllTasks() {
    // 删除所有音频文件记录
    await AudioFile.destroy({ where: {} });
    // 删除所有任务记录
    await Task.destroy({ where: {} });
    console.log('✅ 所有任务已清空');
  }

  async updateTask(id, updates) {
    await Task.update(updates, { where: { id } });
    
    // 发送WebSocket更新
    const task = await this.getTask(id);
    this.io.emit('taskUpdate', task);
  }

  async updateProgress(id, step, progress, message = '') {
    await this.updateTask(id, {
      currentStep: step,
      progress,
      errorMsg: message
    });

    // 发送进度更新
    this.io.emit('progress', {
      task_id: id,
      status: 'processing',
      current_step: step,
      progress,
      message
    });
  }

  // 发送详细步骤更新
  sendStepUpdate(taskId, step, status, content = '', file = '', error = '') {
    if (this.io) {
      const updateData = {
        task_id: taskId,
        step: step,
        status: status,
        content: content,
        file: file,
        error: error
      };

      console.log(`📡 发送步骤更新: ${step} -> ${status}`, {
        task_id: taskId,
        step: step,
        status: status,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 100) + '...' || '',
        file: file,
        error: error
      });

      this.io.emit('step_update', updateData);
    } else {
      console.log('❌ WebSocket IO 未初始化，无法发送步骤更新');
    }
  }

  async setTaskCompleted(id, outputFile) {
    await this.updateTask(id, {
      status: 'completed',
      progress: 100,
      outputFile
    });

    this.io.emit('completed', {
      task_id: id,
      status: 'completed',
      progress: 100,
      message: '任务完成！',
      output_file: outputFile
    });
  }

  async setTaskFailed(id, errorMsg) {
    await this.updateTask(id, {
      status: 'failed',
      errorMsg
    });

    this.io.emit('failed', {
      task_id: id,
      status: 'failed',
      message: errorMsg
    });
  }

  async addAudioFile(taskId, type, filePath, duration = 0) {
    return await AudioFile.create({
      taskId,
      type,
      filePath,
      duration
    });
  }

  // 异步处理任务
  async processTaskAsync(taskId, options = {}) {
    try {
      await this.updateTask(taskId, { status: 'processing' });

      const task = await this.getTask(taskId);
      const {
        duration = 30,
        binauralType = 'alpha',
        noiseTypes = ['rain'],
        voiceSpeed = 6,
        backgroundMusic = null,
        volumes = { voice: 0.05, binaural: 0.1, background: 0.7 },
        audioName = null
      } = options;

      // 步骤1: Dify工作流处理（大纲生成+内容扩写）
      await this.updateProgress(taskId, 'dify_processing', 20, 'Dify工作流处理中...');
      this.sendStepUpdate(taskId, 'outline', 'processing');

      console.log('🔄 开始Dify工作流处理...');
      const result = await this.textService.generateContent(task.userInput);
      console.log('📝 Dify工作流返回结果:', {
        outline: result.outline?.substring(0, 100) + '...',
        content: result.content?.substring(0, 100) + '...',
        outlineLength: result.outline?.length || 0,
        contentLength: result.content?.length || 0
      });

      // 保存大纲和完整内容到数据库
      await this.updateTask(taskId, {
        outline: result.outline,
        content: result.content
      });

      this.sendStepUpdate(taskId, 'outline', 'completed', result.outline);
      this.sendStepUpdate(taskId, 'expansion', 'completed', result.content);
      console.log('✅ Dify工作流处理完成');

      // 步骤2: TTS转换
      await this.updateProgress(taskId, 'tts', 60, '文本转语音中...');
      this.sendStepUpdate(taskId, 'tts', 'processing');

      console.log('🔄 开始TTS转换...');
      const voiceFile = await this.ttsService.convertText(result.content, taskId);
      await this.addAudioFile(taskId, 'voice', voiceFile);
      this.sendStepUpdate(taskId, 'tts', 'completed', '', voiceFile);
      console.log('✅ TTS转换完成:', voiceFile);

      // 步骤4: 生成双耳节拍
      this.sendStepUpdate(taskId, 'binaural', 'processing', '', '');
      const binauralFile = await this.audioService.generateBinaural(
        binauralType,
        duration
      );
      await this.addAudioFile(taskId, 'binaural', binauralFile);
      this.sendStepUpdate(taskId, 'binaural', 'completed', '', binauralFile);
      console.log('✅ 双耳节拍生成完成:', binauralFile);

      // 步骤5: 准备背景音轨
      this.sendStepUpdate(taskId, 'background', 'processing', '', '');
      // 背景音轨将在混合步骤中处理
      this.sendStepUpdate(taskId, 'background', 'completed', '', '准备完成');

      // 步骤6: 音频混合
      this.sendStepUpdate(taskId, 'mixing', 'processing', '', '');
      const finalAudioFile = await this.audioService.mixAudio({
        voiceFile: voiceFile,
        binauralFile: binauralFile,
        backgroundMusic: backgroundMusic,       // 用户上传的背景音乐
        noiseTypes: noiseTypes,                 // 自然音频类型（多选）
        voiceSpeed: voiceSpeed,                 // TTS倍速
        volumes: volumes,                       // 音量配置
        subTheme: task.sub_theme,
        taskId: taskId,
        duration: duration,
        audioName: audioName                    // 自定义音频名称
      });
      await this.addAudioFile(taskId, 'final', finalAudioFile);
      this.sendStepUpdate(taskId, 'mixing', 'completed', '', finalAudioFile);
      console.log('✅ 音频混合完成:', finalAudioFile);

      // 步骤7: 完成
      await this.updateProgress(taskId, 'export', 100, '任务完成');
      await this.setTaskCompleted(taskId, finalAudioFile);

    } catch (error) {
      console.error('❌ 任务处理失败:', error);
      console.error('❌ 错误堆栈:', error.stack);
      console.error('❌ 任务ID:', taskId);

      // 发送错误步骤更新
      const errorStep = this.getCurrentStepFromError(error);
      console.log(`❌ 错误发生在步骤: ${errorStep}`);
      this.sendStepUpdate(taskId, errorStep, 'failed', '', '', error.message);

      await this.setTaskFailed(taskId, error.message);
    }
  }

  // 根据错误确定当前步骤
  getCurrentStepFromError(error) {
    const message = error.message.toLowerCase();
    if (message.includes('dify') || message.includes('outline')) return 'outline';
    if (message.includes('expand') || message.includes('content')) return 'expansion';
    if (message.includes('tts') || message.includes('voice')) return 'tts';
    if (message.includes('binaural')) return 'binaural';
    if (message.includes('mix') || message.includes('audio')) return 'mixing';
    return 'mixing'; // 默认为最后一步
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 清理temp文件（如果需要）
  async cleanupTempFilesIfNeeded() {
    try {
      const { Task } = require('../database/database');
      const { Op } = require('sequelize');

      // 检查是否有正在处理的任务
      const processingTasks = await Task.findAll({
        where: {
          status: {
            [Op.in]: ['pending', 'processing']
          }
        }
      });

      // 如果有多个任务（包括当前要创建的），则清理temp文件
      if (processingTasks.length > 0) {
        console.log('🧹 检测到多个任务，开始清理temp文件...');
        await this.cleanupTempFiles();
      }
    } catch (error) {
      console.error('❌ 检查temp文件清理失败:', error);
    }
  }

  // 清理temp文件
  async cleanupTempFiles() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const config = require('../config/config');

      const tempDir = config.storage.temp_dir;

      // 读取temp目录中的所有文件
      const files = await fs.readdir(tempDir);

      let cleanedCount = 0;
      for (const file of files) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          // 删除超过1小时的文件，或者所有非当前任务的文件
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (stats.mtime < oneHourAgo) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          // 忽略单个文件删除失败
          console.log(`⚠️ 删除文件失败: ${file}`, error.message);
        }
      }

      if (cleanedCount > 0) {
        console.log(`✅ 已清理 ${cleanedCount} 个temp文件`);
      }
    } catch (error) {
      console.error('❌ 清理temp文件失败:', error);
    }
  }

  // 清空所有任务
  static async clearAllTasks() {
    try {
      const { Task } = require('../database/database');
      await Task.destroy({ where: {} });
      console.log('✅ 所有任务已清空');
      return true;
    } catch (error) {
      console.error('❌ 清空任务失败:', error);
      throw error;
    }
  }
}

module.exports = TaskService;
