import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Snackbar,
  Alert,
  Box,
  Stack,
  Avatar,
  Badge
} from '@mui/material';
import {
  PlayArrow,
  Settings,
  MusicNote,
  Refresh,
  GraphicEq,
  Headphones,
  Queue,
  CheckCircle,
  Error,
  HourglassEmpty,
  PlayCircle
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

// Material Design 主题配置
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#f44336',
    },
    warning: {
      main: '#ff9800',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
  },
});

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
  message?: string;
}

// 任务状态图标
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle color="success" />;
    case 'failed':
      return <Error color="error" />;
    case 'processing':
      return <HourglassEmpty color="primary" />;
    default:
      return <Queue color="disabled" />;
  }
};

// 任务状态颜色
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'error';
    case 'processing':
      return 'primary';
    default:
      return 'default';
  }
};

// 任务状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'processing':
      return '处理中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return '未知';
  }
};

const MaterialApp: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [duration, setDuration] = useState(30);
  const [binauralType, setBinauralType] = useState('alpha');
  const [noiseType, setNoiseType] = useState('rain');

  // UI状态
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });

  // 初始化WebSocket和加载数据
  useEffect(() => {
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
      showSnackbar('任务完成！', 'success');
    });

    newSocket.on('failed', (data: ProgressUpdate) => {
      updateTaskProgress(data);
      showSnackbar('任务失败：' + data.message, 'error');
    });

    // 加载任务列表
    loadTasks();

    return () => {
      newSocket.close();
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
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      showSnackbar('加载任务列表失败', 'error');
    }
  };

  // 显示通知
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        {/* App Bar */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
          <Toolbar>
            <MusicNote sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 600 }}>
              Sub Music - AI音频处理系统 (Material Design)
            </Typography>
            <IconButton color="primary">
              <Settings />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
            🎵 Material Design 界面演示
          </Typography>
          
          <Grid container spacing={3}>
            {/* 左侧：任务创建 */}
            <Grid item xs={12} md={8}>
              <Card elevation={2}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <GraphicEq sx={{ mr: 1, color: 'primary.main' }} />
                    创建新任务
                  </Typography>
                  
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      variant="outlined"
                      label="请输入您的诉求"
                      placeholder="例如：我想要一个关于提高专注力的音频，帮助我在工作时保持高效状态..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      inputProps={{ maxLength: 1000 }}
                      helperText={`${userInput.length}/1000`}
                    />

                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>🧠 双耳节拍类型</InputLabel>
                          <Select
                            value={binauralType}
                            label="🧠 双耳节拍类型"
                            onChange={(e) => setBinauralType(e.target.value)}
                          >
                            <MenuItem value="alpha">Alpha (10Hz) - 放松专注</MenuItem>
                            <MenuItem value="beta">Beta (20Hz) - 提高警觉</MenuItem>
                            <MenuItem value="theta">Theta (6Hz) - 深度放松</MenuItem>
                            <MenuItem value="delta">Delta (3Hz) - 深度睡眠</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>⏱️ 音频时长</InputLabel>
                          <Select
                            value={duration}
                            label="⏱️ 音频时长"
                            onChange={(e) => setDuration(Number(e.target.value))}
                          >
                            <MenuItem value={30}>30秒 - 快速体验</MenuItem>
                            <MenuItem value={60}>1分钟 - 短时专注</MenuItem>
                            <MenuItem value={300}>5分钟 - 中等时长</MenuItem>
                            <MenuItem value={600}>10分钟 - 深度体验</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                    </Grid>

                    {/* 环境音频选择 */}
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <Headphones sx={{ mr: 1 }} />
                        环境音频选择
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<PlayCircle />}
                        sx={{ mb: 2 }}
                      >
                        选择并预览环境音频 (演示版)
                      </Button>
                      {noiseType && noiseType !== 'none' && (
                        <Chip 
                          label={`已选择: ${noiseType}`} 
                          color="primary" 
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>

                    {/* 创建任务按钮 */}
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading || !userInput.trim()}
                      startIcon={loading ? <HourglassEmpty /> : <PlayArrow />}
                      sx={{ 
                        py: 2,
                        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
                        }
                      }}
                    >
                      {loading ? '创建中...' : '开始处理 (演示版)'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* 右侧：任务列表 */}
            <Grid item xs={12} md={4}>
              <Card elevation={2}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Queue sx={{ mr: 1 }} />
                      任务列表
                    </Box>
                    <Badge badgeContent={tasks.length} color="primary">
                      <IconButton size="small" onClick={loadTasks}>
                        <Refresh />
                      </IconButton>
                    </Badge>
                  </Typography>

                  <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                    {tasks.length === 0 ? (
                      <ListItem>
                        <ListItemText 
                          primary="暂无任务" 
                          secondary="创建您的第一个音频任务"
                          sx={{ textAlign: 'center' }}
                        />
                      </ListItem>
                    ) : (
                      tasks.map((task) => (
                        <ListItem key={task.id} divider>
                          <Avatar sx={{ mr: 2 }}>
                            {getStatusIcon(task.status)}
                          </Avatar>
                          <ListItemText
                            primary={
                              <Typography variant="body2" noWrap>
                                {task.user_input.length > 30 
                                  ? `${task.user_input.substring(0, 30)}...` 
                                  : task.user_input}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Chip 
                                  label={getStatusText(task.status)} 
                                  size="small" 
                                  color={getStatusColor(task.status) as any}
                                  variant="outlined"
                                />
                                {task.status === 'processing' && (
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={task.progress} 
                                    sx={{ mt: 1 }}
                                  />
                                )}
                              </Box>
                            }
                          />
                          {task.status === 'completed' && (
                            <ListItemSecondaryAction>
                              <IconButton edge="end" color="primary">
                                <PlayArrow />
                              </IconButton>
                            </ListItemSecondaryAction>
                          )}
                        </ListItem>
                      ))
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Snackbar 通知 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert 
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default MaterialApp;
