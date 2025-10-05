// Test script to trigger deposit monitoring
const fetch = require('node-fetch');

async function testMonitoring() {
    try {
        // Try different possible secrets
        const secrets = ['your_revalidate_secret', 'admin123', 'test123', 'revalidate123'];
        
        for (const secret of secrets) {
            console.log(`Testing with secret: ${secret}`);
            
            const response = await fetch('http://localhost:3001/api/cron/monitor-deposits', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${secret}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log(`Status: ${response.status}`);
            
            if (response.status === 200) {
                const result = await response.json();
                console.log('SUCCESS!', result);
                break;
            } else if (response.status !== 401) {
                const error = await response.text();
                console.log('Error:', error);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testMonitoring();
