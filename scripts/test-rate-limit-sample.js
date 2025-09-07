#!/usr/bin/env node

/**
 * Test script for rate limiting with sample data
 * Demonstrates different rate limits for anonymous, free, pro, and enterprise plans
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_ENDPOINT = '/auth/login'; // Use existing endpoint for testing

// Test configurations
const TEST_CONFIGS = [
  {
    name: 'Anonymous User (No API Key)',
    headers: {},
    expectedLimit: 30, // 30 requests per minute
    description: 'Should be limited to 30 requests per minute'
  },
  {
    name: 'Free Tier API Key',
    headers: { 'X-API-Key': 'ak_free_1234567890abcdef' },
    expectedLimit: 100, // 100 requests per minute
    description: 'Should be limited to 100 requests per minute'
  },
  {
    name: 'Pro Tier API Key',
    headers: { 'X-API-Key': 'ak_pro_abcdef1234567890' },
    expectedLimit: 500, // 500 requests per minute
    description: 'Should be limited to 500 requests per minute'
  },
  {
    name: 'Enterprise API Key',
    headers: { 'X-API-Key': 'ak_enterprise_9876543210fedcba' },
    expectedLimit: 2000, // 2000 requests per minute
    description: 'Should be limited to 2000 requests per minute'
  },
  {
    name: 'Whitelisted API Key',
    headers: { 'X-API-Key': 'ak_whitelist_bypass_all_limits' },
    expectedLimit: 'unlimited',
    description: 'Should bypass all rate limits'
  }
];

// Test data
const testData = {
  email: 'test@example.com',
  password: 'password'
};

/**
 * Make a request and return response info
 */
async function makeRequest(headers = {}) {
  try {
    const response = await axios.post(
      `${BASE_URL}${TEST_ENDPOINT}`,
      testData,
      { 
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 5000
      }
    );
    
    return {
      status: response.status,
      headers: response.headers,
      data: response.data,
      success: true
    };
  } catch (error) {
    return {
      status: error.response?.status || 0,
      headers: error.response?.headers || {},
      data: error.response?.data || error.message,
      success: false
    };
  }
}

/**
 * Test rate limiting for a specific configuration
 */
async function testRateLimit(config, maxRequests = 35) {
  console.log(`\n🧪 Testing: ${config.name}`);
  console.log(`📝 ${config.description}`);
  console.log(`🔢 Expected limit: ${config.expectedLimit} requests per minute`);
  console.log(`📊 Making ${maxRequests} requests...\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 1; i <= maxRequests; i++) {
    const result = await makeRequest(config.headers);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    const rateLimitHeaders = {
      limit: result.headers['x-ratelimit-limit'],
      remaining: result.headers['x-ratelimit-remaining'],
      reset: result.headers['x-ratelimit-reset'],
      plan: result.headers['x-ratelimit-plan'],
      status: result.headers['x-ratelimit-status']
    };

    const status = result.success ? '✅' : '❌';
    const statusText = result.success ? 'SUCCESS' : 'FAILED';
    
    console.log(
      `${status} Request ${i.toString().padStart(2, '0')} (${elapsed}s): ${statusText} - ` +
      `Status: ${result.status} - ` +
      `Remaining: ${rateLimitHeaders.remaining || 'N/A'} - ` +
      `Plan: ${rateLimitHeaders.plan || 'N/A'}`
    );

    results.push({
      request: i,
      success: result.success,
      status: result.status,
      rateLimitHeaders,
      elapsed: parseFloat(elapsed)
    });

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Analyze results
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const rateLimitedRequests = results.filter(r => r.status === 429).length;

  console.log(`\n📈 Results for ${config.name}:`);
  console.log(`   ✅ Successful: ${successfulRequests}`);
  console.log(`   ❌ Failed: ${failedRequests}`);
  console.log(`   🚫 Rate Limited: ${rateLimitedRequests}`);
  console.log(`   ⏱️  Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

  // Check if rate limiting worked as expected
  if (config.expectedLimit === 'unlimited') {
    if (rateLimitedRequests === 0) {
      console.log(`   🎉 Rate limiting bypassed correctly!`);
    } else {
      console.log(`   ⚠️  Expected unlimited but got rate limited`);
    }
  } else {
    if (rateLimitedRequests > 0 && successfulRequests <= config.expectedLimit) {
      console.log(`   🎉 Rate limiting worked correctly!`);
    } else if (rateLimitedRequests === 0) {
      console.log(`   ⚠️  No rate limiting detected (might need more requests)`);
    } else {
      console.log(`   ⚠️  Rate limiting behavior unexpected`);
    }
  }

  return results;
}

/**
 * Test IP whitelist functionality
 */
async function testIpWhitelist() {
  console.log(`\n🌐 Testing IP Whitelist functionality`);
  console.log(`📝 Localhost (127.0.0.1) should bypass rate limits\n`);

  // Test with localhost IP (should be whitelisted)
  const results = [];
  for (let i = 1; i <= 50; i++) {
    const result = await makeRequest({});
    const rateLimitStatus = result.headers['x-ratelimit-status'];
    
    console.log(
      `Request ${i.toString().padStart(2, '0')}: Status ${result.status} - ` +
      `Rate Limit Status: ${rateLimitStatus || 'N/A'}`
    );
    
    results.push({
      request: i,
      success: result.success,
      status: result.status,
      rateLimitStatus
    });

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const whitelistedRequests = results.filter(r => r.rateLimitStatus === 'whitelisted').length;
  console.log(`\n📊 IP Whitelist Results:`);
  console.log(`   🌐 Whitelisted requests: ${whitelistedRequests}`);
  
  if (whitelistedRequests > 0) {
    console.log(`   🎉 IP whitelist working correctly!`);
  } else {
    console.log(`   ⚠️  IP whitelist might not be working`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Rate Limit Sample Tests');
  console.log('=====================================');
  
  try {
    // Test each configuration
    for (const config of TEST_CONFIGS) {
      await testRateLimit(config);
      console.log('\n' + '='.repeat(50));
    }

    // Test IP whitelist
    await testIpWhitelist();

    console.log('\n🎉 All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - Anonymous users: 30 req/min');
    console.log('   - Free tier: 100 req/min');
    console.log('   - Pro tier: 500 req/min');
    console.log('   - Enterprise: 2000 req/min');
    console.log('   - Whitelisted: Unlimited');
    console.log('   - Localhost IP: Whitelisted');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testRateLimit, testIpWhitelist };
