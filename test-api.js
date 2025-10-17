const fetch = require('node-fetch');

async function testAPI() {
  try {
    const url = 'http://localhost:3000/api/withdrawal-status?id=3d862c81-b8b0-4f90-95a8-109360c67597&user_id=89bd2b50-da52-4ccd-bc5a-ecbabd663838';
    console.log('Testing URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();
