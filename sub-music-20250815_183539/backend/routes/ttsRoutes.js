const express = require('express');
const TTSService = require('../services/TTSService');

const router = express.Router();
const ttsService = new TTSService();

// TTS转换
router.post('/convert', async (req, res) => {
  try {
    const { text, task_id } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const audioFile = await ttsService.convertText(text, task_id || 'test');
    res.json({ 
      message: 'TTS conversion completed',
      audio_file: audioFile 
    });
  } catch (error) {
    console.error('TTS conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
