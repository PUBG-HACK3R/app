async function testActivityAPI() {
  try {
    console.log('🧪 Testing activity API...');
    
    const response = await fetch('http://localhost:3000/api/admin-v2/dashboard/activity');
    console.log('Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:');
      console.log('- Activities count:', data.activities?.length || 0);
      
      if (data.activities && data.activities.length > 0) {
        console.log('- Activity types:', [...new Set(data.activities.map(a => a.type))]);
        console.log('- Sample activity:', data.activities[0]);
      }
    } else {
      const error = await response.text();
      console.error('Error response:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Use dynamic import for fetch in Node.js
import('node-fetch').then(({ default: fetch }) => {
  global.fetch = fetch;
  testActivityAPI();
}).catch(() => {
  // Fallback if node-fetch is not available
  console.log('Please install node-fetch or run this in a browser environment');
});
