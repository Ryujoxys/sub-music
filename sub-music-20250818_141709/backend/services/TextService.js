const axios = require('axios');
const config = require('../config/config');

class TextService {
  constructor() {
    this.config = config;
  }

  // 生成内容（Dify工作流一次性完成大纲+扩写）
  async generateContent(userInput) {
    if (!this.config.dify.api_key || !this.config.dify.workflow_id) {
      // 模拟响应用于测试
      console.log('⚠️ 使用模拟内容（Dify配置缺失）');
      return this.generateMockContent(userInput);
    }

    try {
      console.log('📡 调用Dify工作流...');
      const response = await this.callDifyWorkflow(userInput);

      // 详细打印Dify响应结构
      console.log('🔍 Dify完整响应:', JSON.stringify(response.data, null, 2));

      // 尝试多种可能的字段路径
      let content = null;
      if (response.data?.outputs?.text) {
        content = response.data.outputs.text;
        console.log('✅ 从outputs.text获取内容');
      } else if (response.data?.text) {
        content = response.data.text;
        console.log('✅ 从text获取内容');
      } else if (response.data?.data?.outputs?.text) {
        content = response.data.data.outputs.text;
        console.log('✅ 从data.outputs.text获取内容');
      } else if (response.data?.answer) {
        content = response.data.answer;
        console.log('✅ 从answer获取内容');
      } else {
        content = '内容生成完成';
        console.log('❌ 未找到有效内容，使用默认值');
      }

      console.log('✅ Dify工作流响应成功，内容长度:', content.length);
      console.log('📝 Dify返回内容预览:', content.substring(0, 200) + '...');
      return content;
    } catch (error) {
      console.error('❌ Dify工作流调用失败:', error.message);
      console.log('⚠️ 使用模拟内容作为备选');
      return this.generateMockContent(userInput);
    }
  }

  // 生成大纲（保留兼容性）
  async generateOutline(userInput) {
    return this.generateContent(userInput);
  }

  // 扩写内容
  async expandContent(outline) {
    if (!this.config.dify.api_key || !this.config.dify.workflow_id) {
      // 模拟响应用于测试
      return this.generateMockContent(outline);
    }

    try {
      // 限制大纲长度，避免超过Dify的500字符限制
      const truncatedOutline = outline.length > 300 ? outline.substring(0, 300) + '...' : outline;
      const expandPrompt = `请扩写以下内容：\n${truncatedOutline}`;

      const response = await this.callDifyWorkflow(expandPrompt);

      // 从输出中提取text字段
      return response.data?.outputs?.text || response.data?.text || '内容扩写完成';
    } catch (error) {
      console.error('Dify content expansion error:', error);
      return this.generateMockContent(outline);
    }
  }

  // 调用Dify工作流
  async callDifyWorkflow(message) {
    const url = `${this.config.dify.base_url}/workflows/run`;

    const requestData = {
      inputs: {
        message: message  // 使用message作为输入变量
      },
      response_mode: "blocking",
      user: "sub-music-user"
    };

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.dify.api_key}`
    };

    console.log('Calling Dify API:', url);
    console.log('Request data:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(url, requestData, { headers });
    return response.data;
  }

  // 生成模拟大纲
  generateMockOutline(userInput) {
    const topics = userInput.toLowerCase();
    let outline = '大纲：\n';
    
    if (topics.includes('专注') || topics.includes('focus')) {
      outline += `1. 专注力的科学原理
2. 创造理想的专注环境
3. 深度专注的训练方法
4. 克服分心和干扰
5. 持续专注的心理建设`;
    } else if (topics.includes('放松') || topics.includes('relax')) {
      outline += `1. 深度放松的重要性
2. 身心放松的基本技巧
3. 呼吸与冥想练习
4. 释放压力和焦虑
5. 建立放松的生活习惯`;
    } else if (topics.includes('睡眠') || topics.includes('sleep')) {
      outline += `1. 优质睡眠的科学基础
2. 睡前放松准备
3. 改善睡眠质量的方法
4. 建立健康的睡眠习惯
5. 深度睡眠的心理暗示`;
    } else {
      outline += `1. 引言 - ${userInput}的重要性
2. 核心理念与原则
3. 实践方法与技巧
4. 心理建设与自我暗示
5. 总结与行动计划`;
    }
    
    return outline;
  }

  // 生成模拟内容
  generateMockContent(outline) {
    return `扩写内容：

${outline}

基于以上大纲，让我为你详细展开每个要点：

你拥有无限的潜能和能力。每一天，你都在变得更加优秀和强大。你的内心充满了平静与力量，能够从容面对任何挑战。

相信自己，你已经具备了成功所需的一切条件。你的思维清晰敏锐，能够专注于重要的事情。你的身心和谐统一，处于最佳的状态。

通过持续的练习和坚持，你将不断提升自己，实现内心的目标。你值得拥有美好的生活，值得获得成功和幸福。

让这些正面的信念深深植入你的潜意识，成为你前进路上的强大动力。你一定可以做到，因为你就是最好的自己！`;
  }
}

module.exports = TextService;
