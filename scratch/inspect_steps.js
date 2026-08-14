import fs from 'fs';

const mainId = '6da01825-a164-482f-8c35-60080c0f111b';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${mainId}/.system_generated/logs/transcript.jsonl`;

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

const stepIndices = [634, 643, 645, 651, 654, 655, 656, 659, 662, 663, 669, 670, 671, 675, 679, 687];

stepIndices.forEach(idx => {
  if (idx < lines.length) {
    const line = lines[idx];
    if (!line.trim()) return;
    try {
      const step = JSON.parse(line);
      console.log(`Step ${idx}: Type=${step.type}, Source=${step.source}`);
      if (step.content) {
        console.log(`  Content keys: ${Object.keys(step.content).join(', ') || '(string)'}`);
        console.log(`  Content preview: ${JSON.stringify(step.content).substring(0, 300)}`);
      }
      if (step.tool_calls) {
        console.log(`  Tool calls: ${JSON.stringify(step.tool_calls).substring(0, 300)}`);
      }
    } catch (e) {
      console.log(`Step ${idx} failed to parse: ${e.message}`);
    }
  }
});
