import fs from 'fs';
const dsa = JSON.parse(fs.readFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_batches.json', 'utf-8'));
const sql = JSON.parse(fs.readFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/sql_batches.json', 'utf-8'));

console.log('DSA BATCHES:');
dsa.forEach((b, i) => {
  console.log(`DSA Batch ${i}:`, b.map(q => q.title));
});

console.log('\nSQL BATCHES:');
sql.forEach((b, i) => {
  console.log(`SQL Batch ${i}:`, b);
});
