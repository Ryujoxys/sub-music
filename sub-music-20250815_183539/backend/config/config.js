const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

let config = {};

try {
  const configPath = path.join(__dirname, '../../configs/config.yaml');
  const configFile = fs.readFileSync(configPath, 'utf8');
  config = yaml.parse(configFile);
} catch (error) {
  console.error('Failed to load config:', error.message);
  // 使用默认配置
  config = {
    server: {
      port: '8080',
      host: 'localhost',
      cors_origins: ['http://localhost:3000']
    },
    database: {
      type: 'sqlite',
      path: './data/app.db'
    },
    storage: {
      temp_dir: './temp',
      output_dir: './output',
      assets_dir: '../assets'
    },
    dify: {
      api_key: '',
      base_url: '',
      workflow_id: ''
    },
    xfyun: {
      app_id: '',
      api_key: '',
      api_secret: '',
      host_url: '',
      voice_name: 'x4_xiaoyan'
    },
    audio: {
      sample_rate: 44100,
      bit_rate: 320,
      format: 'mp3',
      max_duration: 3600,
      volumes: {
        voice: 0.05,
        binaural: 0.1,
        whitenoise: 0.7,
        bgm: 0.9
      },
      voice_speed: 10
    },
    ffmpeg: {
      binary_path: 'ffmpeg',
      temp_format: 'wav'
    }
  };
}

module.exports = config;
