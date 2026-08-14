import fs from 'fs';
import path from 'path';

const mainId = '6da01825-a164-482f-8c35-60080c0f111b';
const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${mainId}/.system_generated/logs/transcript.jsonl`;

const subagents = {
  '055aed5a-35b0-4b94-9bfd-0b71c22484f5': 0,
  '46108c6b-d459-4f7f-94af-37837b9fe4bb': 1,
  'dbc40fd8-bb13-41ba-a771-39f9a64e08b8': 2,
  '40992b73-1fa5-44c9-85bd-eb6e85449078': 3,
  'd65b279a-ace2-4d72-93fa-35f43819b702': 4,
  '3051e497-ae21-49e7-a3b3-2e963bac03c5': 5,
  '4933992b-2dd0-497c-b1a9-4d74d094845c': 6,
  '8e2340bc-1150-4126-9dbc-97bc44894325': 7
};

const results = {};

function isValidSolutions(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  return keys.some(key => obj[key] && (obj[key].solution || obj[key].trace));
}

const logContent = fs.readFileSync(logPath, 'utf-8');
const lines = logContent.split('\n');

lines.forEach((line, lineIdx) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    const contentText = typeof step.content === 'string' ? step.content : 
                        (step.content && typeof step.content === 'object' ? JSON.stringify(step.content) : '');
    
    if (!contentText) return;

    // Search for sender IDs in this contentText
    Object.entries(subagents).forEach(([senderId, batchNum]) => {
      let idx = 0;
      while (true) {
        idx = contentText.indexOf(senderId, idx);
        if (idx === -1) break;

        // Found senderId, now look for the next "content=" or the first "{"
        let contentStartIdx = contentText.indexOf('content=', idx);
        let braceStartIdx = -1;
        if (contentStartIdx !== -1) {
          braceStartIdx = contentText.indexOf('{', contentStartIdx);
        } else {
          braceStartIdx = contentText.indexOf('{', idx + senderId.length);
        }

        if (braceStartIdx !== -1) {
          // Brace counting to find matching closing brace
          let braceCount = 0;
          let endIdx = -1;
          for (let i = braceStartIdx; i < contentText.length; i++) {
            if (contentText[i] === '{') {
              braceCount++;
            } else if (contentText[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIdx = i;
                break;
              }
            }
          }

          if (endIdx !== -1) {
            const jsonText = contentText.substring(braceStartIdx, endIdx + 1);
            try {
              const parsed = JSON.parse(jsonText);
              if (isValidSolutions(parsed)) {
                results[batchNum] = parsed;
                console.log(`Found valid solutions for batch ${batchNum} in step line ${lineIdx}, length: ${Object.keys(parsed).length} questions`);
              }
            } catch (e) {
              // Ignore parse errors for partial blocks
            }
          }
        }
        idx += senderId.length;
      }
    });
  } catch (e) {
    // Ignore line parse errors
  }
});

// Now save the results
Object.entries(results).forEach(([batchNum, data]) => {
  const outFile = `/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_${batchNum}.json`;
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`Successfully wrote batch ${batchNum} to ${outFile}`);
});
