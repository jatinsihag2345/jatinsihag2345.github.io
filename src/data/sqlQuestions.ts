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
  // Set when a question genuinely has one natural query (a plain WHERE filter with no join
  // or grouping to restructure). `whyOneSolution` says what a reader might reach for instead
  // and why it is no improvement, so a lone approach never reads as an unfinished entry.
  onlyOneNaturalSolution?: boolean;
  whyOneSolution?: string;
  // Procedural SQL (CREATE PROCEDURE/FUNCTION/TRIGGER, cursors) cannot run in the in-browser
  // SQLite sandbox (SqlPlayground) — SQLite has no procedural-SQL support at all, in any
  // dialect. SQLViewer skips the live runner and the LeetCode link (there isn't one; these
  // are original questions) when this is set, and shows why instead of a broken run button.
  procedureTrack?: boolean;
  // Human label for the code block's language tag, e.g. 'PL/pgSQL (PostgreSQL)'.
  dialect?: string;
}

export const sqlTopics: string[] = [
  'Basic Select',
  'Basic Joins',
  'Basic Aggregate Functions',
  'Sorting and Grouping',
  'Advanced Select and Joins',
  'Subqueries & CTEs',
  'Advanced String & Window Functions',
  'Stored Procedures & PL/SQL'
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

// Final pass: the loop above only fills in questions it CREATES, so the handful defined
// inline at the top of this file never saw sqlSolutions.json. The polish pass rewrote their
// statements and added alternative query approaches, so let the richer JSON version win —
// otherwise those two questions keep the one-line stub they shipped with.
sqlQuestions.forEach(q => {
  const solved = (sqlSolutions as any)[q.title];
  if (!solved) return;

  if (solved.problemStatement && solved.problemStatement.length > (q.problemStatement || '').length) {
    q.problemStatement = solved.problemStatement;
  }
  if (solved.solutions?.length > q.solutions.length) {
    q.solutions = solved.solutions;
  }
  if (solved.onlyOneNaturalSolution) {
    q.onlyOneNaturalSolution = true;
    q.whyOneSolution = solved.whyOneSolution;
  }
});

// Stored Procedures & PL/SQL — original questions, not mirrored from LeetCode (LeetCode's
// SQL judge is SELECT-only, same as this app's in-browser SQLite sandbox, so neither can run
// these). PL/pgSQL throughout for one consistent, current dialect; each explanation notes
// where Oracle PL/SQL or T-SQL syntax would differ so the CONCEPT is what transfers.
const DIALECT = 'PL/pgSQL (PostgreSQL)';
const plsqlQuestions: SQLQuestion[] = [
  {
    id: 'sql-plsql-1',
    title: 'Give a Department a Raise',
    difficulty: 'Easy',
    leetcodeLink: '',
    topic: 'Stored Procedures & PL/SQL',
    procedureTrack: true,
    dialect: DIALECT,
    problemStatement: 'Write a stored procedure that gives every employee in a given department a percentage raise, and reports how many rows it changed.',
    schema: `CREATE TABLE Employee (id INT, name VARCHAR, salary INT, department_id INT);`,
    exampleData: [
      { tableName: 'Employee', headers: ['id', 'name', 'salary', 'department_id'], rows: [[1, 'Joe', 70000, 1], [2, 'Jim', 90000, 1], [3, 'Henry', 80000, 2]] },
    ],
    expectedOutput: {
      tableName: 'Employee (after CALL give_department_raise(1, 10))',
      headers: ['id', 'name', 'salary', 'department_id'],
      rows: [[1, 'Joe', 77000, 1], [2, 'Jim', 99000, 1], [3, 'Henry', 80000, 2]],
    },
    solutions: [
      {
        name: 'CREATE PROCEDURE with an IN parameter',
        query: `CREATE OR REPLACE PROCEDURE give_department_raise(\n  dept_id INT,\n  raise_pct NUMERIC\n)\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  affected INT;\nBEGIN\n  UPDATE Employee\n  SET salary = salary + (salary * raise_pct / 100)\n  WHERE department_id = dept_id;\n\n  GET DIAGNOSTICS affected = ROW_COUNT;\n  RAISE NOTICE 'Updated % row(s) in department %', affected, dept_id;\nEND;\n$$;\n\n-- Call it:\nCALL give_department_raise(1, 10);`,
        explanation: 'A PROCEDURE (not a FUNCTION) is the right tool here because the point is the side effect — mutating rows — not returning a value; Postgres procedures are invoked with CALL, never inside a SELECT. GET DIAGNOSTICS after the UPDATE reads how many rows the last statement touched, the standard way to report a mutation’s size without a second COUNT query. Oracle PL/SQL uses SQL%ROWCOUNT for the same thing; T-SQL uses @@ROWCOUNT.',
      },
    ],
    edgeCases: [
      'dept_id matching zero employees — affected is 0, nothing is updated, no error.',
      'A negative raise_pct — the procedure has no guard, so it silently cuts pay; a real version should validate the input.',
      'Concurrent calls for the same department racing on the same rows — fine here since a single UPDATE is atomic, but see the transfer-funds question for when that stops being true.',
    ],
  },
  {
    id: 'sql-plsql-2',
    title: 'Nth Highest Salary as a Reusable Function',
    difficulty: 'Medium',
    leetcodeLink: '',
    topic: 'Stored Procedures & PL/SQL',
    procedureTrack: true,
    dialect: DIALECT,
    problemStatement: 'Generalize "second highest salary" into a function that returns the Nth highest distinct salary, or NULL if fewer than N exist.',
    schema: `CREATE TABLE Employee (id INT, salary INT);`,
    exampleData: [
      { tableName: 'Employee', headers: ['id', 'salary'], rows: [[1, 100], [2, 200], [3, 300]] },
    ],
    expectedOutput: {
      tableName: 'SELECT nth_highest_salary(2)',
      headers: ['nth_highest_salary'],
      rows: [[200]],
    },
    solutions: [
      {
        name: 'CREATE FUNCTION returning a scalar',
        query: `CREATE OR REPLACE FUNCTION nth_highest_salary(n INT)\nRETURNS INT\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  result INT;\nBEGIN\n  SELECT DISTINCT salary INTO result\n  FROM Employee\n  ORDER BY salary DESC\n  OFFSET n - 1 LIMIT 1;\n\n  RETURN result; -- stays NULL if fewer than n distinct salaries exist\nEND;\n$$;\n\n-- Call it inside a query, unlike a procedure:\nSELECT nth_highest_salary(2);`,
        explanation: 'FUNCTION, not PROCEDURE, because this returns a value meant to be used inside other SQL (SELECT nth_highest_salary(2), or a WHERE clause) — that’s the actual dividing line interviewers probe. SELECT ... INTO assigns result and leaves it NULL if the query returns no row, which is exactly LeetCode’s "no second highest -> NULL" requirement, for free.',
      },
    ],
    edgeCases: [
      'n larger than the number of distinct salaries — OFFSET runs past the end, result stays NULL.',
      'Duplicate salaries — DISTINCT means two employees tied for #1 still leave #2 as the next DIFFERENT value, matching the original problem’s definition.',
      'n = 0 or negative — OFFSET -1 is invalid in Postgres; a production version would validate n first.',
    ],
  },
  {
    id: 'sql-plsql-3',
    title: 'Audit Trail with an AFTER UPDATE Trigger',
    difficulty: 'Medium',
    leetcodeLink: '',
    topic: 'Stored Procedures & PL/SQL',
    procedureTrack: true,
    dialect: DIALECT,
    problemStatement: 'Automatically log every salary change to a SalaryAudit table, without touching the application code that runs the UPDATE.',
    schema: `CREATE TABLE Employee (id INT, salary INT);\nCREATE TABLE SalaryAudit (employee_id INT, old_salary INT, new_salary INT, changed_at TIMESTAMP);`,
    exampleData: [
      { tableName: 'Employee', headers: ['id', 'salary'], rows: [[1, 70000]] },
      { tableName: 'SalaryAudit', headers: ['employee_id', 'old_salary', 'new_salary', 'changed_at'], rows: [] },
    ],
    expectedOutput: {
      tableName: 'SalaryAudit (after UPDATE Employee SET salary = 77000 WHERE id = 1)',
      headers: ['employee_id', 'old_salary', 'new_salary'],
      rows: [[1, 70000, 77000]],
    },
    solutions: [
      {
        name: 'Trigger function + CREATE TRIGGER',
        query: `CREATE OR REPLACE FUNCTION log_salary_change()\nRETURNS TRIGGER\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  IF NEW.salary IS DISTINCT FROM OLD.salary THEN\n    INSERT INTO SalaryAudit(employee_id, old_salary, new_salary, changed_at)\n    VALUES (OLD.id, OLD.salary, NEW.salary, now());\n  END IF;\n  RETURN NEW;\nEND;\n$$;\n\nCREATE TRIGGER trg_salary_audit\nAFTER UPDATE ON Employee\nFOR EACH ROW\nEXECUTE FUNCTION log_salary_change();`,
        explanation: 'Postgres triggers are always backed by a FUNCTION returning the special TRIGGER type — the CREATE TRIGGER statement just wires that function to an event (AFTER UPDATE) and a granularity (FOR EACH ROW). NEW and OLD are the row’s values after and before the statement; IS DISTINCT FROM (not !=) is the NULL-safe comparison, so a salary changing from NULL to a value still logs. Oracle/MySQL write the trigger body directly under CREATE TRIGGER instead of a separate function — same event model, different plumbing.',
      },
    ],
    edgeCases: [
      'An UPDATE that touches other columns but leaves salary unchanged — IS DISTINCT FROM correctly skips it, no phantom audit row.',
      'A bulk UPDATE affecting 500 rows — FOR EACH ROW fires the trigger 500 times, once per row, not once for the statement.',
      'Someone deletes the employee right after — the audit row still references employee_id 1 with no FK enforcing it exists, which is usually the right call for an audit log (it should survive the row it describes).',
    ],
  },
  {
    id: 'sql-plsql-4',
    title: 'Transfer Funds Between Accounts, Safely',
    difficulty: 'Hard',
    leetcodeLink: '',
    topic: 'Stored Procedures & PL/SQL',
    procedureTrack: true,
    dialect: DIALECT,
    problemStatement: 'Write a procedure that moves money from one account to another, refusing the transfer (with no partial effect) if the source account is missing or underfunded.',
    schema: `CREATE TABLE Accounts (id INT, balance NUMERIC);`,
    exampleData: [
      { tableName: 'Accounts', headers: ['id', 'balance'], rows: [[1, 1000], [2, 200]] },
    ],
    expectedOutput: {
      tableName: 'Accounts (after CALL transfer_funds(1, 2, 500))',
      headers: ['id', 'balance'],
      rows: [[1, 500], [2, 700]],
    },
    solutions: [
      {
        name: 'Procedure with FOR UPDATE locking and an EXCEPTION block',
        query: `CREATE OR REPLACE PROCEDURE transfer_funds(\n  from_account INT,\n  to_account INT,\n  amount NUMERIC\n)\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  from_balance NUMERIC;\nBEGIN\n  SELECT balance INTO from_balance FROM Accounts WHERE id = from_account FOR UPDATE;\n\n  IF from_balance IS NULL THEN\n    RAISE EXCEPTION 'Source account % does not exist', from_account;\n  END IF;\n\n  IF from_balance < amount THEN\n    RAISE EXCEPTION 'Insufficient funds: account % has %, needs %', from_account, from_balance, amount;\n  END IF;\n\n  UPDATE Accounts SET balance = balance - amount WHERE id = from_account;\n  UPDATE Accounts SET balance = balance + amount WHERE id = to_account;\n\nEXCEPTION\n  WHEN OTHERS THEN\n    RAISE NOTICE 'Transfer failed: %', SQLERRM;\n    RAISE; -- re-raise: the caller’s transaction must still roll back\nEND;\n$$;\n\nCALL transfer_funds(1, 2, 500);`,
        explanation: 'FOR UPDATE locks the source row for the rest of the transaction, so two concurrent transfers off the same account can’t both read the same starting balance and overdraw it — the classic race this question is really testing for. The EXCEPTION block logs a readable message via SQLERRM but then RE-RAISES: swallowing the error here would make the procedure report success while nothing committed, silently corrupting the caller’s assumption that CALL returning means the transfer happened. Both UPDATEs run inside the same implicit transaction as the procedure body, so a failure after the debit and before the credit still rolls both back.',
      },
    ],
    edgeCases: [
      'from_account does not exist — from_balance is NULL, the explicit NULL check fires before the comparison (NULL < amount is NULL, not TRUE, so an unguarded version would silently let this through).',
      'Exact-balance transfer (balance == amount) — leaves the source at 0, which is valid, not an error.',
      'to_account does not exist — this version does not check; the credit UPDATE just matches zero rows and the money vanishes. A real version validates both accounts before touching either.',
    ],
  },
  {
    id: 'sql-plsql-5',
    title: 'Per-Department Report with an Explicit Cursor',
    difficulty: 'Medium',
    leetcodeLink: '',
    topic: 'Stored Procedures & PL/SQL',
    procedureTrack: true,
    dialect: DIALECT,
    problemStatement: 'Write a procedure that walks every department with an explicit cursor and prints its headcount — then say when you would NOT do this.',
    schema: `CREATE TABLE Department (id INT, name VARCHAR);\nCREATE TABLE Employee (id INT, department_id INT);`,
    exampleData: [
      { tableName: 'Department', headers: ['id', 'name'], rows: [[1, 'IT'], [2, 'Sales']] },
      { tableName: 'Employee', headers: ['id', 'department_id'], rows: [[1, 1], [2, 1], [3, 2]] },
    ],
    expectedOutput: {
      tableName: 'RAISE NOTICE output (illustrative — not a table)',
      headers: ['message'],
      rows: [['IT (1): 2 employee(s)'], ['Sales (2): 1 employee(s)']],
    },
    solutions: [
      {
        name: 'Explicit CURSOR with a FETCH loop',
        query: `CREATE OR REPLACE PROCEDURE print_department_report()\nLANGUAGE plpgsql\nAS $$\nDECLARE\n  dept_cursor CURSOR FOR SELECT id, name FROM Department ORDER BY id;\n  dept_id INT;\n  dept_name VARCHAR;\n  emp_count INT;\nBEGIN\n  OPEN dept_cursor;\n  LOOP\n    FETCH dept_cursor INTO dept_id, dept_name;\n    EXIT WHEN NOT FOUND;\n\n    SELECT COUNT(*) INTO emp_count FROM Employee WHERE department_id = dept_id;\n    RAISE NOTICE '% (%): % employee(s)', dept_name, dept_id, emp_count;\n  END LOOP;\n  CLOSE dept_cursor;\nEND;\n$$;`,
        explanation: 'This is the textbook explicit-cursor shape — DECLARE ... CURSOR FOR, OPEN, FETCH ... INTO, EXIT WHEN NOT FOUND, CLOSE — and it is worth knowing cold, because a real interviewer’s follow-up is almost always "now don’t do that." Every row this loop produces is exactly what one set-based query already gives you: SELECT d.name, d.id, COUNT(e.id) FROM Department d LEFT JOIN Employee e ON e.department_id = d.id GROUP BY d.id, d.name — one round trip through the query planner instead of N+1. Reach for a cursor only when a row’s processing genuinely depends on procedural logic a single query can’t express (calling an external routine per row, row-by-row conditional branching); recognizing this loop as unnecessary is the actual signal, not writing it.',
      },
    ],
    edgeCases: [
      'A department with zero employees — COUNT(*) correctly returns 0, not NULL, since it is a fresh COUNT per iteration, not a JOIN that could leave a row absent.',
      'Departments table is empty — FETCH immediately returns NOT FOUND, the loop body never runs, no error.',
      'Forgetting CLOSE — the cursor leaks for the rest of the session; Postgres closes it automatically at COMMIT, but relying on that instead of an explicit CLOSE is exactly the habit that causes resource leaks in longer procedures.',
    ],
  },
  {
    id: 'sql-plsql-6',
    title: 'Idempotent Upsert for a Running Total',
    difficulty: 'Medium',
    leetcodeLink: '',
    topic: 'Stored Procedures & PL/SQL',
    procedureTrack: true,
    dialect: DIALECT,
    problemStatement: 'Write a procedure that records a page’s view count for a day, ADDING to any existing count for that (page, day) instead of duplicating the row — and stays correct if the exact same call is retried.',
    schema: `CREATE TABLE PageViewsDaily (page_id INT, day DATE, views INT, UNIQUE(page_id, day));`,
    exampleData: [
      { tableName: 'PageViewsDaily', headers: ['page_id', 'day', 'views'], rows: [] },
    ],
    expectedOutput: {
      tableName: 'PageViewsDaily (after two calls: (101, 2024-01-15, 42) then (101, 2024-01-15, 8))',
      headers: ['page_id', 'day', 'views'],
      rows: [[101, '2024-01-15', 50]],
    },
    solutions: [
      {
        name: 'INSERT ... ON CONFLICT DO UPDATE',
        query: `CREATE OR REPLACE PROCEDURE record_daily_pageview(\n  p_page_id INT,\n  p_day DATE,\n  p_views INT\n)\nLANGUAGE plpgsql\nAS $$\nBEGIN\n  INSERT INTO PageViewsDaily (page_id, day, views)\n  VALUES (p_page_id, p_day, p_views)\n  ON CONFLICT (page_id, day)\n  DO UPDATE SET views = PageViewsDaily.views + EXCLUDED.views;\nEND;\n$$;\n\nCALL record_daily_pageview(101, '2024-01-15', 42);\nCALL record_daily_pageview(101, '2024-01-15', 8); -- same day again: 42 + 8 = 50, still one row`,
        explanation: 'ON CONFLICT needs the UNIQUE(page_id, day) constraint in the schema to know which collision to catch. EXCLUDED refers to the row that WOULD have been inserted — the values from this call’s VALUES clause — so the DO UPDATE adds the new view count to whatever is already there instead of overwriting it, which is what makes repeated calls for the same page and day accumulate correctly rather than duplicate a row. This is Postgres-specific syntax; the same idea in MySQL is INSERT ... ON DUPLICATE KEY UPDATE, and in Oracle it is a MERGE statement.',
      },
    ],
    edgeCases: [
      'The exact same call retried after a network timeout (the caller doesn’t know if it landed) — this procedure is NOT naturally idempotent to a raw retry, since a retried call ADDS again; true retry-safety would need an idempotency key, a separate concern from the upsert pattern itself.',
      'Two different pages on the same day — different page_id means no conflict, both rows insert independently.',
      'views = 0 — inserts a real row with 0, not skipped; the procedure has no guard against a caller passing a meaningless zero.',
    ],
  },
];
sqlQuestions.push(...plsqlQuestions);
