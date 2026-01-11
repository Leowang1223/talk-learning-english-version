const http = require('http');

function testBackend() {
  const options = {
    hostname: 'localhost',
    port: 8082,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ 後端響應:', data);
    });
  });

  req.on('error', (error) => {
    console.error('❌ 連接失敗:', error.message);
  });

  req.end();
}

// 等待2秒後測試
setTimeout(testBackend, 2000);
console.log('⏳ 等待後端啟動...');
