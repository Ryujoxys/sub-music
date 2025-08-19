import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Button, Input, Progress, List, message, Space, Tag, Upload, Slider, Select, Modal, Collapse, InputNumber } from 'antd';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import './index.css';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option, OptGroup } = Select;
const { Panel } = Collapse;

interface Task {
  id: string;
  userInput: string;  // 后端字段名
  user_input?: string; // 兼容前端显示
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step: string;
  currentStep?: string; // 后端字段名
  progress: number;
  error_msg?: string;
  errorMsg?: string; // 后端字段名
  output_file?: string;
  outputFile?: string; // 后端字段名
  created_at?: string;
  createdAt?: string; // 后端字段名
  startTime?: string;
  outline?: string; // 大纲内容
  content?: string; // 扩写内容
}

interface ProgressUpdate {
  task_id: string;
  status: string;
  current_step: string;
  progress: number;
  message?: string;
}

// 音频预览卡片组件
const AudioPreviewCard: React.FC<{
  title: string;
  description: string;
  audioId: string;
  category: string;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onPreview: () => void;
}> = ({ title, description, audioId, category, isSelected, isPlaying, onSelect, onPreview }) => (
  <Card
    size="small"
    style={{
      cursor: 'pointer',
      border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
      backgroundColor: isSelected ? '#f6ffed' : '#fff',
      margin: '8px 0'
    }}
    onClick={onSelect}
    hoverable
  >
    <div style={{ padding: '8px' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{title}</div>
      <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>{description}</div>
      <Button
        size="small"
        type={isPlaying ? "primary" : "default"}
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        style={{ marginRight: '8px' }}
      >
        {isPlaying ? '⏹️ 停止' : '▶️ 试听'}
      </Button>
      {isSelected && <Tag color="blue">已选择</Tag>}
    </div>
  </Card>
);

const App: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [duration, setDuration] = useState(30);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(30);

  // 同步分钟秒和总秒数
  const updateDurationFromMinutesSeconds = (minutes: number, seconds: number) => {
    const totalSeconds = minutes * 60 + seconds;
    const maxSeconds = 10 * 60; // 最大10分钟

    if (totalSeconds > maxSeconds) {
      // 如果超过10分钟，设置为10分钟
      setDurationMinutes(10);
      setDurationSeconds(0);
      setDuration(600);
      message.warning('音频时长不能超过10分钟，已自动调整为10分钟');
    } else if (totalSeconds < 1) {
      // 如果小于1秒，设置为1秒
      setDurationMinutes(0);
      setDurationSeconds(1);
      setDuration(1);
      message.warning('音频时长不能少于1秒，已自动调整为1秒');
    } else {
      setDurationMinutes(minutes);
      setDurationSeconds(seconds);
      setDuration(totalSeconds);
    }
  };

  // 从总秒数更新分钟秒显示
  const updateMinutesSecondsFromDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    setDurationMinutes(minutes);
    setDurationSeconds(seconds);
    setDuration(totalSeconds);
  };
  const [binauralType, setBinauralType] = useState('alpha');
  const [noiseTypes, setNoiseTypes] = useState<string[]>(['rain']); // 环境音频多选
  const [whiteNoiseType, setWhiteNoiseType] = useState('pink'); // 白噪音
  const [voiceSpeed, setVoiceSpeed] = useState(6);
  const [uploadedMusic, setUploadedMusic] = useState<any>(null);
  const [audioName, setAudioName] = useState(''); // 音频命名

  // 音量控制状态 (使用配置文件中的默认值)
  const [volumes, setVolumes] = useState({
    voice: 5,    // 5% = 0.05
    binaural: 10, // 10% = 0.1
    background: 70, // 70% = 0.7
    environment: 50 // 50% = 0.5
  });

  // 音频预览状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  // 配置管理状态
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState('');
  const [showAudioSelector, setShowAudioSelector] = useState(false);

  // 任务详情查看状态
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentProcessingTaskId, setCurrentProcessingTaskId] = useState<string | null>(null);

  // 当前任务步骤状态
  const [currentTaskSteps, setCurrentTaskSteps] = useState({
    outline: { status: 'pending', content: '', file: '', error: '' },
    expansion: { status: 'pending', content: '', file: '', error: '' },
    tts: { status: 'pending', content: '', file: '', error: '' },
    binaural: { status: 'pending', content: '', file: '', error: '' },
    background: { status: 'pending', content: '', file: '', error: '' },
    mixing: { status: 'pending', content: '', file: '', error: '' }
  });

  // 环境音频分类数据 (根据assets实际文件)
  const environmentAudioCategories = {
    rain: {
      title: '🌧️ 雨声系列',
      items: [
        { id: 'light-rain', name: '轻雨', description: '轻柔雨滴声' },
        { id: 'heavy-rain', name: '大雨', description: '强烈雨声' },
        { id: 'rain-on-window', name: '窗雨', description: '雨打窗户声' },
        { id: 'rain-on-tent', name: '帐篷雨', description: '雨打帐篷声' },
        { id: 'rain-on-leaves', name: '叶雨', description: '雨打树叶声' },
        { id: 'rain-on-car-roof', name: '车顶雨', description: '雨打车顶声' },
        { id: 'rain-on-umbrella', name: '伞雨', description: '雨打雨伞声' },
        { id: 'thunder', name: '雷声', description: '雷鸣声' }
      ]
    },
    nature: {
      title: '🌿 自然音效',
      items: [
        { id: 'jungle', name: '丛林', description: '热带丛林声' },
        { id: 'waves', name: '海浪', description: '海浪拍岸' },
        { id: 'wind', name: '微风', description: '轻柔风声' },
        { id: 'campfire', name: '篝火', description: '温暖火声' },
        { id: 'river', name: '河流', description: '潺潺流水' },
        { id: 'waterfall', name: '瀑布', description: '瀑布水声' },
        { id: 'wind-in-trees', name: '林风', description: '风吹树叶' },
        { id: 'underwater', name: '水下', description: '水下环境音' }
      ]
    },
    urban: {
      title: '🏙️ 城市音效',
      items: [
        { id: 'road', name: '公路', description: '远处车流声' },
        { id: 'windshield-wipers', name: '雨刷', description: '汽车雨刷声' },
        { id: 'walk-on-gravel', name: '碎石路', description: '走在碎石路上' },
        { id: 'walk-on-leaves', name: '落叶路', description: '踩踏落叶声' },
        { id: 'walk-in-snow', name: '雪地', description: '雪地行走声' }
      ]
    },
    other: {
      title: '🎵 其他音效',
      items: [
        { id: 'boiling-water', name: '沸水', description: '水开沸腾声' },
        { id: 'bubbles', name: '气泡', description: '水中气泡声' },
        { id: 'droplets', name: '水滴', description: '滴水声' },
        { id: 'howling-wind', name: '狂风', description: '呼啸风声' },
        { id: 'morse-code', name: '摩斯码', description: '电报摩斯码' },
        { id: 'singing-bowl', name: '颂钵', description: '西藏颂钵声' },
        { id: 'slide-projector', name: '幻灯机', description: '老式幻灯机' },
        { id: 'tuning-radio', name: '调频', description: '收音机调频' },
        { id: 'vinyl-effect', name: '黑胶', description: '黑胶唱片效果' },
        { id: 'wind-chimes', name: '风铃', description: '风铃声' }
      ]
    }
  };

  // 白噪音分类数据 (5种独立音轨，根据assets实际文件)
  const whiteNoiseCategories = {
    whitenoise: {
      title: '🔊 白噪音音轨',
      items: [
        { id: 'white', name: '白噪音', description: '全频段均匀噪音' },
        { id: 'pink', name: '粉红噪音', description: '1/f噪音，助眠效果好' },
        { id: 'brown', name: '棕色噪音', description: '低频丰富，深度放松' },
        { id: 'blue', name: '蓝噪音', description: '高频突出，提高专注' },
        { id: 'violet', name: '紫噪音', description: '超高频，清醒专注' }
      ]
    }
  };

  // 初始化WebSocket和加载数据
  useEffect(() => {
    const newSocket = io('ws://localhost:8080');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('progress', (data: ProgressUpdate) => {
      updateTaskProgress(data);

      // 只有当新任务开始时才设置当前处理的任务ID和重置步骤
      if (data.task_id !== currentProcessingTaskId) {
        console.log('🆕 新任务开始:', data.task_id);
        setCurrentProcessingTaskId(data.task_id);

        // 只有在新任务开始时才重置步骤状态
        if (data.progress === 0) {
          setCurrentTaskSteps({
            outline: { status: 'not_started', content: '', file: '', error: '' },
            expansion: { status: 'not_started', content: '', file: '', error: '' },
            tts: { status: 'not_started', content: '', file: '', error: '' },
            binaural: { status: 'not_started', content: '', file: '', error: '' },
            background: { status: 'not_started', content: '', file: '', error: '' },
            mixing: { status: 'not_started', content: '', file: '', error: '' }
          });
        }
      }

      // 根据步骤更新详情
      console.log('Progress update:', data.current_step, data);

      // 根据当前步骤更新状态
      if (data.current_step.includes('Dify工作流')) {
        setCurrentTaskSteps(prev => ({
          ...prev,
          outline: { status: 'processing', content: '正在生成大纲...', file: '', error: '' },
          expansion: { status: 'processing', content: '正在扩写内容...', file: '', error: '' }
        }));
      } else if (data.current_step.includes('TTS')) {
        setCurrentTaskSteps(prev => ({
          ...prev,
          outline: { status: 'completed', content: '大纲生成完成', file: '', error: '' },
          expansion: { status: 'completed', content: '内容扩写完成', file: '', error: '' },
          tts: { status: 'processing', content: '正在转换语音...', file: '', error: '' }
        }));
      } else if (data.current_step.includes('双耳节拍')) {
        setCurrentTaskSteps(prev => ({
          ...prev,
          tts: { status: 'completed', content: '语音转换完成', file: '', error: '' },
          binaural: { status: 'processing', content: '正在生成双耳节拍...', file: '', error: '' }
        }));
      } else if (data.current_step.includes('背景音轨')) {
        setCurrentTaskSteps(prev => ({
          ...prev,
          binaural: { status: 'completed', content: '双耳节拍生成完成', file: '', error: '' },
          background: { status: 'processing', content: '正在处理背景音轨...', file: '', error: '' }
        }));
      } else if (data.current_step.includes('音频混合')) {
        setCurrentTaskSteps(prev => ({
          ...prev,
          background: { status: 'completed', content: '背景音轨处理完成', file: '', error: '' },
          mixing: { status: 'processing', content: '正在混合音频...', file: '', error: '' }
        }));
      }
    });

    // 监听步骤更新事件（第一个监听器）
    newSocket.on('step_update', (data: any) => {
      console.log('📡 Step update received:', data);
      setCurrentTaskSteps(prev => ({
        ...prev,
        [data.step]: {
          status: data.status,
          content: data.content || prev[data.step]?.content || '',
          file: data.file || prev[data.step]?.file || '',
          error: data.error || prev[data.step]?.error || ''
        }
      }));
    });

    newSocket.on('completed', (data: ProgressUpdate) => {
      updateTaskProgress(data);

      // 任务完成时，保持当前步骤内容，只更新状态为完成
      setCurrentTaskSteps(prevSteps => ({
        outline: { ...prevSteps.outline, status: 'completed' },
        expansion: { ...prevSteps.expansion, status: 'completed' },
        tts: { ...prevSteps.tts, status: 'completed' },
        binaural: { ...prevSteps.binaural, status: 'completed' },
        background: { ...prevSteps.background, status: 'completed' },
        mixing: { ...prevSteps.mixing, status: 'completed', file: (data as any).output_file || '' }
      }));

      // 清除当前处理任务ID
      setCurrentProcessingTaskId(null);

      // 重新加载任务列表以获取最新状态
      loadTasks();

      message.success('任务完成！');
    });

    newSocket.on('failed', (data: ProgressUpdate) => {
      updateTaskProgress(data);
      message.error('任务失败：' + data.message);
    });

    // 删除重复的 step_update 监听器

    // 加载任务列表和配置
    loadTasks();
    loadConfigs();
    loadLastUsedConfig();

    return () => {
      newSocket.close();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, []);

  // 更新任务进度
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

  // 加载任务列表
  const loadTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      console.log('Tasks response:', response.data);
      // 确保返回的是数组
      const tasksData = Array.isArray(response.data) ? response.data : [];
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      // 如果加载失败，设置为空数组
      setTasks([]);
    }
  };

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      const response = await axios.get('/api/configs');
      console.log('Configs response:', response.data);
      // 后端返回的是 {configs: Array, lastUsed: Object} 格式
      const configsData = response.data?.configs || [];
      setSavedConfigs(Array.isArray(configsData) ? configsData : []);
    } catch (error) {
      console.error('Failed to load configs:', error);
      // 如果加载失败，设置为空数组
      setSavedConfigs([]);
    }
  };

  // 加载最后使用的配置
  const loadLastUsedConfig = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/configs');
      const data = await response.json();
      if (data.lastUsed && data.lastUsed.config) {
        const config = data.lastUsed.config;
        setVolumes(config.volumes || { voice: 5, binaural: 10, background: 70, environment: 50 });
        setBinauralType(config.binauralType || 'alpha');
        setNoiseTypes(config.noiseTypes || config.noiseType ? [config.noiseType] : ['rain']); // 兼容旧配置
        setWhiteNoiseType(config.whiteNoiseType || 'pink');
        setVoiceSpeed(config.voiceSpeed || 6);

        // 更新时长并同步分钟秒显示
        const configDuration = config.duration || 30;
        updateMinutesSecondsFromDuration(configDuration);
      }
    } catch (error) {
      console.error('加载最后使用的配置失败:', error);
    }
  };

  // 音频预览控制
  const previewAudio = (type: string, filename: string) => {
    const audioId = `${type}-${filename}`;

    if (playingAudioId === audioId && currentAudio) {
      stopAudio();
      return;
    }

    if (currentAudio) {
      stopAudio();
    }

    // 根据类型确定正确的API路径
    let apiType = type;

    if (type === 'environment') {
      apiType = 'bgm'; // 环境音频使用bgm API
    } else if (type === 'whitenoise') {
      apiType = 'whitenoise'; // 白噪音使用whitenoise API
    }

    // 直接使用文件名，后端会自动添加正确的扩展名
    const audioUrl = `http://localhost:8080/api/tasks/preview/${apiType}/${filename}`;
    console.log(`🎵 尝试预览音频: ${audioUrl}`);
    const audio = new Audio(audioUrl);

    audio.addEventListener('loadstart', () => {
      console.log(`✅ 音频开始加载: ${audioUrl}`);
      setIsPlaying(true);
      setPlayingAudioId(audioId);
      setCurrentAudio(audio);
    });

    audio.addEventListener('canplay', () => {
      console.log(`✅ 音频可以播放: ${audioUrl}`);
    });

    audio.addEventListener('ended', () => {
      console.log(`⏹️ 音频播放结束: ${audioUrl}`);
      setIsPlaying(false);
      setPlayingAudioId(null);
      setCurrentAudio(null);
    });

    audio.addEventListener('error', (e) => {
      console.error('❌ 音频播放错误:', e);
      console.error('❌ 音频URL:', audioUrl);
      setIsPlaying(false);
      setPlayingAudioId(null);
      setCurrentAudio(null);
      message.error(`音频预览失败: ${filename} (${audioUrl})`);
    });

    audio.play().catch(error => {
      console.error('❌ 音频播放启动失败:', error);
      console.error('❌ 音频URL:', audioUrl);
      message.error(`音频播放启动失败: ${filename}`);
    });
  };

  // 停止音频播放
  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    setIsPlaying(false);
    setPlayingAudioId(null);
    setCurrentAudio(null);
  };

  // 创建任务
  const createTask = async () => {
    if (!userInput.trim()) {
      message.warning('请输入任务内容');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('user_input', userInput);
      formData.append('duration', duration.toString());
      formData.append('binaural_type', binauralType);
      formData.append('noise_types', JSON.stringify(noiseTypes)); // 环境音频多选
      formData.append('voice_speed', voiceSpeed.toString());
      formData.append('volume_voice', (volumes.voice / 100).toString());
      formData.append('volume_binaural', (volumes.binaural / 100).toString());
      formData.append('volume_background', (volumes.background / 100).toString());
      formData.append('volume_environment', (volumes.environment / 100).toString());

      // 音频命名
      if (audioName.trim()) {
        formData.append('audio_name', audioName.trim());
      }

      // 如果选择了白噪音，添加白噪音参数
      if (whiteNoiseType && whiteNoiseType !== 'none') {
        formData.append('white_noise_type', whiteNoiseType);
      }

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

      // 保存当前配置为最后使用的配置
      try {
        await axios.post('/api/configs/last-used', {
          config: {
            volumes,
            binauralType,
            noiseTypes,
            whiteNoiseType,
            voiceSpeed,
            duration: durationMinutes * 60 + durationSeconds
          }
        });
        console.log('✅ 当前配置已保存为最后使用的配置');
      } catch (configError) {
        console.error('❌ 保存最后使用的配置失败:', configError);
      }

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

  // 保存配置
  const saveConfig = async () => {
    if (!configName.trim()) {
      message.warning('请输入配置名称');
      return;
    }

    try {
      const config = {
        volumes,
        binauralType,
        noiseTypes,
        whiteNoiseType,
        voiceSpeed,
        duration: durationMinutes * 60 + durationSeconds
      };

      await axios.post('/api/configs', {
        name: configName,
        config
      });

      message.success('配置保存成功');
      setConfigName('');
      loadConfigs();
    } catch (error) {
      message.error('保存配置失败');
      console.error('Failed to save config:', error);
    }
  };

  // 应用配置
  const applyConfig = async (config: any) => {
    const newVolumes = config.volumes || { voice: 5, binaural: 10, background: 70, environment: 50 };
    setVolumes(newVolumes);
    setBinauralType(config.binauralType || 'alpha');
    setNoiseTypes(config.noiseTypes || config.noiseType ? [config.noiseType] : ['rain']); // 兼容旧配置
    setWhiteNoiseType(config.whiteNoiseType || 'pink');
    setVoiceSpeed(config.voiceSpeed || 6);

    // 更新时长并同步分钟秒显示
    const configDuration = config.duration || 30;
    updateMinutesSecondsFromDuration(configDuration);

    // 保存为最后使用的配置
    try {
      await axios.post('/api/configs/last-used', {
        config: {
          volumes: newVolumes,
          binauralType: config.binauralType || 'alpha',
          noiseTypes: config.noiseTypes || config.noiseType ? [config.noiseType] : ['rain'],
          whiteNoiseType: config.whiteNoiseType || 'pink',
          voiceSpeed: config.voiceSpeed || 6,
          duration: configDuration
        }
      });
      console.log('✅ 最后使用的配置已保存');
    } catch (error) {
      console.error('❌ 保存最后使用的配置失败:', error);
    }

    message.success('配置已应用');
  };

  // 删除配置
  const deleteConfig = async (configId: string) => {
    try {
      await axios.delete(`/api/configs/${configId}`);
      message.success('配置删除成功');
      loadConfigs();
    } catch (error) {
      message.error('删除配置失败');
      console.error('Failed to delete config:', error);
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      🧠 双耳节拍类型
                    </label>
                    <Select
                      value={binauralType}
                      onChange={setBinauralType}
                      style={{ width: '100%' }}
                    >
                      <Option value="alpha">Alpha (10Hz) - 放松专注</Option>
                      <Option value="beta">Beta (20Hz) - 提高警觉</Option>
                      <Option value="theta">Theta (6Hz) - 深度放松</Option>
                      <Option value="delta">Delta (3Hz) - 深度睡眠</Option>
                    </Select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      ⏱️ 音频时长 (0-10分钟)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <InputNumber
                        min={0}
                        max={10}
                        value={durationMinutes}
                        onChange={(value) => {
                          const minutes = value || 0;
                          updateDurationFromMinutesSeconds(minutes, durationSeconds);
                        }}
                        style={{ width: '80px' }}
                        placeholder="0"
                      />
                      <span>分</span>
                      <InputNumber
                        min={0}
                        max={59}
                        value={durationSeconds}
                        onChange={(value) => {
                          const seconds = value || 0;
                          updateDurationFromMinutesSeconds(durationMinutes, seconds);
                        }}
                        style={{ width: '80px' }}
                        placeholder="0"
                      />
                      <span>秒</span>
                      <span style={{ marginLeft: '12px', color: '#666', fontSize: '12px' }}>
                        总计: {Math.floor(duration / 60)}分{duration % 60}秒
                      </span>
                    </div>
                  </div>

                  {/* 音频命名 */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      🎵 音频命名 (可选)
                    </label>
                    <Input
                      value={audioName}
                      onChange={(e) => setAudioName(e.target.value)}
                      placeholder="为您的音频起个名字，留空则自动生成"
                      maxLength={50}
                      showCount
                    />
                  </div>
                </div>

                {/* 环境音频选择 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    🌿 环境音频多选 (34种自然音效)
                  </label>
                  <Space>
                    <Button
                      type="default"
                      onClick={() => setShowAudioSelector(true)}
                      icon="🎵"
                    >
                      多选环境音频 ({noiseTypes.length} 种已选)
                    </Button>
                    {noiseTypes && noiseTypes.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {noiseTypes.map(type => (
                          <Tag key={type} color="green" style={{ marginBottom: '4px' }}>
                            环境音频: {type}
                          </Tag>
                        ))}
                        <Tag color="blue">已选择 {noiseTypes.length} 种音效</Tag>
                      </div>
                    )}
                  </Space>
                </div>

                {/* 白噪音选择 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    🔊 白噪音音轨 (独立音轨)
                  </label>
                  <Space>
                    <Select
                      value={whiteNoiseType}
                      onChange={setWhiteNoiseType}
                      style={{ width: '200px' }}
                    >
                      <Option value="none">不使用白噪音</Option>
                      <Option value="white">白噪音 - 全频段均匀</Option>
                      <Option value="pink">粉红噪音 - 助眠效果好</Option>
                      <Option value="brown">棕色噪音 - 深度放松</Option>
                      <Option value="blue">蓝噪音 - 提高专注</Option>
                      <Option value="violet">紫噪音 - 清醒专注</Option>
                    </Select>
                    <Button
                      type="default"
                      onClick={() => {
                        if (whiteNoiseType && whiteNoiseType !== 'none') {
                          previewAudio('whitenoise', whiteNoiseType);
                        }
                      }}
                      disabled={!whiteNoiseType || whiteNoiseType === 'none'}
                      icon="🔊"
                    >
                      试听白噪音
                    </Button>
                    {whiteNoiseType && whiteNoiseType !== 'none' && (
                      <Tag color="purple">白噪音: {whiteNoiseType}</Tag>
                    )}
                  </Space>
                </div>

                {/* 背景音乐上传 */}
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
                      return false;
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

                {/* 音量控制 */}
                <div>
                  <label style={{ display: 'block', marginBottom: '16px', fontWeight: 'bold' }}>
                    🎚️ 音量控制
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>
                        🎤 语音音量: {volumes.voice}%
                      </label>
                      <Slider
                        min={0}
                        max={100}
                        value={volumes.voice}
                        onChange={(value) => setVolumes(prev => ({ ...prev, voice: value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>
                        🧠 双耳节拍: {volumes.binaural}%
                      </label>
                      <Slider
                        min={0}
                        max={100}
                        value={volumes.binaural}
                        onChange={(value) => setVolumes(prev => ({ ...prev, binaural: value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>
                        🎵 背景音轨: {volumes.background}%
                      </label>
                      <Slider
                        min={0}
                        max={100}
                        value={volumes.background}
                        onChange={(value) => setVolumes(prev => ({ ...prev, background: value }))}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px' }}>
                        🌿 环境音频: {volumes.environment}%
                      </label>
                      <Slider
                        min={0}
                        max={100}
                        value={volumes.environment}
                        onChange={(value) => setVolumes(prev => ({ ...prev, environment: value }))}
                      />
                    </div>
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

            {/* 任务列表 */}
            <Card
              title="任务列表"
              extra={
                <Space>
                  {isPlaying && (
                    <Button
                      type="primary"
                      danger
                      onClick={stopAudio}
                      icon="⏹️"
                    >
                      停止播放
                    </Button>
                  )}
                  <Button
                    type="primary"
                    ghost
                    onClick={() => {
                      console.log('配置管理按钮被点击');
                      setShowConfigModal(true);
                    }}
                    icon="⚙️"
                  >
                    配置管理
                  </Button>
                  <Button
                    danger
                    onClick={async () => {
                      try {
                        await axios.delete('/api/tasks');
                        setTasks([]);
                        message.success('任务列表已清空');
                      } catch (error) {
                        console.error('Failed to clear tasks:', error);
                        message.error('清空任务列表失败');
                      }
                    }}
                    icon="🗑️"
                  >
                    清空列表
                  </Button>
                </Space>
              }
            >
              <List
                dataSource={tasks}
                locale={{ emptyText: '暂无任务，创建您的第一个音频任务吧！' }}
                renderItem={(task) => (
                  <List.Item key={task.id}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1, marginRight: '16px' }}>
                          <Paragraph style={{ margin: 0, fontWeight: 'bold' }}>
                            {task.userInput || task.user_input || '无标题'}
                          </Paragraph>
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                            创建时间: {new Date(task.createdAt || task.created_at || task.startTime || Date.now()).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <Tag color={
                            task.status === 'completed' ? 'green' :
                            task.status === 'failed' ? 'red' :
                            task.status === 'processing' ? 'blue' : 'default'
                          }>
                            {task.status === 'pending' ? '等待中' :
                             task.status === 'processing' ? '处理中' :
                             task.status === 'completed' ? '已完成' :
                             task.status === 'failed' ? '失败' : '未知'}
                          </Tag>
                        </div>
                      </div>

                      {task.status === 'processing' && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            当前步骤: {task.current_step}
                          </div>
                          <Progress percent={task.progress} size="small" />
                        </div>
                      )}

                      {task.status === 'completed' && (
                        <div className="audio-player">
                          <Space>
                            {(task.output_file || task.outputFile) && (
                              <>
                                <Button
                                  type="primary"
                                  icon={playingAudioId === `output-${(task.output_file || task.outputFile)?.split('/').pop()}` ? "⏹️" : "🎵"}
                                  onClick={() => {
                                    const filename = (task.output_file || task.outputFile)?.split('/').pop();
                                    previewAudio('output', filename || '');
                                  }}
                                >
                                  {playingAudioId === `output-${(task.output_file || task.outputFile)?.split('/').pop()}` ? '停止预览' : '预览音频'}
                                </Button>
                                <Button
                                  type="primary"
                                  icon="📥"
                                  onClick={() => {
                                    const filename = (task.output_file || task.outputFile)?.split('/').pop();
                                    const downloadUrl = `http://localhost:8080/api/tasks/download/${filename}`;
                                    console.log(`📥 下载音频文件: ${downloadUrl}`);

                                    // 使用 fetch 检查文件是否存在
                                    fetch(downloadUrl, { method: 'HEAD' })
                                      .then(response => {
                                        if (response.ok) {
                                          const link = document.createElement('a');
                                          link.href = downloadUrl;
                                          link.download = filename || 'audio.mp3';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          message.success('开始下载音频文件');
                                        } else {
                                          console.error('❌ 文件不存在:', downloadUrl);
                                          message.error('音频文件不存在或下载失败');
                                        }
                                      })
                                      .catch(error => {
                                        console.error('❌ 下载检查失败:', error);
                                        message.error('下载失败，请稍后重试');
                                      });
                                  }}
                                >
                                  下载音频
                                </Button>
                              </>
                            )}
                            <Button
                              type="default"
                              icon="📋"
                              onClick={() => {
                                console.log('查看详情按钮被点击', task);
                                setSelectedTask(task);
                                setShowTaskDetail(true);
                              }}
                            >
                              查看详情
                            </Button>
                          </Space>
                        </div>
                      )}

                      {task.status === 'failed' && (task.error_msg || task.errorMsg) && (
                        <Paragraph type="danger">
                          错误：{task.error_msg || task.errorMsg}
                        </Paragraph>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </div>

          {/* 右侧：当前任务详情 */}
          <div>
            <Card
              title={currentProcessingTaskId ? "当前任务详情" : "当前任务详情 (无正在处理的任务)"}
              style={{ marginBottom: '24px' }}
            >
              {currentProcessingTaskId ? (
              <div>
                {/* 步骤1：大纲生成 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.outline.status === 'completed' ? '✅' :
                       currentTaskSteps.outline.status === 'processing' ? '⏳' :
                       currentTaskSteps.outline.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>1. 大纲生成</strong>
                  </div>
                  {currentTaskSteps.outline.content && (
                    <div style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                      {currentTaskSteps.outline.content}
                    </div>
                  )}
                  {currentTaskSteps.outline.error && (
                    <div style={{ fontSize: '12px', color: 'red' }}>
                      错误: {currentTaskSteps.outline.error}
                    </div>
                  )}
                </div>

                {/* 步骤2：内容扩写 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.expansion.status === 'completed' ? '✅' :
                       currentTaskSteps.expansion.status === 'processing' ? '⏳' :
                       currentTaskSteps.expansion.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>2. 内容扩写</strong>
                  </div>
                  {currentTaskSteps.expansion.content && (
                    <Collapse size="small">
                      <Panel header="查看扩写内容" key="1">
                        <div style={{ fontSize: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                          {currentTaskSteps.expansion.content}
                        </div>
                      </Panel>
                    </Collapse>
                  )}
                </div>

                {/* 步骤3：TTS语音转换 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.tts.status === 'completed' ? '✅' :
                       currentTaskSteps.tts.status === 'processing' ? '⏳' :
                       currentTaskSteps.tts.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>3. TTS语音转换</strong>
                  </div>
                  {currentTaskSteps.tts.file && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => previewAudio('voice', currentTaskSteps.tts.file.split('/').pop() || '')}
                    >
                      🎤 预览语音文件
                    </Button>
                  )}
                </div>

                {/* 步骤4：双耳节拍生成 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.binaural.status === 'completed' ? '✅' :
                       currentTaskSteps.binaural.status === 'processing' ? '⏳' :
                       currentTaskSteps.binaural.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>4. 双耳节拍生成</strong>
                  </div>
                  {currentTaskSteps.binaural.file && (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => previewAudio('binaural', currentTaskSteps.binaural.file.split('/').pop() || '')}
                    >
                      🧠 预览双耳节拍
                    </Button>
                  )}
                </div>

                {/* 步骤5：背景音轨处理 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.background.status === 'completed' ? '✅' :
                       currentTaskSteps.background.status === 'processing' ? '⏳' :
                       currentTaskSteps.background.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>5. 背景音轨处理</strong>
                  </div>
                </div>

                {/* 步骤6：音频混合 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ marginRight: '8px' }}>
                      {currentTaskSteps.mixing.status === 'completed' ? '✅' :
                       currentTaskSteps.mixing.status === 'processing' ? '⏳' :
                       currentTaskSteps.mixing.status === 'failed' ? '❌' : '⭕'}
                    </span>
                    <strong>6. 音频混合</strong>
                  </div>
                  {currentTaskSteps.mixing.file && (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => previewAudio('output', currentTaskSteps.mixing.file.split('/').pop() || '')}
                    >
                      🎵 预览最终音频
                    </Button>
                  )}
                </div>
              </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                  <div>暂无正在处理的任务</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>创建新任务后，处理进度将在这里显示</div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* 环境音频选择模态框 */}
        <Modal
          title={`🌿 选择环境音频 (34种自然音效) - 已选择 ${noiseTypes.length} 种`}
          open={showAudioSelector}
          onCancel={() => setShowAudioSelector(false)}
          footer={[
            <Button key="clear" onClick={() => setNoiseTypes([])}>
              清空选择
            </Button>,
            <Button key="cancel" onClick={() => setShowAudioSelector(false)}>
              取消
            </Button>,
            <Button key="ok" type="primary" onClick={() => setShowAudioSelector(false)}>
              确认选择 ({noiseTypes.length} 种)
            </Button>
          ]}
          width={900}
        >
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {Object.entries(environmentAudioCategories).map(([categoryKey, category]) => (
              <div key={categoryKey} style={{ marginBottom: '24px' }}>
                <Title level={4}>{category.title}</Title>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                  {category.items.map((item) => (
                    <AudioPreviewCard
                      key={item.id}
                      title={item.name}
                      description={item.description}
                      audioId={item.id}
                      category="environment"
                      isSelected={noiseTypes.includes(item.id)}
                      isPlaying={playingAudioId === `environment-${item.id}`}
                      onSelect={() => {
                        if (noiseTypes.includes(item.id)) {
                          // 如果已选中，则取消选择
                          setNoiseTypes(prev => prev.filter(type => type !== item.id));
                        } else {
                          // 如果未选中，则添加到选择列表
                          setNoiseTypes(prev => [...prev, item.id]);
                        }
                      }}
                      onPreview={() => previewAudio('environment', item.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>

        {/* 配置管理模态框 */}
        <Modal
          title="⚙️ 配置管理"
          open={showConfigModal}
          onCancel={() => {
            console.log('配置管理模态框关闭');
            setShowConfigModal(false);
            setConfigName('');
          }}
          footer={[
            <Button key="close" onClick={() => setShowConfigModal(false)}>
              关闭
            </Button>
          ]}
          width={600}
        >
          <div>
            <h3>💾 保存当前音量配置</h3>
            <Space style={{ width: '100%', marginBottom: '24px' }}>
              <Input
                placeholder="输入配置名称"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                style={{ width: '200px' }}
              />
              <Button type="primary" onClick={saveConfig}>
                💾 保存配置
              </Button>
            </Space>

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
          </div>
        </Modal>

        {/* 任务详情模态框 */}
        <Modal
          title={`📋 任务详情${(selectedTask?.userInput || selectedTask?.user_input) ? ` - ${(selectedTask.userInput || selectedTask.user_input || '').substring(0, 20)}...` : ''}`}
          open={showTaskDetail}
          onCancel={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
          footer={[
            <Button key="close" onClick={() => setShowTaskDetail(false)}>
              关闭
            </Button>
          ]}
          width={800}
        >
          {selectedTask && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <strong>📝 用户输入：</strong>
                <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '8px' }}>
                  {selectedTask.userInput || selectedTask.user_input || '无内容'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <strong>📊 任务状态：</strong>
                <Tag color={
                  selectedTask.status === 'completed' ? 'green' :
                  selectedTask.status === 'failed' ? 'red' :
                  selectedTask.status === 'processing' ? 'blue' : 'default'
                } style={{ marginLeft: '8px' }}>
                  {selectedTask.status === 'pending' ? '等待中' :
                   selectedTask.status === 'processing' ? '处理中' :
                   selectedTask.status === 'completed' ? '已完成' :
                   selectedTask.status === 'failed' ? '失败' : '未知'}
                </Tag>
              </div>

              {/* 显示大纲内容 */}
              {selectedTask.outline && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>📋 大纲内容：</strong>
                  <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                    {selectedTask.outline}
                  </div>
                </div>
              )}

              {/* 显示扩写内容 */}
              {selectedTask.content && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>📝 扩写内容：</strong>
                  <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', marginTop: '8px', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                    {selectedTask.content}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <strong>⏰ 创建时间：</strong>
                <span style={{ marginLeft: '8px' }}>
                  {new Date(selectedTask.createdAt || selectedTask.created_at || selectedTask.startTime || Date.now()).toLocaleString()}
                </span>
              </div>

              {selectedTask.status === 'completed' && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <strong>📋 大纲内容：</strong>
                    <div style={{ background: '#f0f8ff', padding: '12px', borderRadius: '4px', marginTop: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      {selectedTask.outline ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.outline}</div>
                      ) : (
                        <div style={{ color: '#666' }}>暂无大纲内容</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <strong>📄 扩写内容：</strong>
                    <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px', marginTop: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                      {selectedTask.content ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{selectedTask.content}</div>
                      ) : (
                        <div style={{ color: '#666' }}>暂无扩写内容</div>
                      )}
                    </div>
                  </div>

                  {(selectedTask.output_file || selectedTask.outputFile) && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong>🎵 最终音频：</strong>
                      <div style={{ marginTop: '8px' }}>
                        <Space>
                          <Button
                            type="primary"
                            icon="🎵"
                            onClick={() => {
                              const filename = (selectedTask.output_file || selectedTask.outputFile)?.split('/').pop();
                              previewAudio('output', filename || '');
                            }}
                          >
                            预览音频
                          </Button>
                          <Button
                            type="primary"
                            icon="📥"
                            onClick={() => {
                              const filename = (selectedTask.output_file || selectedTask.outputFile)?.split('/').pop();
                              const downloadUrl = `http://localhost:8080/api/tasks/download/${filename}`;
                              console.log(`📥 下载音频文件: ${downloadUrl}`);

                              // 使用 fetch 检查文件是否存在
                              fetch(downloadUrl, { method: 'HEAD' })
                                .then(response => {
                                  if (response.ok) {
                                    const link = document.createElement('a');
                                    link.href = downloadUrl;
                                    link.download = filename || 'audio.mp3';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    message.success('开始下载音频文件');
                                  } else {
                                    console.error('❌ 文件不存在:', downloadUrl);
                                    message.error('音频文件不存在或下载失败');
                                  }
                                })
                                .catch(error => {
                                  console.error('❌ 下载检查失败:', error);
                                  message.error('下载失败，请稍后重试');
                                });
                            }}
                          >
                            下载音频
                          </Button>
                        </Space>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedTask.status === 'failed' && (selectedTask.error_msg || selectedTask.errorMsg) && (
                <div style={{ marginBottom: '16px' }}>
                  <strong>❌ 错误信息：</strong>
                  <div style={{ background: '#fff2f0', padding: '12px', borderRadius: '4px', marginTop: '8px', color: 'red' }}>
                    {selectedTask.error_msg || selectedTask.errorMsg}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Content>
    </Layout>
  );
};

export default App;
