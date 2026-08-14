import fs from 'fs';
import path from 'path';

const conversationId = process.argv[2];
const outFile = process.argv[3];

if (!conversationId || !outFile) {
  console.error('Usage: node extract_robust.js <conversationId> <outFile>');
  process.exit(1);
}

const logPath = `/Users/jatinsihag/.gemini/antigravity/brain/${conversationId}/.system_generated/logs/transcript.jsonl`;

if (!fs.existsSync(logPath)) {
  console.error(`Log file does not exist: ${logPath}`);
  process.exit(1);
}

const logContent = fs.readFileSync(logPath, 'utf-8');
const lines = logContent.split('\n');

let candidates = [];

// Helper to check if object is a valid solutions JSON
function isValidSolutions(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.length === 0) return false;
  // Check if at least one key has a "solution" property
  return keys.some(key => obj[key] && (obj[key].solution || obj[key].trace));
}

// Function to find JSON inside a text block
function findJsonInText(text) {
  if (!text || typeof text !== 'string') return;
  
  // Try parsing the whole text
  try {
    const parsed = JSON.parse(text);
    if (isValidSolutions(parsed)) {
      candidates.push(parsed);
      return;
    }
    // If it parsed to a string, try parsing that string
    if (typeof parsed === 'string') {
      findJsonInText(parsed);
      return;
    }
  } catch (e) {}

  // Look for JSON blocks inside code blocks
  const matches = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]);
      if (isValidSolutions(parsed)) {
        candidates.push(parsed);
      }
      if (typeof parsed === 'string') {
        findJsonInText(parsed);
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
        candidates.push(parsed);
      }
    } catch (e) {}
  }
}

lines.forEach(line => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    
    // Check model response content
    if (step.content) {
      if (typeof step.content === 'object') {
        if (isValidSolutions(step.content)) {
          candidates.push(step.content);
        }
      } else {
        findJsonInText(step.content);
      }
    }
    
    // Check tool call arguments (args or arguments)
    if (step.tool_calls && Array.isArray(step.tool_calls)) {
      step.tool_calls.forEach(tc => {
        const argsObj = tc.args || tc.arguments;
        if (argsObj) {
          if (typeof argsObj === 'string') {
            findJsonInText(argsObj);
          } else if (typeof argsObj === 'object') {
            // Check all keys inside argsObj
            Object.values(argsObj).forEach(val => {
              if (typeof val === 'string') {
                findJsonInText(val);
              } else if (typeof val === 'object' && val !== null) {
                if (isValidSolutions(val)) {
                  candidates.push(val);
                }
              }
            });
          }
        }
      });
    }

    // Check message structures if any
    if (step.Message) {
      findJsonInText(step.Message);
    }
  } catch (e) {
    // Ignore line parse errors
  }
});

if (candidates.length > 0) {
  // Take the last candidate (usually the most complete/final one)
  const bestCandidate = candidates[candidates.length - 1];
  fs.writeFileSync(outFile, JSON.stringify(bestCandidate, null, 2));
  console.log(`Successfully extracted solutions for ${Object.keys(bestCandidate).length} questions to ${outFile}`);
} else {
  console.error(`Could not find any valid solutions JSON in subagent log ${conversationId}`);
  process.exit(1);
}
