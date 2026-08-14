import fs from 'fs';
import path from 'path';

const conversationId = process.argv[2];
if (!conversationId) {
  console.error('Usage: node extract_log.js <conversationId> [outFile]');
  process.exit(1);
}

const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${conversationId}/.system_generated/logs/transcript.jsonl`;

if (!fs.existsSync(logPath)) {
  console.error(`Log file does not exist: ${logPath}`);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');
let lastResponse = null;

lines.forEach(line => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    // Look for planner response or tool call / message from subagent
    if (step.type === 'PLANNER_RESPONSE' && step.source === 'MODEL') {
      lastResponse = step.content;
    }
  } catch (e) {
    // Ignore invalid JSON lines
  }
});

if (lastResponse) {
  // Try to find JSON inside the response (sometimes it has markdown codeblocks, sometimes not)
  let jsonText = lastResponse;
  const match = lastResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (match) {
    jsonText = match[1];
  } else {
    const startIdx = lastResponse.indexOf('{');
    const endIdx = lastResponse.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1) {
      jsonText = lastResponse.substring(startIdx, endIdx + 1);
    }
  }
  
  const outFile = process.argv[3];
  if (outFile) {
    fs.writeFileSync(outFile, jsonText);
    console.log(`Successfully wrote extracted JSON to ${outFile}`);
  } else {
    console.log('EXTRACTED CONTENT:');
    console.log(jsonText.substring(0, 1000) + '\n... [truncated]');
  }
} else {
  console.log('No model response found in log.');
}
