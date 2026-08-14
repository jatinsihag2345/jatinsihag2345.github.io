import sqlSolutions from './sqlSolutions.json';
import sqlTheoriesJson from './sqlTheories.json';

export interface SQLExample {
  description: string;
  query: string;
  explanation: string;
}

export interface SQLTopicTheory {
  id: string;
  title: string;
  summary: string;
  examples: SQLExample[];
}

export interface SQLTable {
  tableName: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export interface SQLQuestion {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  leetcodeLink: string;
  topic: string;
  problemStatement: string;
  schema: string;
  exampleData: SQLTable[];
  expectedOutput: SQLTable;
  solutions: {
    name: string;
    query: string;
    explanation: string;
  }[];
  edgeCases: string[];
}

export const sqlTopics: string[] = [
  'Basic Select',
  'Basic Joins',
  'Basic Aggregate Functions',
  'Sorting and Grouping',
  'Advanced Select and Joins',
  'Subqueries & CTEs',
  'Advanced String & Window Functions'
];

export const sqlTheories: SQLTopicTheory[] = sqlTheoriesJson as unknown as SQLTopicTheory[];

export const sqlQuestions: SQLQuestion[] = [
  {
    id: 'sql-1',
    title: 'Second Highest Salary',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/second-highest-salary/',
    topic: 'Subqueries & CTEs',
    problemStatement: 'Find the second highest salary from the Employee table. If there is no second highest salary, return null.',
    schema: `Create table If Not Exists Employee (id int, salary int)`,
    exampleData: [
      {
        tableName: 'Employee',
        headers: ['id', 'salary'],
        rows: [
          [1, 100],
          [2, 200],
          [3, 300]
        ]
      }
    ],
    expectedOutput: {
      tableName: 'SecondHighestSalary',
      headers: ['SecondHighestSalary'],
      rows: [[200]]
    },
    solutions: [
      {
        name: 'Using Subquery and MAX()',
        query: `SELECT MAX(salary) AS SecondHighestSalary\nFROM Employee\nWHERE salary < (SELECT MAX(salary) FROM Employee);`,
        explanation: 'The subquery finds the maximum salary. The outer query finds the maximum salary that is strictly less than the absolute maximum.'
      },
      {
        name: 'Using OFFSET & LIMIT with IFNULL',
        query: `SELECT (\n  SELECT DISTINCT salary \n  FROM Employee \n  ORDER BY salary DESC \n  LIMIT 1 OFFSET 1\n) AS SecondHighestSalary;`,
        explanation: 'We sort unique salaries descending, then skip the first one (OFFSET 1) and take the next.'
      }
    ],
    edgeCases: [
      'Only one record in the Employee table.',
      'Multiple employees sharing the maximum salary (needs DISTINCT).',
      'All employees having the exact same salary.'
    ]
  },
  {
    id: 'sql-2',
    title: 'Department Highest Salary',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/department-highest-salary/',
    topic: 'Basic Joins',
    problemStatement: 'Find employees who have the highest salary in each of the departments. Return the department name, employee name, and salary.',
    schema: `Create table If Not Exists Employee (id int, name varchar, salary int, departmentId int)\nCreate table If Not Exists Department (id int, name varchar)`,
    exampleData: [
      {
        tableName: 'Employee',
        headers: ['id', 'name', 'salary', 'departmentId'],
        rows: [
          [1, 'Joe', 70000, 1],
          [2, 'Jim', 90000, 1],
          [3, 'Henry', 80000, 2],
          [4, 'Sam', 60000, 2],
          [5, 'Max', 90000, 1]
        ]
      },
      {
        tableName: 'Department',
        headers: ['id', 'name'],
        rows: [
          [1, 'IT'],
          [2, 'Sales']
        ]
      }
    ],
    expectedOutput: {
      tableName: 'Output',
      headers: ['Department', 'Employee', 'Salary'],
      rows: [
        ['IT', 'Jim', 90000],
        ['IT', 'Max', 90000],
        ['Sales', 'Henry', 80000]
      ]
    },
    solutions: [
      {
        name: 'Using IN Clause with Group By',
        query: `SELECT \n  D.name AS Department, \n  E.name AS Employee, \n  E.salary AS Salary\nFROM Employee E\nJOIN Department D ON E.departmentId = D.id\nWHERE (E.departmentId, E.salary) IN (\n  SELECT departmentId, MAX(salary)\n  FROM Employee\n  GROUP BY departmentId\n);`,
        explanation: 'First, find the maximum salary for each departmentId in a subquery, then filter for rows matching both departmentId and salary.'
      },
      {
        name: 'Using Window Function (DENSE_RANK)',
        query: `WITH RankedSalary AS (\n  SELECT \n    departmentId, \n    name, \n    salary, \n    DENSE_RANK() OVER (\n      PARTITION BY departmentId \n      ORDER BY salary DESC\n    ) as rnk\n  FROM Employee\n)\nSELECT \n  D.name AS Department,\n  RS.name AS Employee,\n  RS.salary AS Salary\nFROM RankedSalary RS\nJOIN Department D ON RS.departmentId = D.id\nWHERE RS.rnk = 1;`,
        explanation: 'We use DENSE_RANK() to assign rank 1 to the highest earners in each department and filter where rank is 1.'
      }
    ],
    edgeCases: [
      'Multiple employees in a department having the same maximum salary.',
      'Departments containing no employees.'
    ]
  }
];

// Complete SQL index mapping helper
const rawSqlQuestions = [
  { title: 'Count Salary Categories', difficulty: 'Medium', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/count-salary-categories/' },
  { title: 'Replace Employee ID With The Unique Identifier', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/replace-employee-id-with-the-unique-identifier/' },
  // Basic Select
  { title: 'Recyclable and Low Fat Products', difficulty: 'Easy', topic: 'Basic Select', link: 'https://leetcode.com/problems/recyclable-and-low-fat-products/' },
  { title: 'Find Customer Referee', difficulty: 'Easy', topic: 'Basic Select', link: 'https://leetcode.com/problems/find-customer-referee/' },
  { title: 'Big Countries', difficulty: 'Easy', topic: 'Basic Select', link: 'https://leetcode.com/problems/big-countries/' },
  { title: 'Article Views I', difficulty: 'Easy', topic: 'Basic Select', link: 'https://leetcode.com/problems/article-views-i/' },
  { title: 'Invalid Tweets', difficulty: 'Easy', topic: 'Basic Select', link: 'https://leetcode.com/problems/invalid-tweets/' },
  // Basic Joins
  { title: 'Product Sales Analysis I', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/product-sales-analysis-i/' },
  { title: 'Customer Who Visited but Did Not Make Any Transactions', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/customer-who-visited-but-did-not-make-any-transactions/' },
  { title: 'Rising Temperature', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/rising-temperature/' },
  { title: 'Average Time of Process per Machine', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/average-time-of-process-per-machine/' },
  { title: 'Employee Bonus', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/employee-bonus/' },
  { title: 'Students and Examinations', difficulty: 'Easy', topic: 'Basic Joins', link: 'https://leetcode.com/problems/students-and-examinations/' },
  { title: 'Managers with at Least 5 Direct Reports', difficulty: 'Medium', topic: 'Basic Joins', link: 'https://leetcode.com/problems/managers-with-at-least-5-direct-reports/' },
  { title: 'Confirmation Rate', difficulty: 'Medium', topic: 'Basic Joins', link: 'https://leetcode.com/problems/confirmation-rate/' },
  // Basic Aggregate Functions
  { title: 'Not Boring Movies', difficulty: 'Easy', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/not-boring-movies/' },
  { title: 'Average Selling Price', difficulty: 'Easy', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/average-selling-price/' },
  { title: 'Project Employees I', difficulty: 'Easy', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/project-employees-i/' },
  { title: 'Percentage of Users Attended a Contest', difficulty: 'Easy', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/percentage-of-users-attended-a-contest/' },
  { title: 'Queries Quality and Percentage', difficulty: 'Easy', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/queries-quality-and-percentage/' },
  { title: 'Monthly Transactions I', difficulty: 'Medium', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/monthly-transactions-i/' },
  { title: 'Immediate Food Delivery II', difficulty: 'Medium', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/immediate-food-delivery-ii/' },
  { title: 'Game Play Analysis IV', difficulty: 'Medium', topic: 'Basic Aggregate Functions', link: 'https://leetcode.com/problems/game-play-analysis-iv/' },
  // Sorting and Grouping
  { title: 'Number of Unique Subjects Taught by Each Teacher', difficulty: 'Easy', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/number-of-unique-subjects-taught-by-each-teacher/' },
  { title: 'User Activity for the Past 30 Days I', difficulty: 'Easy', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/user-activity-for-the-past-30-days-i/' },
  { title: 'Product Sales Analysis III', difficulty: 'Medium', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/product-sales-analysis-iii/' },
  { title: 'Classes More Than 5 Students', difficulty: 'Easy', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/classes-more-than-5-students/' },
  { title: 'Find Followers Count', difficulty: 'Easy', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/find-followers-count/' },
  { title: 'Biggest Single Number', difficulty: 'Easy', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/biggest-single-number/' },
  { title: 'Customers Who Bought All Products', difficulty: 'Medium', topic: 'Sorting and Grouping', link: 'https://leetcode.com/problems/customers-who-bought-all-products/' },
  // Advanced Select and Joins
  { title: 'The Number of Employees Which Report to Each Employee', difficulty: 'Easy', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/the-number-of-employees-which-report-to-each-employee/' },
  { title: 'Primary Department for Each Employee', difficulty: 'Easy', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/primary-department-for-each-employee/' },
  { title: 'Triangle Judgement', difficulty: 'Easy', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/triangle-judgement/' },
  { title: 'Consecutive Numbers', difficulty: 'Medium', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/consecutive-numbers/' },
  { title: 'Product Price at a Given Date', difficulty: 'Medium', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/product-price-at-a-given-date/' },
  { title: 'Last Person to Fit in the Bus', difficulty: 'Medium', topic: 'Advanced Select and Joins', link: 'https://leetcode.com/problems/last-person-to-fit-in-the-bus/' },
  // Subqueries & CTEs
  { title: 'Employees Whose Manager Left the Company', difficulty: 'Easy', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/employees-whose-manager-left-the-company/' },
  { title: 'Exchange Seats', difficulty: 'Medium', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/exchange-seats/' },
  { title: 'Movie Rating', difficulty: 'Medium', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/movie-rating/' },
  { title: 'Restaurant Growth', difficulty: 'Medium', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/restaurant-growth/' },
  { title: 'Friend Requests II: Who Has the Most Friends', difficulty: 'Medium', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/friend-requests-ii-who-has-the-most-friends/' },
  { title: 'Investments in 2016', difficulty: 'Medium', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/investments-in-2016/' },
  { title: 'Department Top Three Salaries', difficulty: 'Hard', topic: 'Subqueries & CTEs', link: 'https://leetcode.com/problems/department-top-three-salaries/' },
  // Advanced String & Window Functions
  { title: 'Fix Names in a Table', difficulty: 'Easy', topic: 'Advanced String & Window Functions', link: 'https://leetcode.com/problems/fix-names-in-a-table/' },
  { title: 'Patients With a Condition', difficulty: 'Easy', topic: 'Advanced String & Window Functions', link: 'https://leetcode.com/problems/patients-with-a-condition/' },
  { title: 'Delete Duplicate Emails', difficulty: 'Easy', topic: 'Advanced String & Window Functions', link: 'https://leetcode.com/problems/delete-duplicate-emails/' },
  { title: 'Group Sold Products By The Date', difficulty: 'Easy', topic: 'Advanced String & Window Functions', link: 'https://leetcode.com/problems/group-sold-products-by-the-date/' },
  { title: 'List the Products Ordered in a Period', difficulty: 'Easy', topic: 'Advanced String & Window Functions', link: 'https://leetcode.com/problems/list-the-products-ordered-in-a-period/' },
  { title: 'Find Users With Valid E-Mails', difficulty: 'Easy', topic: 'Advanced String & Window Functions', link: 'https://leetcode.com/problems/find-users-with-valid-e-mails/' }
];

// Append remaining index metadata dynamically to checklist
rawSqlQuestions.forEach((item, index) => {
  const existing = sqlQuestions.find(q => q.title.toLowerCase() === item.title.toLowerCase());
  
  const solved = (sqlSolutions as any)[item.title];

  if (!existing) {
    sqlQuestions.push({
      id: `sql-idx-${index + 3}`,
      title: item.title,
      difficulty: item.difficulty as 'Easy' | 'Medium' | 'Hard',
      leetcodeLink: item.link,
      topic: item.topic,
      problemStatement: solved?.problemStatement || `Solve the SQL query '${item.title}' directly on LeetCode. Review the edge cases and write your optimal query logic inside the notes tab below.`,
      schema: solved?.schema || `-- Standard Table Schemas. Refer to LeetCode for full description.`,
      exampleData: solved?.exampleData || [],
      expectedOutput: solved?.expectedOutput || {
        tableName: 'Output',
        headers: ['Headers'],
        rows: []
      },
      solutions: solved?.solutions || [],
      edgeCases: solved?.edgeCases || ['Table containing no matching rows', 'Handling duplicate values', 'Aggregating rows containing NULLs']
    });
  }
});
