import fs from 'fs';
import path from 'path';

const logPath = '/Users/jatinsihag/.gemini/antigravity/brain/6da01825-a164-482f-8c35-60080c0f111b/.system_generated/logs/transcript.jsonl';
const outPath = '/Users/jatinsihag/.gemini/antigravity/brain/6da01825-a164-482f-8c35-60080c0f111b/user_conversation_history.md';

if (!fs.existsSync(logPath)) {
  console.error('Log file not found:', logPath);
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf-8');
const lines = content.split('\n');

let mdContent = `# User Conversation History\n\nThis document compiles all the messages and requests you have sent during this Antigravity pair-programming session.\n\n---\n\n`;
let count = 0;

lines.forEach((line) => {
  if (!line.trim()) return;
  try {
    const step = JSON.parse(line);
    if (step.source === 'USER_EXPLICIT' && step.type === 'USER_INPUT') {
      count++;
      let cleanedContent = step.content || '';
      
      // Strip USER_REQUEST tags for readability
      cleanedContent = cleanedContent.replace(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/, '$1');
      cleanedContent = cleanedContent.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '');
      cleanedContent = cleanedContent.replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '');
      
      const date = step.created_at ? new Date(step.created_at).toLocaleString() : 'N/A';
      
      mdContent += `### Prompt #${count}\n`;
      mdContent += `**Timestamp:** ${date}\n\n`;
      mdContent += `${cleanedContent.trim()}\n\n`;
      mdContent += `---\n\n`;
    }
  } catch (e) {
    // Ignore lines that can't be parsed (e.g. trailing empty lines)
  }
});

fs.writeFileSync(outPath, mdContent);
console.log(`Successfully extracted ${count} prompts to user_conversation_history.md!`);
