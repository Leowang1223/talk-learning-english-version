import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { conversationStore, ScenarioCheckpoint, VocabularyItem } from '../utils/conversationStore'
import { authenticateUser, AuthRequest } from '../middleware/auth'
import { supabase } from '../lib/supabase'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// ============================================================================
// 輔助函數：文本正規化（移除空白、標點）
// ============================================================================
const normalizeText = (text: string): string => {
  return text.replace(/[，。！？、\s]/g, '').toLowerCase()
}

// ============================================================================
// 禮貌用語檢測系統
// ============================================================================

/**
 * 禮貌信號接口
 */
interface PoliteSignal {
  type: 'acknowledgment' | 'thanks' | 'confirmation'
  confidence: 'high' | 'medium'
  shouldTransition: boolean
  matchedPattern: string
}

/**
 * 禮貌用語模式庫（嚴格模式）
 * 只包含明確的禮貌用語，避免誤判
 */
const POLITE_PATTERNS = {
  // 高信號強度 - 明確想結束當前話題
  acknowledgment: ['thank you so much', 'thanks a lot', 'appreciate it', 'much appreciated'],
  thanks: ['thank you', 'thanks', 'cheers', 'ty'],
  confirmation_strong: ['that\'s it', 'all set', 'perfect', 'sounds good', 'that\'s all']
}

/**
 * 檢測用戶輸入中的禮貌用語信號（嚴格模式）
 *
 * @param transcript 用戶說的話
 * @param context 對話上下文
 * @returns 禮貌信號對象，如果沒有檢測到則返回 null
 */
function detectPoliteSignal(
  transcript: string,
  context: {
    lastCheckpointJustCompleted?: boolean
    conversationTurns: number
    lastAiMessageType?: 'question' | 'statement' | 'confirmation'
  }
): PoliteSignal | null {
  const normalized = normalizeText(transcript)

  // 檢測禮貌用語類型
  let type: PoliteSignal['type'] | null = null
  let matchedPattern = ''

  // 優先檢測高信號模式
  for (const pattern of POLITE_PATTERNS.acknowledgment) {
    if (normalized.includes(normalizeText(pattern))) {
      type = 'acknowledgment'
      matchedPattern = pattern
      break
    }
  }

  if (!type) {
    for (const pattern of POLITE_PATTERNS.thanks) {
      if (normalized.includes(normalizeText(pattern))) {
        type = 'thanks'
        matchedPattern = pattern
        break
      }
    }
  }

  if (!type) {
    for (const pattern of POLITE_PATTERNS.confirmation_strong) {
      if (normalized.includes(normalizeText(pattern))) {
        type = 'confirmation'
        matchedPattern = pattern
        break
      }
    }
  }

  // 沒有檢測到任何禮貌用語
  if (!type) return null

  // 根據上下文調整信號強度
  let confidence: 'high' | 'medium' = 'high'

  // 特殊處理：檢測「繼續說話」的信號（降級為不轉換）
  const continuationKeywords = ['等等', '還要', '再', '另外', '對了', '那', '還有']
  const hasContinuation = continuationKeywords.some(kw => normalized.includes(normalizeText(kw)))

  if (hasContinuation && transcript.length > 5) {
    // 用戶想繼續說話，不應該轉換
    console.log('⚠️ Detected continuation keyword, signal ignored')
    return null
  }

  // 決定是否應該轉換話題（嚴格模式：高信號一定轉換）
  const shouldTransition = confidence === 'high'

  console.log(`🔔 Polite signal detected: type=${type}, confidence=${confidence}, pattern="${matchedPattern}", shouldTransition=${shouldTransition}`)

  return { type, confidence, shouldTransition, matchedPattern }
}

// ============================================================================
// 輔助函數：從課程 JSON 中隨機提取 3-5 個詞彙
// ============================================================================
function extractVocabularyFromLesson(lessonId: string): VocabularyItem[] {
  try {
    // 解析課程 ID（如 C1-L01 → chapter-01/lesson-01.json）
    const match = lessonId.match(/^C(\d+)-L(\d+)$/)
    if (!match) {
      console.warn(`⚠️ Invalid lesson ID format: ${lessonId}`)
      return []
    }

    const chapterNum = match[1].padStart(2, '0')
    const lessonNum = match[2].padStart(2, '0')
    const lessonsDir = path.join(__dirname, '../../src/plugins/chinese-lessons')
    const lessonPath = path.join(lessonsDir, `chapter-${chapterNum}`, `lesson-${lessonNum}.json`)

    if (!fs.existsSync(lessonPath)) {
      console.warn(`⚠️ Lesson file not found: ${lessonPath}`)
      return []
    }

    const lessonData = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'))
    const allSteps = lessonData.steps || []

    if (allSteps.length === 0) {
      return []
    }

    // 隨機選擇 3-5 個 steps
    const sampleSize = Math.min(Math.floor(Math.random() * 3) + 3, allSteps.length) // 3-5 或最多所有
    const shuffled = [...allSteps].sort(() => Math.random() - 0.5)
    const selectedSteps = shuffled.slice(0, sampleSize)

    // 提取詞彙
    const vocabulary: VocabularyItem[] = selectedSteps.map((step: any) => {
      const word = Array.isArray(step.expected_answer)
        ? step.expected_answer[0]
        : step.expected_answer
      return {
        word: word || '',
        pinyin: step.pinyin || '',
        english: step.english_hint || '',
        lessonId: lessonId
      }
    }).filter((v: VocabularyItem) => v.word) // 過濾空詞彙

    console.log(`📚 Extracted ${vocabulary.length} vocabulary items from ${lessonId}`)
    return vocabulary
  } catch (error) {
    console.error(`❌ Error extracting vocabulary from ${lessonId}:`, error)
    return []
  }
}

// ============================================================================
// 輔助函數：根據模式載入課程詞彙（最多 5 個課程）
// ============================================================================
function loadReviewVocabulary(
  mode: 'all' | 'selected',
  completedLessons?: string[],
  selectedChapters?: string[]
): { lessons: string[], vocabulary: VocabularyItem[] } {
  let lessons: string[] = []

  if (mode === 'all' && completedLessons && completedLessons.length > 0) {
    // 從已完成課程中隨機選 5 個
    const shuffled = [...completedLessons].sort(() => Math.random() - 0.5)
    lessons = shuffled.slice(0, Math.min(5, shuffled.length))
    console.log(`📖 'all' mode: Selected ${lessons.length} random lessons from ${completedLessons.length} completed`)
  } else if (mode === 'selected' && selectedChapters && selectedChapters.length > 0) {
    // 優先使用已完成課程
    if (completedLessons && completedLessons.length > 0) {
      // 80% 已完成課程
      const shuffled = [...completedLessons].sort(() => Math.random() - 0.5)
      const completedCount = Math.min(4, shuffled.length)  // 最多 4 個已完成課程
      lessons = shuffled.slice(0, completedCount)

      // 20% 新課程（從選定章節中）
      if (lessons.length < 5) {
        const lessonsDir = path.join(__dirname, '../../src/plugins/chinese-lessons')
        const allLessonsInChapters: string[] = []

        for (const chapterId of selectedChapters) {
          const chapterNum = chapterId.replace('C', '').padStart(2, '0')
          const chapterDir = path.join(lessonsDir, `chapter-${chapterNum}`)

          if (fs.existsSync(chapterDir)) {
            const files = fs.readdirSync(chapterDir).filter(f => f.endsWith('.json'))
            for (const file of files) {
              const match = file.match(/lesson-(\d+)\.json/)
              if (match) {
                const lessonNum = match[1]
                const lessonId = `${chapterId}-L${lessonNum}`
                // 只加入未完成的課程
                if (!completedLessons.includes(lessonId)) {
                  allLessonsInChapters.push(lessonId)
                }
              }
            }
          }
        }

        // 從未完成課程中隨機選 1 個
        const shuffledNew = [...allLessonsInChapters].sort(() => Math.random() - 0.5)
        const newCount = Math.min(5 - lessons.length, 1)  // 最多 1 個新課程
        lessons = [...lessons, ...shuffledNew.slice(0, newCount)]
      }

      console.log(`📖 'selected' mode: Selected ${lessons.length} lessons (${completedCount} completed + ${lessons.length - completedCount} new) from chapters ${selectedChapters.join(', ')}`)
    }
    // 降級處理：如果沒有已完成課程，使用舊邏輯
    else {
      const lessonsDir = path.join(__dirname, '../../src/plugins/chinese-lessons')
      const allLessonsInChapters: string[] = []

      for (const chapterId of selectedChapters) {
        const chapterNum = chapterId.replace('C', '').padStart(2, '0')
        const chapterDir = path.join(lessonsDir, `chapter-${chapterNum}`)

        if (fs.existsSync(chapterDir)) {
          const files = fs.readdirSync(chapterDir).filter(f => f.endsWith('.json'))
          for (const file of files) {
            const match = file.match(/lesson-(\d+)\.json/)
            if (match) {
              const lessonNum = match[1]
              allLessonsInChapters.push(`${chapterId}-L${lessonNum}`)
            }
          }
        }
      }

      const shuffled = [...allLessonsInChapters].sort(() => Math.random() - 0.5)
      lessons = shuffled.slice(0, Math.min(5, shuffled.length))
      console.log(`📖 'selected' mode (no completed): Selected ${lessons.length} random lessons from chapters ${selectedChapters.join(', ')}`)
    }
  }

  // 從每個課程提取詞彙
  const allVocabulary: VocabularyItem[] = []
  for (const lessonId of lessons) {
    const vocabFromLesson = extractVocabularyFromLesson(lessonId)
    allVocabulary.push(...vocabFromLesson)
  }

  console.log(`✅ Total vocabulary extracted: ${allVocabulary.length} items from ${lessons.length} lessons`)
  return { lessons, vocabulary: allVocabulary }
}

// ============================================================================
// 輔助函數：使用 Gemini 生成建議回覆
// ============================================================================
async function generateSuggestions(
  model: any,
  context: {
    mode: string
    conversationHistory: Array<{ role: string; text: string }>
    aiLastMessage: string | null  // 允許 null (當用戶先說話時)
    scenarioInfo?: {
      objective: string
      nextCheckpoint?: { description: string; keywords: string[] }
      userRole?: string
    }
    reviewVocabulary?: VocabularyItem[]  // 複習模式詞彙
  }
): Promise<Array<{ english: string; chinese: string; type: string }>> {
  console.log('🔧 generateSuggestions called')
  console.log('   Context mode:', context.mode)
  console.log('   AI last message:', context.aiLastMessage)
  console.log('   Review vocabulary count:', context.reviewVocabulary?.length || 0)

  const historyText = context.conversationHistory
    .slice(-4) // 最近 4 輪對話
    .map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`)
    .join('\n')

  let contextPrompt = `You are helping a language learner practice English conversation.

IMPORTANT GUIDELINES:
- Use natural, conversational English
- Use everyday American English vocabulary and expressions
- Consider English conversational norms and politeness
- Provide Traditional Chinese (Taiwan, 繁體中文) hints to help learners understand

Conversation history:
${historyText}

${context.aiLastMessage ? `AI just said: ${context.aiLastMessage}\n` : 'The user needs to start the conversation.\n'}

CRITICAL REQUIREMENT - ANSWER THE QUESTION:
- ALL suggestions MUST directly respond to what the AI just said
- If AI asked a question, suggestions MUST answer that specific question
- Do NOT give irrelevant responses (e.g., if AI asks "what fruit?", don't suggest "I want water")
- Stay on topic with the AI's message`

  if (context.mode === 'scenario' && context.scenarioInfo) {
    contextPrompt += `
Scenario objective: ${context.scenarioInfo.objective}
User role: ${context.scenarioInfo.userRole || 'student'}

ROLE CONTEXT:
- You are suggesting responses for the user playing: ${context.scenarioInfo.userRole || 'student'}
- Suggestions should match this role's perspective and typical language patterns
`
    if (context.scenarioInfo.nextCheckpoint) {
      contextPrompt += `
Next checkpoint: ${context.scenarioInfo.nextCheckpoint.description}
Keywords relevant to this checkpoint: ${context.scenarioInfo.nextCheckpoint.keywords.slice(0, 8).join(', ')}

CHECKPOINT GUIDANCE:
- Suggestions should naturally progress toward completing this checkpoint
- Use vocabulary from the checkpoint keywords where appropriate
`
    }
  } else if ((context.mode === 'all' || context.mode === 'selected') && context.reviewVocabulary) {
    // 複習模式：提供詞彙資訊給 prompt
    const vocabList = context.reviewVocabulary
      .slice(0, 10) // 最多列出 10 個詞彙
      .map(v => `${v.word} - ${v.english}`)
      .join(', ')

    contextPrompt += `
REVIEW MODE - CRITICAL RULES FOR NATURAL SUGGESTIONS:

🚫 **STRICTLY FORBIDDEN - META-CONVERSATION**:
❌ "Let's review XX" (Don't talk about reviewing)
❌ "I want to learn something new" (Don't talk about learning)
❌ "Are you ready to study?" (Don't talk about readiness)
❌ ANY reference to "learning", "reviewing", "practicing", "studying" in the context of lessons

✅ **WHAT TO DO INSTEAD**:
This is a NATURAL CONVERSATION, not a classroom.
User should respond as if chatting with a friend in English, NOT discussing the learning process.

**First Priority: Directly and naturally answer what the AI said**
- If AI says "Hi! How are you today?" → Suggest "Pretty good!", "Not bad", "A bit tired"
- If AI asks "Did you eat breakfast?" → Suggest "Yes, I did", "Not yet", "I had some bread"
- If AI asks "What have you been doing lately?" → Suggest "Relaxing at home", "Went to the park", "Watching TV"
- If AI asks "Where are you going this weekend?" → Suggest "Going to a movie", "Staying home", "Haven't decided yet"

**Second Priority: Naturally use review vocabulary**
- Available vocabulary: ${vocabList}
- Use 1 word naturally in your response (don't force it)
- Example: AI asks "What did you eat lately?", vocabulary "noodles" → "I had noodles"

**CORRECT Examples** (natural conversation):
AI says: "Hi! How was your day?"
Available words: school, friend, tired

✅ "Pretty good!" (natural greeting response - simple)
✅ "A bit tired" (natural + uses vocabulary naturally)
✅ "Went to school" (natural + uses vocabulary)
❌ "Let's review 'school'" (META-TALK - FORBIDDEN!)
❌ "I want to learn something new" (META-TALK - FORBIDDEN!)

AI says: "Did you eat breakfast?"
Available words: breakfast, bread, milk

✅ "Yes, I did!" (natural simple answer)
✅ "I had some bread" (natural + vocabulary)
✅ "Not yet" (natural alternative)
❌ "Let's review 'breakfast'" (META-TALK - FORBIDDEN!)
❌ "I want to study something else" (META-TALK - FORBIDDEN!)

**CRITICAL RULE**:
- Suggestions = what user would say in REAL LIFE English conversation
- NOT what they would say in a classroom setting
- Act like friends chatting in English, not teacher-student
`
  }

  contextPrompt += `
Generate 3 natural response suggestions for the user to say next in English.

CRITICAL REQUIREMENTS FOR ALL MODES:
- Keep it SHORT: 3-8 words per suggestion
- Keep it NATURAL: Sound like real everyday English conversation
- Keep it SIMPLE: Use only 1-2 vocabulary words per suggestion
- Keep it REALISTIC: Avoid strange or forced statements
- Use NATURAL DAILY LANGUAGE: "Want to go" not "Would you like to go" (too formal)

SUGGESTION TYPES:
- Type "safe": Simple, direct response
  * 1 short sentence, 2-5 words
  * Natural everyday expression
  * Easy for beginners

- Type "advanced": Slightly more detailed
  * 1-2 short sentences, 5-8 words
  * Natural but more complete response

- Type "alternative": Different natural response
  * Same difficulty as "safe"
  * Different phrasing or approach
  * Still natural and realistic

QUALITY REQUIREMENTS:
- Each suggestion MUST sound like something native English speakers say in daily life
- Chinese translations must be in Traditional Chinese (Taiwan, 繁體中文)
- Suggestions must be 3-8 words in length (SHORT!)

EXAMPLE OUTPUT (for review mode, AI asked "Did you eat breakfast?"):
[
  {
    "english": "Yes, I did",
    "chinese": "吃了",
    "type": "safe"
  },
  {
    "english": "I had some bread",
    "chinese": "我吃了麵包",
    "type": "advanced"
  },
  {
    "english": "Not yet",
    "chinese": "還沒吃",
    "type": "alternative"
  }
]

EXAMPLE OUTPUT (for review mode, AI asked "What fruit do you want?"):
[
  {
    "english": "I want an apple",
    "chinese": "我想吃蘋果",
    "type": "safe"
  },
  {
    "english": "Bananas are delicious",
    "chinese": "香蕉很好吃",
    "type": "advanced"
  },
  {
    "english": "I don't want fruit",
    "chinese": "我不想吃水果",
    "type": "alternative"
  }
]

WRONG EXAMPLE (DO NOT DO THIS - AI asked "What fruit do you want?"):
[
  {
    "english": "I want some water",  ❌ WRONG - AI asked about fruit, not drinks!
    "type": "safe"
  },
  {
    "english": "I'm very tired today",  ❌ WRONG - Completely off-topic!
    "type": "advanced"
  }
]

EXAMPLE OUTPUT (for asking directions scenario):
[
  {
    "english": "Excuse me, where's the subway?",
    "chinese": "請問，地鐵站在哪裡？",
    "type": "safe"
  },
  {
    "english": "How do I get to Times Square?",
    "chinese": "我要怎麼去時代廣場？",
    "type": "advanced"
  },
  {
    "english": "Is there a subway nearby?",
    "chinese": "這附近有地鐵站嗎？",
    "type": "alternative"
  }
]

Return JSON array format with exactly 3 suggestions:
[
  {
    "english": "...",
    "chinese": "...",
    "type": "safe"
  },
  {
    "english": "...",
    "chinese": "...",
    "type": "advanced"
  },
  {
    "english": "...",
    "chinese": "...",
    "type": "alternative"
  }
]`

  console.log('🌐 Calling Gemini API for suggestions...')
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: contextPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    console.log('📡 Gemini API response received, length:', responseText.length)

    const suggestions = JSON.parse(responseText)
    console.log('✅ Parsed suggestions successfully:', suggestions.length)
    console.log('   First suggestion:', suggestions[0]?.chinese)

    return suggestions.slice(0, 3) // 確保只返回 3 個
  } catch (error) {
    console.error('❌ Error in generateSuggestions Gemini call:', error)
    throw error // 重新拋出錯誤，讓調用者處理
  }
}

// ============================================================================
// POST /api/conversation/start - 初始化對話會話
// ============================================================================
router.post('/start', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { topicMode, scenarioId, userRole, interviewerId } = req.body
    const userId = req.user!.id

    console.log('🎬 Starting conversation:', { topicMode, scenarioId, userRole, userId })

    // 初始化 Gemini
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    const genAI = new GoogleGenerativeAI(apiKey!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // 如果是 scenario 模式，加載 scenario 數據
    let scenario: any = null
    let checkpoints: ScenarioCheckpoint[] = []
    let aiRole: any = null
    let firstMessage: { chinese: string; english: string } | null = null
    let suggestions: any[] = []

    if (topicMode === 'scenario' && scenarioId) {
      // 加載 scenario JSON
      const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))

      for (const file of files) {
        const content = fs.readFileSync(path.join(scenariosDir, file), 'utf-8')
        const scen = JSON.parse(content)
        if (scen.scenario_id === scenarioId) {
          scenario = scen
          break
        }
      }

      if (!scenario) {
        return res.status(404).json({
          code: 'SCENARIO_NOT_FOUND',
          message: `Scenario ${scenarioId} not found`
        })
      }

      // 初始化 checkpoints
      checkpoints = scenario.checkpoints.map((cp: any) => ({
        id: cp.id,
        description: cp.description,
        chineseDescription: cp.chineseDescription,
        keywords: cp.keywords || [],
        weight: cp.weight,
        completed: false
      }))

      // 確定 AI 角色（與用戶角色相反）
      aiRole = scenario.roles.find((r: any) => r.id !== userRole)
      if (!aiRole) {
        aiRole = scenario.roles[0] // 如果找不到，使用第一個角色
      }

      // 判斷誰應該先說話
      const firstSpeaker = scenario.firstSpeaker || 'ai' // 向後兼容：默認 AI 先說話
      const shouldAiSpeakFirst = firstSpeaker === 'ai'

      console.log(`🎙️ First speaker: ${firstSpeaker}`)

      // 只有當 AI 先說話時才生成首條消息
      if (shouldAiSpeakFirst) {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
        if (apiKey) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

            const prompt = `${aiRole.systemPrompt}

IMPORTANT: You MUST use natural, conversational English.

Scenario: ${scenario.title}
Objective: ${scenario.objective}

You are starting a conversation. Give a natural greeting in English (1-2 sentences) that sets up the scenario.

Return in JSON format:
{
  "english": "greeting in English",
  "chinese": "Traditional Chinese (繁體中文) translation"
}`

            const result = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: 'application/json'
              }
            })

            const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
            const parsed = JSON.parse(responseText)
            // Handle both array and object formats
            firstMessage = Array.isArray(parsed) ? parsed[0] : parsed
            console.log('✅ Generated AI first message:', firstMessage)
          } catch (error) {
            console.warn('⚠️ Failed to generate first message with Gemini:', error)
            // Use default greeting as fallback
            firstMessage = { english: 'Hello!', chinese: '你好！' }
          }
        } else {
          firstMessage = { english: 'Hello!', chinese: '你好！' }
        }
      } else {
        // 用戶先說話 - 不生成 AI 消息
        firstMessage = null
        console.log('👤 User will speak first')
      }

      // 獲取建議 - 優先使用 Gemini 動態生成
      const nextCheckpoint = checkpoints.find((cp: ScenarioCheckpoint) => !cp.completed)

      try {
        suggestions = await generateSuggestions(model, {
          mode: topicMode,
          conversationHistory: [],
          aiLastMessage: firstMessage?.english || null,
          scenarioInfo: {
            objective: scenario.objective,
            nextCheckpoint: nextCheckpoint ? {
              description: nextCheckpoint.description,
              keywords: nextCheckpoint.keywords || []
            } : undefined,
            userRole: userRole
          }
        })
      } catch (error) {
        console.warn('⚠️ Gemini 失敗，使用靜態建議')

        // Fallback 1: 使用 scenario JSON 中的靜態建議
        const roleSuggestions = scenario.suggestions?.byRole?.[userRole] || []

        // 優先使用符合下一個檢查點的建議
        if (nextCheckpoint && roleSuggestions.length > 0) {
          const checkpointSuggestions = roleSuggestions.filter(
            (s: any) => s.checkpointId === nextCheckpoint.id
          )
          suggestions = checkpointSuggestions.length > 0
            ? checkpointSuggestions.slice(0, 3)
            : roleSuggestions.slice(0, 3)
        } else {
          suggestions = roleSuggestions.slice(0, 3)
        }

        // Fallback 2: 通用建議 (最後手段)
        if (suggestions.length === 0) {
          suggestions = [
            { english: 'Okay', chinese: '好的', type: 'safe' },
            { english: 'I understand', chinese: '我明白了', type: 'safe' },
            { english: 'Thank you', chinese: '謝謝', type: 'safe' }
          ]
        }
      }
    } else if (topicMode === 'all' || topicMode === 'selected') {
      // 複習模式：載入課程詞彙並生成自然對話
      const { completedLessons, selectedChapters } = req.body

      // 載入課程詞彙（最多 5 個課程）
      const reviewData = loadReviewVocabulary(topicMode, completedLessons, selectedChapters)

      if (reviewData.lessons.length === 0 || reviewData.vocabulary.length === 0) {
        return res.status(400).json({
          code: 'NO_LESSONS_TO_REVIEW',
          message: '沒有可複習的課程或詞彙'
        })
      }

      // 生成 AI 首條訊息（說明將開始複習對話）
      const vocabList = reviewData.vocabulary
        .map(v => `- ${v.word} (${v.pinyin}) - ${v.english}`)
        .join('\n')

      const prompt = `You are a friendly English conversation partner, starting a natural conversation with a student.

**Opening Requirements**:
1. Length: No more than 15 words, 1-2 sentences
2. Style: Like chatting with a friend, not like a teacher in class
3. Vocabulary: Use only 1-2 review words naturally
4. Forbidden: Don't ask "How are you?", "Are you ready?", "Okay?"

**Correct Natural English Examples**:
✓ "Good morning! How was your day?" (short, natural greeting)
✓ "Hi! What have you been up to?" (open question)
✓ "Hey! What are you doing today?" (casual chat)
✓ "Want to come over today?" (natural invitation)
✓ "Where are you going this weekend?" (casual question)

**Wrong Examples** (absolutely avoid):
✗ "How are you? Do you want to come to my house?" (awkward combo, unnatural)
✗ "We're going to review vocabulary today, are you ready?" (like class, not chat)
✗ "Would you like to go somewhere?" (too formal, should say "Want to go somewhere?")

**Review Vocabulary List** (use only 1-2):
${vocabList}

Return JSON: {"english": "...", "chinese": "..."}`

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,  // 降低以提高台灣口語的一致性
            responseMimeType: 'application/json'
          }
        })

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const parsed = JSON.parse(responseText)
        firstMessage = Array.isArray(parsed) ? parsed[0] : parsed
        console.log('✅ Generated review opening:', firstMessage)
      } catch (error) {
        console.warn('⚠️ Failed to generate review opening with Gemini:', error)
        // 使用自然開場白（避免機械式的「Are you ready?」）
        const naturalOpenings = [
          { english: 'Good morning! How have you been?', chinese: '早安！最近過得怎麼樣？' },
          { english: 'Hello! What are you doing today?', chinese: '你好呀！今天要做什麼？' },
          { english: 'Hi! Anything interesting lately?', chinese: '嗨！最近有什麼有趣的事嗎？' },
          { english: 'Hey! How was your week?', chinese: '你好啊！這週過得如何？' },
          { english: 'How was your day?', chinese: '今天過得好嗎？' }
        ]
        const randomIndex = Math.floor(Math.random() * naturalOpenings.length)
        firstMessage = naturalOpenings[randomIndex]
        console.log('📝 Using natural fallback opening:', firstMessage.english)
      }

      // 生成初始建議回覆
      try {
        suggestions = await generateSuggestions(model, {
          mode: topicMode,
          conversationHistory: [],
          aiLastMessage: firstMessage?.english || null,
          reviewVocabulary: reviewData.vocabulary
        })
      } catch (error) {
        console.warn('⚠️ Failed to generate suggestions for review mode')
        // Natural fallback responses (避免元對話，使用自然日常回應)
        suggestions = [
          { english: "Pretty good!", chinese: '還不錯！', type: 'safe' },
          { english: "A bit tired", chinese: '有點累', type: 'safe' },
          { english: "Not bad", chinese: '還好啊', type: 'safe' }
        ]
      }

      // 保存複習資料到 session（稍後在 createSession 時使用）
      checkpoints = [] // 複習模式不使用 checkpoints
      aiRole = { id: 'teacher', name: 'English Teacher' }

      // 將複習資料傳遞給 session（下面會用）
      // 使用臨時變數，稍後在 createSession 時加入
      const reviewVocabulary = reviewData.vocabulary
      const reviewedLessons = reviewData.lessons

      // 創建會話
      const conversationHistory: Array<{ role: 'user' | 'ai'; text: string; timestamp: Date }> = []

      if (firstMessage) {
        conversationHistory.push({
          role: 'ai' as const,
          text: firstMessage.english,
          timestamp: new Date()
        })
      }

      const session = conversationStore.createSession({
        mode: topicMode,
        checkpoints: [],
        conversationHistory,
        reviewVocabulary,  // 新增
        reviewedLessons     // 新增
      })

      // Persist to Supabase
      await supabase.from('conversation_sessions').insert({
        user_id: userId,
        session_id: session.sessionId,
        type: 'conversation',
        mode: topicMode,
        completed_at: new Date().toISOString(),
        messages_count: conversationHistory.length,
        settings: req.body,
        conversation_data: { history: conversationHistory },
        reviewed_lessons: reviewedLessons,
        vocabulary_items: reviewVocabulary
      })

      return res.json({
        sessionId: session.sessionId,
        reviewMode: {
          lessons: reviewedLessons,
          vocabularyCount: reviewVocabulary.length
        },
        firstMessage,
        suggestions
      })
    } else {
      // Free talk 模式：AI 總是先說話
      firstMessage = { english: 'Hello!', chinese: '你好！' }

      try {
        suggestions = await generateSuggestions(model, {
          mode: topicMode,
          conversationHistory: [],
          aiLastMessage: firstMessage.english
        })
      } catch (error) {
        console.warn('⚠️ Failed to generate suggestions')
        suggestions = []
      }
    }

    // 創建會話
    const conversationHistory: Array<{ role: 'user' | 'ai'; text: string; timestamp: Date }> = []

    // 條件式添加 AI 的第一條消息
    if (firstMessage) {
      conversationHistory.push({
        role: 'ai' as const,
        text: firstMessage.english,
        timestamp: new Date()
      })
    }

    const session = conversationStore.createSession({
      mode: topicMode,
      scenarioId,
      userRole,
      aiRole: aiRole?.id,
      checkpoints,
      conversationHistory
    })

    // Persist to Supabase
    await supabase.from('conversation_sessions').insert({
      user_id: userId,
      session_id: session.sessionId,
      type: 'conversation',
      mode: topicMode,
      completed_at: new Date().toISOString(),
      messages_count: conversationHistory.length,
      settings: req.body,
      conversation_data: { history: conversationHistory },
      scenario_id: scenarioId,
      user_role: userRole,
      ai_role: aiRole?.id,
      checkpoints: checkpoints
    })

    res.json({
      sessionId: session.sessionId,
      scenario: scenario ? {
        scenarioId: scenario.scenario_id,
        title: scenario.chineseTitle || scenario.title,
        objective: scenario.chineseObjective || scenario.objective,
        userRole: userRole,
        aiRole: aiRole.name,
        checkpoints: checkpoints,
        firstSpeaker: scenario.firstSpeaker || 'ai'
      } : undefined,
      firstMessage,
      suggestions
    })

  } catch (error) {
    console.error('❌ Error starting conversation:', error)
    res.status(500).json({
      code: 'START_CONVERSATION_ERROR',
      message: 'Failed to start conversation'
    })
  }
})

// ============================================================================
// POST /api/conversation/message - 處理用戶消息
// ============================================================================
router.post('/message', authenticateUser, upload.single('audio'), async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body
    const audioFile = req.file
    const userId = req.user!.id

    console.log('💬 Processing message for session:', sessionId)

    // 加載會話
    const session = conversationStore.getSession(sessionId)
    if (!session) {
      return res.status(404).json({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

    if (!apiKey || !audioFile) {
      return res.status(400).json({
        code: 'MISSING_DATA',
        message: 'Audio or API key missing'
      })
    }

    // 1. 語音轉文字 (STT)
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    const audioBase64 = audioFile.buffer.toString('base64')

    let transcript = ''
    try {
      const sttPrompt = `Transcribe this English audio accurately.

CRITICAL INSTRUCTIONS:
1. Return ONLY English text - no formatting, no extra text
2. Use American English spelling and vocabulary
3. This is conversational speech - prioritize natural, contextually appropriate phrases
4. Pay careful attention to context to distinguish similar-sounding words
5. Use common conversational patterns
6. If uncertain between similar sounds, choose the phrase that makes more sense in context

Return the transcription only, nothing else.`

      const sttResult = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: sttPrompt },
            {
              inlineData: {
                mimeType: 'audio/webm',
                data: audioBase64
              }
            }
          ]
        }],
        generationConfig: { temperature: 0.3 }
      })

      transcript = sttResult.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      console.log('📝 Transcript:', transcript)
    } catch (error) {
      console.error('❌ STT Error:', error)
      return res.status(503).json({
        code: 'STT_ERROR',
        message: 'Speech recognition failed. Please try again.'
      })
    }

    // 2. 檢測檢查點（僅限 scenario 模式）
    let scenarioProgress: any = undefined
    if (session.mode === 'scenario' && session.checkpoints) {
      const normalizedTranscript = normalizeText(transcript)
      console.log(`🔍 Checkpoint detection START - Normalized transcript: "${normalizedTranscript}"`)
      console.log(`   Checkpoints status before:`, session.checkpoints.map(cp => ({ id: cp.id, completed: cp.completed, desc: cp.description })))

      for (const checkpoint of session.checkpoints) {
        console.log(`   Checking checkpoint ${checkpoint.id}: ${checkpoint.description} (completed: ${checkpoint.completed})`)

        if (!checkpoint.completed && checkpoint.keywords) {
          // 先按長度排序關鍵詞（長的優先，避免誤匹配短詞）
          const sortedKeywords = [...checkpoint.keywords].sort((a, b) => b.length - a.length)
          console.log(`     Keywords to check:`, sortedKeywords.slice(0, 10))

          // 檢查關鍵詞匹配（支援部分匹配）
          const matchedKeyword = sortedKeywords.find(kw => {
            const normalizedKeyword = normalizeText(kw)
            // 跳過單字元的寬泛關鍵詞（如「要」、「來」、「點」）
            if (normalizedKeyword.length === 1) {
              // 單字元詞必須是完整詞彙（前後有邊界）或重複出現
              const kwCount = (normalizedTranscript.match(new RegExp(normalizedKeyword, 'g')) || []).length
              const shouldMatch = kwCount >= 1 && normalizedTranscript.split(normalizedKeyword).length <= 2
              if (shouldMatch) console.log(`     Single-char keyword "${kw}" matched (count: ${kwCount})`)
              return shouldMatch
            }
            const matches = normalizedTranscript.includes(normalizedKeyword)
            if (matches) console.log(`     Keyword "${kw}" matched!`)
            return matches
          })

          if (matchedKeyword) {
            checkpoint.completed = true
            checkpoint.completedAt = new Date()
            console.log(`✅ Checkpoint ${checkpoint.id} completed: ${checkpoint.description}`)
            console.log(`   Matched keyword "${matchedKeyword}" in: "${transcript}"`)
            console.log(`   BREAKING LOOP - should not check more checkpoints`)
            break  // 一次只完成一個 checkpoint
          } else {
            console.log(`     No match for checkpoint ${checkpoint.id}`)
          }
        } else if (checkpoint.completed) {
          console.log(`     Skipping checkpoint ${checkpoint.id} - already completed`)
        }
      }

      console.log(`🔍 Checkpoint detection END`)
      console.log(`   Checkpoints status after:`, session.checkpoints.map(cp => ({ id: cp.id, completed: cp.completed, desc: cp.description })))

      const allCompleted = session.checkpoints.every(cp => cp.completed)
      scenarioProgress = {
        checkpoints: session.checkpoints,
        allCheckpointsCompleted: allCompleted
      }
    }

    // ========== 禮貌信號檢測與狀態更新 ==========

    console.log(`🔍 Checking for polite signals in: "${transcript}"`)

    // 初始化 currentTopicState（如果不存在）
    if (!session.currentTopicState) {
      session.currentTopicState = {
        lastCheckpointCompleted: null,
        turnsOnCurrentTopic: 0,
        lastAiMessageType: 'question',
        shouldTransition: false
      }
    }

    // 檢查是否剛完成 checkpoint（在最近 10 秒內）
    const lastCheckpointJustCompleted = session.checkpoints?.some(cp =>
      cp.completed &&
      cp.completedAt &&
      (new Date().getTime() - cp.completedAt.getTime()) < 10000
    )

    // 檢測禮貌信號
    const politeSignal = detectPoliteSignal(transcript, {
      lastCheckpointJustCompleted,
      conversationTurns: session.currentTopicState.turnsOnCurrentTopic,
      lastAiMessageType: session.currentTopicState.lastAiMessageType
    })

    // 如果檢測到應該轉換的信號，標記狀態
    if (politeSignal?.shouldTransition) {
      session.currentTopicState.shouldTransition = true
      console.log('✅ Topic transition triggered by polite signal:', politeSignal.matchedPattern)
    }

    // 更新最後完成的 checkpoint ID
    if (scenarioProgress) {
      const justCompleted = session.checkpoints?.find(cp =>
        cp.completed &&
        (!session.currentTopicState?.lastCheckpointCompleted ||
         cp.id > session.currentTopicState.lastCheckpointCompleted)
      )

      if (justCompleted) {
        session.currentTopicState.lastCheckpointCompleted = justCompleted.id
        session.currentTopicState.turnsOnCurrentTopic = 0  // 重置話題輪數
        console.log(`📍 Updated last completed checkpoint: ${justCompleted.id}`)
      }
    }

    // 增加當前話題輪數計數
    session.currentTopicState.turnsOnCurrentTopic++
    console.log(`📊 Current topic turns: ${session.currentTopicState.turnsOnCurrentTopic}`)

    // ========== 禮貌信號檢測結束 ==========

    // 3. 生成 AI 回覆
    const conversationHistory = session.conversationHistory
      .slice(-10) // 只取最近 10 輪對話
      .map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`)
      .join('\n')

    let systemPrompt = 'You are a helpful English conversation partner.'
    let scenario: any = null
    if (session.mode === 'scenario' && session.scenarioId) {
      // 加載 scenario 以獲取 AI 角色的 systemPrompt
      const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const content = fs.readFileSync(path.join(scenariosDir, file), 'utf-8')
        const scenarioData = JSON.parse(content)
        if (scenarioData.scenario_id === session.scenarioId) {
          scenario = scenarioData
          const aiRole = scenario.roles.find((r: any) => r.id === session.aiRole)
          if (aiRole) {
            systemPrompt = aiRole.systemPrompt
          }

          // 檢查是否所有檢查點已完成
          if (scenarioProgress?.allCheckpointsCompleted) {
            systemPrompt += '\n\nAll checkpoints have been completed. Politely wrap up the conversation and thank the user.'
          }
          break
        }
      }
    }

    let reply: { english: string; chinese: string } = { english: 'Okay.', chinese: '好的。' }

    try {
      // 找出下一個未完成的 checkpoint
      const nextCheckpoint = session.checkpoints?.find(cp => !cp.completed)
      const completedCheckpoints = session.checkpoints?.filter(cp => cp.completed) || []

      // 構建複習模式上下文
      let reviewContext = ''
      if ((session.mode === 'all' || session.mode === 'selected') && session.reviewVocabulary) {
        const vocabList = session.reviewVocabulary
          .map(v => `${v.word} - ${v.english}`)
          .join('\n')

        reviewContext = `
REVIEW MODE CONTEXT:
You are helping the student review English vocabulary through natural conversation in English.

Vocabulary to review:
${vocabList}

CONVERSATION STYLE REQUIREMENTS:
1. **Keep it SHORT** - Your response should be 1-2 sentences max (no more than 15 words)
2. **Use only 1-2 vocabulary words** - Don't cram too many words into one response
3. **Use NATURAL DAILY LANGUAGE** - Say "Want to go?" NOT "Would you like to go?" (too formal)
4. **Actively use vocabulary in YOUR responses** - Don't ask "Do you know what XX means?"
5. **DIRECTLY respond to the conversation** - Do NOT ask for opinions or consent (禁止問 "How about it?", "Okay?", "Is that alright?", "Would you like to...?")
6. **Sound natural** - Like chatting with a friend in English, not teaching a lesson

Natural Daily Language Examples:
✅ Say "Want to go to school today?" (natural daily talk)
❌ Don't say "Would you like to go to school?" (too formal, unnatural)
✅ Say "Did you eat breakfast?" (natural)
❌ Don't say "Would you like to eat breakfast?" (unnatural)
✅ Say "What are you eating today?" (natural)
❌ Don't say "What would you like to eat today?" (too formal)

Wrong Examples:
❌ "Today we're going to review colors, numbers, and some transportation vocabulary! By the way, speaking of colors, that red shirt you're wearing looks great!" (too long, too many words)
❌ "Would you like to go to school?" (unnatural, too formal)
❌ "Do you know how to say 'good morning'?" (testing the student)
❌ "Let's continue reviewing, okay?" (asking for consent)
❌ "What do you think about that?" (seeking agreement)

Correct Examples:
✅ "Good morning! Did you eat breakfast?" (short, natural daily language)
✅ "Thanks! What are you doing today?" (brief, natural)
✅ "Going to school today?" (natural daily question)
✅ "I took the bus today." (sharing + naturally demonstrating vocabulary)

CRITICAL:
- Use natural daily spoken English (say "Want to go?" not "Would you like to go?")
- Keep responses under 15 words
- Use only 1-2 vocabulary words per response
- Respond naturally to what the student just said in English
`
        systemPrompt = 'You are a friendly English conversation partner, having a natural conversation with a student.'
      }

      // 構建 checkpoint 上下文
      let checkpointContext = ''
      if (session.mode === 'scenario' && nextCheckpoint) {
        checkpointContext = `

Current Progress:
- Completed checkpoints: ${completedCheckpoints.map(cp => cp.description).join(', ') || 'None yet'}
- Next checkpoint to guide user toward: "${nextCheckpoint.description}"
- Relevant keywords for this checkpoint: ${nextCheckpoint.keywords?.slice(0, 5).join(', ')}

IMPORTANT: Naturally guide the conversation toward completing the next checkpoint. Reference what the user just said and ask follow-up questions related to the next checkpoint.`
      }

      // 構建角色職責上下文
      let roleContext = ''
      if (session.mode === 'scenario' && scenario) {
        const aiRole = scenario.roles.find((r: any) => r.id === session.aiRole)

        // 針對 asking-directions 場景的特殊指導
        if (scenario.scenario_id === 'asking-directions-01' && aiRole?.id === 'local') {
          roleContext = `

ROLE CONTEXT - YOU ARE A LOCAL RESIDENT:
- Your job is to GIVE DIRECTIONS to the tourist, not to test their vocabulary
- When the user asks "how do I get there", immediately provide clear directional instructions in English
- Use directional words (turn left, turn right, go straight) in YOUR response to guide them
- Example: "Go straight for about 100 meters, turn left at the 7-11, then walk for 5 minutes"
- Do NOT ask "Do you know what 'turn left' means?" - they are asking YOU for help, not the other way around
- Do NOT repeatedly confirm if they understand directional words - just give the directions naturally in English`
        }

        // 針對 doctor-appointment 場景的特殊指導
        if (scenario.scenario_id === 'doctor-appointment-01' && aiRole?.id === 'doctor') {
          roleContext = `

ROLE CONTEXT - YOU ARE A DOCTOR:
- Your job is to DIAGNOSE and EXPLAIN treatment to the patient, not to test their medical vocabulary
- When patient describes symptoms, ask follow-up questions, then provide diagnosis in English
- Use medical terms in YOUR explanations naturally: "It's a cold, I'll write you a prescription"
- Do NOT ask "Do you know what 'diagnosis' means?" - they need you to provide diagnosis, not explain terminology
- Be professional but approachable, reassure the patient`
        }

        // 針對 taxi-ride 場景的特殊指導
        if (scenario.scenario_id === 'taxi-ride-01' && aiRole?.id === 'driver') {
          roleContext = `

ROLE CONTEXT - YOU ARE A TAXI DRIVER:
- Your job is to drive the passenger safely to their destination
- Ask for destination, suggest route if needed, drive, then handle payment
- You don't need to explain every turn (turn left, turn right) to the passenger unless they specifically ask
- Do NOT test passenger's understanding of directional words
- Example: "Okay, Taipei Station. Taking the highway is faster, is that okay?" then naturally drive
- Be friendly and professional, chat casually if passenger wants`
        }

        // 針對 hotel-checkin 場景的特殊指導
        if (scenario.scenario_id === 'hotel-checkin-01' && aiRole?.id === 'receptionist') {
          roleContext = `

ROLE CONTEXT - YOU ARE A HOTEL RECEPTIONIST:
- Your job is to check in the guest smoothly and provide room information
- After verifying reservation and ID, explain room details naturally in English: room number, floor, wifi password, breakfast time
- Example: "Your room is 505, on the 5th floor. Breakfast is from 7 to 10 AM, wifi password is on the back of the room key."
- Do NOT ask "Do you know what 'facilities' means?" - just provide the information they need in English
- Be professional, welcoming, and helpful`
        }

        // 針對服務場景的改進指導
        if (['restaurant-ordering-01', 'breakfast-shop-01', 'bubble-tea-01', 'convenience-store-01'].includes(scenario.scenario_id)) {
          roleContext = `

ROLE CONTEXT - YOU ARE SERVICE STAFF:

CRITICAL RULES:
1. **Recognize polite closure signals**:
   When customer says "Thanks" or "That's all" after you confirm something:
   - DO NOT repeat the order details
   - DO NOT continue discussing the same topic
   - Give brief acknowledgment: "Got it!" or "Sure!"
   - IMMEDIATELY move to next topic

2. **Natural service flow**:
   Customer: "Less sugar."
   You: "Okay, less sugar!" ← brief confirmation
   Customer: "Thanks." ← CLOSURE SIGNAL
   You: "Got it! And the ice level?" ← ✅ CORRECT: moved to next topic

3. **FORBIDDEN examples**:
   ❌ Customer: "Thanks"
      You: "You're welcome! Let me confirm your bubble tea with less sugar..."
   ❌ Customer: "That's all"
      You: "Sure! Your bubble tea with less sugar and no ice will be ready..."

4. **Keep responses SHORT after polite signal**:
   - Brief acknowledgment: maximum 5-10 words
   - Move forward efficiently

English service is friendly but efficient. After polite signal, MOVE FORWARD.`
        }
      }

      // ========== 話題轉換指示生成 ==========

      let transitionGuidance = ''

      if (session.currentTopicState?.shouldTransition) {
        const allCompleted = session.checkpoints?.every(cp => cp.completed) || false
        const nextCheckpoint = session.checkpoints?.find(cp => !cp.completed)

        console.log(`🎯 Generating transition guidance - allCompleted: ${allCompleted}, nextCheckpoint: ${nextCheckpoint?.description}`)

        if (allCompleted) {
          // 所有 checkpoints 完成 → 簡短確認 + 結束
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - POLITE CLOSURE DETECTED 🎯 🎯 🎯

User said "${transcript}" - polite acknowledgment to close.

ALL tasks complete. You MUST:
1. Very brief acknowledgment: "Okay!" or "Got it, one moment!"
2. DO NOT ask any more questions
3. DO NOT repeat any previous information

KEEP IT SHORT (under 10 words). END CONVERSATION.`

        } else if (nextCheckpoint) {
          // 有下一個 checkpoint → 簡短確認 + 轉新話題
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - TOPIC TRANSITION REQUIRED 🎯 🎯 🎯

User said "${transcript}" - polite signal to finish current sub-topic.

DO NOT continue current topic. You MUST:
1. Brief acknowledgment: "Okay!" or "Got it!"
2. IMMEDIATELY ask about next checkpoint: "${nextCheckpoint.description}"
3. Total response: MAXIMUM 10-15 words

✅ CORRECT examples:
- "Okay! Anything else?"
- "Got it! For here or to go?"

❌ FORBIDDEN:
- Repeating previous information
- Continuing same topic

BE BRIEF. TRANSITION NOW.`

        } else if (session.mode === 'all' || session.mode === 'selected') {
          // 複習模式：總是轉換新話題
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - REVIEW MODE TOPIC CHANGE 🎯 🎯 🎯

User said "${transcript}" - polite acknowledgment.

REVIEW MODE: You MUST transition to a NEW topic.

1. Very brief acknowledgment: "Okay!" or "Got it!"
2. Start a NEW topic immediately using different vocabulary
3. Total response: 15-20 words MAXIMUM

✅ CORRECT:
- "Okay! So where did you go recently?" (natural topic change)
- "Got it! What are you doing today?" (new topic)

❌ FORBIDDEN:
- Continuing same topic
- Asking follow-up about what was just discussed

CHANGE TOPIC NOW.`

        } else {
          // 其他情況：簡短確認
          transitionGuidance = `
🎯 🎯 🎯 CRITICAL - BRIEF ACKNOWLEDGMENT REQUIRED 🎯 🎯 🎯

User said "${transcript}" - polite acknowledgment.

Respond with VERY brief acknowledgment:
- "Okay!" or "Got it!" or "Sure!"

KEEP IT EXTREMELY SHORT (under 5 words).`
        }

        // 重置轉換標記
        session.currentTopicState.shouldTransition = false
        console.log('📝 Added transition guidance to AI prompt')
      }

      // ========== 話題轉換指示生成結束 ==========

      const aiPrompt = `${transitionGuidance}${transitionGuidance ? '\n\n' : ''}${systemPrompt}

IMPORTANT: You MUST respond using natural, conversational English.
${roleContext}
${reviewContext}
${checkpointContext}

Conversation history:
${conversationHistory}

User just said: ${transcript}

Respond in English (1-2 sentences). Be natural and conversational.

Dialogue tips:
- If user mentioned a specific item (e.g., "iced soy milk"), acknowledge it directly: "Okay, iced soy milk!"
- Then ask follow-up naturally: "Want to adjust the sweetness?" or "How sweet do you want it?"
- Don't say unnatural phrases like "Does the soy milk need sweetness?"
- Use casual English expressions: "Want to...", "Need to...", "How about..."

If the user mentioned something related to the next checkpoint, acknowledge it and continue guiding them.

Return in JSON format:
{
  "english": "your response in natural English",
  "chinese": "Traditional Chinese (繁體中文) translation"
}`

      const aiResult = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json'
        }
      })

      const replyText = aiResult.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      let parsedReply = JSON.parse(replyText)

      // 防禦性檢查：如果 Gemini 回傳陣列，取第一個元素
      if (Array.isArray(parsedReply)) {
        console.warn('⚠️ Gemini returned array instead of object, using first element')
        reply = parsedReply[0] || { english: 'Okay.', chinese: '好的。' }
      } else {
        reply = parsedReply
      }

      console.log('🤖 AI Reply:', reply)
    } catch (error) {
      console.error('❌ AI Reply Error:', error)
      // 使用備用回覆，讓對話可以繼續
      reply = { english: 'I understand. Please continue.', chinese: '我明白了。請繼續。' }
      console.log('⚠️ Using fallback reply')
    }

    // ========== 分析並記錄 AI 回覆類型 ==========

    if (session.currentTopicState && reply?.english) {
      const replyText = reply.english

      // 判斷 AI 回覆的類型
      if (replyText.includes('?')) {
        session.currentTopicState.lastAiMessageType = 'question'
      } else if (replyText.toLowerCase().includes('okay') || replyText.toLowerCase().includes('got it') ||
                 replyText.toLowerCase().includes('no problem') || replyText.toLowerCase().includes('understand')) {
        session.currentTopicState.lastAiMessageType = 'confirmation'
      } else {
        session.currentTopicState.lastAiMessageType = 'statement'
      }

      console.log(`📊 AI message type: ${session.currentTopicState.lastAiMessageType}, reply: "${replyText}"`)
    }

    // ========== AI 回覆類型分析結束 ==========

    // 4. 更新對話歷史
    session.conversationHistory.push({
      role: 'user',
      text: transcript,
      timestamp: new Date()
    })
    session.conversationHistory.push({
      role: 'ai',
      text: reply.english || 'Okay.',
      timestamp: new Date()
    })

    conversationStore.updateSession(sessionId, session)

    // 5. 生成建議回覆
    let suggestions: any[] = []
    let scenarioData: any = null

    // 重新加載 scenario 以獲取靜態建議
    if (session.mode === 'scenario' && session.scenarioId) {
      const scenariosDir = path.join(__dirname, '../../src/plugins/scenarios')
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const content = fs.readFileSync(path.join(scenariosDir, file), 'utf-8')
        const scenario = JSON.parse(content)
        if (scenario.scenario_id === session.scenarioId) {
          scenarioData = scenario
          break
        }
      }
    }

    const nextCheckpoint = session.checkpoints?.find((cp: ScenarioCheckpoint) => !cp.completed)

    console.log('💡 Generating suggestions...')
    console.log('   Mode:', session.mode)
    console.log('   AI last message:', reply.english || 'Okay.')
    console.log('   Has review vocabulary:', !!session.reviewVocabulary)

    try {
      suggestions = await generateSuggestions(model, {
        mode: session.mode,
        conversationHistory: session.conversationHistory.slice(-6).map(turn => ({
          role: turn.role,
          text: turn.text
        })),
        aiLastMessage: reply.english || 'Okay.',
        scenarioInfo: session.mode === 'scenario' && scenarioData ? {
          objective: scenarioData.objective || '',
          nextCheckpoint: nextCheckpoint ? {
            description: nextCheckpoint.description,
            keywords: nextCheckpoint.keywords || []
          } : undefined,
          userRole: session.userRole
        } : undefined,
        reviewVocabulary: session.reviewVocabulary  // 複習模式詞彙
      })
      console.log('✅ Suggestions generated successfully:', suggestions.length)
    } catch (error) {
      console.error('❌ Gemini generateSuggestions failed:', error)
      console.warn('⚠️ Using fallback suggestions')

      // Fallback 1: 使用 scenario JSON 中的靜態建議
      if (scenarioData && session.userRole) {
        const roleSuggestions = scenarioData.suggestions?.byRole?.[session.userRole] || []

        // 優先使用符合下一個檢查點的建議
        if (nextCheckpoint && roleSuggestions.length > 0) {
          const checkpointSuggestions = roleSuggestions.filter(
            (s: any) => s.checkpointId === nextCheckpoint.id
          )
          suggestions = checkpointSuggestions.length > 0
            ? checkpointSuggestions.slice(0, 3)
            : roleSuggestions.slice(0, 3)
        } else {
          suggestions = roleSuggestions.slice(0, 3)
        }
      }

      // Fallback 2: 通用建議 (最後手段)
      if (suggestions.length === 0) {
        suggestions = [
          { english: 'Okay', chinese: '好的', type: 'safe' },
          { english: 'I understand', chinese: '我明白了', type: 'safe' },
          { english: 'Thank you', chinese: '謝謝', type: 'safe' }
        ]
      }
    }

    // 6. 更新 Supabase 會話數據
    console.log('💾 Updating Supabase session...')
    const { data: updateData, error: updateError } = await supabase
      .from('conversation_sessions')
      .update({
        conversation_data: { history: session.conversationHistory },
        messages_count: session.conversationHistory.length,
        checkpoints: session.checkpoints,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('❌ Supabase update failed:', updateError)
      // 不要因為 Supabase 更新失敗就讓整個請求失敗
      // 繼續返回響應
    } else {
      console.log('✅ Supabase session updated successfully')
    }

    // 7. 返回響應
    console.log('✅ Message processed successfully')
    res.json({
      userTranscript: transcript,
      instructorReply: reply,
      scenarioProgress,
      suggestions
    })

  } catch (error) {
    console.error('❌ Error processing message:', error)
    res.status(500).json({
      code: 'MESSAGE_PROCESSING_ERROR',
      message: 'Failed to process message'
    })
  }
})

// ============================================================================
// POST /api/conversation/end - 結束對話並生成報告
// ============================================================================
router.post('/end', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.body
    const userId = req.user!.id

    console.log('🏁 Ending conversation:', sessionId)

    const session = conversationStore.getSession(sessionId)
    if (!session) {
      return res.status(404).json({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      })
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

    // 分析對話
    let analysis: any = {
      totalTurns: Math.floor(session.conversationHistory.length / 2),
      duration: Math.floor((new Date().getTime() - session.createdAt.getTime()) / 1000),
      fluency: 75,
      vocabulary: 75,
      grammar: 75
    }

    if (session.mode === 'scenario' && session.checkpoints) {
      const completedCount = session.checkpoints.filter(cp => cp.completed).length
      analysis.checkpointsCompleted = completedCount
      analysis.checkpointsTotal = session.checkpoints.length
    }

    // 複習模式：記錄已複習的課程
    if ((session.mode === 'all' || session.mode === 'selected') && session.reviewedLessons) {
      analysis.reviewedLessons = session.reviewedLessons
      analysis.reviewType = session.mode === 'all' ? '所有已完成課程' : '選定章節'
      analysis.vocabularyCount = session.reviewVocabulary?.length || 0
    }

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const conversationText = session.conversationHistory
          .map(turn => `${turn.role === 'user' ? 'User' : 'AI'}: ${turn.text}`)
          .join('\n')

        const analysisPrompt = `Analyze this Chinese conversation and provide scores (0-100):

Conversation:
${conversationText}

Provide a JSON analysis with:
{
  "fluency": score,
  "vocabulary": score,
  "grammar": score,
  "feedback": "detailed feedback in English",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "vocabularyUsed": ["word1", "word2", "word3"],
  "vocabularyDetails": [
    {
      "chinese": "詞語",
      "pinyin": "cí yǔ",
      "english": "vocabulary"
    }
  ]
}

IMPORTANT: Extract key Chinese vocabulary words/phrases that the user used during the conversation. Include both "vocabularyUsed" (simple array of Chinese words) and "vocabularyDetails" (detailed objects with Chinese, pinyin, and English translation). Focus on meaningful content words, not particles or common words like 我、是、的.`

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.5,
            responseMimeType: 'application/json'
          }
        })

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
        const aiAnalysis = JSON.parse(responseText)

        analysis = { ...analysis, ...aiAnalysis }
        console.log('✅ Generated analysis:', analysis)
      } catch (error) {
        console.warn('⚠️ Failed to generate analysis with Gemini:', error)
      }
    }

    // 生成報告 ID
    const reportId = `report-${sessionId}`

    // 保存報告（可選：保存到文件系統）
    // const reportsDir = path.join(__dirname, '../../dist/logs/reports')
    // fs.mkdirSync(reportsDir, { recursive: true })
    // fs.writeFileSync(
    //   path.join(reportsDir, `${reportId}.json`),
    //   JSON.stringify({ reportId, sessionId, analysis, session }, null, 2)
    // )

    res.json({
      reportId,
      analysis
    })

  } catch (error) {
    console.error('❌ Error ending conversation:', error)
    res.status(500).json({
      code: 'END_CONVERSATION_ERROR',
      message: 'Failed to end conversation'
    })
  }
})

export default router
