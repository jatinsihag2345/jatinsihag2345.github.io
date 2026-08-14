import fs from 'fs';
import path from 'path';

const rawQuestions = JSON.parse(fs.readFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/raw_questions.json', 'utf-8'));

// We want to exclude the ones that are already statically defined in dsaQuestions.ts
// Statically defined IDs: dsa-1, dsa-2, and dsa-idx-3, dsa-idx-4, dsa-idx-5, dsa-idx-6, dsa-idx-20, dsa-idx-22, dsa-idx-26, dsa-idx-27, dsa-idx-32, dsa-idx-39, dsa-idx-40, dsa-idx-43, dsa-idx-48, dsa-idx-54, dsa-idx-63, dsa-idx-70, dsa-idx-71, dsa-idx-94, dsa-idx-125, dsa-idx-139, dsa-idx-140, dsa-idx-166, dsa-idx-172, dsa-idx-185, dsa-idx-1965 (Trie)
const staticallySolvedTitles = new Set([
  'Set Matrix Zeroes',
  'Reverse Linked List',
  'Pascal\'s Triangle',
  'Next Permutation',
  'Maximum Subarray Sum (Kadane\'s Algorithm)',
  'Sort Colors',
  'Two Sum',
  'Longest Consecutive Sequence',
  'Find Middle of Linked List',
  'Merge Two Sorted Linked Lists',
  'Detect Cycle in Linked List',
  'Clone Linked List with Random Pointer',
  '3 Sum',
  'Trapping Rain Water',
  'N Meetings in One Room',
  'Subset Sums',
  'N Queens',
  'Print All Permutations',
  'Search in Rotated Sorted Array',
  'Balanced Parentheses',
  'Inorder Traversal',
  'Preorder Traversal',
  'Search in BST',
  'Validate BST',
  'BFS Traversal',
  'Implement Trie'
]);

const unsolved = rawQuestions.filter(q => !staticallySolvedTitles.has(q.title));

console.log(`Unsolved DSA questions count: ${unsolved.length}`);

// Split into batches of 15
const dsaBatches = [];
for (let i = 0; i < unsolved.length; i += 15) {
  dsaBatches.push(unsolved.slice(i, i + 15));
}
console.log(`Created ${dsaBatches.length} DSA batches.`);
fs.writeFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_batches.json', JSON.stringify(dsaBatches, null, 2));

// Do the same for SQL
// Statically defined SQL questions: Second Highest Salary (sql-1), Department Highest Salary (sql-2)
const sqlQuestionsRaw = [
  'Recyclable and Low Fat Products',
  'Find Customer Referee',
  'Big Countries',
  'Article Views I',
  'Invalid Tweets',
  'Product Sales Analysis I',
  'Customer Who Visited but Did Not Make Any Transactions',
  'Rising Temperature',
  'Average Time of Process per Machine',
  'Employee Bonus',
  'Students and Examinations',
  'Managers with at Least 5 Direct Reports',
  'Confirmation Rate',
  'Not Boring Movies',
  'Average Selling Price',
  'Project Employees I',
  'Percentage of Users Attended a Contest',
  'Queries Quality and Percentage',
  'Monthly Transactions I',
  'Immediate Food Delivery II',
  'Game Play Analysis IV',
  'Number of Unique Subjects Taught by Each Teacher',
  'User Activity for the Past 30 Days I',
  'Product Sales Analysis III',
  'Classes More Than 5 Students',
  'Find Followers Count',
  'Biggest Single Number',
  'Customers Who Bought All Products',
  'The Number of Employees Which Report to Each Employee',
  'Primary Department for Each Employee',
  'Triangle Judgement',
  'Consecutive Numbers',
  'Product Price at a Given Date',
  'Last Person to Fit in the Bus',
  'Employees Whose Manager Left the Company',
  'Exchange Seats',
  'Movie Rating',
  'Restaurant Growth',
  'Friend Requests II: Who Has the Most Friends',
  'Investments in 2016',
  'Department Top Three Salaries',
  'Fix Names in a Table',
  'Patients With a Condition',
  'Delete Duplicate Emails',
  'Group Sold Products By The Date',
  'List the Products Ordered in a Period',
  'Find Users With Valid E-Mails'
];

const sqlBatches = [];
for (let i = 0; i < sqlQuestionsRaw.length; i += 15) {
  sqlBatches.push(sqlQuestionsRaw.slice(i, i + 15));
}
console.log(`Created ${sqlBatches.length} SQL batches.`);
fs.writeFileSync('/Users/jatinsihag/Documents/DSAAAAAA/scratch/sql_batches.json', JSON.stringify(sqlBatches, null, 2));
