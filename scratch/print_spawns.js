import fs from 'fs';

const dsaBatches = JSON.parse(fs.readFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_batches.json', 'utf-8'));
const sqlBatches = JSON.parse(fs.readFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/sql_batches.json', 'utf-8'));

console.log('--- DSA BATCHES ---');
dsaBatches.forEach((batch, idx) => {
  console.log(`\nBatch ${idx} (Target: /Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_${idx}.json):`);
  batch.forEach((q, qidx) => {
    console.log(`${qidx + 1}. ${q.title}`);
  });
});

console.log('\n--- SQL BATCHES ---');
sqlBatches.forEach((batch, idx) => {
  console.log(`\nSQL Batch ${idx} (Target: /Users/jatinsihag/Documents/DSAAAAAA/scratch/sql_sol_${idx}.json):`);
  batch.forEach((q, qidx) => {
    console.log(`${qidx + 1}. ${q}`);
  });
});
