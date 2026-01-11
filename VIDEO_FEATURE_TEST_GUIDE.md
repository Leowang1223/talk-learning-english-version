# 視頻播放功能測試指南

## 🎥 功能概述
現在課程系統支持視頻播放功能！當課程題目包含 `video_url` 時，會自動顯示一個視頻播放器，並支持同步字幕顯示。

## ✨ 新增功能

### 1. 視頻播放器
- **自動播放**：當題目有 `video_url` 時，會自動播放視頻（替代 TTS）
- **自訂控制列**：包含播放/暫停按鈕、進度條和時間顯示
- **響應式設計**：使用 Tailwind CSS 樣式，Card 外觀
- **優雅降級**：如果沒有 `video_url`，自動回退到原有的 TTS 功能

### 2. 同步字幕
- **自動同步**：字幕會根據視頻播放時間自動顯示
- **字幕數據格式**：
  ```json
  "captions": [
    {
      "text": "字幕內容",
      "start": 0,    // 開始時間（秒）
      "end": 3       // 結束時間（秒）
    }
  ]
  ```

### 3. 數據結構更新

#### LessonStep 介面
```typescript
interface LessonStep {
  id: number
  teacher: string
  expected_answer: string | string[]
  pinyin?: string
  pinyin_examples?: string[]
  english_hint: string
  encouragement: string
  video_url?: string              // 🆕 視頻 URL（選填）
  captions?: {                    // 🆕 字幕數據（選填）
    text: string
    start: number
    end: number
  }[]
}
```

## 🧪 測試方法

### 方法 1：測試專用課程（推薦）
我已經創建了一個測試課程 **L11: Video Lesson Demo**

1. 啟動前後端服務：
   ```bash
   # 後端
   cd apps/backend
   npm run dev

   # 前端（新終端）
   cd apps/web
   npm run dev
   ```

2. 打開瀏覽器訪問：`http://localhost:3000`

3. 登入後選擇 **L11: Video Lesson Demo** 課程

4. 觀察以下行為：
   - 第 1 題：顯示視頻播放器，有同步字幕
   - 第 2 題：沒有視頻，使用傳統 TTS
   - 第 3 題：又顯示視頻播放器，有同步字幕

### 方法 2：添加視頻到現有課程
在任何課程 JSON 文件（如 `L1.json`）中，為任意題目添加視頻：

```json
{
  "id": 1,
  "teacher": "Watch this video...",
  "expected_answer": "你好",
  "pinyin": "nǐ hǎo",
  "english_hint": "hello",
  "encouragement": "Great!",
  "video_url": "https://example.com/video.mp4",
  "captions": [
    {
      "text": "Hello! 你好！",
      "start": 0,
      "end": 2
    },
    {
      "text": "Let's learn Chinese!",
      "start": 2,
      "end": 5
    }
  ]
}
```

## 🎬 視頻播放器特性

### 控制列組件
1. **播放/暫停按鈕**：點擊切換播放狀態
2. **進度條**：可拖動跳轉到任意時間點
3. **時間顯示**：顯示當前時間/總時長（例如：5s / 30s）
4. **視覺反饋**：
   - 進度條隨播放自動更新
   - 播放狀態圖標自動切換
   - 漸變背景提升可讀性

### 字幕顯示
- 顯示在視頻下方的灰色背景區域
- 根據視頻時間自動切換字幕內容
- 如果沒有匹配的字幕，顯示教師原始問題文本

## 🔧 技術實現

### 新增 State
```typescript
const [currentCaption, setCurrentCaption] = useState('')
const [isVideoPlaying, setIsVideoPlaying] = useState(false)
const videoRef = useRef<HTMLVideoElement>(null)
```

### 核心函數
1. **`handleVideoTimeUpdate()`**：視頻時間更新時同步字幕
2. **`toggleVideoPlayback()`**：切換播放/暫停狀態
3. **自動播放邏輯**：在 useEffect 中檢測 `video_url` 並自動播放

## 📝 注意事項

1. **視頻來源**：
   - 測試使用了公開的示範視頻（Big Buck Bunny, Elephant's Dream）
   - 實際部署時應替換為真實的教學視頻
   - 確保視頻 URL 可訪問且支持 CORS

2. **瀏覽器支持**：
   - 需要支持 HTML5 video 元素
   - 自動播放可能被瀏覽器阻擋（會自動降級為手動播放）

3. **字幕格式**：
   - 時間單位為秒
   - `start` 和 `end` 應該連續不重疊
   - 字幕文本可以包含中英文

4. **UI 保留**：
   - 所有原有的 UI 元素都完整保留
   - 視頻播放器只在有 `video_url` 時顯示
   - 不影響錄音、評分、報告等其他功能

## ✅ 功能驗證清單

- [ ] 有 `video_url` 的題目顯示視頻播放器
- [ ] 沒有 `video_url` 的題目使用 TTS
- [ ] 播放/暫停按鈕正常工作
- [ ] 進度條可以拖動
- [ ] 時間顯示正確
- [ ] 字幕與視頻同步
- [ ] 視頻播放完畢後可以繼續錄音答題
- [ ] 所有原有功能（錄音、評分、報告）正常工作

## 🎉 測試成功標準
- 視頻可以正常播放
- 控制列所有按鈕都可以使用
- 字幕顯示與視頻播放時間匹配
- 不影響原有的錄音和評分功能
- UI 美觀、響應流暢

---

**測試課程位置**：`apps/backend/src/plugins/chinese-lessons/L11.json`
**修改文件**：`apps/web/app/(protected)/lesson/[id]/page.tsx`
