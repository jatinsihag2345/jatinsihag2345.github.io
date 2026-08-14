import fs from 'fs';
import path from 'path';

const scratchDir = '/Users/jatinsihag/Documents/DSAAAAAA/scratch';
const outSqlPath = '/Users/jatinsihag/Documents/DSAAAAAA/src/data/sqlSolutions.json';

const files = fs.readdirSync(scratchDir);
const sqlSolutions = {};

files.forEach(file => {
  if (file.startsWith('sql_sol_') && file.endsWith('.json')) {
    const filePath = path.join(scratchDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      Object.entries(data).forEach(([title, details]) => {
        sqlSolutions[title] = details;
      });
      console.log(`Merged ${file} successfully.`);
    } catch (e) {
      console.error(`Failed to parse/merge ${file}:`, e);
    }
  }
});

fs.writeFileSync(outSqlPath, JSON.stringify(sqlSolutions, null, 2));
console.log('Successfully wrote compiled SQL solutions!');
