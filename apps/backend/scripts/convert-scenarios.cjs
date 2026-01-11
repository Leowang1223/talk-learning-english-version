/**
 * 場景轉換腳本：將中文學習場景改為英文學習場景
 *
 * 執行方式：node scripts/convert-scenarios.cjs
 */

const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// 載入環境變數
dotenv.config({ path: path.join(__dirname, '../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ 錯誤：未找到 GEMINI_API_KEY 環境變數');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// 場景目錄路徑
const SCENARIOS_DIR = path.join(__dirname, '../src/plugins/scenarios');

// 延遲函數
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 使用 Gemini API 翻譯關鍵詞（中文 → 英文）
 */
async function translateKeywords(chineseKeywords) {
  const prompt = `Translate these Traditional Chinese keywords to natural English equivalents. Return ONLY a JSON array of English translations in the same order.

Chinese keywords: ${JSON.stringify(chineseKeywords)}

Return format: ["english1", "english2", ...]

IMPORTANT: Keep the translations natural and conversational. For example:
- "老闆" → "excuse me" or "hello" (not "boss")
- "我要" → "I want" or "I'd like"
- "謝謝" → "thank you" or "thanks"`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.5,
        responseMimeType: 'application/json'
      }
    });
    const translation = JSON.parse(result.response.text());
    console.log(`  ✓ 翻譯關鍵詞: ${chineseKeywords.length} 個`);
    return translation;
  } catch (error) {
    console.error(`  ✗ 翻譯關鍵詞失敗:`, error.message);
    throw error;
  }
}

/**
 * 轉換 systemPrompt（從中文對話改為英文對話）
 */
function convertSystemPrompt(prompt) {
  return prompt
    .replace(/Traditional Chinese \(Taiwan, 繁體中文\)/g, 'natural, conversational English')
    .replace(/Use Traditional Chinese/g, 'Use natural English')
    .replace(/IMPORTANT: Use Traditional Chinese.*?naturally/g, 'IMPORTANT: Speak in natural English')
    .replace(/繁體中文/g, 'English');
}

/**
 * 轉換單個場景檔案
 */
async function convertScenarioFile(filePath) {
  const relativePath = path.relative(SCENARIOS_DIR, filePath);
  console.log(`\n📖 轉換場景: ${relativePath}`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const scenario = JSON.parse(content);

    // 1. 轉換 roles 的 systemPrompt
    console.log('  處理 roles...');
    for (const role of scenario.roles) {
      role.systemPrompt = convertSystemPrompt(role.systemPrompt);
    }

    // 2. 轉換 checkpoints 的 keywords（中文 → 英文）
    console.log('  處理 checkpoints...');
    for (const checkpoint of scenario.checkpoints) {
      if (checkpoint.keywords && checkpoint.keywords.length > 0) {
        const englishKeywords = await translateKeywords(checkpoint.keywords);
        checkpoint.keywords = englishKeywords;
        await delay(10000); // 10秒延遲避免 rate limit
      }
    }

    // 3. 轉換 suggestions（{chinese, pinyin, english} → {english, chinese}）
    console.log('  處理 suggestions...');
    if (scenario.suggestions && scenario.suggestions.byRole) {
      for (const roleId in scenario.suggestions.byRole) {
        const suggestions = scenario.suggestions.byRole[roleId];
        for (const suggestion of suggestions) {
          // 交換順序：english 變成主要內容，chinese 變成提示
          const newSuggestion = {
            english: suggestion.english,
            chinese: suggestion.chinese,
            type: suggestion.type
          };
          if (suggestion.checkpointId) {
            newSuggestion.checkpointId = suggestion.checkpointId;
          }
          Object.assign(suggestion, newSuggestion);
          // 刪除 pinyin
          delete suggestion.pinyin;
        }
      }
    }

    // 4. 轉換 keyVocabulary（{chinese, pinyin, english} → {english, chinese}）
    console.log('  處理 keyVocabulary...');
    if (scenario.keyVocabulary) {
      scenario.keyVocabulary = scenario.keyVocabulary.map(vocab => ({
        english: vocab.english,
        chinese: vocab.chinese
      }));
    }

    // 5. 轉換 keyPatterns（{pattern: 中文, english} → {pattern: 英文, chinese}）
    console.log('  處理 keyPatterns...');
    if (scenario.keyPatterns) {
      scenario.keyPatterns = scenario.keyPatterns.map(pattern => ({
        pattern: pattern.english,
        chinese: pattern.pattern,
        example: pattern.example
      }));
    }

    // 寫回檔案
    await fs.writeFile(filePath, JSON.stringify(scenario, null, 2), 'utf-8');
    console.log(`✅ 成功轉換: ${relativePath}`);

  } catch (error) {
    console.error(`❌ 轉換失敗: ${relativePath}`, error.message);
    throw error;
  }
}

/**
 * 掃描並轉換所有場景檔案
 */
async function convertAllScenarios() {
  console.log('🚀 開始轉換所有場景...\n');
  console.log(`📂 場景目錄: ${SCENARIOS_DIR}\n`);

  try {
    const files = await fs.readdir(SCENARIOS_DIR);
    const scenarioFiles = files.filter(name => name.endsWith('.json'));

    console.log(`找到 ${scenarioFiles.length} 個場景檔案\n`);

    let totalFiles = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const file of scenarioFiles.sort()) {
      const filePath = path.join(SCENARIOS_DIR, file);
      totalFiles++;

      try {
        await convertScenarioFile(filePath);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`❌ 轉換失敗: ${file}`);
      }

      await delay(3000); // 檔案間延遲 3 秒
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 轉換完成統計');
    console.log('='.repeat(60));
    console.log(`✅ 成功: ${successCount} 個檔案`);
    console.log(`❌ 失敗: ${errorCount} 個檔案`);
    console.log(`📝 總計: ${totalFiles} 個檔案`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 所有場景轉換完成！');
    } else {
      console.log('\n⚠️  部分場景轉換失敗，請檢查錯誤訊息');
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
  console.log('🔄 場景轉換工具：中文學習場景 → 英文學習場景');
  console.log('='.repeat(60));
  console.log('\n轉換規則：');
  console.log('  • systemPrompt: 中文對話 → 英文對話');
  console.log('  • keywords: 中文 → 英文');
  console.log('  • suggestions: {chinese, pinyin, english} → {english, chinese}');
  console.log('  • keyVocabulary: {chinese, pinyin, english} → {english, chinese}');
  console.log('  • keyPatterns: {pattern: 中文, english} → {pattern: 英文, chinese}');
  console.log('  • 刪除所有 pinyin\n');

  await convertAllScenarios();
}

main().catch(error => {
  console.error('❌ 程式執行失敗:', error);
  process.exit(1);
});
