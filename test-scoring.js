const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testScoring() {
  console.log('🧪 Testing Scoring System...\n');

  // Test 1: 檢查後端健康狀態
  console.log('1️⃣ Testing backend health...');
  try {
    const health = await axios.get('http://localhost:8082/health');
    console.log('✅ Backend is running:', health.data);
  } catch (err) {
    console.error('❌ Backend not running!', err.message);
    return;
  }

  // Test 2: 測試正確答案（沒有音頻文件）
  console.log('\n2️⃣ Testing correct answer (mock mode)...');
  try {
    const formData = new FormData();
    formData.append('expectedAnswer', JSON.stringify(['你好']));
    formData.append('questionId', '1');
    formData.append('lessonId', 'L1');

    const response = await axios.post('http://localhost:8082/api/score', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('📊 Correct Answer Response:');
    console.log('   - Overall Score:', response.data.overall_score);
    console.log('   - Method:', response.data.method);
    console.log('   - Transcript:', response.data.transcript);
    console.log('   - Feedback:', response.data.feedback?.substring(0, 50) + '...');
    
    if (response.data.overall_score >= 75) {
      console.log('✅ Correct answer passed (score >= 75)');
    } else {
      console.log('❌ ERROR: Correct answer should pass!');
    }
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  }

  // Test 3: 測試錯誤答案
  console.log('\n3️⃣ Testing wrong answer...');
  try {
    const formData = new FormData();
    formData.append('expectedAnswer', JSON.stringify(['你好']));
    formData.append('questionId', '1');
    formData.append('lessonId', 'L1');

    const response = await axios.post('http://localhost:8082/api/score', formData, {
      headers: formData.getHeaders()
    });
    
    console.log('📊 Mock Scoring Response:');
    console.log('   - Overall Score:', response.data.overall_score);
    console.log('   - Method:', response.data.method);
    
    if (response.data.method === 'mock') {
      console.log('⚠️  WARNING: Using mock scoring - cannot distinguish correct/wrong answers!');
      console.log('   Mock scoring always gives 60-100 points randomly.');
      console.log('   Need audio file + Gemini API for real scoring.');
    }
  } catch (err) {
    console.error('❌ Test failed:', err.response?.data || err.message);
  }

  // Test 4: 檢查環境變量
  console.log('\n4️⃣ Checking Gemini API configuration...');
  console.log('   Note: This test runs on the backend, check backend console for API key status.');
  
  console.log('\n📋 Summary:');
  console.log('   - Backend is running on port 8082');
  console.log('   - Score endpoint: POST /api/score');
  console.log('   - Without audio file: uses mock scoring (random 60-100)');
  console.log('   - With audio file + API key: uses Gemini API for real scoring');
}

testScoring().catch(console.error);
