import fs from 'fs';
import path from 'path';

const scratchDir = '/Users/jatinsihag/Documents/DSAAAAAA/scratch';
const outSolutionsPath = '/Users/jatinsihag/Documents/DSAAAAAA/src/data/dsaSolutions.json';
const outTracesPath = '/Users/jatinsihag/Documents/DSAAAAAA/src/data/dsaTraces.json';

const files = fs.readdirSync(scratchDir);
const dsaSolutions = {};
const dsaTraces = {};

files.forEach(file => {
  if (file.startsWith('dsa_sol_') && file.endsWith('.json')) {
    const filePath = path.join(scratchDir, file);
    try {
      let content = fs.readFileSync(filePath, 'utf-8');
      content = content.replace(/-?Infinity/g, (m) => m.startsWith('-') ? '"-Infinity"' : '"Infinity"');
      const data = JSON.parse(content);
      
      Object.entries(data).forEach(([title, details]) => {
        if (details.solution) {
          dsaSolutions[title] = details.solution;
        }
        if (details.trace) {
          dsaTraces[title] = details.trace;
        }
      });
      console.log(`Merged ${file} successfully.`);
    } catch (e) {
      console.error(`Failed to parse/merge ${file}:`, e);
    }
  }
});

fs.writeFileSync(outSolutionsPath, JSON.stringify(dsaSolutions, null, 2));
fs.writeFileSync(outTracesPath, JSON.stringify(dsaTraces, null, 2));
console.log('Successfully wrote compiled DSA solutions and traces!');
