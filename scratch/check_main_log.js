import fs from 'fs';

const mainId = '6da01825-a164-482f-8c35-60080c0f111b';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${mainId}/.system_generated/logs/transcript.jsonl`;

if (!fs.existsSync(logPath)) {
  console.log('Main log does not exist!');
  process.exit(1);
}

const stats = fs.statSync(logPath);
console.log(`Main log size: ${stats.size} bytes`);
