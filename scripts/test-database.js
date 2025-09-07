#!/usr/bin/env node

/**
 * Test database connection and data
 */

const { Client } = require('pg');

async function testDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'nest_app',
    user: 'postgres',
    password: 'your_password',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Test plans
    console.log('\n📋 Testing Plans:');
    const plansResult = await client.query('SELECT * FROM plans ORDER BY "displayOrder"');
    console.log('Plans found:', plansResult.rows.length);
    plansResult.rows.forEach(plan => {
      console.log(`  - ${plan.name}: ${plan.limit_per_min} req/min (active: ${plan.active})`);
    });

    // Test API keys
    console.log('\n🔑 Testing API Keys:');
    const apiKeysResult = await client.query('SELECT key, plan, active, "isWhitelist" FROM api_keys ORDER BY created_at');
    console.log('API keys found:', apiKeysResult.rows.length);
    apiKeysResult.rows.forEach(key => {
      console.log(`  - ${key.key}: ${key.plan} (active: ${key.active}, whitelist: ${key.isWhitelist})`);
    });

    // Test specific API key
    console.log('\n🔍 Testing Specific API Key:');
    const specificKey = 'ak_free_1234567890abcdef';
    const keyResult = await client.query('SELECT * FROM api_keys WHERE key = $1', [specificKey]);
    if (keyResult.rows.length > 0) {
      const key = keyResult.rows[0];
      console.log(`Found key: ${key.key}`);
      console.log(`  Plan: ${key.plan}`);
      console.log(`  Active: ${key.active}`);
      console.log(`  Whitelist: ${key.isWhitelist}`);
      console.log(`  Expires: ${key.expiresAt}`);
      console.log(`  Deleted: ${key.deletedAt}`);
    } else {
      console.log(`❌ Key not found: ${specificKey}`);
    }

    // Test IP whitelist
    console.log('\n🌐 Testing IP Whitelist:');
    const ipResult = await client.query('SELECT ip, description, active FROM ip_whitelist ORDER BY created_at');
    console.log('IP whitelist entries:', ipResult.rows.length);
    ipResult.rows.forEach(ip => {
      console.log(`  - ${ip.ip}: ${ip.description} (active: ${ip.active})`);
    });

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
  }
}

testDatabase().catch(console.error);
