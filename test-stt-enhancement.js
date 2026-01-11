/**
 * 測試後端 STT 增強功能
 * 驗證拼音轉換和輔助工具
 */

const {
  convertToPinyin,
  generateWordConfidence,
  generateWordTimestamps,
  generateAlternatives
} = require('./apps/backend/src/utils/pinyinConverter.ts');

console.log('🧪 測試後端 STT 增強功能\n');

// 測試案例
const testCases = [
  '你好嗎',
  '我是學生',
  '謝謝你',
  '對不起',
  '再見'
];

testCases.forEach((text, index) => {
  console.log(`\n--- 測試案例 ${index + 1}: "${text}" ---`);
  
  // 測試拼音轉換
  const pinyin = convertToPinyin(text);
  console.log('拼音:', pinyin.join(', '));
  
  // 測試信心度生成
  const confidence = generateWordConfidence(text);
  console.log('信心度:');
  confidence.forEach(c => {
    console.log(`  ${c.word}: ${(c.confidence * 100).toFixed(1)}%`);
  });
  
  // 測試時間戳生成
  const timestamps = generateWordTimestamps(text);
  console.log('時間戳:');
  timestamps.forEach(t => {
    console.log(`  ${t.word}: ${t.start.toFixed(2)}s - ${t.end.toFixed(2)}s`);
  });
  
  // 測試候選答案生成
  const alternatives = generateAlternatives(text);
  console.log('候選答案:', alternatives.join(', '));
});

console.log('\n✅ 所有測試完成！');
