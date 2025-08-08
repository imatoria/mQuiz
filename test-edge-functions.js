// Simple test script to verify edge functions are working
// Run this in the browser console to test the functions

async function testEdgeFunctions() {
  const supabaseUrl = 'https://bdnolakqylcvspodpwyb.supabase.co';
  
  // Test the test-api-key function with a dummy request
  try {
    console.log('Testing test-api-key function...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/test-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // This will fail auth but we can see if function is deployed
      },
      body: JSON.stringify({
        providerId: 'test',
        apiKey: 'test'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);
    
    if (response.status === 401) {
      console.log('✓ Function is deployed and responding (401 Unauthorized is expected without proper auth)');
    } else {
      console.log('Function response:', response.status, data);
    }
    
  } catch (error) {
    console.error('Error testing function:', error);
  }
}

// Run the test
testEdgeFunctions();
