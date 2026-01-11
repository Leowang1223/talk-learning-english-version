# YouTube 視頻支持更新 ✅

## 🎯 新增功能：YouTube 視頻支持

現在課程系統完全支持 **YouTube 視頻**（包括 YouTube Shorts）！

### 📝 更新內容

#### 1. 添加 YouTube 檢測和轉換函數
```typescript
// 檢測是否為 YouTube URL
const isYouTubeUrl = (url: string): boolean => {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

// 將 YouTube URL 轉換為嵌入格式
const getYouTubeEmbedUrl = (url: string): string => {
  // 支持三種格式：
  // 1. YouTube Shorts: https://youtube.com/shorts/VIDEO_ID
  // 2. 標準視頻: https://www.youtube.com/watch?v=VIDEO_ID
  // 3. 短連結: https://youtu.be/VIDEO_ID
}
```

#### 2. 更新視頻播放器 UI
- **YouTube 視頻**：使用 `<iframe>` 嵌入，支持自動播放
- **普通 MP4 視頻**：使用 `<video>` 元素，顯示自訂控制列

#### 3. 更新 L1 課程第一題
- ✅ 添加 YouTube Shorts 視頻：`https://youtube.com/shorts/LaKpMsKzAlI`
- ✅ 添加配套字幕（3 段字幕，共 9 秒）

### 🎬 支持的視頻格式

#### YouTube 視頻
- ✅ YouTube Shorts（如：`https://youtube.com/shorts/LaKpMsKzAlI`）
- ✅ 標準 YouTube 視頻（如：`https://www.youtube.com/watch?v=dQw4w9WgXcQ`）
- ✅ YouTube 短連結（如：`https://youtu.be/dQw4w9WgXcQ`）

特點：
- 使用 YouTube iframe 播放器
- 自動播放（`autoplay=1`）
- 不顯示相關視頻（`rel=0`）
- 使用 YouTube 原生控制列
- 支持全屏模式

#### 普通視頻（MP4 等）
- ✅ 直接 MP4 文件 URL
- ✅ 自訂控制列（播放/暫停、進度條、時間顯示）
- ✅ 支持字幕同步

### 📋 數據格式示例

```json
{
  "id": 1,
  "teacher": "Watch this video to learn how to say hello in Chinese.",
  "expected_answer": "你好",
  "pinyin": "nǐ hǎo",
  "english_hint": "hello",
  "encouragement": "Great job! 👏",
  "video_url": "https://youtube.com/shorts/LaKpMsKzAlI",
  "captions": [
    {
      "text": "Watch and learn how to say '你好' (hello) in Chinese!",
      "start": 0,
      "end": 3
    },
    {
      "text": "你好 (nǐ hǎo) - This is how Chinese people greet each other.",
      "start": 3,
      "end": 6
    },
    {
      "text": "Now it's your turn to practice!",
      "start": 6,
      "end": 9
    }
  ]
}
```

### 🧪 測試方法

#### 測試 L1 課程（有 YouTube Shorts）
1. 啟動前後端服務
2. 訪問 `http://localhost:3000`
3. 選擇 **L1: Self Introduction** 課程
4. 第一題會顯示 YouTube Shorts 視頻播放器
5. 視頻會自動播放
6. 可以看到字幕顯示在視頻下方

#### 測試 L11 課程（有普通視頻）
1. 選擇 **L11: Video Lesson Demo** 課程
2. 會顯示普通 MP4 視頻（來自 Google 測試視頻）
3. 有自訂控制列可以控制播放

### ✨ 技術特點

#### 智能檢測
- 自動檢測 URL 類型（YouTube vs 普通視頻）
- 根據類型選擇合適的播放器（iframe vs video）

#### YouTube 優化
- 自動轉換為嵌入格式
- 支持多種 YouTube URL 格式
- 啟用自動播放
- 禁用相關視頻推薦

#### 向後兼容
- 完全兼容普通 MP4 視頻
- 保留自訂控制列功能
- 不影響 TTS 功能

### 📁 修改的文件

1. **`apps/web/app/(protected)/lesson/[id]/page.tsx`**
   - 添加 `isYouTubeUrl()` 函數
   - 添加 `getYouTubeEmbedUrl()` 函數
   - 更新視頻播放器 UI（條件渲染 iframe 或 video）
   - 更新自動播放邏輯

2. **`apps/backend/src/plugins/chinese-lessons/L1.json`**
   - 第一題添加 YouTube Shorts URL
   - 添加配套字幕數據

### 🎯 使用建議

#### 選擇 YouTube 的時機
- ✅ 需要使用現有的 YouTube 教學視頻
- ✅ 視頻內容經常更新
- ✅ 需要利用 YouTube 的播放質量自適應
- ✅ 視頻文件很大，不想自己托管

#### 選擇普通視頻的時機
- ✅ 需要完全自訂控制列
- ✅ 需要精確的字幕同步控制
- ✅ 視頻文件較小
- ✅ 需要離線播放

### 📝 注意事項

1. **YouTube 自動播放**：
   - 某些瀏覽器可能阻止自動播放
   - 用戶需要有網絡連接

2. **字幕限制**：
   - YouTube 視頻的字幕僅為提示性文字
   - 不會與視頻時間精確同步（YouTube iframe 不支持 timeupdate 事件）
   - 如需精確字幕同步，建議使用普通 MP4 視頻

3. **URL 格式**：
   - 確保 YouTube URL 完整且有效
   - 支持 Shorts、標準視頻、短連結三種格式

### 🚀 下一步建議

1. **添加更多 YouTube 視頻**：為其他課程添加 YouTube 教學視頻
2. **字幕優化**：為 YouTube 視頻添加更詳細的提示文字
3. **播放清單**：支持 YouTube 播放清單
4. **字幕語言**：支持 YouTube 的多語言字幕

---

**更新時間**：2025-01-14  
**測試狀態**：✅ 代碼無錯誤，準備測試  
**YouTube 支持**：✅ Shorts、標準視頻、短連結  
**兼容性**：✅ 完全向後兼容
