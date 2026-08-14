import fs from 'fs';

const mainId = '6da01825-a164-482f-8c35-60080c0f111b';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${mainId}/.system_generated/logs/transcript.jsonl`;

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
const line = lines[629];
if (line) {
  try {
    const step = JSON.parse(line);
    console.log(`Type: ${step.type}`);
    console.log(`Content type: ${typeof step.content}`);
    if (typeof step.content === 'string') {
      console.log(`Content length: ${step.content.length}`);
      console.log(`Content start:\n${step.content.substring(0, 1000)}`);
      console.log(`Content end:\n${step.content.substring(step.content.length - 1000)}`);
    } else {
      console.log(`Content:`, step.content);
    }
  } catch (e) {
    console.log(`Error parsing: ${e.message}`);
  }
} else {
  console.log(`Line 629 not found! Total lines: ${lines.length}`);
}
