#!/usr/bin/env node

/**
 * Test script for rate limiting functionality
 * Run with: node scripts/test-rate-limit.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Test configuration
const TESTS = [
  {
    name: 'Anonymous Rate Limiting',
    url: `${BASE_URL}/demo`,
    headers: {},
    expectedLimit: 300, // free plan limit
  },
  {
    name: 'Custom Rate Limiting',
    url: `${BASE_URL}/heavy`,
    headers: {},
    expectedLimit: 5,
  },
  {
    name: 'Bypass Rate Limiting',
    url: `${BASE_URL}`,
    headers: {},
    expectedLimit: 0, // unlimited
  },
  {
    name: 'API Key Rate Limiting (Pro Plan)',
    url: `${BASE_URL}/demo`,
    headers: {
      'X-API-Key': 'test-pro-key',
    },
    expectedLimit: 1200, // pro plan limit
  },
  {
    name: 'API Key Rate Limiting (Free Plan)',
    url: `${BASE_URL}/demo`,
    headers: {
      'X-API-Key': 'test-free-key',
    },
    expectedLimit: 300, // free plan limit
  },
];

async function makeRequest(test, requestNumber) {
  try {
    const response = await axios.get(test.url, {
      headers: test.headers,
      validateStatus: () => true, // Don't throw on 4xx/5xx
    });

    const rateLimitLimit = response.headers['x-ratelimit-limit'];
    const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
    const rateLimitReset = response.headers['x-ratelimit-reset'];

    console.log(`\n${test.name} - Request #${requestNumber}:`);
    console.log(`  Status: ${response.status}`);
    console.log(`  Rate Limit: ${rateLimitLimit || 'N/A'}`);
    console.log(`  Remaining: ${rateLimitRemaining || 'N/A'}`);
    console.log(`  Reset: ${rateLimitReset || 'N/A'}`);

    if (response.status === 429) {
      console.log(`  ❌ Rate limited!`);
      return false;
    } else {
      console.log(`  ✅ Request allowed`);
      return true;
    }
  } catch (error) {
    console.log(`\n${test.name} - Request #${requestNumber}:`);
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function runTest(test, maxRequests = 10) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`Expected limit: ${test.expectedLimit === 0 ? 'Unlimited' : test.expectedLimit}`);
  console.log(`URL: ${test.url}`);
  console.log(`Headers: ${JSON.stringify(test.headers)}`);

  let successCount = 0;
  let rateLimited = false;

  for (let i = 1; i <= maxRequests; i++) {
    const success = await makeRequest(test, i);
    
    if (success) {
      successCount++;
    } else {
      rateLimited = true;
      break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Results for ${test.name}:`);
  console.log(`  Successful requests: ${successCount}`);
  console.log(`  Rate limited: ${rateLimited ? 'Yes' : 'No'}`);
  
  if (test.expectedLimit === 0) {
    console.log(`  Expected: Unlimited (${successCount >= maxRequests ? '✅' : '❌'})`);
  } else {
    const expected = Math.min(test.expectedLimit, maxRequests);
    console.log(`  Expected: ~${expected} requests (${successCount >= expected * 0.8 ? '✅' : '❌'})`);
  }
}

async function testAdminEndpoints() {
  console.log(`\n🔧 Testing Admin Endpoints:`);
  
  try {
    // Test cache stats
    const statsResponse = await axios.get(`${BASE_URL}/admin/rate-limit/cache/stats`);
    console.log(`  Cache Stats: ${JSON.stringify(statsResponse.data)}`);
  } catch (error) {
    console.log(`  ❌ Cache stats failed: ${error.message}`);
  }

  try {
    // Test plans endpoint
    const plansResponse = await axios.get(`${BASE_URL}/admin/rate-limit/plans`);
    console.log(`  Plans: ${plansResponse.data.length} plans found`);
  } catch (error) {
    console.log(`  ❌ Plans endpoint failed: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Starting Rate Limit Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Test admin endpoints first
  await testAdminEndpoints();

  // Run individual tests
  for (const test of TESTS) {
    await runTest(test);
  }

  console.log('\n✨ Rate limit testing completed!');
  console.log('\n💡 Tips:');
  console.log('  - Check server logs for detailed rate limiting decisions');
  console.log('  - Use admin endpoints to manage API keys and plans');
  console.log('  - Monitor Redis for rate limit data');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

// Run the tests
main().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});
