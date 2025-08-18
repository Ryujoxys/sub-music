const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config/config');

class AudioService {
  constructor() {
    this.tempDir = config.storage.temp_dir;
    this.outputDir = config.storage.output_dir;
    // 确保assetsDir是绝对路径
    this.assetsDir = path.isAbsolute(config.storage.assets_dir)
      ? config.storage.assets_dir
      : path.resolve(__dirname, '..', '..', 'assets'); // 从backend/services到项目根目录的assets

    console.log(`🔍 AudioService初始化 - assetsDir: ${this.assetsDir}`);
  }

  // 生成双耳节拍
  async generateBinaural(type, duration = 60) {
    const frequencies = {
      alpha: { left: 440, right: 450 },    // 10Hz差值 (α波)
      beta: { left: 440, right: 460 },     // 20Hz差值 (β波)
      theta: { left: 440, right: 446 },    // 6Hz差值 (θ波)
      delta: { left: 440, right: 443 }     // 3Hz差值 (δ波)
    };

    const freq = frequencies[type] || frequencies.alpha;
    const outputFile = path.join(this.tempDir, `binaural_${type}_${Date.now()}.mp3`);

    // 确保目录存在
    await this.ensureDir(path.dirname(outputFile));

    console.log(`🧠 生成真正的双耳节拍: ${type} (${freq.right - freq.left}Hz)`);

    try {
      // 尝试生成真正的双耳节拍
      return await this.generateRealBinauralBeats(freq.left, freq.right, duration, outputFile);
    } catch (error) {
      console.error('❌ 生成真正双耳节拍失败，使用静音替代:', error);
      // 如果失败，创建静音文件而不是雨声
      return this.createRealSilentMP3(duration, outputFile);
    }
  }

  // 生成真实的双耳节拍
  async generateRealBinauralBeats(leftFreq, rightFreq, duration, outputFile) {
    console.log(`🎵 生成双耳节拍: 左耳${leftFreq}Hz, 右耳${rightFreq}Hz, 时长${duration}秒`);

    return new Promise((resolve, reject) => {
      // 直接使用spawn调用ffmpeg，避免fluent-ffmpeg的格式检查问题
      const { spawn } = require('child_process');

      const args = [
        '-f', 'lavfi',
        '-i', `sine=frequency=${leftFreq}:duration=${duration}`,
        '-f', 'lavfi',
        '-i', `sine=frequency=${rightFreq}:duration=${duration}`,
        '-filter_complex', '[0:a][1:a]amerge=inputs=2,volume=0.3[out]',
        '-map', '[out]',
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-y', // 覆盖输出文件
        outputFile
      ];

      console.log(`🔧 FFmpeg命令: ffmpeg ${args.join(' ')}`);

      const ffmpegProcess = spawn('ffmpeg', args);

      let stderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ 双耳节拍生成完成: ${outputFile}`);
          resolve(outputFile);
        } else {
          console.error('❌ 双耳节拍生成失败:', stderr);
          // 如果生成失败，使用简化方法
          this.generateSimpleBinauralBeats(leftFreq, rightFreq, duration, outputFile)
            .then(resolve)
            .catch(() => {
              // 最后备选：创建静音文件
              this.createRealSilentMP3(duration, outputFile)
                .then(resolve)
                .catch(reject);
            });
        }
      });

      ffmpegProcess.on('error', (err) => {
        console.error('❌ FFmpeg进程启动失败:', err);
        // 使用简化方法
        this.generateSimpleBinauralBeats(leftFreq, rightFreq, duration, outputFile)
          .then(resolve)
          .catch(() => {
            this.createRealSilentMP3(duration, outputFile)
              .then(resolve)
              .catch(reject);
          });
      });
    });
  }

  // 简化的双耳节拍生成方法
  async generateSimpleBinauralBeats(leftFreq, rightFreq, duration, outputFile) {
    console.log(`🎵 使用简化方法生成双耳节拍: ${leftFreq}Hz - ${rightFreq}Hz`);

    return new Promise((resolve, reject) => {
      // 使用单一正弦波，通过音量调制模拟双耳节拍效果
      const beatFreq = Math.abs(rightFreq - leftFreq); // 节拍频率
      const baseFreq = (leftFreq + rightFreq) / 2; // 基础频率

      const command = ffmpeg();

      command
        .input(`sine=frequency=${baseFreq}:duration=${duration}`)
        .inputFormat('lavfi')
        .audioFilters([
          `tremolo=${beatFreq}:0.5`, // 使用颤音效果模拟双耳节拍
          'volume=0.3'
        ])
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(outputFile)
        .on('end', () => {
          console.log(`✅ 简化双耳节拍生成完成: ${outputFile}`);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('❌ 简化双耳节拍生成失败:', err);
          reject(err);
        })
        .run();
    });
  }

  // 生成白噪音（使用真实音频文件）
  async generateWhiteNoise(type = 'pink', duration = 60, amplitude = 0.05) {
    const outputFile = path.join(this.tempDir, `whitenoise_${type}_${Date.now()}.wav`);
    await this.ensureDir(path.dirname(outputFile));

    // 首先尝试使用自然音频文件
    const naturalAudioFile = this.getNaturalAudioFile(type);
    console.log(`🔍 检查自然音频文件: ${type} -> ${naturalAudioFile}`);

    if (naturalAudioFile && await this.fileExists(naturalAudioFile)) {
      console.log(`🎵 使用真实自然音频文件: ${type}`);
      return this.repeatAudioToFillDuration(naturalAudioFile, duration, outputFile);
    } else {
      console.log(`⚠️ 自然音频文件不存在: ${naturalAudioFile}`);
      console.log(`🔄 尝试使用默认雨声文件作为替代`);

      // 使用默认的雨声文件作为替代
      const defaultFile = this.getNaturalAudioFile('light-rain');
      if (defaultFile && await this.fileExists(defaultFile)) {
        console.log(`✅ 使用默认雨声文件: ${defaultFile}`);
        return this.repeatAudioToFillDuration(defaultFile, duration, outputFile);
      } else {
        console.log(`❌ 默认文件也不存在，创建模拟文件`);
        return this.createMockNoiseFile(outputFile, type, duration);
      }
    }
  }

  // 获取白噪音文件路径
  getWhiteNoiseFile(type) {
    const noiseFiles = {
      'white': path.join(this.assetsDir, 'bgm/white-noise.wav'),
      'pink': path.join(this.assetsDir, 'bgm/pink-noise.wav'),
      'brown': path.join(this.assetsDir, 'bgm/brown-noise.wav'),
      'blue': path.join(this.assetsDir, 'bgm/blue-noise.wav'),
      'violet': path.join(this.assetsDir, 'bgm/violet-noise.wav')
    };
    return noiseFiles[type] || noiseFiles['pink'];
  }

  // 获取音频时长
  async getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration;
          resolve(duration);
        }
      });
    });
  }

  // 调整音频时长
  async adjustDuration(inputFile, targetDuration, outputFile = null) {
    if (!outputFile) {
      outputFile = path.join(this.tempDir, `adjusted_${Date.now()}.wav`);
    }
    await this.ensureDir(path.dirname(outputFile));

    return new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .inputOptions(['-stream_loop', '-1']) // 循环输入
        .outputOptions([
          '-t', targetDuration.toString(),
          '-c:a', 'pcm_s16le'
        ])
        .output(outputFile)
        .on('end', () => resolve(outputFile))
        .on('error', reject)
        .run();
    });
  }

  // 语音加速处理（支持6倍速）
  async speedUpAudio(inputFile, speedMultiplier = 6) {
    const outputFile = path.join(this.tempDir, `spedup_${Date.now()}.wav`);
    await this.ensureDir(path.dirname(outputFile));

    return new Promise((resolve, reject) => {
      console.log(`🚀 开始音频倍速处理: ${speedMultiplier}x`);

      let command = ffmpeg(inputFile);

      // FFmpeg atempo最大支持2.0，需要链式处理
      if (speedMultiplier <= 2.0) {
        command = command.audioFilters(`atempo=${speedMultiplier}`);
      } else if (speedMultiplier <= 4.0) {
        command = command.audioFilters([
          `atempo=2.0`,
          `atempo=${speedMultiplier / 2.0}`
        ]);
      } else {
        // 6倍速：2.0 * 2.0 * 1.5 = 6.0
        command = command.audioFilters([
          `atempo=2.0`,
          `atempo=2.0`,
          `atempo=${speedMultiplier / 4.0}`
        ]);
      }

      command
        .audioCodec('libmp3lame')
        .output(outputFile)
        .on('end', () => {
          console.log(`✅ 音频倍速处理完成: ${outputFile} (${speedMultiplier}x)`);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('❌ 音频倍速处理失败:', err);
          reject(err);
        })
        .run();
    });
  }

  // 混合多个音频文件
  async mixAudio({ voiceFile, binauralFile, backgroundMusic, noiseType, voiceSpeed, volumes, subTheme, taskId, duration }) {
    const outputFile = path.join(this.outputDir, `task_${taskId}.mp3`);
    await this.ensureDir(path.dirname(outputFile));

    // 确定目标时长：优先使用背景音乐时长，其次是用户指定时长，最后是默认时长
    let targetDuration = duration || 30;

    try {
      if (backgroundMusic && await this.fileExists(backgroundMusic)) {
        // 如果有用户上传的背景音乐，以其时长为准
        targetDuration = await this.getAudioDuration(backgroundMusic);
        console.log(`📏 使用背景音乐时长: ${targetDuration}秒`);
      } else {
        console.log(`📏 使用指定时长: ${targetDuration}秒`);
      }
    } catch (error) {
      console.log('📏 使用默认时长:', targetDuration);
    }

    // 准备背景音乐轨道（用户上传的音乐）
    let backgroundMusicFile = null;
    if (backgroundMusic && await this.fileExists(backgroundMusic)) {
      console.log('🎵 处理用户上传的背景音乐');
      backgroundMusicFile = await this.repeatAudioToFillDuration(backgroundMusic, targetDuration);
    }

    // 准备环境音频轨道（自然音频或白噪音）
    let environmentAudioFile = null;
    if (noiseType && noiseType !== 'none') {
      // 首先尝试白噪音文件
      const whiteNoiseFile = this.getWhiteNoiseFile(noiseType);
      if (whiteNoiseFile && await this.fileExists(whiteNoiseFile)) {
        console.log(`🔊 使用白噪音: ${noiseType}`);
        environmentAudioFile = await this.repeatAudioToFillDuration(whiteNoiseFile, targetDuration);
      } else {
        // 尝试自然音频文件
        const naturalAudioFile = this.getNaturalAudioFile(noiseType);
        if (naturalAudioFile && await this.fileExists(naturalAudioFile)) {
          console.log(`🌿 使用自然音频: ${noiseType}`);
          environmentAudioFile = await this.repeatAudioToFillDuration(naturalAudioFile, targetDuration);
        } else {
          console.log(`⚠️ 环境音频文件不存在: ${noiseType}`);
        }
      }
    } else {
      console.log('🔇 跳过环境音频（用户选择无）');
    }

    // 如果有语音文件，需要加速处理，然后重复填满时长
    let processedVoiceFile = null;
    if (voiceFile && await this.fileExists(voiceFile)) {
      const speedUpFile = await this.speedUpAudio(voiceFile, voiceSpeed || 6);
      processedVoiceFile = await this.repeatAudioToFillDuration(speedUpFile, targetDuration);
    }

    // 重复双耳节拍以填满时长
    const adjustedBinauralFile = await this.repeatAudioToFillDuration(binauralFile, targetDuration);

    return new Promise(async (resolve, reject) => {
      const command = ffmpeg();
      let filterComplex = [];
      let mixInputs = '';
      let inputCount = 0;

      // 使用用户自定义音量或默认配置
      const finalVolumes = volumes || {
        voice: 0.1,
        binaural: 0.1,
        background: 0.8,
        environment: 0.5
      };

      console.log('🎚️ 音量设置:', finalVolumes);

      // 添加语音输入（如果存在）
      if (processedVoiceFile && await this.fileExists(processedVoiceFile)) {
        command.input(processedVoiceFile);
        filterComplex.push(`[${inputCount}:a]volume=${finalVolumes.voice}[voice]`);
        mixInputs += '[voice]';
        inputCount++;
        console.log(`🎤 添加语音轨道，音量: ${finalVolumes.voice}`);
      }

      // 添加双耳节拍
      if (adjustedBinauralFile && await this.fileExists(adjustedBinauralFile)) {
        command.input(adjustedBinauralFile);
        filterComplex.push(`[${inputCount}:a]volume=${finalVolumes.binaural}[binaural]`);
        mixInputs += '[binaural]';
        inputCount++;
        console.log(`🧠 添加双耳节拍轨道，音量: ${finalVolumes.binaural}`);
      }

      // 添加背景音乐轨道（用户上传的音乐）
      if (backgroundMusicFile && await this.fileExists(backgroundMusicFile)) {
        command.input(backgroundMusicFile);
        filterComplex.push(`[${inputCount}:a]volume=${finalVolumes.background}[bgmusic]`);
        mixInputs += '[bgmusic]';
        inputCount++;
        console.log(`🎵 添加背景音乐轨道，音量: ${finalVolumes.background}`);
      }

      // 添加环境音频轨道（自然音频或白噪音）
      if (environmentAudioFile && await this.fileExists(environmentAudioFile)) {
        command.input(environmentAudioFile);
        filterComplex.push(`[${inputCount}:a]volume=${finalVolumes.environment || 0.5}[environment]`);
        mixInputs += '[environment]';
        inputCount++;
        console.log(`🌿 添加环境音频轨道，音量: ${finalVolumes.environment || 0.5}`);
      }

      // 检查是否有音轨需要混合
      if (inputCount === 0) {
        console.error('❌ 没有可用的音轨进行混合');
        reject(new Error('没有可用的音轨进行混合'));
        return;
      }

      console.log(`🎛️ 开始混合 ${inputCount} 个音轨`);

      // 混合所有音轨
      if (inputCount === 1) {
        // 只有一个音轨，直接输出
        filterComplex.push(`${mixInputs.replace(/\[|\]/g, '')}[out]`);
      } else {
        // 多个音轨，使用amix混合
        filterComplex.push(`${mixInputs}amix=inputs=${inputCount}[out]`);
      }

      command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', '[out]',
          '-c:a', 'libmp3lame',
          '-b:a', '320k'
        ])
        .output(outputFile)
        .on('end', () => {
          console.log(`✅ Audio mixing completed: ${outputFile}`);
          resolve(outputFile);
        })
        .on('error', (err) => {
          console.error('❌ Audio mixing error:', err);
          reject(err);
        })
        .run();
    });
  }

  // 获取自然音频文件路径（基于实际文件）
  getNaturalAudioFile(type) {
    const audioFiles = {
      // 雨声系列
      'rain': path.join(this.assetsDir, 'bgm/light-rain.mp3'),
      'light-rain': path.join(this.assetsDir, 'bgm/light-rain.mp3'),
      'heavy-rain': path.join(this.assetsDir, 'bgm/heavy-rain.mp3'),
      'rain-on-window': path.join(this.assetsDir, 'bgm/rain-on-window.mp3'),
      'rain-on-tent': path.join(this.assetsDir, 'bgm/rain-on-tent.mp3'),
      'rain-on-leaves': path.join(this.assetsDir, 'bgm/rain-on-leaves.mp3'),
      'rain-on-car-roof': path.join(this.assetsDir, 'bgm/rain-on-car-roof.mp3'),
      'rain-on-umbrella': path.join(this.assetsDir, 'bgm/rain-on-umbrella.mp3'),

      // 水声系列
      'river': path.join(this.assetsDir, 'bgm/river.mp3'),
      'waves': path.join(this.assetsDir, 'bgm/waves.mp3'),
      'waterfall': path.join(this.assetsDir, 'bgm/waterfall.mp3'),
      'droplets': path.join(this.assetsDir, 'bgm/droplets.mp3'),
      'bubbles': path.join(this.assetsDir, 'bgm/bubbles.mp3'),
      'boiling-water': path.join(this.assetsDir, 'bgm/boiling-water.mp3'),
      'underwater': path.join(this.assetsDir, 'bgm/underwater.mp3'),

      // 风声系列
      'wind': path.join(this.assetsDir, 'bgm/wind.mp3'),
      'wind-in-trees': path.join(this.assetsDir, 'bgm/wind-in-trees.mp3'),
      'howling-wind': path.join(this.assetsDir, 'bgm/howling-wind.mp3'),
      'wind-chimes': path.join(this.assetsDir, 'bgm/wind-chimes.mp3'),

      // 自然环境
      'forest': path.join(this.assetsDir, 'bgm/wind-in-trees.mp3'),
      'jungle': path.join(this.assetsDir, 'bgm/jungle.mp3'),
      'campfire': path.join(this.assetsDir, 'bgm/campfire.mp3'),
      'thunder': path.join(this.assetsDir, 'bgm/thunder.mp3'),

      // 特殊音效
      'singing-bowl': path.join(this.assetsDir, 'bgm/singing-bowl.mp3'),
      'morse-code': path.join(this.assetsDir, 'bgm/morse-code.mp3'),
      'vinyl-effect': path.join(this.assetsDir, 'bgm/vinyl-effect.mp3'),
      'tuning-radio': path.join(this.assetsDir, 'bgm/tuning-radio.mp3'),
      'slide-projector': path.join(this.assetsDir, 'bgm/slide-projector.mp3'),
      'windshield-wipers': path.join(this.assetsDir, 'bgm/windshield-wipers.mp3'),

      // 行走声音
      'walk-in-snow': path.join(this.assetsDir, 'bgm/walk-in-snow.mp3'),
      'walk-on-gravel': path.join(this.assetsDir, 'bgm/walk-on-gravel.mp3'),
      'walk-on-leaves': path.join(this.assetsDir, 'bgm/walk-on-leaves.mp3'),
      'road': path.join(this.assetsDir, 'bgm/road.mp3'),

      // 白噪音（优先使用whitenoise文件夹）
      'white': path.join(this.assetsDir, 'whitenoise/white.wav'),
      'pink': path.join(this.assetsDir, 'whitenoise/pink.wav'),
      'brown': path.join(this.assetsDir, 'whitenoise/brown.wav'),
      'blue': path.join(this.assetsDir, 'whitenoise/blue.wav'),
      'violet': path.join(this.assetsDir, 'whitenoise/violet.wav')
    };

    return audioFiles[type] || null;
  }

  // 获取白噪音文件路径（专门用于白噪音）
  getWhiteNoiseFile(type) {
    const whiteNoiseFiles = {
      'white': path.join(this.assetsDir, 'whitenoise/white.wav'),
      'pink': path.join(this.assetsDir, 'whitenoise/pink.wav'),
      'brown': path.join(this.assetsDir, 'whitenoise/brown.wav'),
      'blue': path.join(this.assetsDir, 'whitenoise/blue.wav'),
      'violet': path.join(this.assetsDir, 'whitenoise/violet.wav')
    };

    return whiteNoiseFiles[type] || null;
  }

  // 获取BGM文件
  async getBGMFile(theme) {
    const bgmDir = path.join(this.assetsDir, 'bgm', theme);
    const defaultFile = path.join(bgmDir, 'default.wav');

    try {
      await fs.access(defaultFile);
      return defaultFile;
    } catch {
      // 如果没有BGM文件，返回null
      return null;
    }
  }

  // 创建模拟双耳节拍文件（真正的MP3格式）
  async createMockBinauralFile(outputFile, type, duration) {
    try {
      // 确保输出文件是MP3格式
      const mp3OutputFile = outputFile.endsWith('.mp3') ? outputFile : outputFile + '.mp3';

      // 使用现有音频文件创建一个低音量的MP3作为占位符
      const templateFile = this.getNaturalAudioFile('singing-bowl') || this.getNaturalAudioFile('light-rain');

      if (templateFile && await this.fileExists(templateFile)) {
        return new Promise((resolve, reject) => {
          ffmpeg(templateFile)
            .audioFilters('volume=0.05') // 非常低的音量
            .duration(duration)
            .audioCodec('libmp3lame')
            .output(mp3OutputFile)
            .on('end', () => {
              console.log(`✅ Mock binaural MP3 created: ${mp3OutputFile}`);
              resolve(mp3OutputFile);
            })
            .on('error', (err) => {
              console.error('❌ Mock binaural MP3 creation failed:', err);
              // 创建一个最小的文本文件作为最后备选
              this.createTextPlaceholder(mp3OutputFile, type, duration)
                .then(resolve)
                .catch(reject);
            })
            .run();
        });
      } else {
        console.log(`⚠️ 无法找到模板文件，创建文本占位符`);
        return this.createTextPlaceholder(mp3OutputFile, type, duration);
      }
    } catch (error) {
      console.error('❌ 创建模拟双耳节拍文件失败:', error);
      return this.createTextPlaceholder(outputFile, type, duration);
    }
  }

  // 创建文本占位符（最后的备选方案）
  async createTextPlaceholder(outputFile, type, duration) {
    const mockContent = `Mock Binaural Beats File
Type: ${type}
Duration: ${duration} seconds
Generated at: ${new Date().toISOString()}

This is a placeholder for binaural beats.`;

    const textFile = outputFile.replace('.mp3', '.txt');
    await fs.writeFile(textFile, mockContent);
    console.log(`✅ Text placeholder created: ${textFile}`);
    return textFile;
  }

  // 创建模拟噪音文件（真正的MP3格式）
  async createMockNoiseFile(outputFile, type, duration) {
    try {
      // 确保输出文件是MP3格式
      const mp3OutputFile = outputFile.endsWith('.mp3') ? outputFile : outputFile + '.mp3';

      // 使用现有音频文件创建一个低音量的MP3作为占位符
      const templateFile = this.getNaturalAudioFile('light-rain');

      if (templateFile && await this.fileExists(templateFile)) {
        return new Promise((resolve, reject) => {
          console.log(`🔉 使用模板文件创建模拟噪音: ${type}`);
          ffmpeg(templateFile)
            .audioFilters('volume=0.03') // 非常低的音量
            .duration(duration)
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .output(mp3OutputFile)
            .on('end', () => {
              console.log(`✅ 模拟噪音MP3创建完成: ${mp3OutputFile}`);
              resolve(mp3OutputFile);
            })
            .on('error', (err) => {
              console.error('❌ 模拟噪音MP3创建失败:', err);
              // 创建一个文本文件作为最后备选
              this.createTextPlaceholder(mp3OutputFile, type, duration)
                .then(resolve)
                .catch(reject);
            })
            .run();
        });
      } else {
        console.log(`⚠️ 无法找到模板文件，创建文本占位符`);
        return this.createTextPlaceholder(mp3OutputFile, type, duration);
      }
    } catch (error) {
      console.error('❌ 创建模拟噪音文件失败:', error);
      return this.createTextPlaceholder(outputFile, type, duration);
    }
  }

  // 获取双耳节拍频率
  getBinauralFreq(type) {
    const frequencies = {
      alpha: { left: 440, right: 450 },
      beta: { left: 440, right: 460 },
      theta: { left: 440, right: 446 },
      delta: { left: 440, right: 443 }
    };
    return frequencies[type] || frequencies.alpha;
  }

  // 检查文件是否存在
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 创建静音MP3文件（使用现有音频文件作为模板）
  async createSilentMP3(duration, outputFile) {
    try {
      console.log(`🔇 创建静音MP3文件: ${duration}秒`);

      // 尝试使用现有的音频文件作为模板创建静音文件
      const templateFile = this.getNaturalAudioFile('rain'); // 使用雨声作为模板

      if (templateFile && await this.fileExists(templateFile)) {
        return new Promise((resolve, reject) => {
          ffmpeg(templateFile)
            .audioFilters('volume=0') // 将音量设为0，创建静音
            .duration(duration)
            .audioCodec('libmp3lame')
            .output(outputFile)
            .on('end', () => {
              console.log(`✅ 静音MP3创建完成: ${outputFile}`);
              resolve(outputFile);
            })
            .on('error', (err) => {
              console.error('❌ 静音MP3创建失败，使用模拟文件:', err);
              this.createMockBinauralFile(outputFile, 'silent', duration)
                .then(resolve)
                .catch(reject);
            })
            .run();
        });
      } else {
        console.log(`⚠️ 模板文件不存在，创建模拟文件`);
        return this.createMockBinauralFile(outputFile, 'silent', duration);
      }
    } catch (error) {
      console.error('❌ 创建静音MP3失败:', error);
      return this.createMockBinauralFile(outputFile, 'silent', duration);
    }
  }

  // 重复音频以填满指定时长
  async repeatAudioToFillDuration(inputFile, targetDuration, outputFile = null) {
    if (!outputFile) {
      outputFile = path.join(this.tempDir, `repeated_${Date.now()}.mp3`);
    }
    await this.ensureDir(path.dirname(outputFile));

    // 首先获取输入文件的时长
    const inputDuration = await this.getAudioDuration(inputFile);

    if (inputDuration >= targetDuration) {
      // 如果输入文件已经足够长，直接截取到目标时长
      return new Promise((resolve, reject) => {
        ffmpeg(inputFile)
          .duration(targetDuration)
          .audioCodec('libmp3lame')
          .output(outputFile)
          .on('end', () => {
            console.log(`✅ 音频截取完成: ${outputFile} (${targetDuration}s)`);
            resolve(outputFile);
          })
          .on('error', reject)
          .run();
      });
    } else {
      // 需要重复音频来填满时长
      const repeatCount = Math.ceil(targetDuration / inputDuration);
      console.log(`🔄 重复音频 ${repeatCount} 次以填满 ${targetDuration} 秒`);

      return new Promise((resolve, reject) => {
        const inputs = [];
        const filterInputs = [];

        // 创建重复的输入
        for (let i = 0; i < repeatCount; i++) {
          inputs.push(inputFile);
          filterInputs.push(`[${i}:a]`);
        }

        const command = ffmpeg();
        inputs.forEach(input => command.input(input));

        command
          .complexFilter([
            `${filterInputs.join('')}concat=n=${repeatCount}:v=0:a=1[out]`
          ])
          .map('[out]')
          .duration(targetDuration) // 确保精确的时长
          .audioCodec('libmp3lame')
          .output(outputFile)
          .on('end', () => {
            console.log(`✅ 音频重复填充完成: ${outputFile} (${targetDuration}s)`);
            resolve(outputFile);
          })
          .on('error', (err) => {
            console.error('❌ 音频重复填充失败:', err);
            reject(err);
          })
          .run();
      });
    }
  }

  // 获取音频时长
  async getAudioDuration(audioFile) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioFile, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          const duration = metadata.format.duration;
          resolve(duration);
        }
      });
    });
  }

  // 创建低音量音频（用作双耳节拍替代）
  async createLowVolumeAudio(sourceFile, duration, outputFile) {
    // 确保输出文件是MP3格式
    const mp3OutputFile = outputFile.endsWith('.mp3') ? outputFile : outputFile.replace(/\.[^.]+$/, '.mp3');

    return new Promise((resolve, reject) => {
      console.log(`🔉 创建低音量音频: ${duration}秒, 输出: ${mp3OutputFile}`);

      ffmpeg(sourceFile)
        .audioFilters('volume=0.05') // 降低音量到5%，作为双耳节拍替代
        .duration(duration)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .output(mp3OutputFile)
        .on('end', () => {
          console.log(`✅ 低音量音频创建完成: ${mp3OutputFile}`);
          resolve(mp3OutputFile);
        })
        .on('error', (err) => {
          console.error('❌ 低音量音频创建失败:', err);
          this.createRealSilentMP3(duration, mp3OutputFile)
            .then(resolve)
            .catch(reject);
        })
        .run();
    });
  }

  // 创建真正的静音MP3文件（不依赖lavfi）
  async createRealSilentMP3(duration, outputFile) {
    console.log(`🔇 创建真正的静音MP3: ${duration}秒`);

    // 使用一个现有的音频文件作为模板，但将音量设为0
    const templateFile = this.getNaturalAudioFile('light-rain');

    if (templateFile && await this.fileExists(templateFile)) {
      return new Promise((resolve, reject) => {
        ffmpeg(templateFile)
          .audioFilters('volume=0') // 完全静音
          .duration(duration)
          .audioCodec('libmp3lame')
          .output(outputFile)
          .on('end', () => {
            console.log(`✅ 真正的静音MP3创建完成: ${outputFile}`);
            resolve(outputFile);
          })
          .on('error', (err) => {
            console.error('❌ 真正的静音MP3创建失败:', err);
            // 最后的备选方案：创建一个模拟文件，但确保是MP3格式
            this.createMockBinauralFile(outputFile.replace('.txt', ''), 'silent', duration)
              .then(resolve)
              .catch(reject);
          })
          .run();
      });
    } else {
      console.log(`⚠️ 模板文件不存在，创建模拟MP3文件`);
      return this.createMockBinauralFile(outputFile.replace('.txt', ''), 'silent', duration);
    }
  }

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

module.exports = AudioService;
