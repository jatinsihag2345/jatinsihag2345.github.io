import fs from 'fs';
import path from 'path';

const fileContent = fs.readFileSync('/Users/jatinsihag/Documents/DSAAAAAA/src/data/dsaQuestions.ts', 'utf-8');

// Use regex or eval to get rawQuestions
const match = fileContent.match(/const rawQuestions = (\[[\s\S]*?\]);/);
if (match) {
  const rawQuestions = eval(match[1]);
  console.log(`Total raw questions: ${rawQuestions.length}`);
  const topics = {};
  rawQuestions.forEach(q => {
    topics[q.topic] = (topics[q.topic] || 0) + 1;
  });
  console.log('Topics distribution:', topics);
  fs.writeFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/raw_questions.json', JSON.stringify(rawQuestions, null, 2));
} else {
  console.log('Could not find rawQuestions');
}
