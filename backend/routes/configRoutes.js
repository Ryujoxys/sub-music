const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../data/user-configs.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.dirname(CONFIG_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// 读取配置文件
async function readConfigs() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { configs: [], lastUsed: null };
    }
    throw error;
  }
}

// 写入配置文件
async function writeConfigs(data) {
  await ensureDataDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2));
}

// 获取所有保存的配置
router.get('/', async (req, res) => {
  try {
    const data = await readConfigs();
    res.json(data);
  } catch (error) {
    console.error('Get configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存新配置
router.post('/', async (req, res) => {
  try {
    const { name, config } = req.body;
    
    if (!name || !config) {
      return res.status(400).json({ error: 'Name and config are required' });
    }
    
    const data = await readConfigs();
    
    // 检查是否已存在同名配置
    const existingIndex = data.configs.findIndex(c => c.name === name);
    
    const newConfig = {
      id: Date.now().toString(),
      name,
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // 更新现有配置
      newConfig.id = data.configs[existingIndex].id;
      newConfig.createdAt = data.configs[existingIndex].createdAt;
      data.configs[existingIndex] = newConfig;
    } else {
      // 添加新配置
      data.configs.push(newConfig);
    }
    
    await writeConfigs(data);
    res.json(newConfig);
  } catch (error) {
    console.error('Save config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存最后使用的配置
router.post('/last-used', async (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }

    const data = await readConfigs();

    // 更新最后使用的配置
    data.lastUsed = {
      config,
      updatedAt: new Date().toISOString()
    };

    await writeConfigs(data);
    console.log('✅ 最后使用的配置已保存:', config);
    res.json({ message: 'Last used config saved successfully' });
  } catch (error) {
    console.error('Save last used config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除配置
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readConfigs();

    const index = data.configs.findIndex(c => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Config not found' });
    }

    data.configs.splice(index, 1);
    await writeConfigs(data);

    res.json({ message: 'Config deleted successfully' });
  } catch (error) {
    console.error('Delete config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存最后使用的配置
router.post('/last-used', async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }
    
    const data = await readConfigs();
    data.lastUsed = {
      config,
      updatedAt: new Date().toISOString()
    };
    
    await writeConfigs(data);
    res.json({ message: 'Last used config saved successfully' });
  } catch (error) {
    console.error('Save last used config error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
