/**
 * 課程轉換腳本：將中文學習平台改為英文學習平台
 *
 * 轉換規則：
 * 1. teacher: 中文 → 英文
 * 2. expected_answer: 中文 → 英文
 * 3. english_hint → chinese_hint: 英文 → 繁體中文
 * 4. 刪除 pinyin 和 pinyin_examples
 * 5. tts_voice: zh-TW-HsiaoChenNeural → en-US-JennyNeural
 * 6. encouragement: 保持英文
 */

import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ 錯誤：未找到 GEMINI_API_KEY 環境變數');
  console.error('請在 apps/backend/.env 檔案中設定 GEMINI_API_KEY');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// 課程目錄路徑
const LESSONS_DIR = path.join(__dirname, '../src/plugins/chinese-lessons');

// 延遲函數（避免 API rate limit）
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 使用 Gemini API 將中文翻譯成英文
 */
async function translateToEnglish(chineseText: string): Promise<string> {
  const prompt = `Translate the following Traditional Chinese text to natural, conversational English. Only return the English translation, nothing else.

Traditional Chinese: ${chineseText}

English:`;

  try {
    const result = await model.generateContent(prompt);
    const translation = result.response.text().trim();
    console.log(`  ✓ 中文 → 英文: "${chineseText}" → "${translation}"`);
    return translation;
  } catch (error) {
    console.error(`  ✗ 翻譯失敗 (中→英): ${chineseText}`, error);
    throw error;
  }
}

/**
 * 使用 Gemini API 將英文翻譯成繁體中文
 */
async function translateToChinese(englishText: string): Promise<string> {
  const prompt = `Translate the following English text to Traditional Chinese (Taiwan, 繁體中文). Use natural, conversational language. Only return the Chinese translation, nothing else.

English: ${englishText}

Traditional Chinese:`;

  try {
    const result = await model.generateContent(prompt);
    const translation = result.response.text().trim();
    console.log(`  ✓ 英文 → 中文: "${englishText}" → "${translation}"`);
    return translation;
  } catch (error) {
    console.error(`  ✗ 翻譯失敗 (英→中): ${englishText}`, error);
    throw error;
  }
}

/**
 * 轉換單個 step
 */
async function convertStep(step: any, stepIndex: number): Promise<any> {
  console.log(`\n  處理 Step ${stepIndex + 1}...`);

  // 1. 翻譯 teacher（中文 → 英文）
  const englishTeacher = await translateToEnglish(step.teacher);
  await delay(500); // 避免 rate limit

  // 2. 翻譯 expected_answer（可能是陣列）
  let englishAnswers: string[];
  if (Array.isArray(step.expected_answer)) {
    // 如果是陣列，翻譯所有答案
    englishAnswers = [];
    for (const answer of step.expected_answer) {
      const translated = await translateToEnglish(answer);
      englishAnswers.push(translated);
      await delay(500);
    }
  } else {
    // 如果是單一字串，翻譯後轉為陣列
    const translated = await translateToEnglish(step.expected_answer);
    englishAnswers = [translated];
    await delay(500);
  }

  // 3. 翻譯 english_hint → chinese_hint（英文 → 繁體中文）
  const chineseHint = await translateToChinese(step.english_hint);
  await delay(500);

  // 4. 建立新的 step 物件
  const newStep: any = {
    id: step.id,
    teacher: englishTeacher,
    expected_answer: englishAnswers,
    chinese_hint: chineseHint,
    encouragement: step.encouragement, // 保持英文
    tts_text: englishTeacher,
    tts_voice: 'en-US-JennyNeural'
  };

  // 5. 如果有 video_url 或 captions，保留
  if (step.video_url) newStep.video_url = step.video_url;
  if (step.captions) newStep.captions = step.captions;

  // 注意：不包含 pinyin 和 pinyin_examples（已刪除）

  return newStep;
}

/**
 * 轉換單個課程 JSON 檔案
 */
async function convertLessonFile(filePath: string): Promise<void> {
  const relativePath = path.relative(LESSONS_DIR, filePath);
  console.log(`\n📖 轉換課程: ${relativePath}`);

  try {
    // 1. 讀取原始 JSON
    const content = await fs.readFile(filePath, 'utf-8');
    const lesson = JSON.parse(content);

    // 2. 轉換每個 step
    const convertedSteps = [];
    for (let i = 0; i < lesson.steps.length; i++) {
      const convertedStep = await convertStep(lesson.steps[i], i);
      convertedSteps.push(convertedStep);
    }

    // 3. 建立新的 lesson 物件
    const newLesson = {
      lesson_id: lesson.lesson_id,
      chapter_id: lesson.chapter_id,
      lesson_number: lesson.lesson_number,
      title: lesson.title, // 保持英文標題
      description: lesson.description, // 保持英文描述
      steps: convertedSteps,
      review: lesson.review // 保持原始 review
    };

    // 4. 寫回檔案（格式化為 2 空格縮排）
    await fs.writeFile(filePath, JSON.stringify(newLesson, null, 2), 'utf-8');
    console.log(`✅ 成功轉換: ${relativePath}`);

  } catch (error) {
    console.error(`❌ 轉換失敗: ${relativePath}`, error);
    throw error;
  }
}

/**
 * 掃描並轉換所有課程檔案
 */
async function convertAllLessons(): Promise<void> {
  console.log('🚀 開始轉換所有課程...\n');
  console.log(`📂 課程目錄: ${LESSONS_DIR}\n`);

  try {
    // 1. 掃描所有 chapter 目錄
    const chapters = await fs.readdir(LESSONS_DIR);
    const chapterDirs = chapters.filter(name => name.startsWith('chapter-'));

    console.log(`找到 ${chapterDirs.length} 個章節\n`);

    let totalFiles = 0;
    let successCount = 0;
    let errorCount = 0;

    // 2. 遍歷每個 chapter
    for (const chapterDir of chapterDirs.sort()) {
      const chapterPath = path.join(LESSONS_DIR, chapterDir);
      const stat = await fs.stat(chapterPath);

      if (!stat.isDirectory()) continue;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📚 處理章節: ${chapterDir}`);
      console.log('='.repeat(60));

      // 3. 找出該章節的所有 lesson JSON 檔案
      const files = await fs.readdir(chapterPath);
      const lessonFiles = files.filter(name => name.startsWith('lesson-') && name.endsWith('.json'));

      // 4. 轉換每個 lesson 檔案
      for (const lessonFile of lessonFiles.sort()) {
        const lessonPath = path.join(chapterPath, lessonFile);
        totalFiles++;

        try {
          await convertLessonFile(lessonPath);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`❌ 轉換失敗: ${chapterDir}/${lessonFile}`);
        }

        // 延遲避免 API rate limit
        await delay(1000);
      }
    }

    // 5. 轉換 TEMPLATE.json 和 EXAMPLE_ADVANCED.json
    const specialFiles = ['TEMPLATE.json', 'EXAMPLE_ADVANCED.json'];
    for (const fileName of specialFiles) {
      const filePath = path.join(LESSONS_DIR, fileName);
      try {
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          totalFiles++;
          await convertLessonFile(filePath);
          successCount++;
          await delay(1000);
        }
      } catch (error) {
        // 檔案不存在，跳過
      }
    }

    // 6. 顯示總結
    console.log('\n' + '='.repeat(60));
    console.log('📊 轉換完成統計');
    console.log('='.repeat(60));
    console.log(`✅ 成功: ${successCount} 個檔案`);
    console.log(`❌ 失敗: ${errorCount} 個檔案`);
    console.log(`📝 總計: ${totalFiles} 個檔案`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 所有課程轉換完成！');
    } else {
      console.log('\n⚠️  部分課程轉換失敗，請檢查錯誤訊息');
    }

  } catch (error) {
    console.error('❌ 轉換過程發生錯誤:', error);
    process.exit(1);
  }
}

/**
 * 主函數
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 課程轉換工具：中文學習平台 → 英文學習平台');
  console.log('='.repeat(60));
  console.log('\n轉換規則：');
  console.log('  • teacher: 中文 → 英文');
  console.log('  • expected_answer: 中文 → 英文');
  console.log('  • english_hint → chinese_hint: 英文 → 繁體中文');
  console.log('  • 刪除 pinyin 和 pinyin_examples');
  console.log('  • tts_voice: zh-TW → en-US');
  console.log('  • encouragement: 保持英文\n');

  // 確認是否繼續
  console.log('⚠️  注意：此操作將直接修改原始 JSON 檔案！');
  console.log('   建議先備份 apps/backend/src/plugins/chinese-lessons/ 目錄\n');

  // 開始轉換
  await convertAllLessons();
}

// 執行主函數
main().catch(error => {
  console.error('❌ 程式執行失敗:', error);
  process.exit(1);
});
