import fs from 'fs';

const mainId = '6da01825-a164-482f-8c35-60080c0f111b';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${mainId}/.system_generated/logs/transcript.jsonl`;

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

const stepIndices = [581, 586, 588, 592, 594, 600, 602, 606, 610, 614, 616, 620, 622, 624, 626, 629];

stepIndices.forEach(idx => {
  if (idx < lines.length) {
    const line = lines[idx];
    if (!line.trim()) return;
    try {
      const step = JSON.parse(line);
      console.log(`=== Step ${idx} ===`);
      console.log(`Type: ${step.type}, Source: ${step.source}`);
      console.log(`Raw Content keys: ${step.content ? Object.keys(step.content).join(', ') : 'none'}`);
      if (typeof step.content === 'string') {
        console.log(`Content Snippet: ${step.content.substring(0, 300)}`);
      } else if (step.content) {
        console.log(`Content Snippet: ${JSON.stringify(step.content).substring(0, 300)}`);
      }
      if (step.tool_calls) {
        console.log(`Tool Calls: ${JSON.stringify(step.tool_calls).substring(0, 300)}`);
      }
    } catch (e) {
      console.log(`Step ${idx} error: ${e.message}`);
    }
  }
});
