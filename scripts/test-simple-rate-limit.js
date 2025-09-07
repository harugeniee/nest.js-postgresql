#!/usr/bin/env node

/**
 * Simple test for rate limiting
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_ENDPOINT = '/auth/login';

async function testRateLimit() {
  console.log('🧪 Testing Rate Limiting');
  console.log('========================\n');

  // Test 1: Anonymous user (no API key)
  console.log('1️⃣ Testing Anonymous User (No API Key)');
  console.log('Expected: 30 requests per minute\n');

  for (let i = 1; i <= 35; i++) {
    try {
      const response = await axios.post(
        `${BASE_URL}${TEST_ENDPOINT}`,
        { email: 'test@example.com', password: 'password' },
        { 
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': '192.168.1.100' // Use different IP to avoid whitelist
          },
          timeout: 5000
        }
      );
      
      const rateLimitHeaders = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        plan: response.headers['x-ratelimit-plan'],
        status: response.headers['x-ratelimit-status']
      };

      console.log(
        `Request ${i.toString().padStart(2, '0')}: Status ${response.status} - ` +
        `Limit: ${rateLimitHeaders.limit || 'N/A'} - ` +
        `Remaining: ${rateLimitHeaders.remaining || 'N/A'} - ` +
        `Plan: ${rateLimitHeaders.plan || 'N/A'} - ` +
        `Status: ${rateLimitHeaders.status || 'N/A'}`
      );

    } catch (error) {
      const status = error.response?.status || 0;
      const rateLimitHeaders = {
        limit: error.response?.headers['x-ratelimit-limit'],
        remaining: error.response?.headers['x-ratelimit-remaining'],
        plan: error.response?.headers['x-ratelimit-plan'],
        status: error.response?.headers['x-ratelimit-status']
      };

      console.log(
        `Request ${i.toString().padStart(2, '0')}: Status ${status} - ` +
        `Limit: ${rateLimitHeaders.limit || 'N/A'} - ` +
        `Remaining: ${rateLimitHeaders.remaining || 'N/A'} - ` +
        `Plan: ${rateLimitHeaders.plan || 'N/A'} - ` +
        `Status: ${rateLimitHeaders.status || 'N/A'}`
      );

      if (status === 429) {
        console.log('🚫 Rate limit exceeded!');
        break;
      }
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: With API key
  console.log('2️⃣ Testing with Free Tier API Key');
  console.log('Expected: 100 requests per minute\n');

  for (let i = 1; i <= 35; i++) {
    try {
      const response = await axios.post(
        `${BASE_URL}${TEST_ENDPOINT}`,
        { email: 'test@example.com', password: 'password' },
        { 
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'ak_free_1234567890abcdef',
            'X-Forwarded-For': '192.168.1.100' // Use different IP to avoid whitelist
          },
          timeout: 5000
        }
      );
      
      const rateLimitHeaders = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        plan: response.headers['x-ratelimit-plan'],
        status: response.headers['x-ratelimit-status']
      };

      console.log(
        `Request ${i.toString().padStart(2, '0')}: Status ${response.status} - ` +
        `Limit: ${rateLimitHeaders.limit || 'N/A'} - ` +
        `Remaining: ${rateLimitHeaders.remaining || 'N/A'} - ` +
        `Plan: ${rateLimitHeaders.plan || 'N/A'} - ` +
        `Status: ${rateLimitHeaders.status || 'N/A'}`
      );

    } catch (error) {
      const status = error.response?.status || 0;
      const rateLimitHeaders = {
        limit: error.response?.headers['x-ratelimit-limit'],
        remaining: error.response?.headers['x-ratelimit-remaining'],
        plan: error.response?.headers['x-ratelimit-plan'],
        status: error.response?.headers['x-ratelimit-status']
      };

      console.log(
        `Request ${i.toString().padStart(2, '0')}: Status ${status} - ` +
        `Limit: ${rateLimitHeaders.limit || 'N/A'} - ` +
        `Remaining: ${rateLimitHeaders.remaining || 'N/A'} - ` +
        `Plan: ${rateLimitHeaders.plan || 'N/A'} - ` +
        `Status: ${rateLimitHeaders.status || 'N/A'}`
      );

      if (status === 429) {
        console.log('🚫 Rate limit exceeded!');
        break;
      }
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n🎉 Test completed!');
}

// Run test
testRateLimit().catch(console.error);
