import fs from 'fs';
import { execSync } from 'child_process';

const dsaSubagents = {
  0: 'ece3117d-d116-44d1-aac7-eabfd8762b50',
  1: '55af498c-70f3-4940-83b6-425520aa460c',
  2: '5b13a4d5-8934-4ab7-8a45-abea063c7a7f',
  3: 'e1ae2eeb-a01f-4a34-90bc-cbed37da9db7',
  4: 'd9e818be-0c92-4f4f-b460-244ea8457373',
  5: '43721856-dea6-4679-8014-30b3aa06032d',
  6: '8156e4ab-8942-46ce-a3f4-9a9b6eda5bab',
  7: 'fa1b5b51-7b2a-40cf-886a-a66d26c75016',
  8: '17f5ae41-e274-448b-a9e4-d3c83ba57ec7',
  9: 'cdcb95ce-b49c-456e-b984-b4268c7ad506',
  10: '8680bcbc-1ef4-4bb6-9426-4a1b79f1ffeb'
};

const sqlSubagents = {
  0: '23179dc1-0701-4156-a948-525ade2736da',
  1: 'bd6240c5-2b54-4f47-8a8f-6c421a6a9a03',
  2: 'aabd696d-2dec-42fe-9638-ee7c2594e000',
  3: 'ef60389b-2f33-4c30-891e-ee340ff99a4d'
};

console.log('--- EXTRACTING DSA SUBAGENTS ---');
for (const [batch, id] of Object.entries(dsaSubagents)) {
  const outFile = `/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_${batch}.json`;
  console.log(`Extracting DSA batch ${batch} (ID: ${id}) to ${outFile}...`);
  try {
    const out = execSync(`node scratch/extract_robust.js ${id} ${outFile}`, { encoding: 'utf-8' });
    console.log(`Success: ${out.trim()}`);
  } catch (e) {
    console.log(`Failed to extract DSA batch ${batch}: ${e.message.split('\n')[0]}`);
  }
}

console.log('\n--- EXTRACTING SQL SUBAGENTS ---');
for (const [batch, id] of Object.entries(sqlSubagents)) {
  const outFile = `/Users/jatinsihag/Documents/DSAAAAAA/scratch/sql_sol_${batch}.json`;
  console.log(`Extracting SQL batch ${batch} (ID: ${id}) to ${outFile}...`);
  try {
    const out = execSync(`node scratch/extract_robust.js ${id} ${outFile}`, { encoding: 'utf-8' });
    console.log(`Success: ${out.trim()}`);
  } catch (e) {
    console.log(`Failed to extract SQL batch ${batch}: ${e.message.split('\n')[0]}`);
  }
}
