// scripts/gen-migration.ts
import { execSync } from 'child_process';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('📝 Enter migration name: ', name => {
  if (!name.trim()) {
    console.error('❌ Migration name cannot be empty!');
    rl.close();
    process.exit(1);
  }

  const command = `yarn typeorm migration:generate ./src/db/migrations/${name}`;

  console.log(`🚀 Creating migration: ${name}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Error creating migration:', error);
  }

  rl.close();
});
