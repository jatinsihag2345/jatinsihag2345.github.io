import fs from 'fs';

const id = '46108c6b-d459-4f7f-94af-37837b9fe4bb'; // Batch 1
const path = `/Users/jatinsihag/.gemini/antigravity/brain/${id}/.system_generated/logs/transcript.jsonl`;

const content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    console.log(`Step ${index}: Type=${step.type}, Source=${step.source}`);
    if (step.content) {
      console.log(`  Content snippet: ${JSON.stringify(step.content).substring(0, 150)}`);
    }
    if (step.tool_calls) {
      console.log(`  Tool calls: ${JSON.stringify(step.tool_calls).substring(0, 150)}`);
    }
  } catch (e) {
    console.log(`Step ${index}: Parse error - ${e.message}`);
  }
});
