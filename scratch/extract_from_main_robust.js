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

function findJsonInText(text, batchNum) {
  if (!text || typeof text !== 'string') return;
  
  // Try parsing the whole text
  try {
    const parsed = JSON.parse(text);
    if (isValidSolutions(parsed)) {
      results[batchNum] = parsed;
      return;
    }
    if (typeof parsed === 'string') {
      findJsonInText(parsed, batchNum);
      return;
    }
  } catch (e) {}

  // Look for JSON blocks inside code blocks
  const matches = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (isValidSolutions(parsed)) {
        results[batchNum] = parsed;
      }
      if (typeof parsed === 'string') {
        findJsonInText(parsed, batchNum);
      }
    } catch (e) {}
  }

  // Fallback: search for braces
  let firstBrace = text.indexOf('{');
  let lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const substring = text.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(substring);
      if (isValidSolutions(parsed)) {
        results[batchNum] = parsed;
      }
    } catch (e) {}
  }
}

const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

lines.forEach((line, index) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    const stepStr = JSON.stringify(step);
    
    Object.entries(subagents).forEach(([id, batchNum]) => {
      if (stepStr.includes(id)) {
        // Search for JSON content in step fields
        if (step.content) {
          if (typeof step.content === 'object') {
            if (isValidSolutions(step.content)) {
              results[batchNum] = step.content;
            }
          } else {
            findJsonInText(step.content, batchNum);
          }
        }
        
        // Check tool_calls or message content
        if (step.tool_calls && Array.isArray(step.tool_calls)) {
          step.tool_calls.forEach(tc => {
            const argsObj = tc.args || tc.arguments;
            if (argsObj) {
              if (typeof argsObj === 'string') {
                findJsonInText(argsObj, batchNum);
              } else if (typeof argsObj === 'object') {
                Object.values(argsObj).forEach(val => {
                  if (typeof val === 'string') {
                    findJsonInText(val, batchNum);
                  } else if (typeof val === 'object' && val !== null) {
                    if (isValidSolutions(val)) {
                      results[batchNum] = val;
                    }
                  }
                });
              }
            }
          });
        }

        // Check incoming message notifications
        if (step.Message) {
          findJsonInText(step.Message, batchNum);
        }
      }
    });
  } catch (e) {
    // Ignore line parse errors
  }
});

// Now write all found results to files
Object.entries(results).forEach(([batchNum, data]) => {
  const outFile = `/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_${batchNum}.json`;
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`Saved batch ${batchNum} with ${Object.keys(data).length} questions to ${outFile}`);
});
