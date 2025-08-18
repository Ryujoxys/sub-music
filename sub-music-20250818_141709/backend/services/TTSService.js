const crypto = require('crypto');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

class TTSService {
  constructor() {
    this.config = config;
    this.tempDir = config.storage.temp_dir;
  }

  // 转换文本为语音
  async convertText(text, taskId) {
    if (!this.config.xfyun.api_key || !this.config.xfyun.app_id) {
      // 模拟TTS转换
      return this.createMockAudioFile(text, taskId);
    }

    try {
      return await this.callXfYunTTS(text, taskId);
    } catch (error) {
      console.error('TTS conversion error:', error);
      return this.createMockAudioFile(text, taskId);
    }
  }

  // 调用科大讯飞TTS API
  async callXfYunTTS(text, taskId) {
    console.log('🔤 TTS接收文本长度:', text.length);
    console.log('📝 TTS接收文本预览:', text.substring(0, 200) + '...');
    console.log('🔤 TTS文本编码检查:', Buffer.from(text, 'utf8').toString('hex').substring(0, 100));

    return new Promise((resolve, reject) => {
      // 生成认证URL
      const authUrl = this.generateAuthUrl();
      const outputFile = path.join(this.tempDir, `voice_${taskId}.mp3`);
      
      // 创建WebSocket连接
      const ws = new WebSocket(authUrl);
      const audioChunks = [];

      ws.on('open', () => {
        console.log('TTS WebSocket connected');
        
        // 发送TTS请求
        // 确保文本是UTF-8编码
        const textBase64 = Buffer.from(text, 'utf8').toString('base64');
        console.log('📤 发送给科大讯飞的base64文本:', textBase64.substring(0, 100) + '...');

        const params = {
          common: {
            app_id: this.config.xfyun.app_id
          },
          business: {
            aue: "lame",  // 直接使用MP3格式
            sfl: 1,       // 开启流式返回MP3
            auf: "audio/L16;rate=16000",
            vcn: this.config.xfyun.voice_name || "x4_xiaoyan",
            speed: 50,
            volume: 50,
            pitch: 50,
            bgs: 0,
            tte: "UTF8"   // 明确指定文本编码格式
          },
          data: {
            status: 2,
            text: textBase64
          }
        };

        console.log('📤 TTS请求参数:', JSON.stringify(params, null, 2));
        ws.send(JSON.stringify(params));
      });

      ws.on('message', async (data) => {
        const response = JSON.parse(data);
        
        if (response.code !== 0) {
          reject(new Error(`TTS API error: ${response.message}`));
          return;
        }

        if (response.data && response.data.audio) {
          const audioData = Buffer.from(response.data.audio, 'base64');
          audioChunks.push(audioData);
        }

        if (response.data && response.data.status === 2) {
          // 音频传输完成
          const finalAudio = Buffer.concat(audioChunks);

          try {
            await this.ensureDir(path.dirname(outputFile));

            // 科大讯飞直接返回MP3格式，无需转换
            await fs.writeFile(outputFile, finalAudio);

            // 验证文件是否真的被创建
            const stats = await fs.stat(outputFile);
            console.log(`✅ TTS conversion completed: ${outputFile} (${stats.size} bytes)`);
            resolve(outputFile);
          } catch (error) {
            console.error(`❌ TTS file save error:`, error);
            reject(error);
          }
          
          ws.close();
        }
      });

      ws.on('error', (error) => {
        console.error('TTS WebSocket error:', error);
        reject(error);
      });

      ws.on('close', () => {
        console.log('TTS WebSocket closed');
      });
    });
  }

  // 生成认证URL
  generateAuthUrl() {
    const url = new URL(this.config.xfyun.host_url);
    const host = url.host;
    const path = url.pathname;
    
    // 生成时间戳
    const date = new Date().toUTCString();
    
    // 构建签名字符串
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    
    // 计算签名
    const signature = crypto
      .createHmac('sha256', this.config.xfyun.api_secret)
      .update(signatureOrigin)
      .digest('base64');
    
    // 构建authorization
    const authorizationOrigin = `api_key="${this.config.xfyun.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    // 构建最终URL
    const params = new URLSearchParams({
      authorization,
      date,
      host
    });
    
    return `${this.config.xfyun.host_url}?${params.toString()}`;
  }

  // 创建模拟音频文件
  async createMockAudioFile(text, taskId) {
    const outputFile = path.join(this.tempDir, `voice_${taskId}_mock.txt`);
    
    await this.ensureDir(path.dirname(outputFile));
    
    const mockContent = `Mock TTS Audio File
Text: ${text}
Generated at: ${new Date().toISOString()}
Task ID: ${taskId}

This is a placeholder file for TTS conversion.
In production, this would be an actual audio file.`;

    await fs.writeFile(outputFile, mockContent);
    console.log(`✅ Mock TTS file created: ${outputFile}`);
    
    return outputFile;
  }

  // 注：不再需要WAV转换方法，科大讯飞直接返回MP3格式

  // 确保目录存在
  async ensureDir(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = TTSService;
