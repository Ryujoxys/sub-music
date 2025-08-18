const express = require('express');
const AudioService = require('../services/AudioService');

const router = express.Router();
const audioService = new AudioService();

// 生成双耳节拍
router.post('/binaural', async (req, res) => {
  try {
    const { type, duration } = req.body;
    
    const binauralFile = await audioService.generateBinaural(
      type || 'alpha', 
      duration || 60
    );
    
    res.json({ 
      message: 'Binaural beats generated',
      file: binauralFile 
    });
  } catch (error) {
    console.error('Binaural generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 生成白噪音
router.post('/whitenoise', async (req, res) => {
  try {
    const { type, duration } = req.body;
    
    const noiseFile = await audioService.generateWhiteNoise(
      type || 'white', 
      duration || 60
    );
    
    res.json({ 
      message: 'White noise generated',
      file: noiseFile 
    });
  } catch (error) {
    console.error('White noise generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 音频混合
router.post('/mix', async (req, res) => {
  try {
    const { voice_file, binaural_file, sub_theme, task_id } = req.body;
    
    if (!voice_file) {
      return res.status(400).json({ error: 'voice_file is required' });
    }

    const finalFile = await audioService.mixAudio({
      voiceFile: voice_file,
      binauralFile: binaural_file,
      subTheme: sub_theme || 'focus',
      taskId: task_id || 'test'
    });
    
    res.json({ 
      message: 'Audio mixing completed',
      file: finalFile 
    });
  } catch (error) {
    console.error('Audio mixing error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
