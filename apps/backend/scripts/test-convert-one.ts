/**
 * 測試轉換腳本：只轉換一個課程檔案
 */

import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ 錯誤：未找到 GEMINI_API_KEY 環境變數');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function translateToEnglish(chineseText: string): Promise<string> {
  const prompt = `Translate the following Traditional Chinese text to natural, conversational English. Only return the English translation, nothing else.

Traditional Chinese: ${chineseText}

English:`;

  const result = await model.generateContent(prompt);
  const translation = result.response.text().trim();
  console.log(`  ✓ 中文 → 英文: "${chineseText}" → "${translation}"`);
  return translation;
}

async function translateToChinese(englishText: string): Promise<string> {
  const prompt = `Translate the following English text to Traditional Chinese (Taiwan, 繁體中文). Use natural, conversational language. Only return the Chinese translation, nothing else.

English: ${englishText}

Traditional Chinese:`;

  const result = await model.generateContent(prompt);
  const translation = result.response.text().trim();
  console.log(`  ✓ 英文 → 中文: "${englishText}" → "${translation}"`);
  return translation;
}

async function convertStep(step: any, stepIndex: number): Promise<any> {
  console.log(`\n  處理 Step ${stepIndex + 1}...`);

  const englishTeacher = await translateToEnglish(step.teacher);
  await delay(500);

  let englishAnswers: string[];
  if (Array.isArray(step.expected_answer)) {
    englishAnswers = [];
    for (const answer of step.expected_answer) {
      const translated = await translateToEnglish(answer);
      englishAnswers.push(translated);
      await delay(500);
    }
  } else {
    const translated = await translateToEnglish(step.expected_answer);
    englishAnswers = [translated];
    await delay(500);
  }

  const chineseHint = await translateToChinese(step.english_hint);
  await delay(500);

  const newStep: any = {
    id: step.id,
    teacher: englishTeacher,
    expected_answer: englishAnswers,
    chinese_hint: chineseHint,
    encouragement: step.encouragement,
    tts_text: englishTeacher,
    tts_voice: 'en-US-JennyNeural'
  };

  if (step.video_url) newStep.video_url = step.video_url;
  if (step.captions) newStep.captions = step.captions;

  return newStep;
}

async function main() {
  const testFile = path.join(__dirname, '../src/plugins/chinese-lessons/chapter-01/lesson-01.json');

  console.log('\n' + '='.repeat(60));
  console.log('🧪 測試轉換：chapter-01/lesson-01.json');
  console.log('='.repeat(60) + '\n');

  try {
    const content = await fs.readFile(testFile, 'utf-8');
    const lesson = JSON.parse(content);

    console.log(`📖 課程標題: ${lesson.title}`);
    console.log(`📝 步驟數量: ${lesson.steps.length}\n`);

    // 只轉換前 3 個 steps 作為測試
    const testSteps = lesson.steps.slice(0, 3);
    const convertedSteps = [];

    for (let i = 0; i < testSteps.length; i++) {
      const convertedStep = await convertStep(testSteps[i], i);
      convertedSteps.push(convertedStep);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 轉換結果預覽');
    console.log('='.repeat(60));

    convertedSteps.forEach((step, i) => {
      console.log(`\nStep ${i + 1}:`);
      console.log(`  teacher: ${step.teacher}`);
      console.log(`  expected_answer: ${JSON.stringify(step.expected_answer)}`);
      console.log(`  chinese_hint: ${step.chinese_hint}`);
      console.log(`  encouragement: ${step.encouragement}`);
      console.log(`  tts_voice: ${step.tts_voice}`);
    });

    console.log('\n✅ 測試轉換成功！');
    console.log('\n如果結果正確，可以執行完整轉換：');
    console.log('  cd apps/backend');
    console.log('  npm run convert-lessons');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  }
}

main();
