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
          console.log(`Message length: ${msg.length}`);
          try {
            // Since msg is double-stringified in JSON, it should be parsed once first
            // E.g. msg is a string that starts with "{" or double quote.
            // Let's check its starting and ending characters:
            console.log(`Starts with: ${msg.substring(0, 10)}`);
            console.log(`Ends with: ${msg.substring(msg.length - 10)}`);
            
            // Try parsing once:
            const parsedOnce = JSON.parse(msg);
            console.log(`Parsed once type: ${typeof parsedOnce}`);
            if (typeof parsedOnce === 'string') {
              console.log(`Parsed once length: ${parsedOnce.length}`);
              // Try parsing twice:
              const parsedTwice = JSON.parse(parsedOnce);
              console.log(`Parsed twice type: ${typeof parsedTwice}`);
              console.log(`Parsed twice keys: ${Object.keys(parsedTwice).join(', ')}`);
            } else {
              console.log(`Parsed once keys: ${Object.keys(parsedOnce).join(', ')}`);
            }
          } catch (e) {
            console.log(`Parsing failed: ${e.message}`);
          }
        }
      });
    }
  } catch (e) {
    console.log(`Error parsing line ${index}: ${e.message}`);
  }
});
