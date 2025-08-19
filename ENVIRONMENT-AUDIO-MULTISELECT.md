# 环境音频多选功能 - 2025-08-18

## 🎯 功能描述

将原来的环境音频单选改为多选功能，用户可以同时选择多种环境音效，系统会自动混合这些音效。

## ✨ 新功能特性

### 1. **多选界面**
- 支持同时选择多种环境音效
- 实时显示已选择的音效数量
- 可以点击取消选择已选中的音效

### 2. **智能混合**
- 后端自动混合多个选中的音效
- 保持音频质量和时长一致
- 如果混合失败，自动降级到单个音效

### 3. **向后兼容**
- 兼容旧的单选配置格式
- API 同时支持 `noise_type` 和 `noise_types`
- 配置文件自动升级

## 🔧 技术实现

### 前端改动

#### 状态管理
```typescript
// 从单选改为多选数组
const [noiseTypes, setNoiseTypes] = useState<string[]>(['rain']);
```

#### 选择逻辑
```typescript
onSelect={() => {
  if (noiseTypes.includes(item.id)) {
    // 取消选择
    setNoiseTypes(prev => prev.filter(type => type !== item.id));
  } else {
    // 添加选择
    setNoiseTypes(prev => [...prev, item.id]);
  }
}}
```

#### UI 显示
- 模态框标题显示已选数量
- 按钮显示已选数量
- 标签显示所有选中的音效

### 后端改动

#### 参数处理
```javascript
// 支持新旧格式
noiseTypes: noise_types ? JSON.parse(noise_types) : (noise_type ? [noise_type] : ['rain'])
```

#### 音频混合
```javascript
// 混合多个环境音频文件
async mixMultipleAudioFiles(audioFiles, duration) {
  // 使用 FFmpeg 的 amix 滤镜混合音频
  const mixFilter = `${filterInputs}amix=inputs=${audioFiles.length}:duration=longest`;
}
```

## 📱 用户界面

### 选择界面
```
🌿 环境音频多选 (34种自然音效) - 已选择 3 种

[多选环境音频 (3 种已选)]

已选择的音效：
[环境音频: rain] [环境音频: thunder] [环境音频: wind]
[已选择 3 种音效]
```

### 模态框
```
🌿 选择环境音频 (34种自然音效) - 已选择 3 种

[清空选择] [取消] [确认选择 (3 种)]
```

## 🎵 音频处理流程

1. **收集选中音效**：获取用户选择的所有环境音效
2. **准备音频文件**：为每个音效找到对应的音频文件
3. **调整时长**：将所有音频调整到目标时长
4. **混合音频**：使用 FFmpeg 混合多个音频轨道
5. **集成到最终输出**：将混合后的环境音频加入最终混音

## 🔄 兼容性处理

### 配置文件兼容
```javascript
// 自动转换旧格式
setNoiseTypes(config.noiseTypes || config.noiseType ? [config.noiseType] : ['rain']);
```

### API 兼容
```javascript
// 同时支持新旧参数
const noiseTypes = noise_types ? JSON.parse(noise_types) : 
                  (noise_type ? [noise_type] : ['rain']);
```

## 🧪 测试用例

### 基本功能
- ✅ 选择单个音效（兼容原功能）
- ✅ 选择多个音效
- ✅ 取消选择音效
- ✅ 清空所有选择

### 音频处理
- ✅ 单个音效正常播放
- ✅ 多个音效正确混合
- ✅ 混合失败时的降级处理

### 配置管理
- ✅ 保存多选配置
- ✅ 加载多选配置
- ✅ 兼容旧单选配置

## 🎯 使用场景

### 丰富的音效组合
- **雨天场景**：雨声 + 雷声 + 风声
- **森林场景**：鸟鸣 + 风吹树叶 + 流水
- **海边场景**：海浪 + 海鸥 + 风声
- **夜晚场景**：蟋蟀 + 猫头鹰 + 轻风

### 个性化定制
- 用户可以创建独特的音效组合
- 保存个人喜好的多选配置
- 根据不同场景选择不同组合

## 🚀 优势

1. **更丰富的音效体验**：多种音效叠加创造更真实的环境
2. **个性化定制**：用户可以创建独特的音效组合
3. **完全兼容**：不影响现有功能和配置
4. **智能处理**：自动混合和降级处理
5. **直观操作**：简单的点击选择界面
