import fs from 'fs';

const id = '46108c6b-d459-4f7f-94af-37837b9fe4bb';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${id}/.system_generated/logs/transcript.jsonl`;

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

lines.forEach((line, index) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    if (step.tool_calls && Array.isArray(step.tool_calls)) {
      step.tool_calls.forEach(tc => {
        if (tc.name === 'send_message') {
          const args = tc.args || tc.arguments;
          const msg = args.Message;
          console.log('--- RAW MESSAGE START ---');
          console.log(msg);
          console.log('--- RAW MESSAGE END ---');
        }
      });
    }
  } catch (e) {
    console.log(`Error parsing line ${index}: ${e.message}`);
  }
});
