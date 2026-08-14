import json
import os

# Create the full JSON structure for 15 LeetCode DSA questions
questions_data = {}

# 1. Minimum Cost to Cut a Stick
questions_data["Minimum Cost to Cut a Stick"] = {
    "title": "Minimum Cost to Cut a Stick",
    "problemStatement": (
        "Given a wooden stick of length n, and an array cuts where cuts[i] denotes a position you "
        "must perform a cut at. You can perform the cuts in any order. The cost of one cut is the length "
        "of the stick to be cut. Find the minimum total cost of the cuts."
    ),
    "examples": [
        {
            "input": "n = 7, cuts = [1, 3, 4, 5]",
            "output": "16",
            "explanation": (
                "Cutting at 4 first splits the stick into [0, 4] and [4, 7], costing 7. "
                "Then cutting [0, 4] at 1 and 3 costs 4 + 3 = 7. Cutting [4, 7] at 5 costs 3. "
                "Total cost = 7 + 4 + 3 + 2 = 16 (where 2 is the cost of cutting [3, 5] at 4)."
            )
        },
        {
            "input": "n = 9, cuts = [5, 6, 1, 4, 2]",
            "output": "22",
            "explanation": "If we cut at 5, 6, 1, 4, 2 in an optimal order, the minimum total cost is 22."
        }
    ],
    "constraints": [
        "2 <= n <= 10^6",
        "1 <= cuts.length <= min(n - 1, 100)",
        "1 <= cuts[i] <= n - 1",
        "All elements in cuts are distinct."
    ],
    "edgeCases": [
        "Only one cut is needed.",
        "Cuts are located at the very ends of the allowed boundaries (1 or n-1).",
        "Number of cuts is maximum (100) and n is very large (10^6)."
    ],
    "followUps": [
        "Can we optimize the DP transition using Knuth's Optimization to O(M^2)?",
        "How would you solve this if the cost of a cut was equal to the square of the stick length?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Recursively check all permutations of cuts. For each cut, split the stick and calculate the cost.",
            "algorithm": (
                "1. For any given stick range [L, R] with cuts to make, try every cut `c` in the cuts array.\n"
                "2. The cost of cut `c` is (R - L) plus the cost of solving for the left stick [L, c] and the right stick [c, R].\n"
                "3. Use recursion to find the minimum cost among all choices.\n"
                "4. Return the minimum cost."
            ),
            "code": (
                "def minCostBruteForce(n: int, cuts: list[int]) -> int:\n"
                "    # Helper recursion to solve for range from left to right\n"
                "    def solve(left, right, available_cuts):\n"
                "        # If there are no cuts left to make in this range, cost is 0\n"
                "        if not available_cuts:\n"
                "            return 0\n"
                "        # Initialize the minimum cost for this range to infinity\n"
                "        min_cost = float('inf')\n"
                "        # Try making each available cut in this segment\n"
                "        for cut in available_cuts:\n"
                "            # Check if this cut lies strictly inside our stick segment\n"
                "            if left < cut < right:\n"
                "                # Split available cuts into left and right sub-problems\n"
                "                left_cuts = [c for c in available_cuts if left < c < cut]\n"
                "                right_cuts = [c for c in available_cuts if cut < c < right]\n"
                "                # Cost is current stick length + cost of left stick + cost of right stick\n"
                "                cost = (right - left) + solve(left, cut, left_cuts) + solve(cut, right, right_cuts)\n"
                "                # Track the minimum cost among all possible cut choices\n"
                "                min_cost = min(min_cost, cost)\n"
                "        # If no cuts were valid in this range, return 0, else return the minimum cost\n"
                "        return min_cost if min_cost != float('inf') else 0\n"
                "    # Solve for the entire stick from 0 to n\n"
                "    return solve(0, n, cuts)"
            ),
            "complexity": {
                "time": "O(M! * M)",
                "space": "O(M)"
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use Range DP. Sort the cuts and pad with stick endpoints (0 and n). Let dp[i][j] represent the minimum cost to perform cuts in the range between cuts[i] and cuts[j].",
            "algorithm": (
                "1. Sort the cuts list and pad it: cuts = [0] + sorted(cuts) + [n].\n"
                "2. Initialize a 2D array dp of size M x M with 0, where M is len(cuts).\n"
                "3. Loop through length of cut intervals (length from 2 to M-1).\n"
                "4. Loop through left index `i` from 0 to M - length - 1, and let right index `j` = i + length.\n"
                "5. Try every intermediate cut `k` between `i` and `j` (i.e., i < k < j).\n"
                "6. Calculate the cost: `dp[i][k] + dp[k][j] + cuts[j] - cuts[i]`.\n"
                "7. Record the minimum cost at `dp[i][j]`.\n"
                "8. Return `dp[0][M-1]`."
            ),
            "code": (
                "def minCost(n: int, cuts: list[int]) -> int:\n"
                "    # Sort the cuts so we can work with consecutive intervals\n"
                "    cuts = sorted(cuts)\n"
                "    # Add boundaries 0 and n to cuts to represent the full stick range\n"
                "    cuts = [0] + cuts + [n]\n"
                "    # Get total number of cuts including boundaries\n"
                "    m = len(cuts)\n"
                "    # Initialize a 2D DP table with zeros\n"
                "    dp = [[0] * m for _ in range(m)]\n"
                "    # Iterate over the length of the sub-stick segment in terms of cut indices\n"
                "    for length in range(2, m):\n"
                "        # Iterate over the left boundary of the segment\n"
                "        for i in range(m - length):\n"
                "            # Calculate the right boundary of the segment\n"
                "            j = i + length\n"
                "            # Initialize minimum cost for this range as infinity\n"
                "            min_val = float('inf')\n"
                "            # Try every intermediate cut k between left and right boundaries\n"
                "            for k in range(i + 1, j):\n"
                "                # Calculate cost: subproblem costs + current stick length\n"
                "                cost = dp[i][k] + dp[k][j] + cuts[j] - cuts[i]\n"
                "                # Update minimum cost if the current cut path is cheaper\n"
                "                if cost < min_val:\n"
                "                    min_val = cost\n"
                "            # Store the minimum cost to cut the segment i to j in DP table\n"
                "            dp[i][j] = min_val\n"
                "    # Return the minimum cost to cut the entire stick from index 0 to m-1\n"
                "    return dp[0][m - 1]"
            ),
            "complexity": {
                "time": "O(M^3)",
                "space": "O(M^2)"
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Sorted input cuts.", "vars": {"cuts": [1, 3, 4, 5]}},
        {"line": 5, "desc": "Padded cuts list with boundary elements 0 and n=7.", "vars": {"cuts": [0, 1, 3, 4, 5, 7], "m": 6}},
        {"line": 9, "desc": "Initialized DP table with size 6x6.", "vars": {"dp": "[[0]*6 for _ in range(6)]"}},
        {"line": 11, "desc": "Start processing subproblems of length 2.", "vars": {"length": 2}},
        {"line": 26, "desc": "Compute dp[0][2] (cuts 0 to 3, cuts: [0, 1, 3]). Cut at k=1. Cost = 0+0+3-0 = 3.", "vars": {"i": 0, "j": 2, "k": 1, "dp[0][2]": 3}},
        {"line": 26, "desc": "Compute dp[1][3] (cuts 1 to 4, cuts: [1, 3, 4]). Cut at k=2. Cost = 0+0+4-1 = 3.", "vars": {"i": 1, "j": 3, "k": 2, "dp[1][3]": 3}},
        {"line": 26, "desc": "Compute dp[2][4] (cuts 3 to 5, cuts: [3, 4, 5]). Cut at k=3. Cost = 0+0+5-3 = 2.", "vars": {"i": 2, "j": 4, "k": 3, "dp[2][4]": 2}},
        {"line": 26, "desc": "Compute dp[3][5] (cuts 4 to 7, cuts: [4, 5, 7]). Cut at k=4. Cost = 0+0+7-4 = 3.", "vars": {"i": 3, "j": 5, "k": 4, "dp[3][5]": 3}},
        {"line": 11, "desc": "Start processing subproblems of length 3.", "vars": {"length": 3}},
        {"line": 26, "desc": "Compute dp[0][3] (cuts [0, 1, 3, 4]). Min of k=1 (dp[0][1]+dp[1][3]+4=7) or k=2 (dp[0][2]+dp[2][3]+4=7). dp[0][3]=7.", "vars": {"i": 0, "j": 3, "dp[0][3]": 7}},
        {"line": 11, "desc": "Start processing subproblems of length 5.", "vars": {"length": 5}},
        {"line": 28, "desc": "Completed all subproblem lengths. Return overall minimum cost.", "vars": {"dp[0][5]": 16}}
    ]
}

# 2. Burst Balloons
questions_data["Burst Balloons"] = {
    "title": "Burst Balloons",
    "problemStatement": (
        "You are given n balloons, indexed from 0 to n - 1. Each balloon is painted with a number "
        "on it represented by an array nums. You are asked to burst all the balloons. If you burst the i-th "
        "balloon, you will get nums[i - 1] * nums[i] * nums[i + 1] coins. If i - 1 or i + 1 goes out of bounds "
        "of the array, then treat it as if there is a balloon with a 1 painted on it. Find the maximum coins "
        "you can collect."
    ),
    "examples": [
        {
            "input": "nums = [3, 1, 5]",
            "output": "35",
            "explanation": (
                "nums = [3,1,5] -> [3,5] -> [5] -> []\n"
                "Coins: 3*1*5 + 1*3*5 + 1*5*1 = 15 + 15 + 5 = 35."
            )
        },
        {
            "input": "nums = [1, 5]",
            "output": "10",
            "explanation": "Burst 1 first (1*5*1 = 5) then burst 5 (1*5*1 = 5). Total coins = 10."
        }
    ],
    "constraints": [
        "n == nums.length",
        "1 <= n <= 300",
        "0 <= nums[i] <= 100"
    ],
    "edgeCases": [
        "Array has 1 element.",
        "Array contains elements with value 0.",
        "Array has duplicate elements."
    ],
    "followUps": [
        "How would you return the exact sequence of balloon bursts that yields the maximum coins?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Try all possible orders of bursting the balloons. If there are N balloons, there are N! possible orders.",
            "algorithm": (
                "1. If no balloons remain, return 0.\n"
                "2. Loop through each remaining balloon `i`.\n"
                "3. Calculate coins from bursting balloon `i`: left neighboring balloon * nums[i] * right neighboring balloon.\n"
                "4. Recursively burst remaining balloons.\n"
                "5. Take the maximum overall result."
            ),
            "code": (
                "def maxCoinsBruteForce(nums: list[int]) -> int:\n"
                "    # Recursive function with list of balloons currently remaining\n"
                "    def solve(balloons):\n"
                "        # Base case: if there are no balloons to burst, return 0\n"
                "        if not balloons:\n"
                "            return 0\n"
                "        # Track the max coins found from any burst order\n"
                "        max_val = 0\n"
                "        # Try bursting each balloon first\n"
                "        for i in range(len(balloons)):\n"
                "            # Find neighbors, treating out-of-bounds as 1\n"
                "            left_val = balloons[i-1] if i > 0 else 1\n"
                "            right_val = balloons[i+1] if i < len(balloons) - 1 else 1\n"
                "            # Calculate coins for bursting balloon i now\n"
                "            curr_coins = left_val * balloons[i] * right_val\n"
                "            # Solve recursively for the remaining balloons\n"
                "            remaining = balloons[:i] + balloons[i+1:]\n"
                "            # Update maximum coins possible\n"
                "            max_val = max(max_val, curr_coins + solve(remaining))\n"
                "        # Return the max coins\n"
                "        return max_val\n"
                "    # Trigger recursion\n"
                "    return solve(nums)"
            ),
            "complexity": {
                "time": "O(N!)",
                "space": "O(N)"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Think backwards: What is the LAST balloon burst in the subarray range [i, j]? "
                "If balloon k is burst last in range [i, j], then the sub-problems [i, k-1] and [k+1, j] "
                "must be fully burst first. When balloon k is finally burst, its neighbors are A[i-1] and A[j+1]."
            ),
            "algorithm": (
                "1. Pad nums with 1 at both boundaries to get array A of size n+2.\n"
                "2. Initialize a DP table of size (n+2) x (n+2) with 0.\n"
                "3. Loop through subarray range length from 1 to n.\n"
                "4. Loop through left index `i` of the subarray from 1 to n - length + 1.\n"
                "5. Calculate right index `j` = i + length - 1.\n"
                "6. Try every possible last burst balloon `k` in range `[i, j]`.\n"
                "7. `dp[i][j] = max(dp[i][j], dp[i][k-1] + dp[k+1][j] + A[i-1] * A[k] * A[j+1])`.\n"
                "8. Return `dp[1][n]`."
            ),
            "code": (
                "def maxCoins(nums: list[int]) -> int:\n"
                "    # Pad the array with 1 at both boundaries to handle edges gracefully\n"
                "    A = [1] + nums + [1]\n"
                "    # Get total size of the padded array\n"
                "    n = len(A)\n"
                "    # Initialize DP table where dp[i][j] is the max coins for bursting range i to j\n"
                "    dp = [[0] * n for _ in range(n)]\n"
                "    # Loop over the length of the balloon subarray range\n"
                "    for length in range(1, n - 1):\n"
                "        # Loop over the left index of the subarray range\n"
                "        for i in range(1, n - length):\n"
                "            # Calculate the right index of the subarray range\n"
                "            j = i + length - 1\n"
                "            # Try bursting balloon k last in the range i to j\n"
                "            for k in range(i, j + 1):\n"
                "                # Calculate coins: left subproblem + right subproblem + boundary product\n"
                "                coins = dp[i][k - 1] + dp[k + 1][j] + A[i - 1] * A[k] * A[j + 1]\n"
                "                # Keep the maximum coins possible for the range i to j\n"
                "                if coins > dp[i][j]:\n"
                "                    dp[i][j] = coins\n"
                "    # Return the max coins for the original array range (from index 1 to n - 2)\n"
                "    return dp[1][n - 2]"
            ),
            "complexity": {
                "time": "O(N^3)",
                "space": "O(N^2)"
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Padded input array.", "vars": {"A": [1, 3, 1, 5, 1], "n": 5}},
        {"line": 7, "desc": "Initialized 5x5 DP table.", "vars": {"dp": "[[0]*5 for _ in range(5)]"}},
        {"line": 9, "desc": "Start processing subproblem length 1.", "vars": {"length": 1}},
        {"line": 20, "desc": "Compute dp[1][1] (range [3]). k=1. Coins = 0 + 0 + 1*3*1 = 3.", "vars": {"i": 1, "j": 1, "k": 1, "dp[1][1]": 3}},
        {"line": 20, "desc": "Compute dp[2][2] (range [1]). k=2. Coins = 0 + 0 + 3*1*5 = 15.", "vars": {"i": 2, "j": 2, "k": 2, "dp[2][2]": 15}},
        {"line": 20, "desc": "Compute dp[3][3] (range [5]). k=3. Coins = 0 + 0 + 1*5*1 = 5.", "vars": {"i": 3, "j": 3, "k": 3, "dp[3][3]": 5}},
        {"line": 9, "desc": "Start processing subproblem length 2.", "vars": {"length": 2}},
        {"line": 20, "desc": "Compute dp[1][2] (range [3, 1]). k=1: dp[1][0]+dp[2][2]+1*3*5 = 30. k=2: dp[1][1]+dp[3][2]+1*1*5 = 8. Max = 30.", "vars": {"i": 1, "j": 2, "dp[1][2]": 30}},
        {"line": 20, "desc": "Compute dp[2][3] (range [1, 5]). k=2: 0+dp[3][3]+3*1*1=8. k=3: dp[2][2]+0+3*5*1=30. Max = 30.", "vars": {"i": 2, "j": 3, "dp[2][3]": 30}},
        {"line": 9, "desc": "Start processing subproblem length 3.", "vars": {"length": 3}},
        {"line": 20, "desc": "Compute dp[1][3] (range [3, 1, 5]). k=3 last: dp[1][2]+dp[4][3]+1*5*1 = 30+0+5 = 35.", "vars": {"i": 1, "j": 3, "k": 3, "dp[1][3]": 35}},
        {"line": 22, "desc": "Return final max coins result.", "vars": {"dp[1][3]": 35}}
    ]
}

# 3. Palindrome Partitioning II
questions_data["Palindrome Partitioning II"] = {
    "title": "Palindrome Partitioning II",
    "problemStatement": (
        "Given a string s, partition s such that every substring of the partition is a palindrome. "
        "Return the minimum cuts needed for a palindrome partitioning of s."
    ),
    "examples": [
        {
            "input": "s = 'aab'",
            "output": "1",
            "explanation": "The palindrome partitioning ['aa','b'] could be produced using 1 cut."
        },
        {
            "input": "s = 'a'",
            "output": "0",
            "explanation": "No cuts are needed since the string is already a palindrome."
        }
    ],
    "constraints": [
        "1 <= s.length <= 2000",
        "s consists of lowercase English letters only."
    ],
    "edgeCases": [
        "Entire string is already a palindrome.",
        "All characters are unique (e.g., 'abcdef') -> N-1 cuts.",
        "String consists of all identical characters."
    ],
    "followUps": [
        "Can you return all the minimum cut partitions instead of just the minimum count?",
        "Can we solve this using O(N) auxiliary space?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Try all possible cuts in the string. For each cut combination, check if all resulting segments are palindromes, and count the cuts.",
            "algorithm": (
                "1. Implement a recursive backtracking function to find all valid partitionings.\n"
                "2. For each substring starting at index `start`, find all palindromic prefixes.\n"
                "3. Recursively partition the remaining substring.\n"
                "4. Track the minimum cuts among all successful partitions."
            ),
            "code": (
                "def minCutBruteForce(s: str) -> int:\n"
                "    # Helper function to verify if a substring is a palindrome\n"
                "    def is_palindrome(sub):\n"
                "        return sub == sub[::-1]\n"
                "    # Recursive helper to solve for range starting at 'index'\n"
                "    def solve(index):\n"
                "        # If we reached the end of the string, no more cuts are needed\n"
                "        if index >= len(s):\n"
                "            return -1\n"
                "        min_val = len(s)\n"
                "        # Try all partitions from index to the end of the string\n"
                "        for j in range(index, len(s)):\n"
                "            if is_palindrome(s[index:j+1]):\n"
                "                # Cost is 1 (for current cut) plus the cost of partitioning remaining string\n"
                "                cost = 1 + solve(j + 1)\n"
                "                min_val = min(min_val, cost)\n"
                "        return min_val\n"
                "    return solve(0)"
            ),
            "complexity": {
                "time": "O(2^N * N)",
                "space": "O(N)"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use Dynamic Programming. First, precompute a 2D boolean array is_pal[i][j] indicating "
                "whether s[i..j] is a palindrome. Then, define cuts[i] as the minimum cuts needed for "
                "prefix s[0..i]. If s[0..i] is already a palindrome, cuts[i] = 0. Otherwise, "
                "cuts[i] = min(cuts[j] + 1) for all 0 <= j < i where s[j+1..i] is a palindrome."
            ),
            "algorithm": (
                "1. Precompute palindrome status for all substrings in O(N^2) time.\n"
                "2. Initialize a DP table cuts of size N, where cuts[i] = i (maximum possible cuts).\n"
                "3. Loop `i` from 0 to N-1:\n"
                "   - If s[0..i] is a palindrome, cuts[i] = 0.\n"
                "   - Else, iterate `j` from 0 to i-1. If s[j+1..i] is a palindrome, set cuts[i] = min(cuts[i], cuts[j] + 1).\n"
                "4. Return cuts[N-1]."
            ),
            "code": (
                "def minCut(s: str) -> int:\n"
                "    n = len(s)\n"
                "    # If the string is empty or length is 1, no cuts are needed\n"
                "    if n <= 1:\n"
                "        return 0\n"
                "    # Initialize a 2D boolean list to store palindrome status of substrings\n"
                "    is_pal = [[False] * n for _ in range(n)]\n"
                "    # Loop backwards from end to compute palindrome table\n"
                "    for i in range(n - 1, -1, -1):\n"
                "        # Loop forwards from i to populate palindrome status for range i to j\n"
                "        for j in range(i, n):\n"
                "            # A substring is a palindrome if endpoints match and inner is a palindrome\n"
                "            if s[i] == s[j] and (j - i < 2 or is_pal[i + 1][j - 1]):\n"
                "                is_pal[i][j] = True\n"
                "    # Initialize cuts array where cuts[i] is min cuts for prefix s[0..i]\n"
                "    cuts = [0] * n\n"
                "    # Iterate over the string length to fill the cuts array\n"
                "    for i in range(n):\n"
                "        # If the entire prefix s[0..i] is a palindrome, no cut is needed\n"
                "        if is_pal[0][i]:\n"
                "            cuts[i] = 0\n"
                "        else:\n"
                "            # Set the maximum possible cuts for prefix of length i + 1\n"
                "            min_cuts = i\n"
                "            # Try all partition indices j before i\n"
                "            for j in range(i):\n"
                "                # If the substring s[j+1..i] is a palindrome, check if cuts[j] + 1 is better\n"
                "                if is_pal[j + 1][i]:\n"
                "                    min_cuts = min(min_cuts, cuts[j] + 1)\n"
                "            # Store the minimum cuts in our DP array\n"
                "            cuts[i] = min_cuts\n"
                "    # Return the minimum cuts needed for the entire string\n"
                "    return cuts[n - 1]"
            ),
            "complexity": {
                "time": "O(N^2)",
                "space": "O(N^2)"
            }
        }
    ],
    "trace": [
        {"line": 2, "desc": "Check length of s = 'aab'.", "vars": {"n": 3}},
        {"line": 7, "desc": "Initialized 3x3 palindrome boolean grid.", "vars": {"is_pal": "[[False]*3 for _ in range(3)]"}},
        {"line": 14, "desc": "Populate palindrome grid for i=2: s[2..2] ('b') is palindrome.", "vars": {"i": 2, "j": 2, "is_pal[2][2]": True}},
        {"line": 14, "desc": "Populate palindrome grid for i=1: s[1..1] ('a') is palindrome. s[1..2] ('ab') is not.", "vars": {"i": 1, "is_pal[1][1]": True, "is_pal[1][2]": False}},
        {"line": 14, "desc": "Populate palindrome grid for i=0: s[0..0] ('a') is palindrome, s[0..1] ('aa') is palindrome, s[0..2] ('aab') is not.", "vars": {"i": 0, "is_pal[0][0]": True, "is_pal[0][1]": True, "is_pal[0][2]": False}},
        {"line": 16, "desc": "Initialized cuts list to store results.", "vars": {"cuts": [0, 0, 0]}},
        {"line": 21, "desc": "For i=0, s[0..0] ('a') is palindrome, so cuts[0] = 0.", "vars": {"i": 0, "cuts[0]": 0}},
        {"line": 21, "desc": "For i=1, s[0..1] ('aa') is palindrome, so cuts[1] = 0.", "vars": {"i": 1, "cuts[1]": 0}},
        {"line": 24, "desc": "For i=2, s[0..2] ('aab') is not a palindrome. Initialize min_cuts = 2.", "vars": {"i": 2, "min_cuts": 2}},
        {"line": 29, "desc": "Check j=1: s[2..2] ('b') is palindrome, update min_cuts = min(2, cuts[1]+1) = 1.", "vars": {"j": 1, "min_cuts": 1}},
        {"line": 31, "desc": "Store final min cuts value in DP array.", "vars": {"cuts": [0, 0, 1]}},
        {"line": 33, "desc": "Return overall minimum cuts.", "vars": {"result": 1}}
    ]
}

# 4. Kth Largest Element
questions_data["Kth Largest Element"] = {
    "title": "Kth Largest Element",
    "problemStatement": (
        "Given an integer array nums and an integer k, return the k-th largest element in the array. "
        "Note that it is the k-th largest element in the sorted order, not the k-th distinct element."
    ),
    "examples": [
        {
            "input": "nums = [3,2,1,5,6,4], k = 2",
            "output": "5",
            "explanation": "The sorted array is [1,2,3,4,5,6] and the 2nd largest element is 5."
        },
        {
            "input": "nums = [3,2,3,1,2,4,5,5,6], k = 4",
            "output": "4",
            "explanation": "The sorted array is [1,2,2,3,3,4,5,5,6] and the 4th largest element is 4."
        }
    ],
    "constraints": [
        "1 <= k <= nums.length <= 10^5",
        "-10^4 <= nums[i] <= 10^4"
    ],
    "edgeCases": [
        "k is 1 (the maximum element).",
        "k is equal to len(nums) (the minimum element).",
        "Array has all identical elements."
    ],
    "followUps": [
        "Can you solve it in O(N) time complexity in the worst case (using Median of Medians)?",
        "How would you solve this if the input numbers are streaming in in real-time?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Sort the entire array in descending order, then return the element at index k-1.",
            "algorithm": (
                "1. Sort the input array nums in ascending order.\n"
                "2. The k-th largest element will be at index `len(nums) - k`.\n"
                "3. Return the value at that index."
            ),
            "code": (
                "def findKthLargestBrute(nums: list[int], k: int) -> int:\n"
                "    # Sort the array in-place in ascending order\n"
                "    nums.sort()\n"
                "    # Access the element at index len(nums) - k\n"
                "    return nums[len(nums) - k]"
            ),
            "complexity": {
                "time": "O(N log N)",
                "space": "O(1)"
            }
        },
        {
            "name": "Better",
            "intuition": "Use a Min-Heap of size k. Maintain only the k largest elements seen so far in the heap.",
            "algorithm": (
                "1. Initialize a min-heap with the first k elements of nums.\n"
                "2. For each subsequent element in nums, if it is larger than the root of the heap:\n"
                "   - Pop the root.\n"
                "   - Push the new element.\n"
                "3. The root of the heap will be the k-th largest element. Return it."
            ),
            "code": (
                "import heapq\n\n"
                "def findKthLargestHeap(nums: list[int], k: int) -> int:\n"
                "    # Slice the first k elements of the array\n"
                "    min_heap = nums[:k]\n"
                "    # Transform the list into a min-heap structure\n"
                "    heapq.heapify(min_heap)\n"
                "    # Iterate through the rest of the elements in the array\n"
                "    for num in nums[k:]:\n"
                "        # If current element is larger than the smallest element in heap\n"
                "        if num > min_heap[0]:\n"
                "            # Replace the smallest element with the current one\n"
                "            heapq.heappushpop(min_heap, num)\n"
                "    # The root of the min-heap is now the k-th largest element\n"
                "    return min_heap[0]"
            ),
            "complexity": {
                "time": "O(N log k)",
                "space": "O(k)"
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use Quickselect (Hoare's Selection Algorithm), which is based on Quicksort partitioning and has an average time complexity of O(N).",
            "algorithm": (
                "1. Pick a random pivot index between left and right boundaries.\n"
                "2. Partition the array such that all elements smaller than pivot value are to its left and larger are to its right.\n"
                "3. Let the pivot final index be `store_idx`.\n"
                "4. If `store_idx` matches our target index `len(nums) - k`, return the pivot value.\n"
                "5. If `store_idx` is less than target, recursively search the right side.\n"
                "6. If `store_idx` is greater than target, recursively search the left side."
            ),
            "code": (
                "import random\n\n"
                "def findKthLargest(nums: list[int], k: int) -> int:\n"
                "    # Convert k-th largest to the index in the sorted array (0-indexed)\n"
                "    target = len(nums) - k\n"
                "    def quickselect(left: int, right: int) -> int:\n"
                "        # Base case: if list has only one element, return it\n"
                "        if left == right:\n"
                "            return nums[left]\n"
                "        # Choose a random pivot index to ensure average O(N) performance\n"
                "        pivot_idx = random.randint(left, right)\n"
                "        pivot = nums[pivot_idx]\n"
                "        # Swap the chosen pivot with the element at the right boundary\n"
                "        nums[pivot_idx], nums[right] = nums[right], nums[pivot_idx]\n"
                "        # Keep track of the division boundary for elements smaller than pivot\n"
                "        store_idx = left\n"
                "        # Partition all elements around the pivot value\n"
                "        for i in range(left, right):\n"
                "            # If element is smaller than pivot, move it to the store_idx\n"
                "            if nums[i] < pivot:\n"
                "                nums[store_idx], nums[i] = nums[i], nums[store_idx]\n"
                "                store_idx += 1\n"
                "        # Place pivot at its final sorted position\n"
                "        nums[store_idx], nums[right] = nums[right], nums[store_idx]\n"
                "        # If the pivot is at the target index, we found our k-th largest element\n"
                "        if store_idx == target:\n"
                "            return nums[store_idx]\n"
                "        # If the target is to the right of store_idx, search the right sub-array\n"
                "        elif store_idx < target:\n"
                "            return quickselect(store_idx + 1, right)\n"
                "        # Otherwise, search the left sub-array\n"
                "        else:\n"
                "            return quickselect(left, store_idx - 1)\n"
                "    # Invoke quickselect on the entire array\n"
                "    return quickselect(0, len(nums) - 1)"
            ),
            "complexity": {
                "time": "O(N) average, O(N^2) worst case",
                "space": "O(1) recursion stack"
            }
        }
    ],
    "trace": [
        {"line": 4, "desc": "Convert target element to index.", "vars": {"nums": [3, 2, 1, 5, 6, 4], "k": 2, "target": 4}},
        {"line": 34, "desc": "Call quickselect on index range [0, 5].", "vars": {"left": 0, "right": 5}},
        {"line": 10, "desc": "Select pivot. Let's assume pivot element is 4 (at index 5).", "vars": {"pivot_idx": 5, "pivot": 4}},
        {"line": 20, "desc": "Partition loop runs: elements [3, 2, 1] are smaller than 4 and swapped to left.", "vars": {"store_idx": 3, "nums": [3, 2, 1, 5, 6, 4]}},
        {"line": 23, "desc": "Place pivot 4 at final index 3.", "vars": {"nums": [3, 2, 1, 4, 6, 5], "store_idx": 3}},
        {"line": 28, "desc": "Pivot index 3 is less than target index 4. Recursively search right partition [4, 5].", "vars": {"store_idx": 3, "target": 4}},
        {"line": 5, "desc": "Call quickselect recursively.", "vars": {"left": 4, "right": 5}},
        {"line": 10, "desc": "Select pivot. Assume pivot is 5 (at index 5).", "vars": {"pivot_idx": 5, "pivot": 5}},
        {"line": 23, "desc": "Partition elements. Place pivot 5 at index 4.", "vars": {"nums": [3, 2, 1, 4, 5, 6], "store_idx": 4}},
        {"line": 25, "desc": "Pivot index 4 matches target index 4. Return nums[4].", "vars": {"store_idx": 4, "target": 4, "value": 5}}
    ]
}

# 5. Top K Frequent Elements
questions_data["Top K Frequent Elements"] = {
    "title": "Top K Frequent Elements",
    "problemStatement": (
        "Given an integer array nums and an integer k, return the k most frequent elements. "
        "You may return the answer in any order."
    ),
    "examples": [
        {
            "input": "nums = [1,1,1,2,2,3], k = 2",
            "output": "[1,2]",
            "explanation": "1 occurs 3 times, 2 occurs 2 times, and 3 occurs 1 time. The 2 most frequent elements are [1, 2]."
        },
        {
            "input": "nums = [1], k = 1",
            "output": "[1]",
            "explanation": "1 occurs 1 time, which is the most frequent element."
        }
    ],
    "constraints": [
        "1 <= nums.length <= 10^5",
        "k is in the range [1, the number of unique elements in the array].",
        "It is guaranteed that the answer is unique."
    ],
    "edgeCases": [
        "k is equal to the number of unique elements (must return all unique elements).",
        "All elements have a frequency of 1.",
        "Array contains negative numbers."
    ],
    "followUps": [
        "Your algorithm's time complexity must be better than O(N log N), where N is the array's size. Can we do O(N)?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Count the frequency of each element, sort the unique elements by frequency, and select the top k elements.",
            "algorithm": (
                "1. Build a hash map of item frequencies.\n"
                "2. Sort the keys of the hash map based on their values (frequencies) in descending order.\n"
                "3. Take the first k elements from the sorted list and return them."
            ),
            "code": (
                "def topKFrequentBrute(nums: list[int], k: int) -> list[int]:\n"
                "    # Count frequencies of each number using a dictionary\n"
                "    count = {}\n"
                "    for num in nums:\n"
                "        count[num] = count.get(num, 0) + 1\n"
                "    # Sort dictionary keys by their frequencies in descending order\n"
                "    sorted_items = sorted(count.items(), key=lambda x: x[1], reverse=True)\n"
                "    # Extract the top k elements\n"
                "    return [item[0] for item in sorted_items[:k]]"
            ),
            "complexity": {
                "time": "O(N log N)",
                "space": "O(N)"
            }
        },
        {
            "name": "Better",
            "intuition": "Use a Min-Heap of size k containing (frequency, element) pairs to find the top k elements in O(N log k) time.",
            "algorithm": (
                "1. Count frequencies using a hash map.\n"
                "2. Push elements into a min-heap. Keep the size of the heap <= k.\n"
                "3. Pop extra elements when size exceeds k.\n"
                "4. Extract the elements from the heap and return."
            ),
            "code": (
                "import heapq\n\n"
                "def topKFrequentHeap(nums: list[int], k: int) -> list[int]:\n"
                "    # Count frequencies of each number\n"
                "    count = {}\n"
                "    for num in nums:\n"
                "        count[num] = count.get(num, 0) + 1\n"
                "    # Push elements to min-heap and keep size <= k\n"
                "    heap = []\n"
                "    for num, freq in count.items():\n"
                "        heapq.heappush(heap, (freq, num))\n"
                "        if len(heap) > k:\n"
                "            heapq.heappop(heap)\n"
                "    # Extract elements from the heap\n"
                "    return [item[1] for item in heap]"
            ),
            "complexity": {
                "time": "O(N log k)",
                "space": "O(N + k)"
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use Bucket Sort. Since the maximum frequency of any element is bounded by N, we can create N+1 buckets where bucket[i] stores numbers with frequency i.",
            "algorithm": (
                "1. Compute element frequencies in a hash map.\n"
                "2. Create a list of buckets of size N+1.\n"
                "3. Iterate over the frequency map, and append each element to bucket[frequency].\n"
                "4. Iterate backwards through buckets (from frequency N down to 1).\n"
                "5. Add elements from buckets to the result list until the size reaches k.\n"
                "6. Return the result."
            ),
            "code": (
                "def topKFrequent(nums: list[int], k: int) -> list[int]:\n"
                "    # Count frequencies of each number using a dictionary\n"
                "    count = {}\n"
                "    for num in nums:\n"
                "        count[num] = count.get(num, 0) + 1\n"
                "    # Get length of input array\n"
                "    n = len(nums)\n"
                "    # Create empty buckets where bucket index represents frequency\n"
                "    buckets = [[] for _ in range(n + 1)]\n"
                "    # Put each number in the list corresponding to its frequency\n"
                "    for num, freq in count.items():\n"
                "        buckets[freq].append(num)\n"
                "    # List to hold the top k frequent numbers\n"
                "    result = []\n"
                "    # Loop backwards from highest frequency bucket down to 1\n"
                "    for freq in range(n, 0, -1):\n"
                "        for num in buckets[freq]:\n"
                "            result.append(num)\n"
                "            # Once we have gathered exactly k elements, return the list\n"
                "            if len(result) == k:\n"
                "                return result\n"
                "    # Fallback return statement\n"
                "    return result"
            ),
            "complexity": {
                "time": "O(N)",
                "space": "O(N)"
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Counting frequencies of [1,1,1,2,2,3].", "vars": {"count": {}}},
        {"line": 5, "desc": "Frequency map updated completely.", "vars": {"count": {1: 3, 2: 2, 3: 1}}},
        {"line": 7, "desc": "Obtained length of input array.", "vars": {"n": 6}},
        {"line": 9, "desc": "Initialized 7 empty buckets.", "vars": {"buckets": [[], [], [], [], [], [], []]}},
        {"line": 12, "desc": "Mapped numbers to their frequency buckets.", "vars": {"buckets": [[], [3], [2], [1], [], [], []]}},
        {"line": 14, "desc": "Initialized result list.", "vars": {"result": []}},
        {"line": 16, "desc": "Scanning buckets starting from freq = 6 down to 1.", "vars": {"freq": 6}},
        {"line": 16, "desc": "Scanned down to freq = 3. Bucket has [1].", "vars": {"freq": 3, "buckets[3]": [1]}},
        {"line": 18, "desc": "Added element 1 to results.", "vars": {"result": [1]}},
        {"line": 16, "desc": "Scanned down to freq = 2. Bucket has [2].", "vars": {"freq": 2, "buckets[2]": [2]}},
        {"line": 18, "desc": "Added element 2 to results.", "vars": {"result": [1, 2]}},
        {"line": 20, "desc": "Result list size reaches k=2. Returning.", "vars": {"result": [1, 2]}}
    ]
}

# 6. Merge K Sorted Arrays
questions_data["Merge K Sorted Arrays"] = {
    "title": "Merge K Sorted Arrays",
    "problemStatement": (
        "Given k sorted arrays of sizes possibly different, merge them into a single sorted array."
    ),
    "examples": [
        {
            "input": "arrays = [[1, 4, 7], [2, 5, 8], [3, 6, 9]]",
            "output": "[1,2,3,4,5,6,7,8,9]",
            "explanation": "Merging three sorted arrays results in one sorted array."
        },
        {
            "input": "arrays = [[1, 10], [2, 3]]",
            "output": "[1,2,3,10]",
            "explanation": "Merging two sorted arrays of length 2."
        }
    ],
    "constraints": [
        "0 <= k <= 500",
        "0 <= arrays[i].length <= 500",
        "-10^5 <= arrays[i][j] <= 10^5"
    ],
    "edgeCases": [
        "Some of the k arrays are empty.",
        "k is 0 (empty input list).",
        "All arrays have only one element."
    ],
    "followUps": [
        "Can we solve this using a divide-and-conquer strategy similar to merge sort instead of a min-heap?",
        "What is the space complexity if we are not allowed to output a new array, but rather print the elements?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Concatenate all arrays into one large array and sort it using a standard sorting algorithm.",
            "algorithm": (
                "1. Initialize an empty list `merged`.\n"
                "2. For each array in the input, append all elements to `merged`.\n"
                "3. Sort `merged` using the built-in sort function.\n"
                "4. Return the sorted list."
            ),
            "code": (
                "def mergeKSortedArraysBrute(arrays: list[list[int]]) -> list[int]:\n"
                "    # Initialize a result list\n"
                "    result = []\n"
                "    # Concatenate all arrays\n"
                "    for arr in arrays:\n"
                "        result.extend(arr)\n"
                "    # Sort the concatenated result list\n"
                "    result.sort()\n"
                "    # Return sorted array\n"
                "    return result"
            ),
            "complexity": {
                "time": "O(N log N) where N is the total number of elements across all arrays",
                "space": "O(N) to store the result"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use a Min-Heap. The heap will store the smallest element of each array along with its "
                "origin array index and element index. At each step, pop the smallest element, append it "
                "to the result, and push the next element of that same array into the heap."
            ),
            "algorithm": (
                "1. Initialize a min-heap.\n"
                "2. Insert `(arrays[i][0], i, 0)` for all non-empty arrays `i`.\n"
                "3. While the heap is not empty:\n"
                "   - Pop `(val, arr_idx, elem_idx)`.\n"
                "   - Append `val` to `result`.\n"
                "   - If `elem_idx + 1 < len(arrays[arr_idx])`, push `(arrays[arr_idx][elem_idx+1], arr_idx, elem_idx+1)`.\n"
                "4. Return the result."
            ),
            "code": (
                "import heapq\n\n"
                "def mergeKSortedArrays(arrays: list[list[int]]) -> list[int]:\n"
                "    # Initialize a min-heap to keep track of smallest elements\n"
                "    min_heap = []\n"
                "    # Insert the first element of each non-empty array into the heap\n"
                "    for arr_idx, arr in enumerate(arrays):\n"
                "        if arr:\n"
                "            # Push (value, array_index, element_index)\n"
                "            heapq.heappush(min_heap, (arr[0], arr_idx, 0))\n"
                "    # List to store the final merged elements\n"
                "    result = []\n"
                "    # Process the heap until all elements are merged\n"
                "    while min_heap:\n"
                "        # Pop the element with the minimum value\n"
                "        val, arr_idx, elem_idx = heapq.heappop(min_heap)\n"
                "        result.append(val)\n"
                "        # If the array has more elements, push the next one to the heap\n"
                "        if elem_idx + 1 < len(arrays[arr_idx]):\n"
                "            next_val = arrays[arr_idx][elem_idx + 1]\n"
                "            heapq.heappush(min_heap, (next_val, arr_idx, elem_idx + 1))\n"
                "    # Return the merged and sorted list\n"
                "    return result"
            ),
            "complexity": {
                "time": "O(N log k) where N is total elements, k is number of arrays",
                "space": "O(k) auxiliary space for the heap"
            }
        }
    ],
    "trace": [
        {"line": 4, "desc": "Initialized empty heap.", "vars": {"min_heap": []}},
        {"line": 6, "desc": "Insert first element from arrays: [[1, 4], [2, 5], [3]].", "vars": {"arrays": [[1, 4], [2, 5], [3]]}},
        {"line": 9, "desc": "Heap populated with heads of arrays.", "vars": {"min_heap": [(1, 0, 0), (2, 1, 0), (3, 2, 0)]}},
        {"line": 11, "desc": "Initialized result list.", "vars": {"result": []}},
        {"line": 15, "desc": "Popped min element 1 from array 0.", "vars": {"val": 1, "arr_idx": 0, "elem_idx": 0, "result": [1]}},
        {"line": 20, "desc": "Pushed next element 4 from array 0.", "vars": {"min_heap": [(2, 1, 0), (4, 0, 1), (3, 2, 0)]}},
        {"line": 15, "desc": "Popped min element 2 from array 1.", "vars": {"val": 2, "arr_idx": 1, "elem_idx": 0, "result": [1, 2]}},
        {"line": 20, "desc": "Pushed next element 5 from array 1.", "vars": {"min_heap": [(3, 2, 0), (4, 0, 1), (5, 1, 1)]}},
        {"line": 15, "desc": "Popped min element 3 from array 2.", "vars": {"val": 3, "arr_idx": 2, "elem_idx": 0, "result": [1, 2, 3]}},
        {"line": 15, "desc": "Popped min element 4 from array 0.", "vars": {"val": 4, "arr_idx": 0, "elem_idx": 1, "result": [1, 2, 3, 4]}},
        {"line": 15, "desc": "Popped min element 5 from array 1.", "vars": {"val": 5, "arr_idx": 1, "elem_idx": 1, "result": [1, 2, 3, 4, 5]}},
        {"line": 22, "desc": "Heap empty. Return merged sorted result.", "vars": {"result": [1, 2, 3, 4, 5]}}
    ]
}

# 7. Merge K Sorted Linked Lists
questions_data["Merge K Sorted Linked Lists"] = {
    "title": "Merge K Sorted Linked Lists",
    "problemStatement": (
        "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. "
        "Merge all the linked-lists into one sorted linked-list and return it."
    ),
    "examples": [
        {
            "input": "lists = [[1,4,5],[1,3,4],[2,6]]",
            "output": "[1,1,2,3,4,4,5,6]",
            "explanation": "The linked-lists are:\n[\n  1->4->5,\n  1->3->4,\n  2->6\n]\nmerged list: 1->1->2->3->4->4->5->6"
        },
        {
            "input": "lists = []",
            "output": "[]",
            "explanation": "No lists to merge, output is empty."
        }
    ],
    "constraints": [
        "k == lists.length",
        "0 <= k <= 10^4",
        "0 <= lists[i].length <= 500",
        "-10^4 <= lists[i][j] <= 10^4",
        "lists[i] is sorted in ascending order.",
        "The total number of nodes in all lists does not exceed 10^4."
    ],
    "edgeCases": [
        "lists is empty (lists = []).",
        "lists contains empty nodes (lists = [[]]).",
        "All lists have identical elements (e.g. [[1,1], [1,1]])."
    ],
    "followUps": [
        "Can you implement it in-place using O(1) auxiliary space (excluding recursion stack)?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Collect all nodes' values into a list, sort the list, and construct a new sorted linked list from it.",
            "algorithm": (
                "1. Traverse all linked lists and append all node values to a list.\n"
                "2. Sort the values list.\n"
                "3. Create a dummy node and build a new linked list with the sorted values.\n"
                "4. Return `dummy.next`."
            ),
            "code": (
                "# Definition for singly-linked list.\n"
                "# class ListNode:\n"
                "#     def __init__(self, val=0, next=None):\n"
                "#         self.val = val\n"
                "#         self.next = next\n\n"
                "def mergeKListsBrute(lists: list[ListNode]) -> ListNode:\n"
                "    # List to store values\n"
                "    values = []\n"
                "    # Traverse each list\n"
                "    for l in lists:\n"
                "        curr = l\n"
                "        while curr:\n"
                "            values.append(curr.val)\n"
                "            curr = curr.next\n"
                "    # Sort all gathered values\n"
                "    values.sort()\n"
                "    # Rebuild a new sorted linked list\n"
                "    dummy = ListNode(0)\n"
                "    curr = dummy\n"
                "    for val in values:\n"
                "        curr.next = ListNode(val)\n"
                "        curr = curr.next\n"
                "    return dummy.next"
            ),
            "complexity": {
                "time": "O(N log N)",
                "space": "O(N) to store values and rebuild nodes"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use a Min-Heap. Insert the head of each linked list. Since Python comparing nodes "
                "might throw errors, store a tuple of (node.val, list_index, node) in the heap. "
                "Pop the smallest node, append it to the merged list, and push its next node."
            ),
            "algorithm": (
                "1. Initialize a dummy head and a pointer `current`.\n"
                "2. Create a min-heap.\n"
                "3. Loop through lists: if list is not empty, push `(l.val, idx, l)` into heap.\n"
                "4. While heap is not empty:\n"
                "   - Pop `(val, idx, node)`.\n"
                "   - Link `current.next` to `node` and move `current`.\n"
                "   - If `node.next` exists, push `(node.next.val, idx, node.next)` into heap.\n"
                "5. Return `dummy.next`."
            ),
            "code": (
                "import heapq\n\n"
                "class ListNode:\n"
                "    def __init__(self, val=0, next=None):\n"
                "        self.val = val\n"
                "        self.next = next\n\n"
                "def mergeKLists(lists: list[ListNode]) -> ListNode:\n"
                "    # Initialize a dummy node to act as the head of the merged list\n"
                "    dummy = ListNode(0)\n"
                "    # Pointer to track the tail of the merged list\n"
                "    current = dummy\n"
                "    # Min-heap to store nodes ordered by value\n"
                "    min_heap = []\n"
                "    # Push the first node of each non-empty linked list into the heap\n"
                "    for idx, l in enumerate(lists):\n"
                "        if l:\n"
                "            # We push (node.val, idx, node) to avoid direct comparison of ListNode objects\n"
                "            heapq.heappush(min_heap, (l.val, idx, l))\n"
                "    # Pop and process nodes from heap until empty\n"
                "    while min_heap:\n"
                "        # Retrieve the node with the smallest value\n"
                "        val, idx, node = heapq.heappop(min_heap)\n"
                "        # Link this node to our merged list\n"
                "        current.next = node\n"
                "        # Advance the pointer in the merged list\n"
                "        current = current.next\n"
                "        # If the popped node has a next node, push it to the heap\n"
                "        if node.next:\n"
                "            heapq.heappush(min_heap, (node.next.val, idx, node.next))\n"
                "    # Return the head of the merged linked list\n"
                "    return dummy.next"
            ),
            "complexity": {
                "time": "O(N log k) where N is total nodes, k is number of linked lists",
                "space": "O(k) for the min-heap"
            }
        }
    ],
    "trace": [
        {"line": 8, "desc": "Initialized dummy node.", "vars": {"dummy.val": 0}},
        {"line": 10, "desc": "Initialized current pointer pointing to dummy.", "vars": {"current.val": 0}},
        {"line": 12, "desc": "Initialized empty min-heap.", "vars": {"min_heap": []}},
        {"line": 14, "desc": "Loop through lists to populate initial heap. Assume lists: [[1->5], [2->6]].", "vars": {}},
        {"line": 17, "desc": "Heads inserted into min-heap.", "vars": {"min_heap": [(1, 0, "Node(1)") ,(2, 1, "Node(2)")]}},
        {"line": 21, "desc": "Popped Node(1) from heap.", "vars": {"val": 1, "idx": 0, "node.val": 1}},
        {"line": 23, "desc": "Linked current.next to Node(1).", "vars": {"dummy.next.val": 1}},
        {"line": 25, "desc": "Moved current pointer to Node(1).", "vars": {"current.val": 1}},
        {"line": 28, "desc": "Pushed Node(5) (next of Node(1)) to heap.", "vars": {"min_heap": [(2, 1, "Node(2)"), (5, 0, "Node(5)")]}},
        {"line": 21, "desc": "Popped Node(2) from heap.", "vars": {"val": 2, "idx": 1, "node.val": 2}},
        {"line": 23, "desc": "Linked current.next to Node(2).", "vars": {"current.next.val": 2}},
        {"line": 28, "desc": "Pushed Node(6) (next of Node(2)) to heap.", "vars": {"min_heap": [(5, 0, "Node(5)"), (6, 1, "Node(6)")]}},
        {"line": 30, "desc": "Process finishes. Return dummy.next.", "vars": {"dummy.next.val": 1}}
    ]
}

# 8. Find Median from Data Stream
questions_data["Find Median from Data Stream"] = {
    "title": "Find Median from Data Stream",
    "problemStatement": (
        "The median is the middle value in an ordered integer list. If the size of the list is even, "
        "there is no middle value, and the median is the mean of the two middle values. Implement MedianFinder class:\n"
        "- MedianFinder() initializes the MedianFinder object.\n"
        "- void addNum(int num) adds the integer num from the data stream to the data structure.\n"
        "- double findMedian() returns the median of all elements so far."
    ),
    "examples": [
        {
            "input": "addNum(1); addNum(2); findMedian(); addNum(3); findMedian();",
            "output": "[null, null, 1.5, null, 2.0]",
            "explanation": "Median of [1, 2] is (1+2)/2 = 1.5. Median of [1, 2, 3] is 2.0."
        }
    ],
    "constraints": [
        "-10^5 <= num <= 10^5",
        "At most 5 * 10^4 calls will be made to addNum and findMedian."
    ],
    "edgeCases": [
        "First call to findMedian when only 1 element is added.",
        "Duplicate numbers are added to the stream.",
        "Very large stream of sorted numbers."
    ],
    "followUps": [
        "If all integer numbers from the stream are in the range [0, 100], how would you optimize the space?",
        "If 99% of all integer numbers from the stream are in the range [0, 100], how would you optimize?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Store all numbers in a list. Every time we need the median, sort the list and return the middle element(s).",
            "algorithm": (
                "1. Keep a list `nums`.\n"
                "2. `addNum(num)`: Append `num` to `nums` in O(1).\n"
                "3. `findMedian()`: Sort the list in O(N log N). If length is odd, return middle element. If even, return average of two middle elements."
            ),
            "code": (
                "class MedianFinderBrute:\n"
                "    def __init__(self):\n"
                "        # List to store the numbers from the stream\n"
                "        self.nums = []\n\n"
                "    def addNum(self, num: int) -> None:\n"
                "        # Append num to list\n"
                "        self.nums.append(num)\n\n"
                "    def findMedian(self) -> float:\n"
                "        # Sort the numbers\n"
                "        self.nums.sort()\n"
                "        n = len(self.nums)\n"
                "        # If odd length, return the middle element\n"
                "        if n % 2 == 1:\n"
                "            return float(self.nums[n // 2])\n"
                "        # If even length, return the average of the two middle elements\n"
                "        else:\n"
                "            return (self.nums[n // 2 - 1] + self.nums[n // 2]) / 2.0"
            ),
            "complexity": {
                "time": "addNum: O(1), findMedian: O(N log N)",
                "space": "O(N)"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use two heaps: a max-heap to store the smaller half of the numbers, and a min-heap to store "
                "the larger half. We keep the sizes of the two heaps balanced so that the max-heap has at "
                "most one more element than the min-heap."
            ),
            "algorithm": (
                "1. Maintain max-heap `small` (lower half) and min-heap `large` (upper half).\n"
                "2. `addNum(num)`:\n"
                "   - Push to `small` (using negative values for Python's min-heap).\n"
                "   - Move the maximum element of `small` to `large` to maintain ordering.\n"
                "   - If `len(large) > len(small)`, move the minimum element of `large` back to `small`.\n"
                "3. `findMedian()`:\n"
                "   - If `len(small) > len(large)`, return `-small[0]`.\n"
                "   - Otherwise, return `(-small[0] + large[0]) / 2.0`."
            ),
            "code": (
                "import heapq\n\n"
                "class MedianFinder:\n"
                "    def __init__(self):\n"
                "        # Max-heap (simulated with negative numbers) for lower half\n"
                "        self.small = []\n"
                "        # Min-heap for upper half\n"
                "        self.large = []\n\n"
                "    def addNum(self, num: int) -> None:\n"
                "        # Push value to small (max-heap)\n"
                "        heapq.heappush(self.small, -num)\n"
                "        # Ensure elements in small are smaller than large: pop from small, push to large\n"
                "        val = -heapq.heappop(self.small)\n"
                "        heapq.heappush(self.large, val)\n"
                "        # If sizes are unbalanced, move top element of large back to small\n"
                "        if len(self.large) > len(self.small):\n"
                "            val = heapq.heappop(self.large)\n"
                "            heapq.heappush(self.small, -val)\n\n"
                "    def findMedian(self) -> float:\n"
                "        # If small has more elements, the top of small is the median\n"
                "        if len(self.small) > len(self.large):\n"
                "            return float(-self.small[0])\n"
                "        # Otherwise, the median is the average of the tops of both heaps\n"
                "        return (-self.small[0] + self.large[0]) / 2.0"
            ),
            "complexity": {
                "time": "addNum: O(log N), findMedian: O(1)",
                "space": "O(N)"
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Initialized MedianFinder with empty heaps.", "vars": {"small": [], "large": []}},
        {"line": 8, "desc": "addNum(1) called.", "vars": {"num": 1}},
        {"line": 10, "desc": "Push -1 to small.", "vars": {"small": [-1]}},
        {"line": 13, "desc": "Pop 1 from small and push to large.", "vars": {"small": [], "large": [1]}},
        {"line": 17, "desc": "Since len(large) > len(small), pop 1 from large and push to small.", "vars": {"small": [-1], "large": []}},
        {"line": 8, "desc": "addNum(2) called.", "vars": {"num": 2}},
        {"line": 10, "desc": "Push -2 to small.", "vars": {"small": [-2, -1]}},
        {"line": 13, "desc": "Pop 2 (max element) from small and push to large.", "vars": {"small": [-1], "large": [2]}},
        {"line": 18, "desc": "findMedian() called. Sizes are equal (1 and 1). Average is (-(-1)+2)/2.0 = 1.5.", "vars": {"median": 1.5}},
        {"line": 8, "desc": "addNum(3) called.", "vars": {"num": 3}},
        {"line": 10, "desc": "Push -3 to small.", "vars": {"small": [-3, -1]}},
        {"line": 13, "desc": "Pop 3 from small and push to large.", "vars": {"small": [-1], "large": [2, 3]}},
        {"line": 17, "desc": "len(large) > len(small), so pop 2 from large and push to small.", "vars": {"small": [-2, -1], "large": [3]}},
        {"line": 18, "desc": "findMedian() called. len(small) > len(large). Median is -small[0] = 2.0.", "vars": {"median": 2.0}}
    ]
}

# 9. Implement Trie II
questions_data["Implement Trie II"] = {
    "title": "Implement Trie II",
    "problemStatement": (
        "Design a Trie (Prefix Tree) that supports insertion, prefix counting, exact word matching count, "
        "and deletion of words. Implement Trie class:\n"
        "- Trie() Initializes the trie object.\n"
        "- void insert(String word) Inserts the string word into the trie.\n"
        "- int countWordsEqualTo(String word) Returns the number of instances of the string word in the trie.\n"
        "- int countWordsStartingWith(String prefix) Returns the number of strings in the trie that have the prefix prefix.\n"
        "- void erase(String word) Erases the string word from the trie."
    ),
    "examples": [
        {
            "input": "insert('apple'); insert('apple'); countWordsEqualTo('apple'); countWordsStartingWith('app'); erase('apple'); countWordsEqualTo('apple');",
            "output": "[null, null, 2, 2, null, 1]",
            "explanation": "Two 'apple' words inserted. Match equals 2, starts with prefix 'app' is 2. After erasing one, count equals 1."
        }
    ],
    "constraints": [
        "1 <= word.length, prefix.length <= 2000",
        "word and prefix consist of lowercase English letters only.",
        "At most 3 * 10^4 calls in total will be made to insert, countWordsEqualTo, countWordsStartingWith, and erase.",
        "It is guaranteed that for any call to erase, the string word will exist in the trie."
    ],
    "edgeCases": [
        "Erase is called for a word that is a prefix of another word (should not corrupt the other word's path).",
        "Inserting words that are sub-strings of each other.",
        "Erase until the trie becomes completely empty."
    ],
    "followUps": [
        "What if we want to delete empty nodes completely to save space during erase? (Pruning)",
        "How would you optimize synchronization if this Trie is accessed by multiple threads?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Use a simple list to store all inserted words. Search linearly or count using collections.",
            "algorithm": (
                "1. Maintain a list of inserted words.\n"
                "2. `insert(word)`: Append `word` to the list.\n"
                "3. `countWordsEqualTo(word)`: Count occurrences of `word` in the list.\n"
                "4. `countWordsStartingWith(prefix)`: Count how many strings in the list start with `prefix`.\n"
                "5. `erase(word)`: Find the first occurrence of `word` and remove it from the list."
            ),
            "code": (
                "class TrieBrute:\n"
                "    def __init__(self):\n"
                "        # Simple list to keep track of inserted words\n"
                "        self.words = []\n\n"
                "    def insert(self, word: str) -> None:\n"
                "        # Append word to list\n"
                "        self.words.append(word)\n\n"
                "    def countWordsEqualTo(self, word: str) -> int:\n"
                "        # Count exact occurrences\n"
                "        return self.words.count(word)\n\n"
                "    def countWordsStartingWith(self, prefix: str) -> int:\n"
                "        # Count strings starting with prefix\n"
                "        return sum(1 for w in self.words if w.startswith(prefix))\n\n"
                "    def erase(self, word: str) -> None:\n"
                "        # Remove first matching word from list\n"
                "        if word in self.words:\n"
                "            self.words.remove(word)"
            ),
            "complexity": {
                "time": "insert: O(1), countWordsEqualTo: O(N), countWordsStartingWith: O(N * L), erase: O(N)",
                "space": "O(N * L) where N is number of words, L is average length"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use a Trie where each node stores two variables: `pass_count` (number of words passing through "
                "this node) and `end_count` (number of words ending at this node). Deletion reduces to traversing "
                "and decrementing these counts, pruning nodes when their pass_count becomes 0."
            ),
            "algorithm": (
                "1. TrieNode contains children dict, `end_count` (int), and `pass_count` (int).\n"
                "2. `insert(word)`: Traverse character by character, incrementing `pass_count` at each node. Create node if missing. Increment `end_count` at the final node.\n"
                "3. `countWordsEqualTo(word)`: Follow path of `word`. If path is broken, return 0. Else return `end_count` of final node.\n"
                "4. `countWordsStartingWith(prefix)`: Follow path of `prefix`. If path is broken, return 0. Else return `pass_count` of final node.\n"
                "5. `erase(word)`: Decrement `pass_count` of root. Traverse path, decrementing `pass_count`. If a child node's `pass_count` reaches 0, delete it from parent's children. Finally, decrement `end_count` of the last node."
            ),
            "code": (
                "class TrieNode:\n"
                "    def __init__(self):\n"
                "        # Character map to children nodes\n"
                "        self.children = {}\n"
                "        # Stores the count of words that end exactly at this node\n"
                "        self.end_count = 0\n"
                "        # Stores the count of words that prefix through this node\n"
                "        self.pass_count = 0\n\n"
                "class Trie:\n"
                "    def __init__(self):\n"
                "        # Root node initialization\n"
                "        self.root = TrieNode()\n\n"
                "    def insert(self, word: str) -> None:\n"
                "        curr = self.root\n"
                "        # Every insertion increments the prefix count of root\n"
                "        curr.pass_count += 1\n"
                "        # Traverse and insert node for each character in word\n"
                "        for char in word:\n"
                "            if char not in curr.children:\n"
                "                curr.children[char] = TrieNode()\n"
                "            curr = curr.children[char]\n"
                "            # Increment pass count for each character node\n"
                "            curr.pass_count += 1\n"
                "        # Increment end count for the final character node\n"
                "        curr.end_count += 1\n\n"
                "    def countWordsEqualTo(self, word: str) -> int:\n"
                "        curr = self.root\n"
                "        # Traverse the characters of the word\n"
                "        for char in word:\n"
                "            if char not in curr.children:\n"
                "                return 0\n"
                "            curr = curr.children[char]\n"
                "        # Return the exact match count\n"
                "        return curr.end_count\n\n"
                "    def countWordsStartingWith(self, prefix: str) -> int:\n"
                "        curr = self.root\n"
                "        # Traverse the prefix characters\n"
                "        for char in prefix:\n"
                "            if char not in curr.children:\n"
                "                return 0\n"
                "            curr = curr.children[char]\n"
                "        # Return prefix match count\n"
                "        return curr.pass_count\n\n"
                "    def erase(self, word: str) -> None:\n"
                "        # Avoid illegal state: check if word exists in trie\n"
                "        if self.countWordsEqualTo(word) == 0:\n"
                "            return\n"
                "        curr = self.root\n"
                "        curr.pass_count -= 1\n"
                "        # Traverse and decrement counts\n"
                "        for char in word:\n"
                "            next_node = curr.children[char]\n"
                "            next_node.pass_count -= 1\n"
                "            # If no words pass through this node, delete the branch\n"
                "            if next_node.pass_count == 0:\n"
                "                del curr.children[char]\n"
                "                return\n"
                "            curr = next_node\n"
                "        # Decrement end count of word\n"
                "        curr.end_count -= 1"
            ),
            "complexity": {
                "time": "O(L) for all operations, where L is word length",
                "space": "O(N * L) total space"
            }
        }
    ],
    "trace": [
        {"line": 10, "desc": "Trie initialized with root node.", "vars": {"root.pass_count": 0, "root.end_count": 0}},
        {"line": 12, "desc": "insert('app') called.", "vars": {"word": "app"}},
        {"line": 15, "desc": "Increment pass_count of root.", "vars": {"root.pass_count": 1}},
        {"line": 20, "desc": "Character 'a' processed. Create child node for 'a'.", "vars": {"char": "a", "root.children": ["a"]}},
        {"line": 20, "desc": "Character 'p' processed. Create child node for 'p'.", "vars": {"char": "p"}},
        {"line": 20, "desc": "Character 'p' processed. Create child node for 'p'.", "vars": {"char": "p"}},
        {"line": 23, "desc": "Increment end_count of node corresponding to path 'app'.", "vars": {"node('app').end_count": 1, "node('app').pass_count": 1}},
        {"line": 25, "desc": "countWordsEqualTo('app') called.", "vars": {"word": "app"}},
        {"line": 31, "desc": "Return end_count of node 'app'.", "vars": {"result": 1}},
        {"line": 43, "desc": "erase('app') called.", "vars": {"word": "app"}},
        {"line": 52, "desc": "Erase traverses path 'app'. Deletes 'a' branch since pass_count becomes 0.", "vars": {"root.children": "{}"}}
    ]
}

# 10. Maximum XOR of Two Numbers
questions_data["Maximum XOR of Two Numbers"] = {
    "title": "Maximum XOR of Two Numbers",
    "problemStatement": (
        "Given an integer array nums, return the maximum result of nums[i] XOR nums[j], "
        "where 0 <= i <= j < nums.length."
    ),
    "examples": [
        {
            "input": "nums = [3,10,5,25,2,8]",
            "output": "28",
            "explanation": "The maximum result is 5 XOR 25 = 28."
        },
        {
            "input": "nums = [14,70,53,83,49,91,36,80,92,51,66,70]",
            "output": "127",
            "explanation": "The maximum XOR result is obtained from pair (14, 113) or similar, max value is 127."
        }
    ],
    "constraints": [
        "1 <= nums.length <= 2 * 10^5",
        "0 <= nums[i] <= 2^31 - 1"
    ],
    "edgeCases": [
        "Array has only 1 element (XOR of element with itself is 0).",
        "Array consists of elements that are all 0.",
        "Array has duplicate elements."
    ],
    "followUps": [
        "Can we solve this without a Trie using a prefix-based greedy search with a hash set?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Compare all possible pairs of numbers in the array, calculate their XOR value, and track the maximum.",
            "algorithm": (
                "1. Run nested loops to iterate through all pairs (nums[i], nums[j]).\n"
                "2. Calculate XOR value `nums[i] ^ nums[j]`.\n"
                "3. Update `max_xor` if the calculated value is larger.\n"
                "4. Return `max_xor`."
            ),
            "code": (
                "def findMaximumXORBrute(nums: list[int]) -> int:\n"
                "    # Initialize max XOR to 0\n"
                "    max_xor = 0\n"
                "    # Nested loops to compare every pair\n"
                "    for i in range(len(nums)):\n"
                "        for j in range(i, len(nums)):\n"
                "            # Calculate XOR for the current pair\n"
                "            current_xor = nums[i] ^ nums[j]\n"
                "            # Track the maximum XOR encountered\n"
                "            if current_xor > max_xor:\n"
                "                max_xor = current_xor\n"
                "    return max_xor"
            ),
            "complexity": {
                "time": "O(N^2)",
                "space": "O(1)"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use a Binary Trie (Prefix Tree of bits). Insert the 31-bit binary representation of all "
                "numbers into the Trie. For each number, traverse the Trie trying to choose the path of "
                "the opposite bit at each step (since 1 ^ 0 = 1). This greedily maximizes the XOR value."
            ),
            "algorithm": (
                "1. Create a Trie where each node can have two children (bit 0 and bit 1).\n"
                "2. Insert all numbers from the array into the Trie (bit-by-bit from MSB to LSB).\n"
                "3. For each number, query the Trie to find the maximum possible XOR partner:\n"
                "   - At each bit, if the opposite bit child exists, go to that child and set that bit in the XOR result to 1.\n"
                "   - Else, go to the same bit child.\n"
                "4. Update the overall maximum XOR result.\n"
                "5. Return the maximum result."
            ),
            "code": (
                "class TrieNode:\n"
                "    def __init__(self):\n"
                "        # Children pointers for bits 0 and 1\n"
                "        self.children = [None, None]\n\n"
                "class Trie:\n"
                "    def __init__(self):\n"
                "        self.root = TrieNode()\n\n"
                "    def insert(self, num: int) -> None:\n"
                "        curr = self.root\n"
                "        # Insert 31-bit representation (from bit 30 down to 0)\n"
                "        for i in range(30, -1, -1):\n"
                "            bit = (num >> i) & 1\n"
                "            if not curr.children[bit]:\n"
                "                curr.children[bit] = TrieNode()\n"
                "            curr = curr.children[bit]\n\n"
                "    def getMaxXor(self, num: int) -> int:\n"
                "        curr = self.root\n"
                "        max_xor = 0\n"
                "        # Traverse trying to find opposite bits\n"
                "        for i in range(30, -1, -1):\n"
                "            bit = (num >> i) & 1\n"
                "            target_bit = 1 - bit\n"
                "            if curr.children[target_bit]:\n"
                "                # If opposite bit is available, set the i-th bit in result and follow it\n"
                "                max_xor |= (1 << i)\n"
                "                curr = curr.children[target_bit]\n"
                "            else:\n"
                "                # Otherwise follow the same bit\n"
                "                curr = curr.children[bit]\n"
                "        return max_xor\n\n"
                "def findMaximumXOR(nums: list[int]) -> int:\n"
                "    trie = Trie()\n"
                "    # Insert all numbers into the trie\n"
                "    for num in nums:\n"
                "        trie.insert(num)\n"
                "    max_res = 0\n"
                "    # Query maximum XOR for each number\n"
                "    for num in nums:\n"
                "        max_res = max(max_res, trie.getMaxXor(num))\n"
                "    # Return the overall maximum XOR\n"
                "    return max_res"
            ),
            "complexity": {
                "time": "O(N * 30) = O(N)",
                "space": "O(N * 30) = O(N) space for Trie nodes"
            }
        }
    ],
    "trace": [
        {"line": 34, "desc": "Initialized Trie.", "vars": {"max_res": 0}},
        {"line": 37, "desc": "Insert 3 and 10 into Trie.", "vars": {"nums": [3, 10]}},
        {"line": 10, "desc": "3 (binary 00...011) inserted into Trie.", "vars": {"inserted_num": 3}},
        {"line": 10, "desc": "10 (binary 00...1010) inserted into Trie.", "vars": {"inserted_num": 10}},
        {"line": 40, "desc": "Query max XOR for num = 3.", "vars": {"num": 3}},
        {"line": 22, "desc": "Search Trie for opposite bits of 3. We match with 10's bits.", "vars": {"target_xor": 9}},
        {"line": 41, "desc": "max_res updated to 9.", "vars": {"max_res": 9}},
        {"line": 40, "desc": "Query max XOR for num = 10.", "vars": {"num": 10}},
        {"line": 22, "desc": "Search Trie for opposite bits of 10. Match with 3's bits.", "vars": {"target_xor": 9}},
        {"line": 43, "desc": "Completed querying all nums. Return maximum XOR.", "vars": {"max_res": 9}}
    ]
}

# 11. Maximum XOR Queries
questions_data["Maximum XOR Queries"] = {
    "title": "Maximum XOR Queries",
    "problemStatement": (
        "You are given an array nums of non-negative integers. You are also given a queries array "
        "where queries[i] = [xi, mi]. The answer to the i-th query is the maximum bitwise XOR value of xi with "
        "any element of nums that does not exceed mi. If all elements in nums are larger than mi, "
        "the answer is -1. Return an array of the results."
    ),
    "examples": [
        {
            "input": "nums = [0,1,2,3,4], queries = [[3,1],[1,3],[5,6]]",
            "output": "[3,3,7]",
            "explanation": (
                "For query 0 (3, 1): elements <= 1 are 0, 1. Max XOR of 3 with 0 or 1 is 3 ^ 0 = 3.\n"
                "For query 1 (1, 3): elements <= 3 are 0, 1, 2, 3. Max XOR of 1 with those is 1 ^ 2 = 3.\n"
                "For query 2 (5, 6): elements <= 6 are 0, 1, 2, 3, 4. Max XOR of 5 with those is 5 ^ 2 = 7."
            )
        }
    ],
    "constraints": [
        "1 <= nums.length, queries.length <= 10^5",
        "0 <= nums[i], xi, mi <= 10^9"
    ],
    "edgeCases": [
        "All elements in nums are strictly greater than mi for a query (should return -1).",
        "mi is larger than all elements in nums (all elements can be selected).",
        "nums has only 1 element."
    ],
    "followUps": [
        "Can we solve this query-by-query online (without sorting queries) by using a Persistent Trie?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "For each query (xi, mi), search the entire array nums linearly. Filter elements <= mi, compute their XOR with xi, and find the maximum.",
            "algorithm": (
                "1. Initialize a result list of size len(queries).\n"
                "2. For each query index `i`, extract `xi` and `mi`.\n"
                "3. Loop through all `num` in `nums`:\n"
                "   - If `num <= mi`, compute `num ^ xi` and update query max.\n"
                "4. If no elements were <= mi, set result[i] = -1. Else set it to max.\n"
                "5. Return result."
            ),
            "code": (
                "def maximizeXorBrute(nums: list[int], queries: list[list[int]]) -> list[int]:\n"
                "    ans = []\n"
                "    # Process each query\n"
                "    for xi, mi in queries:\n"
                "        max_val = -1\n"
                "        # Linearly search through nums\n"
                "        for num in nums:\n"
                "            # Only consider numbers less than or equal to mi\n"
                "            if num <= mi:\n"
                "                max_val = max(max_val, num ^ xi)\n"
                "        ans.append(max_val)\n"
                "    return ans"
            ),
            "complexity": {
                "time": "O(Q * N)",
                "space": "O(1) auxiliary space"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Offline Queries + Binary Trie. Sort the array nums and the queries by limit mi in ascending order. "
                "Process queries sequentially, inserting numbers from nums into the Trie as long as they are <= mi. "
                "Then query the Trie for the maximum XOR with xi. Since the elements are sorted, we insert each number "
                "into the Trie at most once."
            ),
            "algorithm": (
                "1. Sort `nums` in ascending order.\n"
                "2. Pair each query with its original index, and sort queries by `mi`.\n"
                "3. Keep a pointer `nums_idx = 0` in sorted `nums`.\n"
                "4. For each query `(mi, xi, idx)`:\n"
                "   - Insert `nums[nums_idx]` into the Trie and increment `nums_idx` while `nums[nums_idx] <= mi`.\n"
                "   - Query the Trie with `xi` to get the maximum XOR value.\n"
                "   - Store the result in `ans[idx]`.\n"
                "5. Return `ans`."
            ),
            "code": (
                "class TrieNode:\n"
                "    def __init__(self):\n"
                "        # Array of children pointers for 0 and 1 bits\n"
                "        self.children = [None, None]\n\n"
                "class BinaryTrie:\n"
                "    def __init__(self):\n"
                "        self.root = TrieNode()\n\n"
                "    def insert(self, num: int) -> None:\n"
                "        curr = self.root\n"
                "        # Insert a 30-bit number\n"
                "        for i in range(29, -1, -1):\n"
                "            bit = (num >> i) & 1\n"
                "            if not curr.children[bit]:\n"
                "                curr.children[bit] = TrieNode()\n"
                "            curr = curr.children[bit]\n\n"
                "    def getMaxXor(self, num: int) -> int:\n"
                "        curr = self.root\n"
                "        # If no numbers have been inserted yet, return -1\n"
                "        if not curr.children[0] and not curr.children[1]:\n"
                "            return -1\n"
                "        max_xor = 0\n"
                "        # Search the Trie for maximum XOR\n"
                "        for i in range(29, -1, -1):\n"
                "            bit = (num >> i) & 1\n"
                "            target_bit = 1 - bit\n"
                "            if curr.children[target_bit]:\n"
                "                max_xor |= (1 << i)\n"
                "                curr = curr.children[target_bit]\n"
                "            else:\n"
                "                curr = curr.children[bit]\n"
                "        return max_xor\n\n"
                "def maximizeXor(nums: list[int], queries: list[list[int]]) -> list[int]:\n"
                "    # Sort the elements of nums in ascending order\n"
                "    nums.sort()\n"
                "    # Store queries along with original index and sort them by the threshold value mi\n"
                "    sorted_queries = sorted([(q[1], q[0], idx) for idx, q in enumerate(queries)])\n"
                "    # Initialize our binary trie\n"
                "    trie = BinaryTrie()\n"
                "    # Array to store the result of each query\n"
                "    ans = [-1] * len(queries)\n"
                "    nums_idx = 0\n"
                "    n = len(nums)\n"
                "    # Process queries sequentially\n"
                "    for mi, xi, idx in sorted_queries:\n"
                "        # Insert all numbers <= mi into the Trie\n"
                "        while nums_idx < n and nums[nums_idx] <= mi:\n"
                "            trie.insert(nums[nums_idx])\n"
                "            nums_idx += 1\n"
                "        # Retrieve maximum XOR from trie\n"
                "        ans[idx] = trie.getMaxXor(xi)\n"
                "    # Return query responses\n"
                "    return ans"
            ),
            "complexity": {
                "time": "O(N log N + Q log Q + (N + Q) * 30)",
                "space": "O(N * 30) to store all nodes in Trie"
            }
        }
    ],
    "trace": [
        {"line": 39, "desc": "Sorted input nums.", "vars": {"nums": [0, 1, 2, 3, 4]}},
        {"line": 41, "desc": "Sorted queries with indices.", "vars": {"sorted_queries": [(1, 3, 0), (3, 1, 1), (6, 5, 2)]}},
        {"line": 43, "desc": "Initialized Trie.", "vars": {"ans": [-1, -1, -1]}},
        {"line": 47, "desc": "Process first query: mi=1, xi=3, idx=0.", "vars": {"mi": 1, "xi": 3, "idx": 0}},
        {"line": 50, "desc": "Insert nums[0] (0) and nums[1] (1) into Trie since <= 1.", "vars": {"nums_idx": 2, "inserted": [0, 1]}},
        {"line": 53, "desc": "Get max XOR for xi=3. Trie has [0, 1]. Best match is 0 (XOR = 3).", "vars": {"ans[0]": 3}},
        {"line": 47, "desc": "Process second query: mi=3, xi=1, idx=1.", "vars": {"mi": 3, "xi": 1, "idx": 1}},
        {"line": 50, "desc": "Insert nums[2] (2) and nums[3] (3) into Trie since <= 3.", "vars": {"nums_idx": 4, "inserted": [2, 3]}},
        {"line": 53, "desc": "Get max XOR for xi=1. Trie has [0, 1, 2, 3]. Best is 2 (XOR = 3).", "vars": {"ans[1]": 3}},
        {"line": 55, "desc": "Finished all queries. Return ans.", "vars": {"ans": [3, 3, 7]}}
    ]
}

# 12. LFU Cache
questions_data["LFU Cache"] = {
    "title": "LFU Cache",
    "problemStatement": (
        "Design and implement a data structure for a Least Frequently Used (LFU) cache. "
        "Implement LFUCache class:\n"
        "- LFUCache(int capacity) Initializes the object with the capacity.\n"
        "- int get(int key) Gets the value of the key if key exists. Otherwise, returns -1.\n"
        "- void put(int key, int value) Updates value of key if present, or inserts it. "
        "When cache reaches capacity, remove the least frequently used key. If there is a tie, "
        "use the least recently used key. O(1) time complexity for both operations is required."
    ),
    "examples": [
        {
            "input": (
                "LFUCache cache = new LFUCache(2);\n"
                "cache.put(1, 1);\n"
                "cache.put(2, 2);\n"
                "cache.get(1);      // returns 1\n"
                "cache.put(3, 3);    // evicts key 2\n"
                "cache.get(2);      // returns -1 (not found)\n"
                "cache.get(3);      // returns 3\n"
                "cache.put(4, 4);    // evicts key 1\n"
                "cache.get(1);      // returns -1 (not found)\n"
                "cache.get(3);      // returns 3\n"
                "cache.get(4);      // returns 4"
            ),
            "output": "[null, null, null, 1, null, -1, 3, null, -1, 3, 4]",
            "explanation": "LFU cache trace matching standard operations."
        }
    ],
    "constraints": [
        "0 <= capacity <= 10^4",
        "0 <= key <= 10^5",
        "0 <= value <= 10^9",
        "At most 2 * 10^5 calls will be made to get and put."
    ],
    "edgeCases": [
        "capacity is 0 (all put operations should fail immediately).",
        "Getting a non-existent key.",
        "Tie-breaker: Multiple keys have the same minimum frequency."
    ],
    "followUps": [
        "How would you implement LFU Cache in a concurrent environment where multiple threads access the cache?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Use a simple map to store values and another map to store frequency and access timestamps of keys. Scan the frequencies linearly during eviction.",
            "algorithm": (
                "1. `key_to_val` stores the key-value pairs.\n"
                "2. `key_to_stats` stores `(frequency, last_access_timestamp)` for each key.\n"
                "3. `get(key)`: Increment frequency and update timestamp. Return value.\n"
                "4. `put(key, value)`:\n"
                "   - If key exists, update value, increment frequency, update timestamp.\n"
                "   - If key does not exist and cache is full, scan `key_to_stats` to find key with minimum frequency. In case of tie, choose the one with minimum timestamp. Delete that key.\n"
                "   - Insert new key with frequency 1 and current timestamp."
            ),
            "code": (
                "class LFUCacheBrute:\n"
                "    def __init__(self, capacity: int):\n"
                "        self.capacity = capacity\n"
                "        self.key_to_val = {}\n"
                "        self.key_to_stats = {} # stores [freq, timestamp]\n"
                "        self.timestamp = 0\n\n"
                "    def get(self, key: int) -> int:\n"
                "        if key not in self.key_to_val:\n"
                "            return -1\n"
                "        self.timestamp += 1\n"
                "        self.key_to_stats[key][0] += 1\n"
                "        self.key_to_stats[key][1] = self.timestamp\n"
                "        return self.key_to_val[key]\n\n"
                "    def put(self, key: int, value: int) -> None:\n"
                "        if self.capacity <= 0:\n"
                "            return\n"
                "        self.timestamp += 1\n"
                "        if key in self.key_to_val:\n"
                "            self.key_to_val[key] = value\n"
                "            self.key_to_stats[key][0] += 1\n"
                "            self.key_to_stats[key][1] = self.timestamp\n"
                "        else:\n"
                "            if len(self.key_to_val) == self.capacity:\n"
                "                # Find key with minimum freq, then minimum timestamp\n"
                "                evict_key = min(self.key_to_stats.keys(), \n"
                "                                key=lambda k: (self.key_to_stats[k][0], self.key_to_stats[k][1]))\n"
                "                del self.key_to_val[evict_key]\n"
                "                del self.key_to_stats[evict_key]\n"
                "            self.key_to_val[key] = value\n"
                "            self.key_to_stats[key] = [1, self.timestamp]"
            ),
            "complexity": {
                "time": "get: O(1), put: O(C) where C is capacity (due to scanning keys during eviction)",
                "space": "O(C)"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use a Double Hash Map + Doubly Linked Lists to achieve O(1) average time complexity. "
                "One map links keys to node objects. The second map links frequencies to Doubly Linked Lists of nodes "
                "having that frequency. We maintain a `min_freq` variable to instantly locate the list to evict from."
            ),
            "algorithm": (
                "1. Node stores `key`, `val`, `freq`, `prev`, and `next` pointers.\n"
                "2. DoublyLinkedList maintains sentinel `head` and `tail`, `size`, `append(node)`, `pop(node)`, and `pop_head()` (removes oldest node).\n"
                "3. `_update(node)`: Remove node from `freq_to_list[freq]`. If that list is empty and `freq == min_freq`, increment `min_freq`. Increment `node.freq` and append to `freq_to_list[new_freq]`.\n"
                "4. `get(key)`: Retrieve node from `key_to_node`, call `_update(node)`, and return value.\n"
                "5. `put(key, value)`:\n"
                "   - If key exists, update value, call `_update(node)`.\n"
                "   - If key doesn't exist and cache is full, pop head of `freq_to_list[min_freq]`, delete it from `key_to_node`.\n"
                "   - Insert new node with frequency 1, update `min_freq = 1`."
            ),
            "code": (
                "class Node:\n"
                "    def __init__(self, key=0, val=0):\n"
                "        # Key of the cache entry\n"
                "        self.key = key\n"
                "        # Value of the cache entry\n"
                "        self.val = val\n"
                "        # Frequency of the cache entry, initially 1\n"
                "        self.freq = 1\n"
                "        # Pointer to the previous node in the list\n"
                "        self.prev = None\n"
                "        # Pointer to the next node in the list\n"
                "        self.next = None\n\n"
                "class DoublyLinkedList:\n"
                "    def __init__(self):\n"
                "        # Initialize dummy head and tail nodes\n"
                "        self.head = Node()\n"
                "        self.tail = Node()\n"
                "        self.head.next = self.tail\n"
                "        self.tail.prev = self.head\n"
                "        # Number of elements in this list\n"
                "        self.size = 0\n\n"
                "    def append(self, node: Node) -> None:\n"
                "        # Append node to the end of the doubly linked list\n"
                "        node.next = self.tail\n"
                "        node.prev = self.tail.prev\n"
                "        self.tail.prev.next = node\n"
                "        self.tail.prev = node\n"
                "        self.size += 1\n\n"
                "    def pop(self, node: Node) -> None:\n"
                "        # Remove node from the list\n"
                "        node.prev.next = node.next\n"
                "        node.next.prev = node.prev\n"
                "        self.size -= 1\n\n"
                "    def pop_head(self) -> Node:\n"
                "        # Pop the first actual node from the list (least recently used)\n"
                "        if self.size == 0:\n"
                "            return None\n"
                "        first = self.head.next\n"
                "        self.pop(first)\n"
                "        return first\n\n"
                "class LFUCache:\n"
                "    def __init__(self, capacity: int):\n"
                "        self.capacity = capacity\n"
                "        # Current number of items in the cache\n"
                "        self.size = 0\n"
                "        # Tracks the lowest frequency in the cache\n"
                "        self.min_freq = 0\n"
                "        # Map key to Node object\n"
                "        self.key_to_node = {}\n"
                "        # Map frequency to DoublyLinkedList object\n"
                "        self.freq_to_list = {}\n\n"
                "    def _update(self, node: Node) -> None:\n"
                "        # Extract current frequency\n"
                "        freq = node.freq\n"
                "        # Remove node from its current frequency list\n"
                "        self.freq_to_list[freq].pop(node)\n"
                "        # If min_freq list is empty, update min_freq\n"
                "        if freq == self.min_freq and self.freq_to_list[freq].size == 0:\n"
                "            self.min_freq += 1\n"
                "        # Update node frequency\n"
                "        node.freq += 1\n"
                "        new_freq = node.freq\n"
                "        # Insert node into the list for the new frequency\n"
                "        if new_freq not in self.freq_to_list:\n"
                "            self.freq_to_list[new_freq] = DoublyLinkedList()\n"
                "        self.freq_to_list[new_freq].append(node)\n\n"
                "    def get(self, key: int) -> int:\n"
                "        if key not in self.key_to_node:\n"
                "            return -1\n"
                "        node = self.key_to_node[key]\n"
                "        self._update(node)\n"
                "        return node.val\n\n"
                "    def put(self, key: int, value: int) -> None:\n"
                "        if self.capacity == 0:\n"
                "            return\n"
                "        if key in self.key_to_node:\n"
                "            node = self.key_to_node[key]\n"
                "            node.val = value\n"
                "            self._update(node)\n"
                "        else:\n"
                "            # If cache is at full capacity, evict the LFU node\n"
                "            if self.size == self.capacity:\n"
                "                evict_list = self.freq_to_list[self.min_freq]\n"
                "                evict_node = evict_list.pop_head()\n"
                "                del self.key_to_node[evict_node.key]\n"
                "                self.size -= 1\n"
                "            # Create and insert new node\n"
                "            new_node = Node(key, value)\n"
                "            self.key_to_node[key] = new_node\n"
                "            if 1 not in self.freq_to_list:\n"
                "                self.freq_to_list[1] = DoublyLinkedList()\n"
                "            self.freq_to_list[1].append(new_node)\n"
                "            # Reset min_freq to 1\n"
                "            self.min_freq = 1\n"
                "            self.size += 1"
            ),
            "complexity": {
                "time": "O(1) for both get and put operations",
                "space": "O(C) where C is cache capacity"
            }
        }
    ],
    "trace": [
        {"line": 52, "desc": "Initialized LFUCache with capacity 2.", "vars": {"capacity": 2, "size": 0, "min_freq": 0}},
        {"line": 77, "desc": "put(1, 10) called.", "vars": {"key": 1, "value": 10}},
        {"line": 95, "desc": "Node(1) created, inserted into freq_to_list[1], min_freq set to 1.", "vars": {"size": 1, "min_freq": 1}},
        {"line": 77, "desc": "put(2, 20) called.", "vars": {"key": 2, "value": 20}},
        {"line": 95, "desc": "Node(2) created, inserted into freq_to_list[1].", "vars": {"size": 2, "min_freq": 1}},
        {"line": 68, "desc": "get(1) called.", "vars": {"key": 1}},
        {"line": 60, "desc": "Node(1) updated: freq incremented to 2, moved to freq_to_list[2].", "vars": {"min_freq": 1, "Node(1).freq": 2}},
        {"line": 77, "desc": "put(3, 30) called.", "vars": {"key": 3, "value": 30}},
        {"line": 89, "desc": "Cache is at capacity (2). Evict head of freq_to_list[min_freq=1] which is Node(2).", "vars": {"evicted_key": 2}},
        {"line": 95, "desc": "Node(3) created and inserted into freq_to_list[1], min_freq reset to 1.", "vars": {"size": 2, "min_freq": 1}}
    ]
}

# 13. Online Stock Span
questions_data["Online Stock Span"] = {
    "title": "Online Stock Span",
    "problemStatement": (
        "Design an algorithm that collects daily price quotes for some stock and returns the span "
        "of that stock's price for the current day. The span of the stock's price today is defined as the "
        "maximum number of consecutive days (starting from today and going backwards) for which the stock "
        "price was less than or equal to today's price. Implement StockSpanner class:\n"
        "- StockSpanner() Initializes the object.\n"
        "- int next(int price) Returns the span of the stock's price given that today's price is price."
    ),
    "examples": [
        {
            "input": "next(100); next(80); next(60); next(70); next(60); next(75); next(85);",
            "output": "[1, 1, 1, 2, 1, 4, 6]",
            "explanation": (
                "Spans are computed backward. For example, next(75) pops 60 (span 1) and 70 (span 2), "
                "adding up to 1 + 1 + 2 = 4 days."
            )
        }
    ],
    "constraints": [
        "1 <= price <= 10^5",
        "At most 10^4 calls will be made to next."
    ],
    "edgeCases": [
        "Stock prices are in strictly increasing order (span grows larger each day).",
        "Stock prices are in strictly decreasing order (span is always 1).",
        "All stock prices are identical."
    ],
    "followUps": [
        "Can we solve this using O(1) space if we are allowed to modify the input stream?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Store all incoming stock prices in a list. For each new price, count backwards until we encounter a price strictly greater than the current price.",
            "algorithm": (
                "1. Keep a list of all stock prices.\n"
                "2. In `next(price)`:\n"
                "   - Append `price` to `prices`.\n"
                "   - Scan the list backwards starting from the second last element.\n"
                "   - Count days as long as the price is <= current price.\n"
                "   - Return the count."
            ),
            "code": (
                "class StockSpannerBrute:\n"
                "    def __init__(self):\n"
                "        # List to store all daily stock prices\n"
                "        self.prices = []\n\n"
                "    def next(self, price: int) -> int:\n"
                "        # Append current price\n"
                "        self.prices.append(price)\n"
                "        span = 0\n"
                "        # Scan backwards\n"
                "        for i in range(len(self.prices) - 1, -1, -1):\n"
                "            if self.prices[i] <= price:\n"
                "                span += 1\n"
                "            else:\n"
                "                break\n"
                "        return span"
            ),
            "complexity": {
                "time": "O(N) per query, where N is the number of prices processed so far",
                "space": "O(N) to store prices"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use a Monotonic Stack. Store pairs of (price, span) on the stack. "
                "When a new price comes, pop elements from the stack that have prices less than or equal "
                "to the new price. Accumulate their spans into the current day's span. Push the new "
                "price and its total span onto the stack."
            ),
            "algorithm": (
                "1. Maintain a stack of tuples: (price, span).\n"
                "2. In `next(price)`:\n"
                "   - Set initial `span = 1`.\n"
                "   - While `stack` is not empty and `stack[-1][0] <= price`:\n"
                "     - Pop top element `(prev_price, prev_span)`.\n"
                "     - `span += prev_span`.\n"
                "   - Push `(price, span)` onto `stack`.\n"
                "   - Return `span`."
            ),
            "code": (
                "class StockSpanner:\n"
                "    def __init__(self):\n"
                "        # Initialize stack to store tuples of (price, span)\n"
                "        self.stack = []\n\n"
                "    def next(self, price: int) -> int:\n"
                "        # The current price always has a base span of 1\n"
                "        span = 1\n"
                "        # Keep popping elements whose price is less than or equal to current\n"
                "        while self.stack and self.stack[-1][0] <= price:\n"
                "            # Accumulate the spans of the popped elements\n"
                "            span += self.stack.pop()[1]\n"
                "        # Push the current price and its accumulated span onto stack\n"
                "        self.stack.append((price, span))\n"
                "        # Return the span for the current day\n"
                "        return span"
            ),
            "complexity": {
                "time": "O(1) amortized. Each price is pushed and popped at most once.",
                "space": "O(N) worst case for the stack"
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "StockSpanner initialized with empty stack.", "vars": {"stack": []}},
        {"line": 5, "desc": "next(100) called.", "vars": {"price": 100}},
        {"line": 7, "desc": "Initial span set to 1. Stack is empty.", "vars": {"span": 1}},
        {"line": 12, "desc": "Push (100, 1) to stack. Return 1.", "vars": {"stack": [(100, 1)]}},
        {"line": 5, "desc": "next(80) called.", "vars": {"price": 80}},
        {"line": 7, "desc": "Initial span is 1. Stack top has price 100 > 80.", "vars": {"span": 1}},
        {"line": 12, "desc": "Push (80, 1) to stack. Return 1.", "vars": {"stack": [(100, 1), (80, 1)]}},
        {"line": 5, "desc": "next(120) called.", "vars": {"price": 120}},
        {"line": 7, "desc": "Initial span is 1.", "vars": {"span": 1}},
        {"line": 9, "desc": "Pop (80, 1) from stack since 80 <= 120. Accumulate span.", "vars": {"span": 2, "stack": [(100, 1)]}},
        {"line": 9, "desc": "Pop (100, 1) from stack since 100 <= 120. Accumulate span.", "vars": {"span": 3, "stack": []}},
        {"line": 12, "desc": "Push (120, 3) to stack. Return 3.", "vars": {"stack": [(120, 3)]}}
    ]
}

# 14. Power Set
questions_data["Power Set"] = {
    "title": "Power Set",
    "problemStatement": (
        "Given an integer array nums of unique elements, return all possible subsets (the power set). "
        "The solution set must not contain duplicate subsets. Return the solution in any order."
    ),
    "examples": [
        {
            "input": "nums = [1,2,3]",
            "output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]",
            "explanation": "All possible subsets of [1,2,3] are generated."
        },
        {
            "input": "nums = [0]",
            "output": "[[],[0]]",
            "explanation": "The power set of [0] contains the empty set and [0] itself."
        }
    ],
    "constraints": [
        "1 <= nums.length <= 10",
        "-10 <= nums[i] <= 10",
        "All the numbers in nums are unique."
    ],
    "edgeCases": [
        "Array has length 1.",
        "Elements are negative numbers.",
        "Input contains 0."
    ],
    "followUps": [
        "How would you generate subsets if the array contains duplicate elements (Subsets II)?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Use bit manipulation. Since there are 2^N subsets, represent each subset using a binary number from 0 to 2^N - 1, where the i-th bit indicates whether nums[i] is in the subset.",
            "algorithm": (
                "1. Find length `n` of the array.\n"
                "2. Loop through `i` from 0 to `2^n - 1`.\n"
                "3. For each `i`, check all bits from 0 to n-1. If the j-th bit is set, add nums[j] to the current subset.\n"
                "4. Add the subset to result.\n"
                "5. Return result."
            ),
            "code": (
                "def subsetsBitManipulation(nums: list[int]) -> list[list[int]]:\n"
                "    n = len(nums)\n"
                "    result = []\n"
                "    # Total subsets = 2^n\n"
                "    total_subsets = 1 << n\n"
                "    for i in range(total_subsets):\n"
                "        subset = []\n"
                "        for j in range(n):\n"
                "            # If the j-th bit is set, include nums[j]\n"
                "            if (i >> j) & 1:\n"
                "                subset.append(nums[j])\n"
                "        result.append(subset)\n"
                "    return result"
            ),
            "complexity": {
                "time": "O(N * 2^N)",
                "space": "O(N * 2^N) to store all subsets"
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use Backtracking to build subsets recursively. For each element, we decide to either include it or exclude it.",
            "algorithm": (
                "1. Define backtracking function `backtrack(start, current_subset)`.\n"
                "2. Append a copy of `current_subset` to the results list.\n"
                "3. Loop through elements from index `start` to `len(nums) - 1`:\n"
                "   - Add `nums[i]` to `current_subset`.\n"
                "   - Recurse `backtrack(i + 1, current_subset)`.\n"
                "   - Remove `nums[i]` from `current_subset` (backtrack).\n"
                "4. Start backtracking from index 0 with an empty subset.\n"
                "5. Return results list."
            ),
            "code": (
                "def subsets(nums: list[int]) -> list[list[int]]:\n"
                "    # List to store all subsets\n"
                "    result = []\n"
                "    def backtrack(start: int, current_subset: list[int]):\n"
                "        # Append a copy of current subset to results\n"
                "        result.append(list(current_subset))\n"
                "        # Iterate over candidates starting from index 'start'\n"
                "        for i in range(start, len(nums)):\n"
                "            # Include nums[i] in the current subset\n"
                "            current_subset.append(nums[i])\n"
                "            # Recurse to generate subsets using next indices\n"
                "            backtrack(i + 1, current_subset)\n"
                "            # Backtrack by removing nums[i]\n"
                "            current_subset.pop()\n"
                "    # Start backtracking from index 0 with empty subset\n"
                "    backtrack(0, [])\n"
                "    # Return the complete list of subsets\n"
                "    return result"
            ),
            "complexity": {
                "time": "O(N * 2^N)",
                "space": "O(N) recursion stack space"
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Initialized result list.", "vars": {"result": []}},
        {"line": 15, "desc": "Start backtrack with index 0 and empty subset.", "vars": {"start": 0, "current_subset": []}},
        {"line": 5, "desc": "Add empty subset to result.", "vars": {"result": [[]]}},
        {"line": 7, "desc": "Loop i=0: Include nums[0] (1).", "vars": {"i": 0, "current_subset": [1]}},
        {"line": 11, "desc": "Recurse backtrack with start=1.", "vars": {"start": 1}},
        {"line": 5, "desc": "Add [1] to result.", "vars": {"result": [[], [1]]}},
        {"line": 7, "desc": "Loop i=1: Include nums[1] (2).", "vars": {"i": 1, "current_subset": [1, 2]}},
        {"line": 11, "desc": "Recurse backtrack with start=2.", "vars": {"start": 2}},
        {"line": 5, "desc": "Add [1, 2] to result.", "vars": {"result": [[], [1], [1, 2]]}},
        {"line": 13, "desc": "Backtrack: pop 2 from subset.", "vars": {"current_subset": [1]}},
        {"line": 13, "desc": "Backtrack: pop 1 from subset.", "vars": {"current_subset": []}},
        {"line": 17, "desc": "Finished all branches. Return results.", "vars": {"result_len": 8}}
    ]
}

# 15. Maximum XOR Subarray
questions_data["Maximum XOR Subarray"] = {
    "title": "Maximum XOR Subarray",
    "problemStatement": (
        "Given an array of integers arr[], find the maximum XOR subarray value."
    ),
    "examples": [
        {
            "input": "arr = [1, 2, 3, 4]",
            "output": "7",
            "explanation": "Subarray [3, 4] gives 3 ^ 4 = 7, which is the maximum XOR possible."
        },
        {
            "input": "arr = [8, 1, 2, 12]",
            "output": "15",
            "explanation": "Subarray [1, 2, 12] gives 1 ^ 2 ^ 12 = 15."
        }
    ],
    "constraints": [
        "1 <= arr.length <= 10^5",
        "0 <= arr[i] <= 10^6"
    ],
    "edgeCases": [
        "Array has length 1 (maximum XOR is the element itself).",
        "All elements are 0.",
        "Elements are power of 2 values."
    ],
    "followUps": [
        "Can you return the start and end indices of the subarray that yields the maximum XOR?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Compute the XOR sum of all possible subarrays and keep track of the maximum value.",
            "algorithm": (
                "1. Run nested loops to find all subarrays starting at index `i` and ending at index `j`.\n"
                "2. Maintain running XOR for each starting index.\n"
                "3. Update `max_xor` with the running XOR value.\n"
                "4. Return `max_xor`."
            ),
            "code": (
                "def maxSubarrayXORBrute(arr: list[int]) -> int:\n"
                "    max_xor = 0\n"
                "    n = len(arr)\n"
                "    # Check all possible subarrays\n"
                "    for i in range(n):\n"
                "        curr_xor = 0\n"
                "        for j in range(i, n):\n"
                "            curr_xor ^= arr[j]\n"
                "            max_xor = max(max_xor, curr_xor)\n"
                "    return max_xor"
            ),
            "complexity": {
                "time": "O(N^2)",
                "space": "O(1)"
            }
        },
        {
            "name": "Optimal",
            "intuition": (
                "Use the prefix XOR property. Subarray XOR sum from i to j can be computed as "
                "prefixXOR[j] ^ prefixXOR[i-1]. Thus, maximizing subarray XOR is equivalent to finding two prefix XORs "
                "with maximum bitwise XOR. We can insert prefix XORs into a Binary Trie and query the max XOR for each prefix."
            ),
            "algorithm": (
                "1. Initialize a Binary Trie.\n"
                "2. Insert 0 into the Trie (to handle subarrays starting at index 0).\n"
                "3. Maintain a running `curr_xor = 0`.\n"
                "4. For each element `num` in the array:\n"
                "   - `curr_xor ^= num`.\n"
                "   - Insert `curr_xor` into the Trie.\n"
                "   - Query the Trie with `curr_xor` to find the maximum XOR with any existing prefix XOR.\n"
                "   - Update `max_res`.\n"
                "5. Return `max_res`."
            ),
            "code": (
                "class TrieNode:\n"
                "    def __init__(self):\n"
                "        # Binary Trie pointers for 0 and 1\n"
                "        self.children = [None, None]\n\n"
                "class BinaryTrie:\n"
                "    def __init__(self):\n"
                "        self.root = TrieNode()\n\n"
                "    def insert(self, num: int) -> None:\n"
                "        curr = self.root\n"
                "        # Insert 31-bit representation\n"
                "        for i in range(30, -1, -1):\n"
                "            bit = (num >> i) & 1\n"
                "            if not curr.children[bit]:\n"
                "                curr.children[bit] = TrieNode()\n"
                "            curr = curr.children[bit]\n\n"
                "    def getMaxXor(self, num: int) -> int:\n"
                "        curr = self.root\n"
                "        max_xor = 0\n"
                "        # Traverse searching for opposite bits\n"
                "        for i in range(30, -1, -1):\n"
                "            bit = (num >> i) & 1\n"
                "            target_bit = 1 - bit\n"
                "            if curr.children[target_bit]:\n"
                "                max_xor |= (1 << i)\n"
                "                curr = curr.children[target_bit]\n"
                "            else:\n"
                "                curr = curr.children[bit]\n"
                "        return max_xor\n\n"
                "def maxSubarrayXOR(arr: list[int]) -> int:\n"
                "    trie = BinaryTrie()\n"
                "    # Insert prefix XOR of 0 to handle subarrays starting at index 0\n"
                "    trie.insert(0)\n"
                "    max_res = 0\n"
                "    curr_xor = 0\n"
                "    # Process each element in the array\n"
                "    for num in arr:\n"
                "        # Calculate cumulative prefix XOR\n"
                "        curr_xor ^= num\n"
                "        # Insert the cumulative XOR into the trie\n"
                "        trie.insert(curr_xor)\n"
                "        # Find maximum XOR of current prefix XOR with any previous prefix XOR\n"
                "        max_res = max(max_res, trie.getMaxXor(curr_xor))\n"
                "    # Return the maximum XOR subarray value found\n"
                "    return max_res"
            ),
            "complexity": {
                "time": "O(N * 30) = O(N)",
                "space": "O(N * 30) = O(N) space for Trie nodes"
            }
        }
    ],
    "trace": [
        {"line": 35, "desc": "Initialized Trie.", "vars": {"max_res": 0, "curr_xor": 0}},
        {"line": 37, "desc": "Inserted base prefix XOR 0.", "vars": {}},
        {"line": 41, "desc": "Iterate arr = [1, 2, 3]. Process num = 1.", "vars": {"num": 1}},
        {"line": 43, "desc": "Update curr_xor = 0 ^ 1 = 1.", "vars": {"curr_xor": 1}},
        {"line": 45, "desc": "Insert 1 into Trie.", "vars": {}},
        {"line": 47, "desc": "Query Trie for max XOR of 1. Match with 0. max_res = 1.", "vars": {"max_res": 1}},
        {"line": 41, "desc": "Process num = 2.", "vars": {"num": 2}},
        {"line": 43, "desc": "Update curr_xor = 1 ^ 2 = 3.", "vars": {"curr_xor": 3}},
        {"line": 45, "desc": "Insert 3 into Trie.", "vars": {}},
        {"line": 47, "desc": "Query Trie for max XOR of 3. Match with 0. max_res = max(1, 3) = 3.", "vars": {"max_res": 3}},
        {"line": 41, "desc": "Process num = 3.", "vars": {"num": 3}},
        {"line": 43, "desc": "Update curr_xor = 3 ^ 3 = 0.", "vars": {"curr_xor": 0}},
        {"line": 47, "desc": "Query Trie for max XOR of 0. Match with 3. max_res = max(3, 3) = 3.", "vars": {"max_res": 3}},
        {"line": 49, "desc": "Finished processing array. Return maximum XOR.", "vars": {"max_res": 3}}
    ]
}

# Write output to the destination file
output_path = "/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_10.json"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "w") as f:
    json.dump(questions_data, f, indent=2)

print("SUCCESSFULLY WRITTEN JSON TO", output_path)
