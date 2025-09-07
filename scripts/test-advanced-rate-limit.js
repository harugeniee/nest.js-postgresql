#!/usr/bin/env node

/**
 * Test script for advanced rate limiting system
 * Tests policy-based rate limiting with different strategies
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_ENDPOINTS = [
  {
    name: 'Legacy Demo (Free Plan)',
    url: '/demo',
    method: 'GET',
    expectedLimit: 300, // 300 requests per minute
  },
  {
    name: 'Legacy Heavy Operation',
    url: '/heavy',
    method: 'GET',
    expectedLimit: 5, // 5 requests per 5 minutes
  },
  {
    name: 'Advanced Policy (API Read)',
    url: '/advanced',
    method: 'GET',
    expectedLimit: 1000, // 1000 requests per minute
  },
  {
    name: 'Token Bucket Demo',
    url: '/token-bucket',
    method: 'GET',
    expectedLimit: 'burst', // Token bucket with burst
  },
];

const TEST_USERS = [
  { id: 'user-1', name: 'Test User 1' },
  { id: 'user-2', name: 'Test User 2' },
  { id: 'user-3', name: 'Test User 3' },
];

const TEST_IPS = [
  '192.168.1.100',
  '192.168.1.101',
  '192.168.1.102',
];

/**
 * Make a request with rate limit testing
 */
async function makeRequest(endpoint, user = null, ip = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (user) {
    headers['X-User-ID'] = user.id;
    headers['X-User-Name'] = user.name;
  }

  if (ip) {
    headers['X-Forwarded-For'] = ip;
  }

  try {
    const response = await axios({
      method: endpoint.method,
      url: `${BASE_URL}${endpoint.url}`,
      headers,
      timeout: 5000,
    });

    return {
      success: true,
      status: response.status,
      headers: response.headers,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      headers: error.response?.headers || {},
      error: error.message,
    };
  }
}

/**
 * Test rate limiting for a specific endpoint
 */
async function testEndpoint(endpoint, iterations = 10, delay = 100) {
  console.log(`\n🧪 Testing: ${endpoint.name}`);
  console.log(`📍 Endpoint: ${endpoint.method} ${endpoint.url}`);
  console.log(`🎯 Expected Limit: ${endpoint.expectedLimit}`);
  console.log(`🔄 Iterations: ${iterations}`);
  console.log('─'.repeat(60));

  const results = [];
  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 0; i < iterations; i++) {
    const user = TEST_USERS[i % TEST_USERS.length];
    const ip = TEST_IPS[i % TEST_IPS.length];
    
    const result = await makeRequest(endpoint, user, ip);
    results.push(result);

    if (result.success) {
      successCount++;
      console.log(`✅ Request ${i + 1}: Success (${result.status})`);
      
      // Log rate limit headers
      if (result.headers['x-ratelimit-limit']) {
        console.log(`   📊 Rate Limit: ${result.headers['x-ratelimit-remaining']}/${result.headers['x-ratelimit-limit']}`);
        console.log(`   🔄 Strategy: ${result.headers['x-ratelimit-strategy'] || 'unknown'}`);
      }
    } else {
      if (result.status === 429) {
        rateLimitedCount++;
        console.log(`🚫 Request ${i + 1}: Rate Limited (${result.status})`);
        
        if (result.headers['retry-after']) {
          console.log(`   ⏰ Retry After: ${result.headers['retry-after']} seconds`);
        }
      } else {
        console.log(`❌ Request ${i + 1}: Error (${result.status}) - ${result.error}`);
      }
    }

    // Add delay between requests
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log('─'.repeat(60));
  console.log(`📈 Results: ${successCount} success, ${rateLimitedCount} rate limited`);
  console.log(`📊 Success Rate: ${((successCount / iterations) * 100).toFixed(1)}%`);

  return {
    endpoint: endpoint.name,
    total: iterations,
    success: successCount,
    rateLimited: rateLimitedCount,
    successRate: (successCount / iterations) * 100,
  };
}

/**
 * Test policy matching
 */
async function testPolicyMatching() {
  console.log('\n🔍 Testing Policy Matching');
  console.log('─'.repeat(60));

  const testCases = [
    {
      name: 'Global Policy',
      request: {
        ip: '192.168.1.100',
        routeKey: 'GET:/api/v1/unknown',
      },
    },
    {
      name: 'Route Policy',
      request: {
        ip: '192.168.1.100',
        routeKey: 'POST:/api/v1/messages',
      },
    },
    {
      name: 'User Policy',
      request: {
        userId: 'user-123',
        ip: '192.168.1.100',
        routeKey: 'GET:/api/v1/profile',
      },
    },
  ];

  for (const testCase of testCases) {
    try {
      const response = await axios.post(`${BASE_URL}/admin/rate-limit/policies/test-match`, testCase.request);
      console.log(`✅ ${testCase.name}: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.log(`❌ ${testCase.name}: ${error.message}`);
    }
  }
}

/**
 * Test cache invalidation
 */
async function testCacheInvalidation() {
  console.log('\n🔄 Testing Cache Invalidation');
  console.log('─'.repeat(60));

  try {
    const response = await axios.post(`${BASE_URL}/admin/rate-limit/policies/publish`);
    console.log(`✅ Cache Invalidation: ${response.data.message}`);
  } catch (error) {
    console.log(`❌ Cache Invalidation: ${error.message}`);
  }
}

/**
 * Get policy statistics
 */
async function getPolicyStats() {
  console.log('\n📊 Policy Statistics');
  console.log('─'.repeat(60));

  try {
    const response = await axios.get(`${BASE_URL}/admin/rate-limit/policies/stats/overview`);
    console.log(`📈 Stats: ${JSON.stringify(response.data, null, 2)}`);
  } catch (error) {
    console.log(`❌ Stats: ${error.message}`);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Advanced Rate Limiting Test Suite');
  console.log('=' .repeat(60));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);

  try {
    // Test each endpoint
    const results = [];
    for (const endpoint of TEST_ENDPOINTS) {
      const result = await testEndpoint(endpoint, 15, 200);
      results.push(result);
    }

    // Test policy matching
    await testPolicyMatching();

    // Test cache invalidation
    await testCacheInvalidation();

    // Get policy statistics
    await getPolicyStats();

    // Summary
    console.log('\n📋 Test Summary');
    console.log('=' .repeat(60));
    results.forEach(result => {
      console.log(`${result.endpoint}: ${result.success}/${result.total} (${result.successRate.toFixed(1)}%)`);
    });

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  makeRequest,
  testEndpoint,
  testPolicyMatching,
  testCacheInvalidation,
  getPolicyStats,
  runTests,
};
