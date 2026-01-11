const http = require('http');

// 測試健康檢查
function testHealth() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8082,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

// 測試報告生成
function testReport() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      studentName: 'Test Student',
      lessonTitle: 'Test Lesson',
      lessonObjective: 'Test objective',
      dateCompleted: '2025-01-01',
      questions: [{
        id: 1,
        prompt: { chinese: '你好', pinyin: 'ni hao', english: 'hello' },
        studentAnswer: 'ni hao',
        scores: { Pronunciation: 80, Fluency: 75, Accuracy: 85, Comprehension: 90 }
      }],
      overallScores: { Pronunciation: 80, Fluency: 75, Accuracy: 85, Comprehension: 90, Confidence: 70 }
    });

    const options = {
      hostname: 'localhost',
      port: 8082,
      path: '/v1/generate-report',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: body }));
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 運行測試
async function runTests() {
  try {
    console.log('Testing health endpoint...');
    const healthResult = await testHealth();
    console.log('Health Status:', healthResult.status);
    console.log('Health Data:', healthResult.data);

    console.log('\nTesting report generation...');
    const reportResult = await testReport();
    console.log('Report Status:', reportResult.status);
    console.log('Report Data:', reportResult.data);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTests();