import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Button, Input, Progress, List, message, Space, Tag, Upload, Slider, Select, Modal } from 'antd';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import './index.css';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option, OptGroup } = Select;

interface Task {
  id: string;
  user_input: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step: string;
  progress: number;
  error_msg?: string;
  output_file?: string;
  created_at: string;
  startTime?: string;
}

interface ProgressUpdate {
  task_id: string;
  status: string;
  current_step: string;
  progress: number;
  message: string;
}

const App: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [duration, setDuration] = useState(30); // 默认30秒
  const [binauralType, setBinauralType] = useState('alpha'); // 默认α波
  const [noiseType, setNoiseType] = useState('rain'); // 默认雨声
  const [voiceSpeed, setVoiceSpeed] = useState(6); // TTS倍速，默认6倍
  const [uploadedMusic, setUploadedMusic] = useState<any>(null);

  // 音量控制状态
  const [volumes, setVolumes] = useState({
    voice: 5,        // 语音音量 5%
    binaural: 10,    // 双耳节拍音量 10%
    background: 70,  // 背景音轨音量 70%
    environment: 50  // 环境音频音量 50%
  });

  // 配置管理状态
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [configName, setConfigName] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 音频预览状态
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // 当前任务的详细步骤状态
  const [currentTaskSteps, setCurrentTaskSteps] = useState({
    outline: { status: 'pending', content: '', error: '' },
    expansion: { status: 'pending', content: '', error: '' },
    tts: { status: 'pending', file: '', error: '' },
    binaural: { status: 'pending', file: '', error: '' },
    background: { status: 'pending', file: '', error: '' },
    mixing: { status: 'pending', file: '', error: '' }
  });

  useEffect(() => {
    // 连接WebSocket
    const newSocket = io('ws://localhost:8080');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('progress', (data: ProgressUpdate) => {
      updateTaskProgress(data);
    });

    newSocket.on('completed', (data: ProgressUpdate) => {
      updateTaskProgress(data);
      message.success('任务完成！');
    });

    // 监听详细步骤更新
    newSocket.on('step_update', (data: any) => {
      if (data.task_id) {
        setCurrentTaskSteps(prev => ({
          ...prev,
          [data.step]: {
            status: data.status,
            content: data.content || prev[data.step].content,
            file: data.file || prev[data.step].file,
            error: data.error || ''
          }
        }));
      }
    });

    // 加载任务列表和配置
    loadTasks();
    loadConfigs();
    loadLastUsedConfig();

    return () => {
      newSocket.close();
      // 清理音频播放
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  // 加载保存的配置
  const loadConfigs = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/configs');
      const data = await response.json();
      setSavedConfigs(data.configs || []);
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 加载最后使用的配置（只包含音量参数）
  const loadLastUsedConfig = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/configs');
      const data = await response.json();
      if (data.lastUsed && data.lastUsed.config) {
        const config = data.lastUsed.config;
        setVolumes(config.volumes || { voice: 5, binaural: 10, background: 70, environment: 50 });
      }
    } catch (error) {
      console.error('加载最后使用的配置失败:', error);
    }
  };

  const updateTaskProgress = (update: ProgressUpdate) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === update.task_id 
          ? { 
              ...task, 
              status: update.status as any,
              current_step: update.current_step,
              progress: update.progress 
            }
          : task
      )
    );
  };

  // 保存最后使用的配置（只保存音量参数）
  const saveLastUsedConfig = async () => {
    try {
      const config = {
        volumes
      };

      await fetch('http://localhost:8080/api/configs/last-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
    } catch (error) {
      console.error('保存最后使用的配置失败:', error);
    }
  };

  // 保存配置（只保存音量参数）
  const saveConfig = async () => {
    if (!configName.trim()) {
      message.error('请输入配置名称');
      return;
    }

    try {
      const config = {
        volumes
      };

      await fetch('http://localhost:8080/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: configName, config })
      });

      message.success('配置保存成功');
      setConfigName('');
      setShowConfigModal(false);
      loadConfigs();
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    }
  };

  // 删除配置
  const deleteConfig = async (id: string) => {
    try {
      await fetch(`http://localhost:8080/api/configs/${id}`, {
        method: 'DELETE'
      });
      message.success('配置删除成功');
      loadConfigs();
    } catch (error) {
      console.error('删除配置失败:', error);
      message.error('删除配置失败');
    }
  };

  // 应用配置（只应用音量参数）
  const applyConfig = (config: any) => {
    setVolumes(config.volumes || { voice: 5, binaural: 10, background: 70, environment: 50 });
    message.success('音量配置已应用');
  };

  // 清空任务列表
  const clearTasks = async () => {
    try {
      await fetch('http://localhost:8080/api/tasks/clear', {
        method: 'DELETE'
      });
      setTasks([]);
      message.success('任务列表已清空');
    } catch (error) {
      console.error('清空任务失败:', error);
      message.error('清空任务失败');
    }
  };

  // 音频预览控制
  const previewAudio = (type: string, filename: string) => {
    const audioId = `${type}-${filename}`;

    // 如果当前正在播放这个音频，则停止
    if (playingAudioId === audioId && currentAudio) {
      stopAudio();
      return;
    }

    // 如果有其他音频在播放，先停止
    if (currentAudio) {
      stopAudio();
    }

    const audioUrl = `http://localhost:8080/api/tasks/preview/${type}/${filename}`;
    const audio = new Audio(audioUrl);

    // 设置音频事件监听
    audio.addEventListener('loadstart', () => {
      setIsPlaying(true);
      setPlayingAudioId(audioId);
      setCurrentAudio(audio);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setPlayingAudioId(null);
      setCurrentAudio(null);
    });

    audio.addEventListener('error', () => {
      setIsPlaying(false);
      setPlayingAudioId(null);
      setCurrentAudio(null);
      message.error('音频预览失败');
    });

    // 开始播放
    audio.play().catch(error => {
      console.error('播放失败:', error);
      setIsPlaying(false);
      setPlayingAudioId(null);
      setCurrentAudio(null);
      message.error('音频预览失败');
    });
  };

  // 停止音频播放
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setIsPlaying(false);
    setPlayingAudioId(null);
  };

  const createTask = async () => {
    if (!userInput.trim()) {
      message.error('请输入您的诉求');
      return;
    }

    setLoading(true);
    try {
      // 保存最后使用的配置
      await saveLastUsedConfig();

      // 创建FormData来支持文件上传
      const formData = new FormData();
      formData.append('user_input', userInput);
      formData.append('sub_theme', 'focus');
      formData.append('duration', duration.toString());
      formData.append('binaural_type', binauralType);
      formData.append('noise_type', noiseType);
      formData.append('voice_speed', voiceSpeed.toString());
      formData.append('volume_voice', (volumes.voice / 100).toString());
      formData.append('volume_binaural', (volumes.binaural / 100).toString());
      formData.append('volume_background', (volumes.background / 100).toString());
      formData.append('volume_environment', (volumes.environment / 100).toString());

      if (uploadedMusic) {
        formData.append('background_music', uploadedMusic);
      }

      const response = await axios.post('/api/tasks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newTask = response.data;
      setTasks(prevTasks => [newTask, ...prevTasks]);
      setUserInput('');
      setUploadedMusic(null);
      message.success('任务创建成功，开始处理...');
    } catch (error) {
      message.error('创建任务失败');
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'processing': return 'processing';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'processing': return '处理中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const getStepText = (step: string) => {
    switch (step) {
      case 'outline': return '生成大纲';
      case 'expand': return '扩写内容';
      case 'tts': return '文本转语音';
      case 'audio_split': return '音频分离';
      case 'audio_mix': return '音频混合';
      case 'export': return '导出文件';
      default: return step;
    }
  };

  return (
    <Layout className="app-container">
      <Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <span style={{ fontSize: '24px', color: '#1890ff', marginRight: '12px' }}>🎵</span>
          <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
            Sub Music - AI音频处理系统
          </Title>
        </div>
      </Header>

      <Content className="main-content" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', maxWidth: '1600px', margin: '0 auto' }}>
          {/* 左侧：任务创建和列表 */}
          <div>
            <Card title="创建新任务" style={{ marginBottom: '24px' }}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Paragraph>
              请输入您的诉求，系统将自动生成大纲、扩写内容、转换为语音，并添加双耳节拍和背景音乐。
            </Paragraph>

            <TextArea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="例如：我想要一个关于提高专注力的音频，帮助我在工作时保持高效状态..."
              rows={4}
              maxLength={1000}
              showCount
            />

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  音频时长 (秒)
                </label>
                <Slider
                  min={10}
                  max={300}
                  value={duration}
                  onChange={setDuration}
                  marks={{
                    10: '10s',
                    30: '30s',
                    60: '1min',
                    120: '2min',
                    300: '5min'
                  }}
                  tooltip={{ formatter: (value) => `${value}秒` }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  双耳节拍类型
                </label>
                <Select
                  value={binauralType}
                  onChange={setBinauralType}
                  style={{ width: '100%' }}
                >
                  <Option value="alpha">α波 (8-13Hz) - 放松冥想</Option>
                  <Option value="beta">β波 (14-30Hz) - 专注警觉</Option>
                  <Option value="theta">θ波 (4-8Hz) - 深度放松</Option>
                  <Option value="delta">δ波 (0.5-4Hz) - 深度睡眠</Option>
                </Select>
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  🚀 TTS倍速: {voiceSpeed}x
                </label>
                <Slider
                  min={1}
                  max={10}
                  step={0.5}
                  value={voiceSpeed}
                  onChange={setVoiceSpeed}
                  tooltip={{ formatter: (value) => `${value}x` }}
                  marks={{
                    1: '1x',
                    3: '3x',
                    6: '6x',
                    10: '10x'
                  }}
                />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  🌧️ 环境音频类型
                </label>
                <Select
                  value={noiseType}
                  onChange={setNoiseType}
                  style={{ width: '100%' }}
                  disabled={!!uploadedMusic}
                >
                  <Option value="none">🔇 无环境音频</Option>

                  <OptGroup label="🌧️ 雨声系列">
                    <Option value="light-rain">🌧️ 轻雨 - 轻柔雨滴</Option>
                    <Option value="heavy-rain">⛈️ 大雨 - 强烈雨声</Option>
                    <Option value="rain-on-window">🪟 窗雨 - 雨打窗户</Option>
                    <Option value="rain-on-tent">⛺ 帐篷雨 - 雨打帐篷</Option>
                    <Option value="rain-on-leaves">🍃 叶雨 - 雨打树叶</Option>
                    <Option value="rain-on-car-roof">🚗 车顶雨 - 雨打车顶</Option>
                    <Option value="rain-on-umbrella">☂️ 伞雨 - 雨打雨伞</Option>
                  </OptGroup>

                  <OptGroup label="🌊 水声系列">
                    <Option value="river">🏞️ 河流 - 潺潺流水</Option>
                    <Option value="waves">🌊 海浪 - 海洋声音</Option>
                    <Option value="waterfall">💧 瀑布 - 飞流直下</Option>
                    <Option value="droplets">💧 水滴 - 滴水声</Option>
                    <Option value="bubbles">🫧 气泡 - 冒泡声</Option>
                    <Option value="boiling-water">♨️ 沸水 - 烧水声</Option>
                    <Option value="underwater">🤿 水下 - 潜水声</Option>
                  </OptGroup>

                  <OptGroup label="💨 风声系列">
                    <Option value="wind">💨 风声 - 自然微风</Option>
                    <Option value="wind-in-trees">🌲 林风 - 树叶沙沙</Option>
                    <Option value="howling-wind">🌪️ 呼啸风 - 强风声</Option>
                    <Option value="wind-chimes">🎐 风铃 - 清脆铃声</Option>
                  </OptGroup>

                  <OptGroup label="🔥 自然环境">
                    <Option value="campfire">🔥 篝火 - 燃烧声音</Option>
                    <Option value="jungle">🌴 丛林 - 热带雨林</Option>
                    <Option value="thunder">⚡ 雷声 - 远方雷鸣</Option>
                  </OptGroup>

                  <OptGroup label="🎵 特殊音效">
                    <Option value="singing-bowl">🎎 颂钵 - 冥想音</Option>
                    <Option value="morse-code">📡 摩斯码 - 电报声</Option>
                    <Option value="vinyl-effect">💿 黑胶 - 复古音效</Option>
                    <Option value="tuning-radio">📻 调频 - 收音机</Option>
                    <Option value="slide-projector">📽️ 投影仪 - 幻灯片</Option>
                    <Option value="windshield-wipers">🚗 雨刷 - 汽车雨刷</Option>
                  </OptGroup>

                  <OptGroup label="🚶 行走声音">
                    <Option value="walk-in-snow">❄️ 雪地行走 - 踩雪声</Option>
                    <Option value="walk-on-gravel">🪨 砾石行走 - 踩石声</Option>
                    <Option value="walk-on-leaves">🍂 落叶行走 - 踩叶声</Option>
                    <Option value="road">🛣️ 公路 - 车流声</Option>
                  </OptGroup>

                  <OptGroup label="🔊 白噪音系列">
                    <Option value="white">⚪ 白噪音 - 频谱均匀</Option>
                    <Option value="pink">🌸 粉红噪音 - 经典白噪音</Option>
                    <Option value="brown">🤎 棕色噪音 - 低频丰富</Option>
                    <Option value="blue">🔵 蓝噪音 - 高频突出</Option>
                    <Option value="violet">🟣 紫噪音 - 超高频</Option>
                  </OptGroup>
                </Select>
              </div>
            </div>

            {/* 音量控制区域 */}
            <Card
              size="small"
              title="🎚️ 音量控制"
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef'
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    🗣️ 语音音量: {volumes.voice}%
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    value={volumes.voice}
                    onChange={(value) => setVolumes(prev => ({ ...prev, voice: value }))}
                    tooltip={{ formatter: (value) => `${value}%` }}
                    trackStyle={{ backgroundColor: '#52c41a' }}
                    handleStyle={{ borderColor: '#52c41a' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    🧠 双耳节拍: {volumes.binaural}%
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    value={volumes.binaural}
                    onChange={(value) => setVolumes(prev => ({ ...prev, binaural: value }))}
                    tooltip={{ formatter: (value) => `${value}%` }}
                    trackStyle={{ backgroundColor: '#1890ff' }}
                    handleStyle={{ borderColor: '#1890ff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    🎵 背景音轨: {volumes.background}%
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    value={volumes.background}
                    onChange={(value) => setVolumes(prev => ({ ...prev, background: value }))}
                    tooltip={{ formatter: (value) => `${value}%` }}
                    trackStyle={{ backgroundColor: '#722ed1' }}
                    handleStyle={{ borderColor: '#722ed1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    🌿 环境音频: {volumes.environment}%
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    value={volumes.environment}
                    onChange={(value) => setVolumes(prev => ({ ...prev, environment: value }))}
                    tooltip={{ formatter: (value) => `${value}%` }}
                    trackStyle={{ backgroundColor: '#52c41a' }}
                    handleStyle={{ borderColor: '#52c41a' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  onClick={() => setVolumes({ voice: 5, binaural: 10, background: 70, environment: 50 })}
                >
                  默认配置
                </Button>
                <Button
                  size="small"
                  onClick={() => setVolumes({ voice: 20, binaural: 30, background: 30, environment: 20 })}
                >
                  均衡模式
                </Button>
                <Button
                  size="small"
                  onClick={() => setVolumes({ voice: 1, binaural: 5, background: 90, environment: 4 })}
                >
                  背景主导
                </Button>
                <Button
                  size="small"
                  onClick={() => setVolumes({ voice: 30, binaural: 20, background: 30, environment: 20 })}
                >
                  语音清晰
                </Button>
              </div>
            </Card>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                🎵 背景音乐 (可选)
              </label>
              <Upload
                beforeUpload={(file) => {
                  const isAudio = file.type.startsWith('audio/');
                  if (!isAudio) {
                    message.error('只能上传音频文件！');
                    return false;
                  }
                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error('音频文件大小不能超过10MB！');
                    return false;
                  }
                  setUploadedMusic(file);
                  return false; // 阻止自动上传
                }}
                onRemove={() => {
                  setUploadedMusic(null);
                }}
                fileList={uploadedMusic ? [uploadedMusic] : []}
                maxCount={1}
              >
                <Button icon="📁">
                  {uploadedMusic ? '更换音乐' : '上传背景音乐'}
                </Button>
              </Upload>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                支持 MP3、WAV、M4A 等格式，最大10MB。如不上传将使用白噪音。
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              loading={loading}
              onClick={createTask}
              icon={loading ? '⏳' : '▶️'}
              style={{ width: '100%' }}
            >
              {loading ? '创建中...' : '开始处理'}
            </Button>
          </Space>
        </Card>

        <Card
          title="任务列表"
          extra={
            <Space>
              {isPlaying && (
                <Button
                  type="primary"
                  danger
                  onClick={stopAudio}
                  icon={<span>⏹️</span>}
                >
                  停止播放
                </Button>
              )}
              <Button
                type="primary"
                ghost
                onClick={() => setShowConfigModal(true)}
                icon={<span>⚙️</span>}
              >
                配置管理
              </Button>
              <Button
                danger
                onClick={clearTasks}
                icon={<span>🗑️</span>}
              >
                清空列表
              </Button>
            </Space>
          }
        >
          <List
            dataSource={tasks}
            locale={{ emptyText: '暂无任务' }}
            renderItem={(task) => (
              <List.Item className="task-card">
                <Card size="small" style={{ width: '100%' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Space>
                      <Tag color={getStatusColor(task.status)}>
                        {getStatusText(task.status)}
                      </Tag>
                      {task.status === 'processing' && (
                        <Tag color="blue">{getStepText(task.current_step)}</Tag>
                      )}
                    </Space>
                  </div>
                  
                  <Paragraph ellipsis={{ rows: 2, expandable: true }}>
                    {task.user_input}
                  </Paragraph>

                  {task.status === 'processing' && (
                    <div className="progress-container">
                      <Progress 
                        percent={task.progress} 
                        status="active"
                        format={(percent) => `${percent}% - ${getStepText(task.current_step)}`}
                      />
                    </div>
                  )}

                  {task.status === 'completed' && task.output_file && (
                    <div className="audio-player">
                      <Space>
                        <Button
                          type="primary"
                          icon={playingAudioId === `output-${task.output_file?.split('/').pop()}` ? "⏹️" : "🎵"}
                          onClick={() => {
                            // 预览最终混合音频
                            const filename = task.output_file?.split('/').pop();
                            previewAudio('output', filename || '');
                          }}
                        >
                          {playingAudioId === `output-${task.output_file?.split('/').pop()}` ? '停止预览' : '预览音频'}
                        </Button>
                        <Button
                          type="primary"
                          icon="📥"
                          onClick={() => {
                            // 直接下载最终混合音频文件
                            const filename = task.output_file?.split('/').pop();
                            const downloadUrl = `http://localhost:8080/api/tasks/preview/output/${filename}`;
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = filename || 'audio.mp3';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            message.success('开始下载音频文件');
                          }}
                        >
                          下载音频
                        </Button>
                      </Space>
                    </div>
                  )}

                  {task.status === 'failed' && task.error_msg && (
                    <Paragraph type="danger">
                      错误：{task.error_msg}
                    </Paragraph>
                  )}

                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                    开始处理时间：{new Date(task.startTime || task.created_at).toLocaleString()}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </Card>
          </div>

          {/* 右侧：详细步骤展示 */}
          <div>
            <Card title="🔍 处理步骤详情" style={{ position: 'sticky', top: '24px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">

                {/* 步骤1：大纲生成 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.outline.status === 'completed' ? '✅' :
                       currentTaskSteps.outline.status === 'processing' ? '⏳' :
                       currentTaskSteps.outline.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>1. 大纲生成</strong>
                  </div>
                  {currentTaskSteps.outline.content && (
                    <div style={{
                      backgroundColor: '#f6f8fa',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {currentTaskSteps.outline.content}
                    </div>
                  )}
                  {currentTaskSteps.outline.error && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      错误：{currentTaskSteps.outline.error}
                    </div>
                  )}
                </div>

                {/* 步骤2：内容扩写 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.expansion.status === 'completed' ? '✅' :
                       currentTaskSteps.expansion.status === 'processing' ? '⏳' :
                       currentTaskSteps.expansion.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>2. 内容扩写</strong>
                  </div>
                  {currentTaskSteps.expansion.content && (
                    <div style={{
                      backgroundColor: '#f6f8fa',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {currentTaskSteps.expansion.content}
                    </div>
                  )}
                  {currentTaskSteps.expansion.error && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      错误：{currentTaskSteps.expansion.error}
                    </div>
                  )}
                </div>

                {/* 步骤3：TTS转换 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.tts.status === 'completed' ? '✅' :
                       currentTaskSteps.tts.status === 'processing' ? '⏳' :
                       currentTaskSteps.tts.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>3. 语音转换</strong>
                  </div>
                  {currentTaskSteps.tts.file && (
                    <div style={{ fontSize: '12px' }}>
                      <Space>
                        <a href={`/api/download/${currentTaskSteps.tts.file.split('/').pop()}`} target="_blank" rel="noopener noreferrer">
                          📁 下载语音文件
                        </a>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => previewAudio('voice', currentTaskSteps.tts.file.split('/').pop() || '')}
                        >
                          {playingAudioId === `voice-${currentTaskSteps.tts.file.split('/').pop()}` ? '⏹️ 停止' : '🎵 预览'}
                        </Button>
                      </Space>
                    </div>
                  )}
                  {currentTaskSteps.tts.error && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      错误：{currentTaskSteps.tts.error}
                    </div>
                  )}
                </div>

                {/* 步骤4：双耳节拍 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.binaural.status === 'completed' ? '✅' :
                       currentTaskSteps.binaural.status === 'processing' ? '⏳' :
                       currentTaskSteps.binaural.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>4. 双耳节拍</strong>
                  </div>
                  {currentTaskSteps.binaural.file && (
                    <div style={{ fontSize: '12px' }}>
                      <Space>
                        <a href={`/api/download/${currentTaskSteps.binaural.file}`} target="_blank" rel="noopener noreferrer">
                          📁 下载双耳节拍
                        </a>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => previewAudio('binaural', currentTaskSteps.binaural.file.split('/').pop() || '')}
                        >
                          {playingAudioId === `binaural-${currentTaskSteps.binaural.file.split('/').pop()}` ? '⏹️ 停止' : '🎵 预览'}
                        </Button>
                      </Space>
                    </div>
                  )}
                  {currentTaskSteps.binaural.error && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      错误：{currentTaskSteps.binaural.error}
                    </div>
                  )}
                </div>

                {/* 步骤5：背景音轨 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.background.status === 'completed' ? '✅' :
                       currentTaskSteps.background.status === 'processing' ? '⏳' :
                       currentTaskSteps.background.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>5. 背景音轨</strong>
                  </div>
                  {currentTaskSteps.background.file && (
                    <div style={{ fontSize: '12px' }}>
                      <Space>
                        <a href={`/api/download/${currentTaskSteps.background.file}`} target="_blank" rel="noopener noreferrer">
                          📁 下载背景音轨
                        </a>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => previewAudio('bgm', currentTaskSteps.background.file.split('/').pop() || '')}
                        >
                          {playingAudioId === `bgm-${currentTaskSteps.background.file.split('/').pop()}` ? '⏹️ 停止' : '🎵 预览'}
                        </Button>
                      </Space>
                    </div>
                  )}
                  {currentTaskSteps.background.error && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      错误：{currentTaskSteps.background.error}
                    </div>
                  )}
                </div>

                {/* 步骤6：最终混合 */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.mixing.status === 'completed' ? '✅' :
                       currentTaskSteps.mixing.status === 'processing' ? '⏳' :
                       currentTaskSteps.mixing.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>6. 音频混合</strong>
                  </div>
                  {currentTaskSteps.mixing.file && (
                    <div style={{ fontSize: '12px' }}>
                      <Space>
                        <a href={`/api/download/${currentTaskSteps.mixing.file}`} target="_blank" rel="noopener noreferrer">
                          🎵 下载最终音频
                        </a>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => previewAudio('output', currentTaskSteps.mixing.file.split('/').pop() || '')}
                        >
                          {playingAudioId === `output-${currentTaskSteps.mixing.file.split('/').pop()}` ? '⏹️ 停止' : '🎵 预览'}
                        </Button>
                      </Space>
                    </div>
                  )}
                  {currentTaskSteps.mixing.error && (
                    <div style={{ color: '#ff4d4f', fontSize: '12px' }}>
                      错误：{currentTaskSteps.mixing.error}
                    </div>
                  )}
                </div>

              </Space>
            </Card>
          </div>
        </div>
      </Content>

      {/* 音量配置管理Modal */}
      <Modal
        title="🎚️ 音量配置管理"
        open={showConfigModal}
        onCancel={() => setShowConfigModal(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: '20px' }}>
          <h3>💾 保存当前音量配置</h3>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
            保存当前的音量设置：语音 {volumes.voice}%、双耳节拍 {volumes.binaural}%、背景音轨 {volumes.background}%、环境音频 {volumes.environment}%
          </p>
          <Space style={{ width: '100%' }}>
            <Input
              placeholder="输入配置名称（如：专注模式、放松模式）"
              value={configName}
              onChange={(e) => setConfigName(e.target.value)}
              style={{ width: '300px' }}
            />
            <Button type="primary" onClick={saveConfig}>
              💾 保存音量配置
            </Button>
          </Space>
        </div>

        <div>
          <h3>📋 已保存的音量配置</h3>
          <List
            dataSource={savedConfigs}
            locale={{ emptyText: '暂无保存的音量配置' }}
            renderItem={(config: any) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    onClick={() => applyConfig(config.config)}
                  >
                    🎯 应用
                  </Button>,
                  <Button
                    type="link"
                    danger
                    onClick={() => deleteConfig(config.id)}
                  >
                    🗑️ 删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={`🎚️ ${config.name}`}
                  description={
                    <div>
                      <div>音量设置: 语音 {config.config.volumes?.voice || 0}%、双耳节拍 {config.config.volumes?.binaural || 0}%、背景音轨 {config.config.volumes?.background || 0}%、环境音频 {config.config.volumes?.environment || 0}%</div>
                      <div style={{ color: '#999', fontSize: '12px' }}>创建时间: {new Date(config.createdAt).toLocaleString()}</div>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default App;
