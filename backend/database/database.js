const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const config = require('../config/config');

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../', config.database.path),
  logging: false // 设置为console.log可以看到SQL查询
});

// 定义Task模型
const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  userInput: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  outline: {
    type: DataTypes.TEXT
  },
  content: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  currentStep: {
    type: DataTypes.ENUM('outline', 'expand', 'tts', 'audio_split', 'audio_mix', 'export'),
    defaultValue: 'outline'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  errorMsg: {
    type: DataTypes.TEXT
  },
  outputFile: {
    type: DataTypes.STRING
  },
  subTheme: {
    type: DataTypes.STRING,
    defaultValue: 'focus'
  },
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// 定义AudioFile模型
const AudioFile = sequelize.define('AudioFile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  taskId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Task,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.STRING, // voice, binaural, whitenoise, bgm, final
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  }
});

// 定义关联关系
Task.hasMany(AudioFile, { foreignKey: 'taskId', as: 'audioFiles' });
AudioFile.belongsTo(Task, { foreignKey: 'taskId' });

// 初始化数据库
async function init() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // 同步模型到数据库（强制重建以添加新字段）
    await sequelize.sync({ force: true });
    console.log('✅ Database models synchronized with force rebuild.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
}

module.exports = {
  sequelize,
  Task,
  AudioFile,
  init
};
