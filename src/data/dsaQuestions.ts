import dsaSolutions from './dsaSolutions.json';
import dsaTraces from './dsaTraces.json';
import dsaTheoriesJson from './dsaTheories.json';
import dsaPatternsJson from './dsaPatterns.json';
import dsaCodeTranslationsJson from './dsaCodeTranslations.json';
import dsaExtraExamplesJson from './dsaExtraExamples.json';

export interface Approach {
  name: string; // "Brute Force" | "Optimal"
  intuition: string;
  algorithm: string;
  code: string; // Python code with inline comments
  complexity: {
    time: string;
    space: string;
  };
  /** Optional ports of `code` into other languages, keyed by a lowercase language id.
   *  The 'java' ones are compiled and run in-browser (utils/javaHarness wraps them in
   *  a `main` first); 'cpp' and 'javascript' are read-only text. Absent or missing a
   *  key means no translation exists yet for that approach/language; the viewer says
   *  so rather than falling back to Python silently. */
  translations?: Record<string, string>;
}

export interface Question {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  leetcodeLink: string;
  day: number;
  topic: string;
  problemStatement: string;
  examples: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  constraints: string[];
  edgeCases: string[];
  followUps: string[];
  prerequisites?: string[]; // Per-question "know this before solving" bullets
  approaches: Approach[];
  trace?: any[];
  /** Python assertions the learner's own attempt is graded against, in the browser.
   *  Every approach shipped here already passes them offline. */
  tests?: string;
  /** Interview patterns the OPTIMAL solution uses, primary first ("Two Pointers",
   *  "Monotonic Stack", ...). Interviews are pattern-matched, not topic-matched. */
  patterns?: string[];
}

export interface TheorySection {
  title: string;
  content: string; // Multi-paragraph plain text; may contain ASCII diagrams
  code?: string;   // Optional commented Python snippet for this section
}

export interface TopicTheory {
  topic: string;
  summary: string;
  preRequisites: string[];
  cheatSheet: string[];
  sections?: TheorySection[]; // Layered deep-dive theory, rendered in order
  implementations: {
    title: string;
    code: string;
  }[];
}

export const dsaTopics: string[] = [
  'Arrays',
  'Linked List',
  'Linked List & Arrays',
  'Greedy',
  'Recursion',
  'Recursion & Backtracking',
  'Binary Search',
  'Stack & Queue',
  'Stack & Queue Part-II',
  'String',
  'String Part-II',
  'Binary Tree',
  'Binary Tree Part-II',
  'Binary Search Tree',
  'Graphs',
  'Dynamic Programming',
  'Heap',
  'Tries',
  'Miscellaneous'
];

export const dsaTheories: Record<string, TopicTheory> = dsaTheoriesJson as unknown as Record<string, TopicTheory>;

// Full SDE sheet Python questions list (fully preloaded with solved core questions)
export const dsaQuestions: Question[] = [
  {
    id: 'dsa-1',
    title: 'Set Matrix Zeroes',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/set-matrix-zeroes/',
    day: 1,
    topic: 'Arrays',
    problemStatement: 'Given an m x n integer matrix, if an element is 0, set its entire row and column to 0\'s. You must do it in-place.',
    examples: [
      {
        input: 'matrix = [[1,1,1],[1,0,1],[1,1,1]]',
        output: '[[1,0,1],[0,0,0],[1,0,1]]',
        explanation: 'The element at row 1, col 1 is 0. So, we set row 1 and col 1 to 0.'
      }
    ],
    constraints: [
      'm == matrix.length',
      'n == matrix[0].length',
      '1 <= m, n <= 200',
      '-2^31 <= matrix[i][j] <= 2^31 - 1'
    ],
    edgeCases: [
      'Single element matrix (1x1).',
      'Zeroes only in the first row or first column.'
    ],
    followUps: [
      'Could you solve it using constant O(1) auxiliary space?'
    ],
    approaches: [
      {
        name: 'Brute Force',
        intuition: 'Scan the matrix and whenever we find a 0, mark the entire row and column elements that are not zero with a placeholder value (e.g., -999999). Finally, run another pass to convert placeholders to 0.',
        algorithm: '1. Traverse the matrix, looking for 0s.\n2. For each 0, iterate through its row and column. If a cell is not already 0, change it to -999999.\n3. Make a final pass over the matrix, changing all occurrences of -999999 to 0.',
        code: `def setZeroes(matrix: List[List[int]]) -> None:
    # Get matrix dimensions
    m, n = len(matrix), len(matrix[0])
    placeholder = -999999 # Use a temporary marker
    
    # First pass: Find zeros and mark rows/columns
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == 0:
                # Mark non-zero cells in the same row
                for c in range(n):
                    if matrix[i][c] != 0:
                        matrix[i][c] = placeholder
                # Mark non-zero cells in the same column
                for r in range(m):
                    if matrix[r][j] != 0:
                        matrix[r][j] = placeholder
                        
    # Second pass: Replace placeholders with zero
    for i in range(m):
        for j in range(n):
            if matrix[i][j] == placeholder:
                matrix[i][j] = 0`,
        complexity: {
          time: 'O((M * N) * (M + N))',
          space: 'O(1) using placeholder marker'
        }
      },
      {
        name: 'Optimal',
        intuition: 'Instead of using auxiliary space arrays of size M and N, we can reuse the first row and column of the matrix itself to store the zero markers. A single variable col0 is used to track the status of the first column.',
        algorithm: '1. Scan the first column. If any element is 0, set col0 = 0.\n2. Use the first row and first column to record if their respective rows/cols should be zeroed.\n3. Iterate the matrix backwards to set cells to 0 based on markers.',
        code: `def setZeroes(matrix: List[List[int]]) -> None:
    m, n = len(matrix), len(matrix[0])
    col0 = 1 # Flag to track first column state
    
    # Step 1: Set flags in the first row and column
    for i in range(m):
        # Check if first column has any zero
        if matrix[i][0] == 0:
            col0 = 0
        # Check rest of the cells
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = 0 # Mark row start
                matrix[0][j] = 0 # Mark col start
                
    # Step 2: Traverse matrix backwards to set zeroes
    for i in range(m - 1, -1, -1):
        for j in range(n - 1, 0, -1):
            # If row start or col start is zero, set current cell to zero
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = 0
        # Update the first column cell
        if col0 == 0:
            matrix[i][0] = 0`,
        complexity: {
          time: 'O(M * N)',
          space: 'O(1) strictly in-place'
        }
      }
    ]
  },
  {
    id: 'dsa-2',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/reverse-linked-list/',
    day: 5,
    topic: 'Linked List',
    problemStatement: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[5,4,3,2,1]'
      }
    ],
    constraints: [
      'The number of nodes in the list is the range [0, 5000].',
      '-5000 <= Node.val <= 5000'
    ],
    edgeCases: [
      'Empty list (head = null).',
      'Single node list.'
    ],
    followUps: [
      'Implement it both iteratively and recursively.'
    ],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Rotate the link references in-place as we traverse the list. Track prev, curr, and a temporary next node reference.',
        algorithm: '1. Initialize prev = None, curr = head.\n2. While curr is not None:\n   a. Save next node reference: next_node = curr.next\n   b. Reverse the pointer direction: curr.next = prev\n   c. Advance pointers: prev = curr, curr = next_node\n3. Return prev (new head).',
        code: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

def reverseList(head: Optional[ListNode]) -> Optional[ListNode]:
    prev = None # Tracks the reversed list head
    curr = head # Tracks the current traversal node
    
    # Traverse through all nodes
    while curr:
        next_node = curr.next # Save next node reference
        curr.next = prev      # Reverse pointer link
        prev = curr          # Move prev pointer forward
        curr = next_node     # Move curr pointer forward
        
    return prev # prev ends up as the new head of reversed list`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) auxiliary space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-3',
    title: 'Pascal\'s Triangle',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/pascals-triangle/',
    day: 1,
    topic: 'Arrays',
    problemStatement: 'Given an integer numRows, return the first numRows of Pascal\'s triangle.',
    examples: [
      {
        input: 'numRows = 5',
        output: '[[1],[1,1],[1,2,1],[1,3,3,1],[1,4,6,4,1]]'
      }
    ],
    constraints: ['1 <= numRows <= 30'],
    edgeCases: ['numRows = 1'],
    followUps: ['Could you return a specific index row in O(N) time?'],
    approaches: [
      {
        name: 'Brute Force',
        intuition: 'Generate each element by calculating the combinations (nCr) formula directly, where each value is row! / (col! * (row - col)!).',
        algorithm: '1. Initialize nested lists.\n2. Compute combinations using math.factorial for each row and col index.\n3. Return the populated triangle.',
        code: `import math

def generate(numRows: int) -> List[List[int]]:
    triangle = []
    # Loop for each row index
    for r in range(numRows):
        row = []
        # Loop for each column index
        for c in range(r + 1):
            # Calculate combination value: nCr
            val = math.factorial(r) // (math.factorial(c) * math.factorial(r - c))
            row.append(val)
        triangle.append(row)
    return triangle`,
        complexity: {
          time: 'O(N^3)',
          space: 'O(N^2) for the results'
        }
      },
      {
        name: 'Optimal',
        intuition: 'Each element in Pascal\'s Triangle is the sum of the two elements directly above it. We can build rows sequentially, using values from the previous row.',
        algorithm: '1. Create rows 1 to N.\n2. Inrow i, columns at index 0 and end are 1.\n3. Middle columns are filled using prev_row[j - 1] + prev_row[j].',
        code: `def generate(numRows: int) -> List[List[int]]:
    triangle = []
    
    # Generate row by row
    for r in range(numRows):
        # Initialize row filled with 1s
        row = [1] * (r + 1)
        # Fill inner cells
        for c in range(1, r):
            # Sum elements from previous row
            row[c] = triangle[r - 1][c - 1] + triangle[r - 1][c]
        triangle.append(row)
        
    return triangle`,
        complexity: {
          time: 'O(N^2)',
          space: 'O(N^2) to store values'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-4',
    title: 'Next Permutation',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/next-permutation/',
    day: 1,
    topic: 'Arrays',
    problemStatement: 'Rearrange numbers into the lexicographically next greater permutation of numbers. If no such arrangement exists, rearrange it as the lowest possible order.',
    examples: [
      {
        input: 'nums = [1,2,3]',
        output: '[1,3,2]'
      }
    ],
    constraints: ['1 <= nums.length <= 100', '0 <= nums[i] <= 100'],
    edgeCases: ['Array already in decreasing order.', 'All duplicate elements.'],
    followUps: ['Solve strictly in-place with O(1) extra memory.'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Identify the "break point" from the right where the order stops increasing. Swap the element with the next greater element in the suffix, and reverse the suffix.',
        algorithm: '1. Traverse right-to-left to find index i where nums[i] < nums[i+1].\n2. Find index j from right where nums[j] > nums[i]. Swap them.\n3. Reverse the suffix nums[i+1:].',
        code: `def nextPermutation(nums: List[int]) -> None:
    # 1. Find the break point
    n = len(nums)
    i = n - 2
    while i >= 0 and nums[i] >= nums[i + 1]:
        i -= 1
        
    # If break point found
    if i >= 0:
        # 2. Find next greater element to swap
        j = n - 1
        while nums[j] <= nums[i]:
            j -= 1
        # Swap break point with next greater
        nums[i], nums[j] = nums[j], nums[i]
        
    # 3. Reverse the suffix to get smallest permutation
    left, right = i + 1, n - 1
    while left < right:
        nums[left], nums[right] = nums[right], nums[left]
        left += 1
        right -= 1`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) in-place modification'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-5',
    title: 'Maximum Subarray Sum (Kadane\'s Algorithm)',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/maximum-subarray/',
    day: 1,
    topic: 'Arrays',
    problemStatement: 'Find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: '[4,-1,2,1] has the largest sum = 6.'
      }
    ],
    constraints: ['1 <= nums.length <= 10^5', '-10^4 <= nums[i] <= 10^4'],
    edgeCases: ['Array of all negative numbers.', 'Single element arrays.'],
    followUps: ['If you have figured out the O(N) solution, try coding another solution using the Divide and Conquer approach, which is more subtle.'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Kadane\'s algorithm calculates the maximum sum ending at each position. We carry forward previous sum only if it is positive; otherwise, we start a new subarray.',
        algorithm: '1. Initialize max_sum and current_sum to first element.\n2. Iterate through index 1 to N.\n3. Update current_sum = max(x, current_sum + x).\n4. Update max_sum = max(max_sum, current_sum).',
        code: `def maxSubArray(nums: List[int]) -> int:
    max_sum = nums[0]
    current_sum = nums[0]
    
    # Traverse remaining elements
    for x in nums[1:]:
        # Add current element or start fresh if previous sum is negative
        current_sum = max(x, current_sum + x)
        max_sum = max(max_sum, current_sum)
        
    return max_sum`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) extra space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-6',
    title: 'Sort Colors',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/sort-colors/',
    day: 1,
    topic: 'Arrays',
    problemStatement: 'Given an array nums with n objects colored red, white, or blue, sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue (0, 1, 2).',
    examples: [
      {
        input: 'nums = [2,0,2,1,1,0]',
        output: '[0,0,1,1,2,2]'
      }
    ],
    constraints: ['n == nums.length', '1 <= n <= 300', 'nums[i] is 0, 1, or 2.'],
    edgeCases: ['Array already sorted.', 'Only containing one color.'],
    followUps: ['Could you come up with a one-pass algorithm using only constant extra space?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use the Dutch National Flag algorithm. Three pointers low, mid, and high sort elements in a single pass: 0s before low, 1s between low & mid, 2s after high.',
        algorithm: '1. Init low=0, mid=0, high=len-1.\n2. While mid <= high:\n   - If 0: swap low & mid, advance both.\n   - If 1: advance mid.\n   - If 2: swap mid & high, decrement high.',
        code: `def sortColors(nums: List[int]) -> None:
    low, mid, high = 0, 0, len(nums) - 1
    
    # Sort in a single pass
    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else: # nums[mid] == 2
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) strictly in-place'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-20',
    title: 'Two Sum',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/two-sum/',
    day: 4,
    topic: 'Arrays',
    problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]'
      }
    ],
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
    edgeCases: ['Target sum is negative.', 'Duplicate numbers present.'],
    followUps: ['Can you find an O(N) runtime algorithm?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Store the indices of traversed elements in a hash map. For each element, check if (target - element) exists in the map.',
        algorithm: '1. Create hash map lookup: value -> index.\n2. Traverse array: if complement in map, return indices. Otherwise, add element to map.',
        code: `def twoSum(nums: List[int], target: int) -> List[int]:
    lookup = {} # Maps value to index
    
    # Single pass search
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []`,
        complexity: {
          time: 'O(N)',
          space: 'O(N)'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-22',
    title: 'Longest Consecutive Sequence',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/longest-consecutive-sequence/',
    day: 4,
    topic: 'Arrays',
    problemStatement: 'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence.',
    examples: [
      {
        input: 'nums = [100,4,200,1,3,2]',
        output: '4',
        explanation: 'The consecutive sequence is [1,2,3,4]. Length is 4.'
      }
    ],
    constraints: ['0 <= nums.length <= 10^5', '-10^9 <= nums[i] <= 10^9'],
    edgeCases: ['Empty array input.', 'All identical elements.'],
    followUps: ['You must write an algorithm that runs in O(n) time.'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Insert elements into a set. Traverse elements, check if current element is the start of a sequence (i.e. num - 1 is not in set). Count consecutive values forward.',
        algorithm: '1. Initialize set from array.\n2. Loop through set: if num-1 not in set, count forward. Track max count.',
        code: `def longestConsecutive(nums: List[int]) -> int:
    num_set = set(nums) # Load numbers into hash set
    longest = 0
    
    for num in num_set:
        # Check if current number is start of a sequence
        if num - 1 not in num_set:
            current_num = num
            current_streak = 1
            
            # Count sequence size
            while current_num + 1 in num_set:
                current_num += 1
                current_streak += 1
            longest = max(longest, current_streak)
            
    return longest`,
        complexity: {
          time: 'O(N)',
          space: 'O(N) set storage'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-26',
    title: 'Find Middle of Linked List',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/middle-of-the-linked-list/',
    day: 5,
    topic: 'Linked List',
    problemStatement: 'Given the head of a singly linked list, return the middle node of the linked list. If there are two middle nodes, return the second middle node.',
    examples: [
      {
        input: 'head = [1,2,3,4,5]',
        output: '[3,4,5]'
      }
    ],
    constraints: ['Number of nodes in range [1, 100].'],
    edgeCases: ['Single node list.', 'Even number of nodes.'],
    followUps: ['Can you solve this in a single pass traversal?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use slow and fast pointer strategy. The slow pointer moves one step at a time, while the fast pointer moves two. When fast reaches the end, slow is in the middle.',
        algorithm: '1. Init slow = head, fast = head.\n2. While fast and fast.next are valid: slow = slow.next, fast = fast.next.next.\n3. Return slow.',
        code: `def middleNode(head: Optional[ListNode]) -> Optional[ListNode]:
    slow = head # Moves 1 step
    fast = head # Moves 2 steps
    
    # Traverse list
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        
    return slow # Points to the middle node`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) extra memory'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-27',
    title: 'Merge Two Sorted Linked Lists',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/merge-two-sorted-lists/',
    day: 5,
    topic: 'Linked List',
    problemStatement: 'Merge two sorted linked lists and return it as a sorted list. The list should be made by splicing together the nodes of the first two lists.',
    examples: [
      {
        input: 'l1 = [1,2,4], l2 = [1,3,4]',
        output: '[1,1,2,3,4,4]'
      }
    ],
    constraints: ['Number of nodes is range [0, 50].', '-100 <= Node.val <= 100'],
    edgeCases: ['One list is empty.', 'Both lists are empty.'],
    followUps: ['Can you implement the merge operation using recursion?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Iterate through both lists, splicing the smaller node next in the merged list. A dummy head simplifies edge case assignments at index 0.',
        algorithm: '1. Create dummy head node.\n2. Compare heads of l1 and l2. Spliced smaller node.\n3. Attach remaining list to end.',
        code: `def mergeTwoLists(list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:
    dummy = ListNode(0) # Dummy start node
    curr = dummy
    
    # Iterate both lists
    while list1 and list2:
        if list1.val <= list2.val:
            curr.next = list1
            list1 = list1.next
        else:
            curr.next = list2
            list2 = list2.next
        curr = curr.next
        
    # Append leftover nodes
    curr.next = list1 if list1 else list2
    return dummy.next`,
        complexity: {
          time: 'O(N + M)',
          space: 'O(1) in-place splicing'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-32',
    title: 'Detect Cycle in Linked List',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/linked-list-cycle/',
    day: 6,
    topic: 'Linked List',
    problemStatement: 'Given head, the head of a linked list, determine if the linked list has a cycle in it.',
    examples: [
      {
        input: 'head = [3,2,0,-4], pos = 1',
        output: 'true',
        explanation: 'There is a cycle where tail connects to node at index 1.'
      }
    ],
    constraints: ['Number of nodes is range [0, 10^4].'],
    edgeCases: ['Empty list.', 'Single node pointing to itself.'],
    followUps: ['Can you solve it using O(1) (i.e. constant) memory?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Floyd\'s Cycle Finding algorithm. Move slow pointer 1 step and fast pointer 2 steps. If there is a cycle, the fast pointer will loop and meet slow.',
        algorithm: '1. Init slow = head, fast = head.\n2. Loop while fast and fast.next exist.\n3. If slow == fast, cycle detected! Return True.',
        code: `def hasCycle(head: Optional[ListNode]) -> bool:
    slow = head
    fast = head
    
    # Traverse list with two speeds
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        
        # Pointers meet -> cycle detected
        if slow == fast:
            return True
            
    return False`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) extra space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-39',
    title: '3 Sum',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/3sum/',
    day: 7,
    topic: 'Linked List & Arrays',
    problemStatement: 'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j != k and sum is 0.',
    examples: [
      {
        input: 'nums = [-1,0,1,2,-1,-4]',
        output: '[[-1,-1,2],[-1,0,1]]'
      }
    ],
    constraints: ['3 <= nums.length <= 3000', '-10^5 <= nums[i] <= 10^5'],
    edgeCases: ['Array with all zeroes.', 'No triplets exist.'],
    followUps: ['Can you optimize search comparisons by sorting first?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Sort array first. Iterate i through array. Use two pointers left and right on elements past i. Adjust pointers to find target sum -nums[i]. Skip duplicates.',
        algorithm: '1. Sort nums.\n2. Loop i. If nums[i] > 0, break. If duplicate, skip.\n3. Left=i+1, Right=len-1. Adjust pointers matching sum=0.',
        code: `def threeSum(nums: List[int]) -> List[List[int]]:
    nums.sort() # Sort array first
    res = []
    
    for i in range(len(nums) - 2):
        # Skip duplicate values for 'i'
        if i > 0 and nums[i] == nums[i - 1]:
            continue
            
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s < 0:
                left += 1
            elif s > 0:
                right -= 1
            else:
                res.append([nums[i], nums[left], nums[right]])
                # Skip duplicate values for left/right
                while left < right and nums[left] == nums[left + 1]:
                    left += 1
                while left < right and nums[right] == nums[right - 1]:
                    right -= 1
                left += 1
                right -= 1
    return res`,
        complexity: {
          time: 'O(N^2)',
          space: 'O(N) sorting space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-40',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    leetcodeLink: 'https://leetcode.com/problems/trapping-rain-water/',
    day: 7,
    topic: 'Linked List & Arrays',
    problemStatement: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    examples: [
      {
        input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
        output: '6'
      }
    ],
    constraints: ['n == height.length', '1 <= n <= 2 * 10^4'],
    edgeCases: ['Descending height map.', 'Ascending height map.', 'Flat surface.'],
    followUps: ['Can you solve it in O(N) time using two pointers?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use left and right pointers. Water trapped at any cell is bounded by the minimum of maximum heights on its left and right. Move pointer from lower maximum bound inward.',
        algorithm: '1. Init left=0, right=len-1, left_max=0, right_max=0.\n2. While left < right:\n   - If left height < right height: update left_max and add trapped water.\n   - Else: update right_max and add trapped water.',
        code: `def trap(height: List[int]) -> int:
    left, right = 0, len(height) - 1
    left_max, right_max = 0, 0
    ans = 0
    
    # Two pointers sweep inward
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left] # Update max boundary
            else:
                ans += left_max - height[left] # Accumulate trapped water
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right] # Update max boundary
            else:
                ans += right_max - height[right] # Accumulate trapped water
            right -= 1
            
    return ans`,
        complexity: {
          time: 'O(N)',
          space: 'O(1) extra space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-43',
    title: 'N Meetings in One Room',
    difficulty: 'Easy',
    leetcodeLink: 'https://practice.geeksforgeeks.org/problems/n-meetings-in-one-room/0',
    day: 8,
    topic: 'Greedy',
    problemStatement: 'There is one meeting room in a firm. There are N meetings with start and end times. Find the maximum number of meetings that can be accommodated.',
    examples: [
      {
        input: 'start[] = [1,3,0,5,8,5], end[] = [2,4,6,7,9,9]',
        output: '4'
      }
    ],
    constraints: ['1 <= N <= 10^5'],
    edgeCases: ['All meetings overlap.', 'No overlap meetings.'],
    followUps: ['What if we want to sort meetings based on their start times? Why is that incorrect?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Sort meetings by their end times. Greedily select the next meeting that start after the previous meeting ends. This maximizes room availability.',
        algorithm: '1. Bundle start, end times and indices.\n2. Sort bundle by end times.\n3. Traverse sorted bundle. If start > last_end, increment count.',
        code: `def maxMeetings(start: List[int], end: List[int]) -> int:
    # Pair start and end times together
    meetings = list(zip(start, end))
    # Sort meetings based on finish times
    meetings.sort(key=lambda x: x[1])
    
    count = 0
    last_end = -1
    
    for s, e in meetings:
        # If start time is after the last meeting ended
        if s > last_end:
            count += 1
            last_end = e # Update last meeting end marker
            
    return count`,
        complexity: {
          time: 'O(N log N) sorting time',
          space: 'O(N) for zipped pairs'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-48',
    title: 'Subset Sums',
    difficulty: 'Easy',
    leetcodeLink: 'https://practice.geeksforgeeks.org/problems/subset-sums/',
    day: 9,
    topic: 'Recursion',
    problemStatement: 'Given a list of N integers, return the sum of all subsets in increasing order.',
    examples: [
      {
        input: 'arr = [2, 3]',
        output: '[0, 2, 3, 5]'
      }
    ],
    constraints: ['1 <= N <= 15', '0 <= arr[i] <= 10^4'],
    edgeCases: ['Empty list/all zero elements.'],
    followUps: ['Can you solve it using recursion without tracking indices explicitly?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use recursion. At each index, we have two choices: either include the element in the subset sum or exclude it. Save base sums at the end.',
        algorithm: '1. DFS function taking index and current sum.\n2. At index N, append sum.\n3. Recurse inclusion: index + 1, sum + arr[idx]. Recurse exclusion: index + 1, sum.',
        code: `def subsetSums(arr: List[int]) -> List[int]:
    sums = []
    n = len(arr)
    
    def dfs(idx: int, curr_sum: int):
        if idx == n:
            sums.append(curr_sum) # Base case: subset complete
            return
            
        # Decision 1: Include current element
        dfs(idx + 1, curr_sum + arr[idx])
        # Decision 2: Exclude current element
        dfs(idx + 1, curr_sum)
        
    dfs(0, 0)
    sums.sort() # Sort final sums in increasing order
    return sums`,
        complexity: {
          time: 'O(2^N) calls',
          space: 'O(N) recursive call stack depth'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-54',
    title: 'Print All Permutations',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/permutations/',
    day: 10,
    topic: 'Recursion & Backtracking',
    problemStatement: 'Given an array nums of distinct integers, return all the possible permutations.',
    examples: [
      {
        input: 'nums = [1,2,3]',
        output: '[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]'
      }
    ],
    constraints: ['1 <= nums.length <= 6'],
    edgeCases: ['Single item lists.', 'Negatives present.'],
    followUps: ['Can you generate permutations in lexicographical order?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use backtracking. Swap elements to place every number at current index. Recurse for next indices, and swap back to restore state.',
        algorithm: '1. DFS swap helper taking index.\n2. Base case: index = length. Append copy.\n3. Loop i = idx to N: swap idx & i, recurse idx+1, swap back.',
        code: `def permute(nums: List[int]) -> List[List[int]]:
    ans = []
    
    def backtrack(idx):
        if idx == len(nums):
            ans.append(nums[:]) # Add a copy of current permutation
            return
            
        for i in range(idx, len(nums)):
            # Choose: Swap index values
            nums[idx], nums[i] = nums[i], nums[idx]
            # Explore: Recurse next position
            backtrack(idx + 1)
            # Unchoose: Swap back to backtrack
            nums[idx], nums[i] = nums[i], nums[idx]
            
    backtrack(0)
    return ans`,
        complexity: {
          time: 'O(N * N!) operations',
          space: 'O(N) stack space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-55',
    title: 'N Queens',
    difficulty: 'Hard',
    leetcodeLink: 'https://leetcode.com/problems/n-queens/',
    day: 10,
    topic: 'Recursion & Backtracking',
    problemStatement: 'The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Return all distinct solutions.',
    examples: [
      {
        input: 'n = 4',
        output: '[[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]]'
      }
    ],
    constraints: ['1 <= n <= 9'],
    edgeCases: ['n = 1 (trivial).', 'n = 2 or 3 (no solutions).'],
    followUps: ['Can you optimize safety validation checks using boolean hash sets for columns and diagonals?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Backtrack row by row. Use sets to check if putting a queen in column `c` conflicts with previous columns, diagonals `r-c`, and anti-diagonals `r+c`.',
        algorithm: '1. DFS function placing queen in row r.\n2. For each column c: if safe, add to sets, place queen, recurse r+1, backtrack.',
        code: `def solveNQueens(n: int) -> List[List[str]]:
    ans = []
    board = [['.'] * n for _ in range(n)]
    
    # Sets to track threatened positions in O(1) time
    cols = set()
    diag1 = set() # r - c
    diag2 = set() # r + c
    
    def backtrack(r):
        if r == n:
            ans.append(["".join(row) for row in board])
            return
            
        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue # Threatened cell, skip
                
            # Choose: Place queen
            board[r][c] = 'Q'
            cols.add(c)
            diag1.add(r - c)
            diag2.add(r + c)
            
            # Explore: Recurse next row
            backtrack(r + 1)
            
            # Unchoose: Backtrack state
            board[r][c] = '.'
            cols.remove(c)
            diag1.remove(r - c)
            diag2.remove(r + c)
            
    backtrack(0)
    return ans`,
        complexity: {
          time: 'O(N!) bounds',
          space: 'O(N^2) board grid space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-63',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/search-in-rotated-sorted-array/',
    day: 11,
    topic: 'Binary Search',
    problemStatement: 'Search a target value in an integer array sorted in ascending order that has been rotated at some pivot unknown to you.',
    examples: [
      {
        input: 'nums = [4,5,6,7,0,1,2], target = 0',
        output: '4'
      }
    ],
    constraints: ['1 <= nums.length <= 5000', '-10^4 <= nums[i] <= 10^4'],
    edgeCases: ['Array not rotated.', 'Target not present.'],
    followUps: ['Write an algorithm with O(log n) runtime complexity.'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'At any division point, at least one half of the rotated array is sorted. Check which half is sorted, and look if target falls within its bounds.',
        algorithm: '1. Compute mid.\n2. If nums[low] <= nums[mid]: left half sorted. Check if target in left range.\n3. Else: right half sorted. Check if target in right range.',
        code: `def search(nums: List[int], target: int) -> int:
    low, high = 0, len(nums) - 1
    
    while low <= high:
        mid = low + (high - low) // 2
        if nums[mid] == target:
            return mid
            
        # Case 1: Left half is sorted
        if nums[low] <= nums[mid]:
            if nums[low] <= target < nums[mid]:
                high = mid - 1 # Search left half
            else:
                low = mid + 1  # Search right half
                
        # Case 2: Right half is sorted
        else:
            if nums[mid] < target <= nums[high]:
                low = mid + 1  # Search right half
            else:
                high = mid - 1 # Search left half
                
    return -1`,
        complexity: {
          time: 'O(log N)',
          space: 'O(1) extra space'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-70',
    title: 'Balanced Parentheses',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/valid-parentheses/',
    day: 13,
    topic: 'Stack & Queue',
    problemStatement: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
    examples: [
      {
        input: 's = "()[]{}"',
        output: 'true'
      }
    ],
    constraints: ['1 <= s.length <= 10^4'],
    edgeCases: ['String contains only closing brackets.', 'Odd number of brackets.'],
    followUps: ['Can you optimize character matching by map associations?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use a stack. For each opening bracket, push to stack. For each closing bracket, check if it matches the top of stack.',
        algorithm: '1. Loop through characters.\n2. If opening: push to stack. If closing: pop and check compatibility.\n3. Check if stack is empty.',
        code: `def isValid(s: str) -> bool:
    stack = []
    # Map closing brackets to opening partners
    mapping = {")": "(", "}": "{", "]": "["}
    
    for char in s:
        if char in mapping:
            # Pop top element or use dummy if empty
            top_element = stack.pop() if stack else '#'
            # Check if match failed
            if mapping[char] != top_element:
                return False
        else:
            # Opening bracket, push to stack
            stack.append(char)
            
    # Valid if stack is fully cleared
    return len(stack) == 0`,
        complexity: {
          time: 'O(N)',
          space: 'O(N) stack capacity'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-71',
    title: 'Next Greater Element',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/next-greater-element-i/',
    day: 13,
    topic: 'Stack & Queue',
    problemStatement: 'The next greater element of some element x in an array is the first greater element that is to the right of x in the same array.',
    examples: [
      {
        input: 'nums1 = [4,1,2], nums2 = [1,3,4,2]',
        output: '[-1,3,-1]'
      }
    ],
    constraints: ['1 <= nums.length <= 1000'],
    edgeCases: ['No element is greater.', 'Array is decreasing sorted.'],
    followUps: ['Solve it in linear O(N) time.'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use a monotonic stack. Traverse the target array. Maintain numbers in decreasing order on stack. When a larger number is found, pop smaller elements and pair them.',
        algorithm: '1. Dictionary map to store next greater mappings.\n2. Stack stores numbers. Iterate elements: while stack and top < x, pop and map.\n3. Return result indices.',
        code: `def nextGreaterElement(nums1: List[int], nums2: List[int]) -> List[int]:
    greater_map = {}
    stack = [] # Decreasing stack
    
    # Find next greater elements in nums2
    for num in nums2:
        while stack and stack[-1] < num:
            greater_map[stack.pop()] = num
        stack.append(num)
        
    # Map values or default to -1
    return [greater_map.get(x, -1) for x in nums1]`,
        complexity: {
          time: 'O(N + M)',
          space: 'O(M) for stack lookup map'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-94',
    title: 'Inorder Traversal',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/binary-tree-inorder-traversal/',
    day: 17,
    topic: 'Binary Tree',
    problemStatement: 'Given the root of a binary tree, return the inorder traversal of its nodes\' values.',
    examples: [
      {
        input: 'root = [1,null,2,3]',
        output: '[1,3,2]'
      }
    ],
    constraints: ['Number of nodes in tree range [0, 100].'],
    edgeCases: ['Empty tree.', 'Single node trees.'],
    followUps: ['Recursive solution is trivial, could you do it iteratively?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Inorder traversal visits nodes in the order Left -> Root -> Right recursively.',
        algorithm: '1. Initialize result list.\n2. Helper DFS: left subtree recurse, append val, right subtree recurse.',
        code: `# Definition for a binary tree node.
# class TreeNode:
#     def __init__(self, val=0, left=None, right=None):
#         self.val = val
#         self.left = left
#         self.right = right

def inorderTraversal(root: Optional[TreeNode]) -> List[int]:
    ans = []
    
    def dfs(node):
        if not node: return
        dfs(node.left)    # Traverse Left
        ans.append(node.val) # Visit Root
        dfs(node.right)   # Traverse Right
        
    dfs(root)
    return ans`,
        complexity: {
          time: 'O(N)',
          space: 'O(N) recursion depth call stack'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-125',
    title: 'Search in BST',
    difficulty: 'Easy',
    leetcodeLink: 'https://leetcode.com/problems/search-in-a-binary-search-tree/',
    day: 20,
    topic: 'Binary Search Tree',
    problemStatement: 'Find the node in the binary search tree (BST) that the node\'s value equals val and return the subtree rooted with that node.',
    examples: [
      {
        input: 'root = [4,2,7,1,3], val = 2',
        output: '[2,1,3]'
      }
    ],
    constraints: ['Number of nodes is range [1, 5000].'],
    edgeCases: ['Value not present.', 'Search root node value.'],
    followUps: ['Can you implement this search iteratively to achieve constant O(1) space complexity?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use BST property: left values are smaller, right values are larger. Recurse down matching path.',
        algorithm: '1. If root is null or root.val == target, return root.\n2. If target < root.val, search left child.\n3. Else, search right child.',
        code: `def searchBST(root: Optional[TreeNode], val: int) -> Optional[TreeNode]:
    # Base case: node is empty or matches value
    if not root or root.val == val:
        return root
        
    # Recurse left or right based on key comparison
    if val < root.val:
        return searchBST(root.left, val)
    else:
        return searchBST(root.right, val)`,
        complexity: {
          time: 'O(log N) average, O(N) worst case',
          space: 'O(log N) stack bounds'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-139',
    title: 'BFS Traversal',
    difficulty: 'Easy',
    leetcodeLink: 'https://practice.geeksforgeeks.org/problems/bfs-traversal-of-graph/1',
    day: 23,
    topic: 'Graphs',
    problemStatement: 'Given a directed graph, return the Breadth First Traversal of this graph starting from 0.',
    examples: [
      {
        input: 'V = 5, E = 4, AdjList = [[1, 2, 3], [], [4], [], []]',
        output: '[0,1,2,3,4]'
      }
    ],
    constraints: ['1 <= V, E <= 10^4'],
    edgeCases: ['Disconnected graph components.', 'Loops present.'],
    followUps: ['Can you trace BFS on disconnected graphs?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Use a queue. Push start node, mark visited. Pop front node, visit it, and push all unvisited neighbors to queue.',
        algorithm: '1. Queue deque([0]), visited set.\n2. While queue: popleft, append to ans, check neighbors.',
        code: `from collections import deque

def bfsOfGraph(V: int, adj: List[List[int]]) -> List[int]:
    bfs = []
    visited = [False] * V
    queue = deque([0]) # BFS queue starting at vertex 0
    visited[0] = True
    
    while queue:
        node = queue.popleft()
        bfs.append(node)
        
        # Enqueue unvisited neighbors
        for neighbor in adj[node]:
            if not visited[neighbor]:
                visited[neighbor] = True
                queue.append(neighbor)
                
    return bfs`,
        complexity: {
          time: 'O(V + E)',
          space: 'O(V) storage'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-140',
    title: 'DFS Traversal',
    difficulty: 'Easy',
    leetcodeLink: 'https://practice.geeksforgeeks.org/problems/depth-first-traversal-for-a-graph/1',
    day: 23,
    topic: 'Graphs',
    problemStatement: 'Given a connected undirected graph, perform Depth First Traversal (DFS) starting from 0.',
    examples: [
      {
        input: 'V = 5, E = 4, AdjList = [[2, 3, 1], [0], [0, 4], [0], [2]]',
        output: '[0,2,4,3,1]',
        explanation:
          "From 0 the neighbours are taken in the listed order 2, 3, 1. Going to 2 first reaches 4 through it, " +
          'and only once that branch is exhausted does the walk come back for 3 and then 1 — depth first, so 4 ' +
          'is reported before either of them.'
      }
    ],
    constraints: ['1 <= V, E <= 10^4'],
    edgeCases: ['Graph contains self loops.', 'Single vertex.'],
    followUps: ['Implement DFS iteratively using an explicit stack.'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Explore as deep as possible along each branch before backtracking. Recursively visit neighbors, marking them visited to prevent cycles.',
        algorithm: '1. Visited array.\n2. DFS helper: append node to result, recurse unvisited neighbors.',
        code: `def dfsOfGraph(V: int, adj: List[List[int]]) -> List[int]:
    dfs = []
    visited = [False] * V
    
    def traverse(node):
        visited[node] = True
        dfs.append(node) # Visit current node
        
        # Recurse deep into neighbors
        for neighbor in adj[node]:
            if not visited[neighbor]:
                traverse(neighbor)
                
    traverse(0)
    return dfs`,
        complexity: {
          time: 'O(V + E)',
          space: 'O(V) recursion stack'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-166',
    title: 'Longest Common Subsequence',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/longest-common-subsequence/',
    day: 25,
    topic: 'Dynamic Programming',
    problemStatement: 'Given two strings text1 and text2, return the length of their longest common subsequence.',
    examples: [
      {
        input: 'text1 = "abcde", text2 = "ace"',
        output: '3',
        explanation: 'The common subsequence is "ace" length 3.'
      }
    ],
    constraints: ['1 <= text1.length, text2.length <= 1000'],
    edgeCases: ['No common subsequence.', 'Empty inputs.'],
    followUps: ['Can you optimize memory to use only 1D arrays instead of 2D grids?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Solve using 2D DP tabulation. `dp[i][j]` tracks LCS size of prefixes `text1[0..i]` and `text2[0..j]`. If characters match, increment diagonal. Otherwise, take max from left/top.',
        algorithm: '1. Create DP grid size (m+1) x (n+1).\n2. Iterate through strings. If matching: `dp[i][j] = dp[i-1][j-1] + 1`.\n3. Else: `dp[i][j] = max(dp[i-1][j], dp[i][j-1])`.',
        code: `def longestCommonSubsequence(text1: str, text2: str) -> int:
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    # Populate DP matrix
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                # Characters match -> add diagonal
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                # Discrepancy -> take best fallback
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
                
    return dp[m][n]`,
        complexity: {
          time: 'O(M * N)',
          space: 'O(M * N) table size'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-172',
    title: 'Longest Increasing Subsequence',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/longest-increasing-subsequence/',
    day: 25,
    topic: 'Dynamic Programming',
    problemStatement: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
    examples: [
      {
        input: 'nums = [10,9,2,5,3,7,101,18]',
        output: '4',
        explanation: 'The LIS is [2,3,7,101] (or [2,3,7,18]), length 4.'
      }
    ],
    constraints: ['1 <= nums.length <= 2500'],
    edgeCases: ['Array already sorted descending.', 'Single element inputs.'],
    followUps: ['Could you improve the runtime complexity to O(n log n)?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Solve in O(N log N) using binary search (patience sorting). Maintain a dynamic active tails list. For each number, locate its insert index in tails; replace or append.',
        algorithm: '1. Initialize empty tails list.\n2. Iterate numbers: find index using bisect_left. If index = tails size, append. Else, replace tails[index].',
        code: `import bisect

def lengthOfLIS(nums: List[int]) -> int:
    tails = []
    
    for x in nums:
        # Binary search to find candidate slot
        idx = bisect.bisect_left(tails, x)
        # If it is larger than all elements in tails, append it
        if idx == len(tails):
            tails.append(x)
        else:
            # Replace tails value with smaller candidate
            tails[idx] = x
            
    return len(tails)`,
        complexity: {
          time: 'O(N log N)',
          space: 'O(N) tails capacity'
        }
      }
    ]
  },
  {
    id: 'dsa-idx-185',
    title: 'Implement Trie',
    difficulty: 'Medium',
    leetcodeLink: 'https://leetcode.com/problems/implement-trie-prefix-tree/',
    day: 27,
    topic: 'Tries',
    problemStatement: 'A trie (pronounced as "try") or prefix tree is a tree data structure used to efficiently store and retrieve keys in a dataset of strings.',
    examples: [
      {
        input: '["Trie","insert","search","startsWith"]\n[[],["apple"],["apple"],["app"]]',
        output: '[null,null,true,true]'
      }
    ],
    constraints: ['Strings contain only lowercase English letters.'],
    edgeCases: ['Search word not inserted.', 'Search prefix of inserted word.'],
    followUps: ['Can you optimize trie nodes by using arrays instead of dictionaries for child references?'],
    approaches: [
      {
        name: 'Optimal',
        intuition: 'Trie node contains children mapping to letters and a word-ending flag. Traverse tree characters dynamically to execute searches in O(L).',
        algorithm: '1. Create TrieNode.\n2. insert(word): traverse letters, insert nodes.\n3. search(word): traverse, return True if matches and is_end is True.',
        code: `class TrieNode:
    def __init__(self):
        # Maps characters to children TrieNodes
        self.children = {}
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        curr = self.root
        for char in word:
            # Add child if not present
            if char not in curr.children:
                curr.children[char] = TrieNode()
            curr = curr.children[char]
        curr.is_word = True # Mark end of word

    def search(self, word: str) -> bool:
        curr = self.root
        for char in word:
            if char not in curr.children:
                return False
            curr = curr.children[char]
        return curr.is_word # Must be exact word

    def startsWith(self, prefix: str) -> bool:
        curr = self.root
        for char in prefix:
            if char not in curr.children:
                return False
            curr = curr.children[char]
        return True # Prefix path exists`,
        complexity: {
          time: 'O(L) where L is string length',
          space: 'O(Total chars inserted) nodes storage'
        }
      }
    ]
  }
];

// Complete user SDE checklist index mapping
const rawQuestions = [
  // Arrays
  { title: 'Pascal\'s Triangle', difficulty: 'Easy', day: 1, topic: 'Arrays', link: 'https://leetcode.com/problems/pascals-triangle/' },
  { title: 'Next Permutation', difficulty: 'Medium', day: 1, topic: 'Arrays', link: 'https://leetcode.com/problems/next-permutation/' },
  { title: 'Maximum Subarray Sum (Kadane\'s Algorithm)', difficulty: 'Medium', day: 1, topic: 'Arrays', link: 'https://leetcode.com/problems/maximum-subarray/' },
  { title: 'Sort Colors', difficulty: 'Medium', day: 1, topic: 'Arrays', link: 'https://leetcode.com/problems/sort-colors/' },
  { title: 'Buy and Sell Stock', difficulty: 'Easy', day: 1, topic: 'Arrays', link: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
  { title: 'Rotate Matrix', difficulty: 'Medium', day: 2, topic: 'Arrays', link: 'https://leetcode.com/problems/rotate-image/' },
  { title: 'Merge Overlapping Intervals', difficulty: 'Medium', day: 2, topic: 'Arrays', link: 'https://leetcode.com/problems/merge-intervals/' },
  { title: 'Merge Two Sorted Arrays Without Extra Space', difficulty: 'Medium', day: 2, topic: 'Arrays', link: 'https://leetcode.com/problems/merge-sorted-array/' },
  { title: 'Find Duplicate Number', difficulty: 'Medium', day: 2, topic: 'Arrays', link: 'https://leetcode.com/problems/find-the-duplicate-number/' },
  { title: 'Repeat and Missing Number', difficulty: 'Medium', day: 2, topic: 'Arrays', link: 'https://practice.geeksforgeeks.org/problems/repeat-and-missing-number-arrays-gp/' },
  { title: 'Inversion Count', difficulty: 'Hard', day: 2, topic: 'Arrays', link: 'https://practice.geeksforgeeks.org/problems/inversion-of-array-1587115620/1' },
  { title: 'Search in a 2D Matrix', difficulty: 'Medium', day: 3, topic: 'Arrays', link: 'https://leetcode.com/problems/search-a-2d-matrix/' },
  { title: 'Pow(x, n)', difficulty: 'Medium', day: 3, topic: 'Arrays', link: 'https://leetcode.com/problems/powx-n/' },
  { title: 'Majority Element (> n/2 times)', difficulty: 'Easy', day: 3, topic: 'Arrays', link: 'https://leetcode.com/problems/majority-element/' },
  { title: 'Majority Element II (> n/3 times)', difficulty: 'Medium', day: 3, topic: 'Arrays', link: 'https://leetcode.com/problems/majority-element-ii/' },
  { title: 'Grid Unique Paths', difficulty: 'Medium', day: 3, topic: 'Arrays', link: 'https://leetcode.com/problems/unique-paths/' },
  { title: 'Reverse Pairs', difficulty: 'Hard', day: 3, topic: 'Arrays', link: 'https://leetcode.com/problems/reverse-pairs/' },
  { title: 'Two Sum', difficulty: 'Easy', day: 4, topic: 'Arrays', link: 'https://leetcode.com/problems/two-sum/' },
  { title: 'Four Sum', difficulty: 'Medium', day: 4, topic: 'Arrays', link: 'https://leetcode.com/problems/4sum/' },
  { title: 'Longest Consecutive Sequence', difficulty: 'Medium', day: 4, topic: 'Arrays', link: 'https://leetcode.com/problems/longest-consecutive-sequence/' },
  { title: 'Largest Subarray with 0 Sum', difficulty: 'Medium', day: 4, topic: 'Arrays', link: 'https://practice.geeksforgeeks.org/problems/largest-subarray-with-0-sum/1' },
  { title: 'Count Subarrays with Given XOR', difficulty: 'Medium', day: 4, topic: 'Arrays', link: 'https://www.interviewbit.com/problems/subarray-with-given-xor/' },
  { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', day: 4, topic: 'Arrays', link: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },

  // Linked List
  { title: 'Find Middle of Linked List', difficulty: 'Easy', day: 5, topic: 'Linked List', link: 'https://leetcode.com/problems/middle-of-the-linked-list/' },
  { title: 'Merge Two Sorted Linked Lists', difficulty: 'Easy', day: 5, topic: 'Linked List', link: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  { title: 'Remove Nth Node From End', difficulty: 'Medium', day: 5, topic: 'Linked List', link: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
  { title: 'Add Two Numbers as Linked Lists', difficulty: 'Medium', day: 5, topic: 'Linked List', link: 'https://leetcode.com/problems/add-two-numbers/' },
  { title: 'Delete a Given Node', difficulty: 'Medium', day: 5, topic: 'Linked List', link: 'https://leetcode.com/problems/delete-node-in-a-linked-list/' },
  { title: 'Intersection of Two Linked Lists', difficulty: 'Easy', day: 6, topic: 'Linked List', link: 'https://leetcode.com/problems/intersection-of-two-linked-lists/' },
  { title: 'Detect Cycle in Linked List', difficulty: 'Easy', day: 6, topic: 'Linked List', link: 'https://leetcode.com/problems/linked-list-cycle/' },
  { title: 'Reverse Nodes in K Group', difficulty: 'Hard', day: 6, topic: 'Linked List', link: 'https://leetcode.com/problems/reverse-nodes-in-k-group/' },
  { title: 'Check if Linked List is Palindrome', difficulty: 'Easy', day: 6, topic: 'Linked List', link: 'https://leetcode.com/problems/palindrome-linked-list/' },
  { title: 'Find Starting Point of Loop', difficulty: 'Medium', day: 6, topic: 'Linked List', link: 'https://leetcode.com/problems/linked-list-cycle-ii/' },
  { title: 'Flatten a Linked List', difficulty: 'Medium', day: 6, topic: 'Linked List', link: 'https://practice.geeksforgeeks.org/problems/flattening-a-linked-list/1' },
  { title: 'Rotate a Linked List', difficulty: 'Medium', day: 7, topic: 'Linked List', link: 'https://leetcode.com/problems/rotate-list/' },

  // Linked List & Arrays
  { title: 'Clone Linked List with Random Pointer', difficulty: 'Medium', day: 7, topic: 'Linked List & Arrays', link: 'https://leetcode.com/problems/copy-list-with-random-pointer/' },
  { title: '3 Sum', difficulty: 'Medium', day: 7, topic: 'Linked List & Arrays', link: 'https://leetcode.com/problems/3sum/' },
  { title: 'Trapping Rain Water', difficulty: 'Hard', day: 7, topic: 'Linked List & Arrays', link: 'https://leetcode.com/problems/trapping-rain-water/' },
  { title: 'Remove Duplicates from Sorted Array', difficulty: 'Easy', day: 7, topic: 'Linked List & Arrays', link: 'https://leetcode.com/problems/remove-duplicates-from-sorted-array/' },
  { title: 'Max Consecutive Ones', difficulty: 'Easy', day: 7, topic: 'Linked List & Arrays', link: 'https://leetcode.com/problems/max-consecutive-ones/' },

  // Greedy
  { title: 'N Meetings in One Room', difficulty: 'Easy', day: 8, topic: 'Greedy', link: 'https://practice.geeksforgeeks.org/problems/n-meetings-in-one-room/' },
  { title: 'Minimum Number of Platforms', difficulty: 'Medium', day: 8, topic: 'Greedy', link: 'https://practice.geeksforgeeks.org/problems/minimum-platforms/' },
  { title: 'Job Sequencing Problem', difficulty: 'Medium', day: 8, topic: 'Greedy', link: 'https://practice.geeksforgeeks.org/problems/job-sequencing-problem/' },
  { title: 'Fractional Knapsack', difficulty: 'Medium', day: 8, topic: 'Greedy', link: 'https://practice.geeksforgeeks.org/problems/fractional-knapsack/' },
  { title: 'Greedy Coin Change', difficulty: 'Easy', day: 8, topic: 'Greedy', link: 'https://practice.geeksforgeeks.org/problems/number-of-coins/' },

  // Recursion
  { title: 'Subset Sums', difficulty: 'Easy', day: 9, topic: 'Recursion', link: 'https://practice.geeksforgeeks.org/problems/subset-sums/' },
  { title: 'Subsets II', difficulty: 'Medium', day: 9, topic: 'Recursion', link: 'https://leetcode.com/problems/subsets-ii/' },
  { title: 'Combination Sum', difficulty: 'Medium', day: 9, topic: 'Recursion', link: 'https://leetcode.com/problems/combination-sum/' },
  { title: 'Combination Sum II', difficulty: 'Medium', day: 9, topic: 'Recursion', link: 'https://leetcode.com/problems/combination-sum-ii/' },
  { title: 'Palindrome Partitioning', difficulty: 'Medium', day: 9, topic: 'Recursion', link: 'https://leetcode.com/problems/palindrome-partitioning/' },
  { title: 'K-th Permutation Sequence', difficulty: 'Hard', day: 9, topic: 'Recursion', link: 'https://leetcode.com/problems/permutation-sequence/' },

  // Recursion & Backtracking
  { title: 'Print All Permutations', difficulty: 'Medium', day: 10, topic: 'Recursion & Backtracking', link: 'https://leetcode.com/problems/permutations/' },
  { title: 'N Queens', difficulty: 'Hard', day: 10, topic: 'Recursion & Backtracking', link: 'https://leetcode.com/problems/n-queens/' },
  { title: 'Sudoku Solver', difficulty: 'Hard', day: 10, topic: 'Recursion & Backtracking', link: 'https://leetcode.com/problems/sudoku-solver/' },
  { title: 'M Coloring Problem', difficulty: 'Medium', day: 10, topic: 'Recursion & Backtracking', link: 'https://practice.geeksforgeeks.org/problems/m-coloring-problem-1587115620/1' },
  { title: 'Rat in a Maze', difficulty: 'Medium', day: 10, topic: 'Recursion & Backtracking', link: 'https://practice.geeksforgeeks.org/problems/rat-in-a-maze-problem/' },
  { title: 'Word Break', difficulty: 'Hard', day: 10, topic: 'Recursion & Backtracking', link: 'https://leetcode.com/problems/word-break-ii/' },

  // Binary Search
  { title: 'Nth Root of a Number', difficulty: 'Easy', day: 11, topic: 'Binary Search', link: 'https://www.geeksforgeeks.org/find-nth-root-of-number/' },
  { title: 'Matrix Median', difficulty: 'Hard', day: 11, topic: 'Binary Search', link: 'https://www.interviewbit.com/problems/matrix-median/' },
  { title: 'Find Single Element in Sorted Array', difficulty: 'Medium', day: 11, topic: 'Binary Search', link: 'https://leetcode.com/problems/single-element-in-a-sorted-array/' },
  { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', day: 11, topic: 'Binary Search', link: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  { title: 'Median of Two Sorted Arrays', difficulty: 'Hard', day: 11, topic: 'Binary Search', link: 'https://leetcode.com/problems/median-of-two-sorted-arrays/' },
  { title: 'Kth Element of Two Sorted Arrays', difficulty: 'Medium', day: 11, topic: 'Binary Search', link: 'https://practice.geeksforgeeks.org/problems/k-th-element-of-two-sorted-array/' },

  // Stack & Queue
  { title: 'Implement Stack Using Array', difficulty: 'Easy', day: 13, topic: 'Stack & Queue', link: 'https://practice.geeksforgeeks.org/problems/implement-stack-using-array/1' },
  { title: 'Implement Queue Using Array', difficulty: 'Easy', day: 13, topic: 'Stack & Queue', link: 'https://practice.geeksforgeeks.org/problems/implement-queue-using-array/1' },
  { title: 'Implement Stack Using Queue', difficulty: 'Easy', day: 13, topic: 'Stack & Queue', link: 'https://leetcode.com/problems/implement-stack-using-queues/' },
  { title: 'Implement Queue Using Stack', difficulty: 'Easy', day: 13, topic: 'Stack & Queue', link: 'https://leetcode.com/problems/implement-queue-using-stacks/' },
  { title: 'Balanced Parentheses', difficulty: 'Easy', day: 13, topic: 'Stack & Queue', link: 'https://leetcode.com/problems/valid-parentheses/' },
  { title: 'Next Greater Element', difficulty: 'Medium', day: 13, topic: 'Stack & Queue', link: 'https://leetcode.com/problems/next-greater-element-i/' },
  { title: 'Sort a Stack', difficulty: 'Medium', day: 13, topic: 'Stack & Queue', link: 'https://practice.geeksforgeeks.org/problems/sort-a-stack/1' },
  { title: 'Maximum of Minimum for Every Window Size', difficulty: 'Hard', day: 14, topic: 'Stack & Queue', link: 'https://practice.geeksforgeeks.org/problems/max-of-min-for-every-window-size3453/1' },
  { title: 'LRU Cache', difficulty: 'Medium', day: 14, topic: 'Stack & Queue', link: 'https://leetcode.com/problems/lru-cache/' },
  { title: 'Largest Rectangle in Histogram', difficulty: 'Hard', day: 14, topic: 'Stack & Queue', link: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },

  // Stack & Queue Part-II
  { title: 'Sliding Window Maximum', difficulty: 'Hard', day: 14, topic: 'Stack & Queue Part-II', link: 'https://leetcode.com/problems/sliding-window-maximum/' },
  { title: 'Rotten Oranges', difficulty: 'Medium', day: 14, topic: 'Stack & Queue Part-II', link: 'https://leetcode.com/problems/rotting-oranges/' },
  { title: 'Min Stack', difficulty: 'Easy', day: 14, topic: 'Stack & Queue Part-II', link: 'https://leetcode.com/problems/min-stack/' },
  { title: 'Stock Span Problem', difficulty: 'Medium', day: 14, topic: 'Stack & Queue Part-II', link: 'https://leetcode.com/problems/online-stock-span/' },

  // String
  { title: 'Reverse Words in a String', difficulty: 'Medium', day: 15, topic: 'String', link: 'https://leetcode.com/problems/reverse-words-in-a-string/' },
  { title: 'Longest Palindromic Substring', difficulty: 'Medium', day: 15, topic: 'String', link: 'https://leetcode.com/problems/longest-palindromic-substring/' },
  { title: 'Roman to Integer', difficulty: 'Easy', day: 15, topic: 'String', link: 'https://leetcode.com/problems/roman-to-integer/' },
  { title: 'String to Integer (atoi)', difficulty: 'Medium', day: 15, topic: 'String', link: 'https://leetcode.com/problems/string-to-integer-atoi/' },
  { title: 'Longest Common Prefix', difficulty: 'Easy', day: 15, topic: 'String', link: 'https://leetcode.com/problems/longest-common-prefix/' },
  { title: 'Rabin Karp', difficulty: 'Medium', day: 15, topic: 'String', link: 'https://leetcode.com/problems/repeated-string-match/' },
  { title: 'Z Function', difficulty: 'Medium', day: 15, topic: 'String', link: 'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/' },
  { title: 'KMP Algorithm', difficulty: 'Medium', day: 15, topic: 'String', link: 'https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/' },

  // String Part-II
  { title: 'Minimum Characters Needed for Palindrome', difficulty: 'Hard', day: 16, topic: 'String Part-II', link: 'https://www.interviewbit.com/problems/minimum-characters-required-to-make-a-string-palindromic/' },
  { title: 'Anagram Check', difficulty: 'Easy', day: 16, topic: 'String Part-II', link: 'https://leetcode.com/problems/valid-anagram/' },
  { title: 'Count and Say', difficulty: 'Medium', day: 16, topic: 'String Part-II', link: 'https://leetcode.com/problems/count-and-say/' },
  { title: 'Compare Version Numbers', difficulty: 'Medium', day: 16, topic: 'String Part-II', link: 'https://leetcode.com/problems/compare-version-numbers/' },
  { title: 'Longest Palindromic Prefix', difficulty: 'Medium', day: 16, topic: 'String Part-II', link: 'https://leetcode.com/problems/shortest-palindrome/' },
  { title: 'Implement strstr()', difficulty: 'Easy', day: 16, topic: 'String Part-II', link: 'https://leetcode.com/problems/implement-strstr/' },

  // Binary Tree
  { title: 'Inorder Traversal', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-inorder-traversal/' },
  { title: 'Preorder Traversal', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-preorder-traversal/' },
  { title: 'Postorder Traversal', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-postorder-traversal/' },
  { title: 'Level Order Traversal', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
  { title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
  { title: 'Check if Binary Tree is Balanced', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/balanced-binary-tree/' },
  { title: 'Diameter of Binary Tree', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/diameter-of-binary-tree/' },
  { title: 'Maximum Path Sum in Binary Tree', difficulty: 'Hard', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
  { title: 'Check Identical Trees', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/same-tree/' },
  { title: 'Zig Zag Traversal', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/' },
  { title: 'Boundary Traversal', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://practice.geeksforgeeks.org/problems/boundary-traversal-of-binary-tree/1' },
  { title: 'Vertical Order Traversal', difficulty: 'Hard', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/' },
  { title: 'Top View of Binary Tree', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://practice.geeksforgeeks.org/problems/top-view-of-binary-tree/1' },
  { title: 'Bottom View of Binary Tree', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://practice.geeksforgeeks.org/problems/bottom-view-of-binary-tree/1' },
  { title: 'Right View of Binary Tree', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/binary-tree-right-side-view/' },
  { title: 'Left View of Binary Tree', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://practice.geeksforgeeks.org/problems/left-view-of-binary-tree/1' },
  { title: 'Symmetric Binary Tree', difficulty: 'Easy', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/symmetric-tree/' },
  { title: 'Root to Node Path', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://practice.geeksforgeeks.org/problems/root-to-leaf-paths/1' },
  { title: 'Lowest Common Ancestor in Binary Tree', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/' },
  { title: 'Maximum Width of Binary Tree', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://leetcode.com/problems/maximum-width-of-binary-tree/' },
  { title: 'Children Sum Property', difficulty: 'Medium', day: 17, topic: 'Binary Tree', link: 'https://www.codingninjas.com/codestudio/problems/childrensumproperty_385751' },

  // Binary Tree Part-II
  { title: 'Nodes at Distance K', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/' },
  { title: 'Burn a Binary Tree', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://practice.geeksforgeeks.org/problems/burning-tree/1' },
  { title: 'Count Total Nodes in Complete Binary Tree', difficulty: 'Easy', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/count-complete-tree-nodes/' },
  { title: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/' },
  { title: 'Construct Binary Tree from Postorder and Inorder', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/' },
  { title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },
  { title: 'Morris Inorder Traversal', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/binary-tree-inorder-traversal/' },
  { title: 'Morris Preorder Traversal', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/binary-tree-preorder-traversal/' },
  { title: 'Flatten Binary Tree to Linked List', difficulty: 'Medium', day: 18, topic: 'Binary Tree Part-II', link: 'https://leetcode.com/problems/flatten-binary-tree-to-linked-list/' },

  // Binary Search Tree
  { title: 'Search in BST', difficulty: 'Easy', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/search-in-a-binary-search-tree/' },
  { title: 'Floor in BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://practice.geeksforgeeks.org/problems/floor-in-bst/1' },
  { title: 'Ceil in BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://practice.geeksforgeeks.org/problems/ceil-in-bst/1' },
  { title: 'Insert Node in BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/insert-into-a-binary-search-tree/' },
  { title: 'Delete Node in BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/delete-node-in-a-binary-search-tree/' },
  { title: 'Kth Smallest Element in BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/' },
  { title: 'Validate BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/validate-binary-search-tree/' },
  { title: 'Lowest Common Ancestor in BST', difficulty: 'Easy', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/' },
  { title: 'Construct BST from Preorder Traversal', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/construct-binary-search-tree-from-preorder-traversal/' },
  { title: 'Inorder Successor in BST', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://practice.geeksforgeeks.org/problems/inorder-successor-in-bst/1' },
  { title: 'BST Iterator', difficulty: 'Medium', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/binary-search-tree-iterator/' },
  { title: 'Two Sum in BST', difficulty: 'Easy', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/two-sum-iv-input-is-a-bst/' },
  { title: 'Recover BST', difficulty: 'Hard', day: 20, topic: 'Binary Search Tree', link: 'https://leetcode.com/problems/recover-binary-search-tree/' },
  { title: 'Largest BST in Binary Tree', difficulty: 'Hard', day: 20, topic: 'Binary Search Tree', link: 'https://practice.geeksforgeeks.org/problems/largest-bst/1' },

  // Graphs
  { title: 'BFS Traversal', difficulty: 'Easy', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/bfs-traversal-of-graph/1' },
  { title: 'DFS Traversal', difficulty: 'Easy', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/depth-first-traversal-for-a-graph/1' },
  { title: 'Number of Provinces', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://leetcode.com/problems/number-of-provinces/' },
  { title: 'Number of Islands', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://leetcode.com/problems/number-of-islands/' },
  { title: 'Flood Fill Algorithm', difficulty: 'Easy', day: 23, topic: 'Graphs', link: 'https://leetcode.com/problems/flood-fill/' },
  { title: 'Detect Cycle in Undirected Graph (BFS)', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/detect-cycle-in-an-undirected-graph/1' },
  { title: 'Detect Cycle in Undirected Graph (DFS)', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/detect-cycle-in-an-undirected-graph/1' },
  { title: 'Detect Cycle in Directed Graph', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/detect-cycle-in-a-directed-graph/1' },
  { title: 'Topological Sort (DFS)', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/topological-sort/1' },
  { title: 'Topological Sort (BFS/Kahn\'s Algorithm)', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/topological-sort/1' },
  { title: 'Bipartite Graph Check', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://leetcode.com/problems/is-graph-bipartite/' },
  { title: 'Shortest Path in DAG', difficulty: 'Medium', day: 23, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/shortest-path-in-undirected-graph-having-unit-distance/1' },
  { title: 'Dijkstra\'s Algorithm', difficulty: 'Medium', day: 24, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/implementing-dijkstra-adjoining-list-representation/1' },
  { title: 'Bellman Ford Algorithm', difficulty: 'Medium', day: 24, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/distance-from-the-source-bellman-ford-algorithm/1' },
  { title: 'Floyd Warshall Algorithm', difficulty: 'Medium', day: 24, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/implementing-floyd-warshall/1' },
  { title: 'Minimum Spanning Tree (Prim\'s Algorithm)', difficulty: 'Medium', day: 24, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/minimum-spanning-tree/1' },
  { title: 'Minimum Spanning Tree (Kruskal\'s Algorithm)', difficulty: 'Medium', day: 24, topic: 'Graphs', link: 'https://practice.geeksforgeeks.org/problems/minimum-spanning-tree/1' },

  // Dynamic Programming
  { title: 'Maximum Sum of Non-Adjacent Elements', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://www.codingninjas.com/codestudio/problems/maximum-sum-of-non-adjacent-elements_842401' },
  { title: 'House Robber', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/house-robber/' },
  { title: 'Frog Jump', difficulty: 'Easy', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/frog-jump/' },
  { title: 'Frog Jump with K Distance', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://www.codingninjas.com/codestudio/problems/minimal-cost_8180930' },
  { title: 'Climbing Stairs', difficulty: 'Easy', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/climbing-stairs/' },
  { title: 'Coin Change', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/coin-change/' },
  { title: 'Coin Change II', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/coin-change-ii/' },
  { title: '0/1 Knapsack', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://practice.geeksforgeeks.org/problems/0-1-knapsack-problem0429/1' },
  { title: 'Unbounded Knapsack', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://practice.geeksforgeeks.org/problems/knapsack-with-duplicate-items4201/1' },
  { title: 'Rod Cutting Problem', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://practice.geeksforgeeks.org/problems/rod-cutting0840/1' },
  { title: 'Longest Common Subsequence', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/longest-common-subsequence/' },
  { title: 'Longest Common Substring', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://practice.geeksforgeeks.org/problems/longest-common-substring1452/1' },
  { title: 'Longest Palindromic Subsequence', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/longest-palindromic-subsequence/' },
  { title: 'Edit Distance', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/edit-distance/' },
  { title: 'Distinct Subsequences', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/distinct-subsequences/' },
  { title: 'Wildcard Matching', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/wildcard-matching/' },
  { title: 'Longest Increasing Subsequence', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
  { title: 'Largest Divisible Subset', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/largest-divisible-subset/' },
  { title: 'Longest String Chain', difficulty: 'Medium', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/longest-string-chain/' },
  { title: 'Bitonic Subsequence', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://practice.geeksforgeeks.org/problems/longest-bitonic-subsequence0824/1' },
  { title: 'Matrix Chain Multiplication', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://practice.geeksforgeeks.org/problems/matrix-chain-multiplication0303/1' },
  { title: 'Minimum Cost to Cut a Stick', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/minimum-cost-to-cut-a-stick/' },
  { title: 'Burst Balloons', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/burst-balloons/' },
  { title: 'Palindrome Partitioning II', difficulty: 'Hard', day: 25, topic: 'Dynamic Programming', link: 'https://leetcode.com/problems/palindrome-partitioning-ii/' },

  // Heap
  { title: 'Kth Largest Element', difficulty: 'Medium', day: 12, topic: 'Heap', link: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
  { title: 'Top K Frequent Elements', difficulty: 'Medium', day: 12, topic: 'Heap', link: 'https://leetcode.com/problems/top-k-frequent-elements/' },
  { title: 'Merge K Sorted Arrays', difficulty: 'Medium', day: 12, topic: 'Heap', link: 'https://practice.geeksforgeeks.org/problems/merge-k-sorted-arrays/1' },
  { title: 'Merge K Sorted Linked Lists', difficulty: 'Hard', day: 12, topic: 'Heap', link: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
  { title: 'Find Median from Data Stream', difficulty: 'Hard', day: 12, topic: 'Heap', link: 'https://leetcode.com/problems/find-median-from-data-stream/' },

  // Tries
  { title: 'Implement Trie', difficulty: 'Medium', day: 27, topic: 'Tries', link: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
  { title: 'Implement Trie II', difficulty: 'Medium', day: 27, topic: 'Tries', link: 'https://www.codingninjas.com/codestudio/problems/implement-trie_1387095' },
  { title: 'Maximum XOR of Two Numbers', difficulty: 'Medium', day: 27, topic: 'Tries', link: 'https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/' },
  { title: 'Maximum XOR Queries', difficulty: 'Hard', day: 27, topic: 'Tries', link: 'https://leetcode.com/problems/maximum-xor-with-an-element-from-array/' },

  // Miscellaneous
  { title: 'LFU Cache', difficulty: 'Hard', day: 14, topic: 'Miscellaneous', link: 'https://leetcode.com/problems/lfu-cache/' },
  { title: 'Online Stock Span', difficulty: 'Medium', day: 14, topic: 'Miscellaneous', link: 'https://leetcode.com/problems/online-stock-span/' },
  { title: 'Power Set', difficulty: 'Medium', day: 27, topic: 'Miscellaneous', link: 'https://practice.geeksforgeeks.org/problems/power-set4302/1' },
  { title: 'Maximum XOR Subarray', difficulty: 'Hard', day: 27, topic: 'Miscellaneous', link: 'https://www.interviewbit.com/problems/max-xor-subarray/' }
];

// Append remaining index metadata dynamically to checklist.
// Dedupe by TITLE only: the statically defined questions above already occupy some
// `dsa-idx-N` ids, so matching on id would drop unrelated raw questions whose index
// happens to collide with one of those slots.
const takenIds = new Set(dsaQuestions.map(q => q.id));
rawQuestions.forEach((item, index) => {
  let targetId = `dsa-idx-${index + 3}`;
  while (takenIds.has(targetId)) targetId = `${targetId}b`; // guarantee uniqueness
  takenIds.add(targetId);
  const existing = dsaQuestions.find(q => q.title.toLowerCase() === item.title.toLowerCase());

  const solved = (dsaSolutions as any)[item.title];
  const trace = (dsaTraces as any)[item.title];

  if (!existing) {
    dsaQuestions.push({
      id: targetId,
      title: item.title,
      difficulty: item.difficulty as 'Easy' | 'Medium' | 'Hard',
      leetcodeLink: item.link,
      day: item.day,
      topic: item.topic,
      problemStatement: solved?.problemStatement || `Solve the '${item.title}' problem directly on LeetCode. Review the edge cases and save your Python code logic inside the notes tab below.`,
      examples: solved?.examples || [],
      constraints: solved?.constraints || ['Refer to LeetCode description for exact data bounds.'],
      edgeCases: solved?.edgeCases || ['Empty lists / size-0 arguments', 'Negative/overflow values', 'Duplicate elements'],
      followUps: solved?.followUps || ['Can you optimize time or space complexity further?', 'Are there alternative data structures?'],
      prerequisites: solved?.prerequisites || undefined,
      approaches: solved?.approaches || [],
      trace: trace || undefined
    });
  } else {
    // If it is statically defined but we have parsed a trace from solutions
    if (trace && !(existing as any).trace) {
      (existing as any).trace = trace;
    }
    if (solved?.prerequisites && !(existing as any).prerequisites) {
      (existing as any).prerequisites = solved.prerequisites;
    }
  }
});

// Final pass: attach traces / prerequisites to statically defined questions too
// (their titles are not present in rawQuestions, so the loop above skips them)
dsaQuestions.forEach(q => {
  const solved = (dsaSolutions as any)[q.title];
  const trace = (dsaTraces as any)[q.title];
  if (trace && !q.trace) q.trace = trace;
  if (solved?.prerequisites && !q.prerequisites) q.prerequisites = solved.prerequisites;
  if (solved?.tests && !q.tests) q.tests = solved.tests;
  const pat = (dsaPatternsJson as any)[q.title];
  if (pat && !q.patterns) q.patterns = pat;

  // The audit pass writes execution-verified approach ladders (Brute -> Better -> Optimal)
  // into dsaSolutions.json. Many of those questions are ALSO defined inline above with a
  // lone "Optimal", so the richer JSON version has to win — otherwise the brute-force
  // progression the learner is meant to walk through never reaches the page.
  //
  // The guarded condition is trace safety, not provenance: `trace` line numbers index into
  // the LAST approach's code, so we only swap when that code has the same number of lines
  // (the audit was allowed to append trailing `#` comments, never to add/remove/reorder
  // lines). `overrideStatic` remains an explicit escape hatch for audits that deliberately
  // rewrote the Optimal and shipped a matching corrected trace alongside it.
  const audited: Approach[] | undefined = solved?.approaches?.length ? solved.approaches : undefined;
  if (audited) {
    const inlineLast = q.approaches[q.approaches.length - 1];
    const auditedLast = audited[audited.length - 1];
    const traceStillAligns =
      !inlineLast ||
      inlineLast.code.split('\n').length === auditedLast.code.split('\n').length;

    if (solved.overrideStatic || (audited.length > q.approaches.length && traceStillAligns)) {
      q.approaches = audited;
    }
  }

  // Many questions shipped with a stub statement that just told the reader to go read the
  // problem on LeetCode. The prose pass replaced those with a real description, so take the
  // JSON version whenever it is the substantive one — length is a good enough proxy, and it
  // keeps a hand-written inline statement from being clobbered by a shorter generated one.
  const statement: string | undefined = solved?.problemStatement;
  if (statement && statement.length > (q.problemStatement || '').length) {
    q.problemStatement = statement;
  }
});

// "View in another language" ports (utils: LanguagePicker) — hand-translated and
// execution-verified against the same assertions as the Python version. Java is
// runnable in-app (see utils/javaRunner.ts); C++ and JavaScript stay read-only, so
// their correctness rests entirely on that offline verification. Keyed by
// question id here rather than living inline per-approach in dsaSolutions.json, since
// only a starter batch is translated so far and this keeps that partial coverage in
// one place instead of scattered across hundreds of approach objects. Attached to
// the SAME approach the id was translated FROM — every entry here is a port of that
// question's Optimal approach — after the audited-swap pass above has already
// decided which approach object is actually "Optimal" for this question.
Object.entries(dsaCodeTranslationsJson as Record<string, Record<string, string>>).forEach(([id, translations]) => {
  const q = dsaQuestions.find(x => x.id === id);
  if (!q) return; // a ported id that no longer matches a live question — skip, never throw
  const optimal = q.approaches.find(a => a.name === 'Optimal') ?? q.approaches[q.approaches.length - 1];
  if (optimal) optimal.translations = translations;
});

// Extra worked examples, bringing thin questions up to the three LeetCode shows.
// Every entry here was machine-verified before shipping: each proposed example
// carried a call expression that was executed against this question's own Optimal
// solution, and anything whose real return value did not match the stated output
// was corrected or dropped rather than published on a guess. Kept in its own
// id-keyed file (like the translations above) so the 191 question definitions stay
// untouched. Deduped on input, so re-running the generator cannot double up an
// example a question already ships inline.
Object.entries(dsaExtraExamplesJson as Record<string, Question['examples']>).forEach(([id, extra]) => {
  const q = dsaQuestions.find(x => x.id === id);
  if (!q) return;
  const seen = new Set(q.examples.map(e => e.input.replace(/\s+/g, '')));
  extra.forEach(ex => {
    if (seen.has(ex.input.replace(/\s+/g, ''))) return;
    seen.add(ex.input.replace(/\s+/g, ''));
    q.examples.push(ex);
  });
});
