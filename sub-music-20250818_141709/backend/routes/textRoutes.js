const express = require('express');
const TextService = require('../services/TextService');

const router = express.Router();
const textService = new TextService();

// 生成大纲
router.post('/outline', async (req, res) => {
  try {
    const { user_input } = req.body;
    
    if (!user_input) {
      return res.status(400).json({ error: 'user_input is required' });
    }

    const outline = await textService.generateOutline(user_input);
    res.json({ outline });
  } catch (error) {
    console.error('Generate outline error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 扩写内容
router.post('/expand', async (req, res) => {
  try {
    const { outline } = req.body;
    
    if (!outline) {
      return res.status(400).json({ error: 'outline is required' });
    }

    const content = await textService.expandContent(outline);
    res.json({ content });
  } catch (error) {
    console.error('Expand content error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
