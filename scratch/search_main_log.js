import fs from 'fs';

const mainId = '6da01825-a164-482f-8c35-60080c0f111b';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${mainId}/.system_generated/logs/transcript.jsonl`;

const subagents = {
  '055aed5a-35b0-4b94-9bfd-0b71c22484f5': 'batch_0',
  '46108c6b-d459-4f7f-94af-37837b9fe4bb': 'batch_1',
  'dbc40fd8-bb13-41ba-a771-39f9a64e08b8': 'batch_2',
  '40992b73-1fa5-44c9-85bd-eb6e85449078': 'batch_3',
  'd65b279a-ace2-4d72-93fa-35f43819b702': 'batch_4',
  '3051e497-ae21-49e7-a3b3-2e963bac03c5': 'batch_5',
  '4933992b-2dd0-497c-b1a9-4d74d094845c': 'batch_6',
  '8e2340bc-1150-4126-9dbc-97bc44894325': 'batch_7'
};

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

lines.forEach((line, index) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    const stepStr = JSON.stringify(step);
    
    // Search for subagent ID inside the step
    Object.entries(subagents).forEach(([id, name]) => {
      if (stepStr.includes(id)) {
        console.log(`Step ${index} contains ${name} (${id})`);
        // Let's inspect where it appears
        if (step.type === 'USER_INPUT') {
          // User inputs might contain the compaction messages
          console.log(`  USER_INPUT content length: ${String(step.content).length}`);
          // Look for incoming messages in user input
          if (typeof step.content === 'string' && step.content.includes(id)) {
            // Find JSON-like blocks or messages in the text
            const lines = step.content.split('\n');
            console.log(`  Found in USER_INPUT text lines: ${lines.length}`);
          }
        }
      }
    });
  } catch (e) {
    // Ignore errors
  }
});
