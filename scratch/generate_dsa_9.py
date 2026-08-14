import json
import os

# Define True, False, None to ease JSON-like structure definition if needed,
# though we can write standard Python dicts directly.
null = None
true = True
false = False

data = {}

# 1. Coin Change II
data["Coin Change II"] = {
    "solution": {
        "problemStatement": "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the number of combinations that make up that amount. If that amount of money cannot be made up by any combination of the coins, return 0. You may assume that you have an infinite number of each kind of coin.",
        "examples": [
            {
                "input": "amount = 5, coins = [1, 2, 5]",
                "output": "4",
                "explanation": "There are four ways to make up the amount:\n5=5\n5=2+2+1\n5=2+1+1+1\n5=1+1+1+1+1"
            },
            {
                "input": "amount = 3, coins = [2]",
                "output": "0",
                "explanation": "The amount of 3 cannot be made up just with coins of 2."
            }
        ],
        "constraints": [
            "1 <= coins.length <= 300",
            "1 <= coins[i] <= 5000",
            "All the values of coins are unique.",
            "0 <= amount <= 5000"
        ],
        "edgeCases": [
            "amount = 0: there is 1 way (empty combination)",
            "No coins available: 0 ways (handled by constraints)",
            "No combination is possible: return 0"
        ],
        "followUps": [
            "Can you optimize the space complexity to O(amount)?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Try all possible combinations of coins to sum up to the target amount. For each coin, we can either choose to include it and stay at the same index (since we have infinite coins) or exclude it and move to the next coin index.",
                "algorithm": "1. Define a recursive helper function solve(index, current_amount).\n2. If current_amount is 0, return 1 (found a valid combination).\n3. If current_amount < 0 or index >= len(coins), return 0 (invalid state).\n4. Try two choices: pick the coin (solve(index, current_amount - coins[index])) and skip the coin (solve(index + 1, current_amount)).\n5. Return the sum of both choices.",
                "code": "def change(amount: int, coins: list[int]) -> int:\n    # Define helper function for recursion\n    def helper(idx, rem):\n        # Base Case: if remainder is 0, we found a valid combination\n        if rem == 0:\n            return 1\n        # Base Case: if remainder is negative or no coins left, invalid\n        if rem < 0 or idx == len(coins):\n            return 0\n        # Choice 1: Take current coin and stay at the same index\n        take = helper(idx, rem - coins[idx])\n        # Choice 2: Skip current coin and move to next index\n        skip = helper(idx + 1, rem)\n        # Sum up both decisions\n        return take + skip\n    # Call helper starting at coin index 0 and full amount\n    return helper(0, amount)",
                "complexity": {
                    "time": "O(2^(N + amount))",
                    "space": "O(N + amount)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Using dynamic programming, we can compute the number of combinations iteratively. Let dp[i] be the number of combinations to make change for amount i. For each coin, we update the dp array from coins[idx] up to amount, accumulating the number of ways.",
                "algorithm": "1. Initialize a DP array dp of size amount + 1 with 0s, and set dp[0] = 1.\n2. Iterate through each coin in coins.\n3. For each coin, iterate through all amounts from coin to amount.\n4. Update dp[i] += dp[i - coin].\n5. Return dp[amount].",
                "code": "def change(amount: int, coins: list[int]) -> int:\n    # Initialize dp table with zeros of size amount + 1\n    dp = [0] * (amount + 1)\n    # Base case: 1 way to make amount 0 (using no coins)\n    dp[0] = 1\n    # Loop through each coin denomination\n    for coin in coins:\n        # Update dp array for all amounts greater than or equal to current coin\n        for i in range(coin, amount + 1):\n            # Add combinations using the current coin\n            dp[i] += dp[i - coin]\n    # Return the total ways to make the target amount\n    return dp[amount]",
                "complexity": {
                    "time": "O(N * amount)",
                    "space": "O(amount)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize DP table of size amount + 1 (amount=3). Set dp[0] = 1.",
            "vars": {"amount": 3, "coins": "[1, 2]", "dp": "[1, 0, 0, 0]"}
        },
        {
            "line": 6,
            "desc": "Process coin = 1. We iterate i from 1 to 3.",
            "vars": {"coin": 1}
        },
        {
            "line": 10,
            "desc": "Update dp for coin = 1. After loop, dp counts ways using only coin 1.",
            "vars": {"dp": "[1, 1, 1, 1]"}
        },
        {
            "line": 6,
            "desc": "Process coin = 2. We iterate i from 2 to 3.",
            "vars": {"coin": 2}
        },
        {
            "line": 10,
            "desc": "Update dp for i = 2: dp[2] += dp[0] => 1 + 1 = 2.",
            "vars": {"i": 2, "dp": "[1, 1, 2, 1]"}
        },
        {
            "line": 10,
            "desc": "Update dp for i = 3: dp[3] += dp[1] => 1 + 1 = 2.",
            "vars": {"i": 3, "dp": "[1, 1, 2, 2]"}
        },
        {
            "line": 12,
            "desc": "Return dp[amount] which is dp[3].",
            "vars": {"result": 2}
        }
    ]
}

# 2. 0/1 Knapsack
data["0/1 Knapsack"] = {
    "solution": {
        "problemStatement": "You are given weights and values of N items, put these items in a knapsack of capacity W to get the maximum total value in the knapsack. Note that we have only one quantity of each item. In other words, given two integer arrays val[0..N-1] and wt[0..N-1] which represent values and weights associated with N items respectively. Also given an integer W which represents knapsack capacity, find out the maximum value subset of val[] such that sum of the weights of this subset is smaller than or equal to W.",
        "examples": [
            {
                "input": "values = [60, 100, 120], weights = [10, 20, 30], W = 50",
                "output": "220",
                "explanation": "The maximum value is obtained by choosing items with weights 20 and 30."
            }
        ],
        "constraints": [
            "1 <= N <= 1000",
            "1 <= W <= 1000",
            "1 <= weights[i], values[i] <= 1000"
        ],
        "edgeCases": [
            "W = 0: maximum value is 0",
            "All items heavier than W: maximum value is 0",
            "Total weight of all items is <= W: select all items"
        ],
        "followUps": [
            "Can you optimize the space complexity to O(W) using a single 1D array?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "For each item, we have two choices: either include it in the knapsack (if its weight is less than or equal to the remaining capacity) or exclude it. We recursively try both and return the maximum value.",
                "algorithm": "1. Define helper(idx, W).\n2. If idx == N or W == 0, return 0.\n3. If weight of current item > W, we must skip it: helper(idx + 1, W).\n4. Otherwise, return max of picking item (values[idx] + helper(idx + 1, W - weights[idx])) or skipping item (helper(idx + 1, W)).",
                "code": "def knapsack(W: int, wt: list[int], val: list[int]) -> int:\n    n = len(wt)\n    # Define recursive helper function\n    def helper(idx, rem_w):\n        # Base Case: no items left or knapsack is full\n        if idx == n or rem_w == 0:\n            # Return 0 value\n            return 0\n        # If weight of current item exceeds remaining capacity, skip it\n        if wt[idx] > rem_w:\n            return helper(idx + 1, rem_w)\n        # Case 1: Pick the current item\n        take = val[idx] + helper(idx + 1, rem_w - wt[idx])\n        # Case 2: Skip the current item\n        skip = helper(idx + 1, rem_w)\n        # Return the maximum of both choices\n        return max(take, skip)\n    # Start search from index 0\n    return helper(0, W)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use Dynamic Programming to build a 2D table or optimize it to a 1D table where dp[w] stores the maximum value for a knapsack capacity w. By iterating items one by one and updating dp from right to left (W down to weight), we ensure each item is used at most once.",
                "algorithm": "1. Initialize dp array of size W + 1 with 0s.\n2. Iterate through each item index from 0 to N-1.\n3. For each item, iterate w from W down to wt[i].\n4. Update dp[w] = max(dp[w], val[i] + dp[w - wt[i]]).\n5. Return dp[W].",
                "code": "def knapsack(W: int, wt: list[int], val: list[int]) -> int:\n    n = len(wt)\n    # dp[w] will store the maximum value for capacity w\n    dp = [0] * (W + 1)\n    # Iterate through all given items\n    for i in range(n):\n        # Iterate backwards from capacity W down to current item's weight\n        for w in range(W, wt[i] - 1, -1):\n            # Update capacity w with max of picking or skipping item i\n            dp[w] = max(dp[w], val[i] + dp[w - wt[i]])\n    # Return the maximum value for full capacity W\n    return dp[W]",
                "complexity": {
                    "time": "O(N * W)",
                    "space": "O(W)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 4,
            "desc": "Initialize DP table of size W + 1 (W = 30) with all zeros.",
            "vars": {"W": 30, "dp": "[0, 0, ..., 0] (length 31)"}
        },
        {
            "line": 6,
            "desc": "Process item 0 with weight 10 and value 60. Iterate w backwards from 30 down to 10.",
            "vars": {"i": 0, "weight": 10, "value": 60}
        },
        {
            "line": 10,
            "desc": "Update dp values for capacities >= 10. dp[10..30] becomes 60.",
            "vars": {"dp[10]": 60, "dp[30]": 60}
        },
        {
            "line": 6,
            "desc": "Process item 1 with weight 20 and value 100. Iterate w backwards from 30 down to 20.",
            "vars": {"i": 1, "weight": 20, "value": 100}
        },
        {
            "line": 10,
            "desc": "Update dp[30] = max(dp[30], 100 + dp[10]) = max(60, 160) = 160.",
            "vars": {"dp[30]": 160, "dp[20]": 100}
        },
        {
            "line": 12,
            "desc": "Return dp[W] which is dp[30] = 160.",
            "vars": {"result": 160}
        }
    ]
}

# 3. Unbounded Knapsack
data["Unbounded Knapsack"] = {
    "solution": {
        "problemStatement": "Given a set of N items, each with a weight and a value, represented by the arrays wt[] and val[] respectively. Also, a knapsack with weight limit W. Find the maximum value that can be put into the knapsack. You are allowed to use an item multiple times (unbounded times).",
        "examples": [
            {
                "input": "values = [10, 40, 50, 70], weights = [1, 3, 4, 5], W = 8",
                "output": "110",
                "explanation": "Choose item 1 (value 40, weight 3) twice and item 3 (value 70, weight 5) once. Total value = 40+40+70 = 150? Wait: weights 3+3+5 = 11 > 8. Correct choice: Choose item 1 (weight 3, val 40) once and item 3 (weight 5, val 70) once. Total weight = 8, value = 110."
            }
        ],
        "constraints": [
            "1 <= N, W <= 1000",
            "1 <= weights[i], values[i] <= 1000"
        ],
        "edgeCases": [
            "W = 0: max value is 0",
            "No item weighs <= W: max value is 0"
        ],
        "followUps": [
            "Can you implement this with time complexity O(N*W) and space complexity O(W)?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "For each item, we can take it as many times as we want as long as the capacity allows. We can iterate over all items and make recursive calls with reduced capacity.",
                "algorithm": "1. Define helper(rem_w).\n2. If rem_w is 0, return 0.\n3. Initialize max_val = 0.\n4. Loop through all items: if wt[i] <= rem_w, max_val = max(max_val, val[i] + helper(rem_w - wt[i])).\n5. Return max_val.",
                "code": "def unboundedKnapsack(W: int, wt: list[int], val: list[int]) -> int:\n    n = len(wt)\n    # Recursive helper function\n    def helper(rem_w):\n        # Base Case: if remaining weight is 0 or less, value is 0\n        if rem_w <= 0:\n            return 0\n        max_val = 0\n        # Check every item for inclusion\n        for i in range(n):\n            # If item weight fits in remaining capacity\n            if wt[i] <= rem_w:\n                # Update max_val by including this item\n                max_val = max(max_val, val[i] + helper(rem_w - wt[i]))\n        # Return maximum value possible with capacity rem_w\n        return max_val\n    # Call helper with full capacity\n    return helper(W)",
                "complexity": {
                    "time": "O(N^W)",
                    "space": "O(W)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use a 1D DP table where dp[w] is the maximum value we can get with capacity w. Since items are unbounded, we can iterate capacity from 0 to W, and for each capacity check all items, update dp[w] using previously calculated values.",
                "algorithm": "1. Initialize dp array of size W + 1 with 0s.\n2. Iterate capacity w from 1 to W.\n3. For each w, iterate through all N items.\n4. If wt[i] <= w, update dp[w] = max(dp[w], dp[w - wt[i]] + val[i]).\n5. Return dp[W].",
                "code": "def unboundedKnapsack(W: int, wt: list[int], val: list[int]) -> int:\n    n = len(wt)\n    # Initialize dp array of size W + 1 with 0s\n    dp = [0] * (W + 1)\n    # Compute max value for every capacity from 1 to W\n    for w in range(1, W + 1):\n        # Check each item to see if it can fit in current capacity w\n        for i in range(n):\n            if wt[i] <= w:\n                # Update DP table with the best value\n                dp[w] = max(dp[w], dp[w - wt[i]] + val[i])\n    # Return the maximum value for capacity W\n    return dp[W]",
                "complexity": {
                    "time": "O(N * W)",
                    "space": "O(W)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 4,
            "desc": "Initialize DP table of size W + 1 (W = 3) with zeros.",
            "vars": {"W": 3, "dp": "[0, 0, 0, 0]"}
        },
        {
            "line": 6,
            "desc": "Iterate capacity w = 1. Check item 0 (wt=1, val=10).",
            "vars": {"w": 1, "i": 0, "wt[i]": 1, "val[i]": 10}
        },
        {
            "line": 10,
            "desc": "Update dp[1] = max(dp[1], dp[0] + 10) = 10.",
            "vars": {"dp": "[0, 10, 0, 0]"}
        },
        {
            "line": 6,
            "desc": "Iterate capacity w = 2. Update dp[2] using item 0 (wt=1, val=10). dp[2] = dp[1] + 10 = 20.",
            "vars": {"w": 2, "dp": "[0, 10, 20, 0]"}
        },
        {
            "line": 6,
            "desc": "Iterate capacity w = 3. Update dp[3] using item 0. dp[3] = dp[2] + 10 = 30.",
            "vars": {"w": 3, "dp": "[0, 10, 20, 30]"}
        },
        {
            "line": 12,
            "desc": "Loop finished. Return dp[W] = dp[3] = 30.",
            "vars": {"result": 30}
        }
    ]
}

# 4. Rod Cutting Problem
data["Rod Cutting Problem"] = {
    "solution": {
        "problemStatement": "Given a rod of length N inches and an array of prices, price[] that contains prices of all pieces of size smaller than N. Determine the maximum value obtainable by cutting up the rod and selling the pieces.",
        "examples": [
            {
                "input": "price = [1, 5, 8, 9, 10, 17, 17, 20], N = 8",
                "output": "22",
                "explanation": "The maximum value is obtained by cutting the rod into two pieces of lengths 2 and 6, price is 5 + 17 = 22."
            }
        ],
        "constraints": [
            "1 <= N <= 1000",
            "1 <= price[i] <= 10^5"
        ],
        "edgeCases": [
            "N = 1: return price[0]",
            "Single cut gives max value vs multiple cuts"
        ],
        "followUps": [
            "How does this relate to the Unbounded Knapsack problem?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "For a rod of length N, try making a cut at all possible lengths i (from 1 to N), add the price of that piece, and recursively find the maximum value for the remaining length N - i.",
                "algorithm": "1. Define helper(n).\n2. If n == 0, return 0.\n3. Initialize max_val = 0.\n4. Loop i from 1 to n: max_val = max(max_val, price[i-1] + helper(n - i)).\n5. Return max_val.",
                "code": "def cutRod(price: list[int], n: int) -> int:\n    # Helper recursive function\n    def helper(rem_len):\n        # Base Case: if remaining length is 0, no price\n        if rem_len == 0:\n            return 0\n        max_val = 0\n        # Try cutting at every possible length from 1 to rem_len\n        for i in range(1, rem_len + 1):\n            # Update max_val with best cut\n            max_val = max(max_val, price[i - 1] + helper(rem_len - i))\n        return max_val\n    # Call helper with initial length n\n    return helper(n)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use DP to solve bottom-up. dp[i] will store the maximum value obtainable for a rod of length i. We can build it up from length 1 to N.",
                "algorithm": "1. Initialize dp array of size N + 1 with 0s.\n2. Iterate length i from 1 to N.\n3. For each i, find max price by trying all possible first cuts of size j (from 1 to i).\n4. dp[i] = max(price[j-1] + dp[i-j]) for all j.\n5. Return dp[N].",
                "code": "def cutRod(price: list[int], n: int) -> int:\n    # Initialize dp table with size n + 1\n    dp = [0] * (n + 1)\n    # Build DP values for each length up to n\n    for i in range(1, n + 1):\n        max_val = -1\n        # Look at every cut length j from 1 to i\n        for j in range(1, i + 1):\n            # Keep track of the maximum obtainable value\n            max_val = max(max_val, price[j - 1] + dp[i - j])\n        # Store the maximum value for length i\n        dp[i] = max_val\n    # Return the maximum value for length n\n    return dp[n]",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize DP table of size 4 with 0s.",
            "vars": {"n": 3, "price": "[1, 5, 8]", "dp": "[0, 0, 0, 0]"}
        },
        {
            "line": 5,
            "desc": "Outer loop i = 1 (rod of length 1). Inner loop j = 1.",
            "vars": {"i": 1, "j": 1}
        },
        {
            "line": 10,
            "desc": "dp[1] = max(-1, price[0] + dp[0]) = 1.",
            "vars": {"dp": "[0, 1, 0, 0]"}
        },
        {
            "line": 5,
            "desc": "Outer loop i = 2. Inner loop j = 1, 2.",
            "vars": {"i": 2}
        },
        {
            "line": 10,
            "desc": "dp[2] = max(price[0] + dp[1], price[1] + dp[0]) = max(1+1, 5+0) = 5.",
            "vars": {"dp": "[0, 1, 5, 0]"}
        },
        {
            "line": 5,
            "desc": "Outer loop i = 3. Inner loop j = 1, 2, 3.",
            "vars": {"i": 3}
        },
        {
            "line": 10,
            "desc": "dp[3] = max(price[0]+dp[2], price[1]+dp[1], price[2]+dp[0]) = max(1+5, 5+1, 8+0) = 8.",
            "vars": {"dp": "[0, 1, 5, 8]"}
        },
        {
            "line": 12,
            "desc": "Loop completed. Return dp[3] = 8.",
            "vars": {"result": 8}
        }
    ]
}

# 5. Longest Common Subsequence
data["Longest Common Subsequence"] = {
    "solution": {
        "problemStatement": "Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0. A subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.",
        "examples": [
            {
                "input": "text1 = \"abcde\", text2 = \"ace\"",
                "output": "3",
                "explanation": "The longest common subsequence is \"ace\" and its length is 3."
            }
        ],
        "constraints": [
            "1 <= text1.length, text2.length <= 1000",
            "text1 and text2 consist of only lowercase English characters."
        ],
        "edgeCases": [
            "No characters match: return 0",
            "Identical strings: return length of strings",
            "Single character strings"
        ],
        "followUps": [
            "Can you print the actual longest common subsequence, not just its length?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Compare characters from both strings using two pointers. If characters match, add 1 to the LCS and move both pointers. Otherwise, try moving either pointer and choose the option that yields the longer subsequence.",
                "algorithm": "1. Define helper(i, j) where i and j are pointers in text1 and text2.\n2. If i == len(text1) or j == len(text2), return 0.\n3. If text1[i] == text2[j], return 1 + helper(i+1, j+1).\n4. Else, return max(helper(i+1, j), helper(i, j+1)).",
                "code": "def longestCommonSubsequence(text1: str, text2: str) -> int:\n    # Recursive helper with indices i and j\n    def helper(i, j):\n        # Base Case: if we reach end of either string, length is 0\n        if i == len(text1) or j == len(text2):\n            return 0\n        # If characters match, increment length and move both pointers\n        if text1[i] == text2[j]:\n            return 1 + helper(i + 1, j + 1)\n        # Else, try moving each pointer and take the max\n        return max(helper(i + 1, j), helper(i, j + 1))\n    # Start recursion at (0, 0)\n    return helper(0, 0)",
                "complexity": {
                    "time": "O(2^(M + N))",
                    "space": "O(M + N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use a 2D table dp where dp[i][j] represents the LCS length of text1[i:] and text2[j:]. By traversing from the end to the start, we avoid redundant calculations.",
                "algorithm": "1. Let m = len(text1), n = len(text2).\n2. Initialize dp array of size (m+1) x (n+1) with 0.\n3. Loop i from m-1 down to 0, and j from n-1 down to 0.\n4. If text1[i] == text2[j], dp[i][j] = 1 + dp[i+1][j+1].\n5. Else, dp[i][j] = max(dp[i+1][j], dp[i][j+1]).\n6. Return dp[0][0].",
                "code": "def longestCommonSubsequence(text1: str, text2: str) -> int:\n    m, n = len(text1), len(text2)\n    # Create a 2D table of size (m+1) x (n+1) initialized with 0\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    # Iterate backwards through both strings\n    for i in range(m - 1, -1, -1):\n        for j in range(n - 1, -1, -1):\n            # If characters match, take diagonal value and add 1\n            if text1[i] == text2[j]:\n                dp[i][j] = 1 + dp[i + 1][j + 1]\n            else:\n                # Else, take maximum of moving right or down in the table\n                dp[i][j] = max(dp[i + 1][j], dp[i][j + 1])\n    # Return top-left value containing the answer\n    return dp[0][0]",
                "complexity": {
                    "time": "O(M * N)",
                    "space": "O(M * N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize DP table of size (2+1)x(2+1) for 'ab' and 'ac'.",
            "vars": {"text1": "ab", "text2": "ac", "m": 2, "n": 2, "dp": "[[0,0,0],[0,0,0],[0,0,0]]"}
        },
        {
            "line": 6,
            "desc": "Process index i = 1 ('b'), j = 1 ('c'). Characters mismatch. dp[1][1] = max(dp[2][1], dp[1][2]) = 0.",
            "vars": {"i": 1, "j": 1, "text1[1]": "b", "text2[1]": "c"}
        },
        {
            "line": 6,
            "desc": "Process index i = 1 ('b'), j = 0 ('a'). Characters mismatch. dp[1][0] = 0.",
            "vars": {"i": 1, "j": 0}
        },
        {
            "line": 6,
            "desc": "Process index i = 0 ('a'), j = 1 ('c'). Characters mismatch. dp[0][1] = 0.",
            "vars": {"i": 0, "j": 1}
        },
        {
            "line": 6,
            "desc": "Process index i = 0 ('a'), j = 0 ('a'). Characters match! dp[0][0] = 1 + dp[1][1] = 1.",
            "vars": {"i": 0, "j": 0, "dp[0][0]": 1}
        },
        {
            "line": 13,
            "desc": "Return dp[0][0] which is 1.",
            "vars": {"result": 1}
        }
    ]
}

# 6. Longest Common Substring
data["Longest Common Substring"] = {
    "solution": {
        "problemStatement": "Given two strings S1 and S2, find the length of the longest common substring between them. A substring is a contiguous sequence of characters within a string.",
        "examples": [
            {
                "input": "S1 = \"ABCDGH\", S2 = \"ACDGHR\"",
                "output": "4",
                "explanation": "The longest common substring is \"CDGH\" of length 4."
            }
        ],
        "constraints": [
            "1 <= S1.length, S2.length <= 1000",
            "Strings contain uppercase English letters."
        ],
        "edgeCases": [
            "No common substring: return 0",
            "Whole string matches: return len(S1)"
        ],
        "followUps": [
            "Can you reduce space complexity to O(min(M, N))?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all substrings of S1 and check if they exist in S2. Keep track of the longest one found.",
                "algorithm": "1. Initialize max_len = 0.\n2. Iterate through all starting positions i and ending positions j of S1.\n3. For each substring S1[i:j], check if S1[i:j] is in S2.\n4. If it is, update max_len with the maximum length.",
                "code": "def longestCommonSubstring(S1: str, S2: str) -> int:\n    n, m = len(S1), len(S2)\n    max_len = 0\n    # Generate all starting indices of S1\n    for i in range(n):\n        # Generate all ending indices of S1\n        for j in range(i + 1, n + 1):\n            substring = S1[i:j]\n            # Check if this substring exists in S2\n            if substring in S2:\n                # Update max_len if this substring is longer\n                max_len = max(max_len, len(substring))\n    return max_len",
                "complexity": {
                    "time": "O(N^3)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use a DP table dp[i][j] representing the length of the longest common suffix of substrings S1[0..i-1] and S2[0..j-1]. If S1[i-1] == S2[j-1], then we extend the common suffix: dp[i][j] = dp[i-1][j-1] + 1. Keep track of the maximum value in this table.",
                "algorithm": "1. Let n = len(S1), m = len(S2).\n2. Initialize dp table of size (n+1) x (m+1) with 0.\n3. Loop i from 1 to n, and j from 1 to m.\n4. If S1[i-1] == S2[j-1], then dp[i][j] = dp[i-1][j-1] + 1, and update max_len = max(max_len, dp[i][j]).\n5. Return max_len.",
                "code": "def longestCommonSubstring(S1: str, S2: str) -> int:\n    n, m = len(S1), len(S2)\n    # dp[i][j] stores longest common suffix length of S1[0..i-1] and S2[0..j-1]\n    dp = [[0] * (m + 1) for _ in range(n + 1)]\n    max_len = 0\n    # Loop through characters of S1\n    for i in range(1, n + 1):\n        # Loop through characters of S2\n        for j in range(1, m + 1):\n            # If characters at current positions match\n            if S1[i - 1] == S2[j - 1]:\n                # Extend the common substring length from previous diagonal\n                dp[i][j] = dp[i - 1][j - 1] + 1\n                # Update the maximum length found so far\n                max_len = max(max_len, dp[i][j])\n            else:\n                # If they do not match, common suffix length at this point becomes 0\n                dp[i][j] = 0\n    # Return the maximum common substring length\n    return max_len",
                "complexity": {
                    "time": "O(N * M)",
                    "space": "O(N * M)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize DP table of size (2+1)x(2+1) and max_len = 0 for S1='ab' and S2='cb'.",
            "vars": {"S1": "ab", "S2": "cb", "max_len": 0, "dp": "[[0,0,0],[0,0,0],[0,0,0]]"}
        },
        {
            "line": 7,
            "desc": "Loop i = 1 (character 'a'). j = 1 ('c'). 'a' != 'c', dp[1][1] = 0.",
            "vars": {"i": 1, "j": 1}
        },
        {
            "line": 7,
            "desc": "Loop i = 1 ('a'). j = 2 ('b'). 'a' != 'b', dp[1][2] = 0.",
            "vars": {"i": 1, "j": 2}
        },
        {
            "line": 7,
            "desc": "Loop i = 2 ('b'). j = 1 ('c'). 'b' != 'c', dp[2][1] = 0.",
            "vars": {"i": 2, "j": 1}
        },
        {
            "line": 7,
            "desc": "Loop i = 2 ('b'). j = 2 ('b'). Matches! dp[2][2] = dp[1][1] + 1 = 1. Update max_len = 1.",
            "vars": {"i": 2, "j": 2, "dp[2][2]": 1, "max_len": 1}
        },
        {
            "line": 19,
            "desc": "Return max_len which is 1.",
            "vars": {"result": 1}
        }
    ]
}

# 7. Longest Palindromic Subsequence
data["Longest Palindromic Subsequence"] = {
    "solution": {
        "problemStatement": "Given a string s, find the longest palindromic subsequence's length in s. A subsequence is a sequence that can be derived from another sequence by deleting some or no elements without changing the order of the remaining elements.",
        "examples": [
            {
                "input": "s = \"bbbab\"",
                "output": "4",
                "explanation": "One possible longest palindromic subsequence is \"bbbb\"."
            }
        ],
        "constraints": [
            "1 <= s.length <= 1000",
            "s consists of lowercase English letters."
        ],
        "edgeCases": [
            "Single character: return 1",
            "Already a palindrome: return len(s)",
            "All unique characters: return 1"
        ],
        "followUps": [
            "Can you solve this by finding the LCS between s and its reverse?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Check all characters from both ends. If the outer characters match, they form part of the palindrome. Otherwise, we recursively skip the left character or the right character.",
                "algorithm": "1. Define helper(i, j) where i and j are start and end pointers.\n2. If i > j, return 0. If i == j, return 1.\n3. If s[i] == s[j], return 2 + helper(i+1, j-1).\n4. Else, return max(helper(i+1, j), helper(i, j-1)).",
                "code": "def longestPalindromeSubseq(s: str) -> int:\n    # Recursive helper with left index i and right index j\n    def helper(i, j):\n        # Base Case: empty substring\n        if i > j:\n            return 0\n        # Base Case: single character substring is always a palindrome\n        if i == j:\n            return 1\n        # If boundary characters match, add 2 and move inwards\n        if s[i] == s[j]:\n            return 2 + helper(i + 1, j - 1)\n        # Otherwise, try skipping left character or right character\n        return max(helper(i + 1, j), helper(i, j - 1))\n    # Start search from the full string boundaries\n    return helper(0, len(s) - 1)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Let dp[i][j] be the length of the LPS in s[i..j]. We can fill this table starting from shorter substrings to longer ones. If s[i] == s[j], dp[i][j] = dp[i+1][j-1] + 2. Otherwise, dp[i][j] = max(dp[i+1][j], dp[i][j-1]).",
                "algorithm": "1. Let n = len(s).\n2. Initialize dp table of size n x n with 0s.\n3. Set dp[i][i] = 1 for all i.\n4. Loop substring length l from 2 to n.\n5. Loop start index i from 0 to n - l. Let j = i + l - 1.\n6. If s[i] == s[j], dp[i][j] = dp[i+1][j-1] + (2 if l > 2 else 1? No, 2 since l >= 2 and we check s[i]==s[j]. But wait: if l=2, j=i+1, dp[i+1][i] is 0, so dp[i+1][j-1] + 2 = 0 + 2 = 2, which is correct!).\n7. Else, dp[i][j] = max(dp[i+1][j], dp[i][j-1]).\n8. Return dp[0][n-1].",
                "code": "def longestPalindromeSubseq(s: str) -> int:\n    n = len(s)\n    # dp[i][j] will store the LPS length for substring s[i..j]\n    dp = [[0] * n for _ in range(n)]\n    # Every single character is a palindrome of length 1\n    for i in range(n):\n        dp[i][i] = 1\n    # Loop over substring lengths from 2 to n\n    for length in range(2, n + 1):\n        # Loop over all possible start indices\n        for i in range(n - length + 1):\n            j = i + length - 1\n            # If boundary characters match\n            if s[i] == s[j]:\n                # Value is 2 + inner substring's LPS\n                dp[i][j] = dp[i + 1][j - 1] + 2\n            else:\n                # Else, max of excluding left or excluding right\n                dp[i][j] = max(dp[i + 1][j], dp[i][j - 1])\n    # Return the answer for the full string\n    return dp[0][n - 1]",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(N^2)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize DP table of size 3x3 for s = 'aba'. Set dp[0][0]=dp[1][1]=dp[2][2]=1.",
            "vars": {"s": "aba", "n": 3, "dp": "[[1,0,0],[0,1,0],[0,0,1]]"}
        },
        {
            "line": 8,
            "desc": "Process length = 2. i = 0, j = 1 ('ab'). Mismatch. dp[0][1] = max(dp[1][1], dp[0][0]) = 1.",
            "vars": {"length": 2, "i": 0, "j": 1}
        },
        {
            "line": 8,
            "desc": "Process length = 2. i = 1, j = 2 ('ba'). Mismatch. dp[1][2] = max(dp[2][2], dp[1][1]) = 1.",
            "vars": {"length": 2, "i": 1, "j": 2}
        },
        {
            "line": 8,
            "desc": "Process length = 3. i = 0, j = 2 ('aba'). Match! dp[0][2] = dp[1][1] + 2 = 1 + 2 = 3.",
            "vars": {"length": 3, "i": 0, "j": 2, "dp[0][2]": 3}
        },
        {
            "line": 21,
            "desc": "Return dp[0][2] which is 3.",
            "vars": {"result": 3}
        }
    ]
}

# 8. Edit Distance
data["Edit Distance"] = {
    "solution": {
        "problemStatement": "Given two strings word1 and word2, return the minimum number of operations required to convert word1 to word2. You have the following three operations permitted on a word:\n1. Insert a character\n2. Delete a character\n3. Replace a character",
        "examples": [
            {
                "input": "word1 = \"horse\", word2 = \"ros\"",
                "output": "3",
                "explanation": "horse -> rorse (replace 'h' with 'r')\nrorse -> rose (remove 'r')\nrose -> ros (remove 'e')"
            }
        ],
        "constraints": [
            "0 <= word1.length, word2.length <= 500",
            "word1 and word2 consist of lowercase English letters."
        ],
        "edgeCases": [
            "One string is empty: return the length of the other string",
            "Identical strings: return 0"
        ],
        "followUps": [
            "Can you optimize the space complexity to O(min(M, N))?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Compare characters from the end. If they match, move backward for both. Otherwise, recursively compute the cost of insertion, deletion, and replacement, and pick the minimum cost plus 1.",
                "algorithm": "1. Define helper(i, j) where i and j are indices in word1 and word2.\n2. If i == 0, return j (need to insert all remaining characters of word2).\n3. If j == 0, return i (need to delete all remaining characters of word1).\n4. If word1[i-1] == word2[j-1], return helper(i-1, j-1).\n5. Else, return 1 + min(helper(i, j-1) [insert], helper(i-1, j) [delete], helper(i-1, j-1) [replace]).",
                "code": "def minDistance(word1: str, word2: str) -> int:\n    # Recursive helper with lengths i and j\n    def helper(i, j):\n        # If word1 is exhausted, we need to insert all word2 chars\n        if i == 0:\n            return j\n        # If word2 is exhausted, we need to delete all word1 chars\n        if j == 0:\n            return i\n        # If characters match, no operation needed\n        if word1[i - 1] == word2[j - 1]:\n            return helper(i - 1, j - 1)\n        # Else try insert, delete, replace and take min\n        return 1 + min(\n            helper(i, j - 1),    # Insert\n            helper(i - 1, j),    # Delete\n            helper(i - 1, j - 1) # Replace\n        )\n    return helper(len(word1), len(word2))",
                "complexity": {
                    "time": "O(3^(M+N))",
                    "space": "O(M+N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use a 2D DP table dp of size (M+1) x (N+1) where dp[i][j] is the edit distance between word1[0..i-1] and word2[0..j-1]. Fill the table iteratively.",
                "algorithm": "1. Initialize dp matrix of size (m+1) x (n+1).\n2. Set dp[i][0] = i and dp[0][j] = j.\n3. Loop i from 1 to m, and j from 1 to n.\n4. If word1[i-1] == word2[j-1], dp[i][j] = dp[i-1][j-1].\n5. Else, dp[i][j] = 1 + min(dp[i][j-1], dp[i-1][j], dp[i-1][j-1]).\n6. Return dp[m][n].",
                "code": "def minDistance(word1: str, word2: str) -> int:\n    m, n = len(word1), len(word2)\n    # Initialize 2D DP array with size (m+1) x (n+1)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    # Base cases: converting string of length i to empty string requires i deletions\n    for i in range(m + 1):\n        dp[i][0] = i\n    # Base cases: converting empty string to string of length j requires j insertions\n    for j in range(n + 1):\n        dp[0][j] = j\n    # Populate DP table\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            # If characters match, no operation cost is added\n            if word1[i - 1] == word2[j - 1]:\n                dp[i][j] = dp[i - 1][j - 1]\n            else:\n                # Min of insert, delete, replace + 1\n                dp[i][j] = 1 + min(\n                    dp[i][j - 1],    # Insert\n                    dp[i - 1][j],    # Delete\n                    dp[i - 1][j - 1] # Replace\n                )\n    # Return the edit distance at bottom-right cell\n    return dp[m][n]",
                "complexity": {
                    "time": "O(M * N)",
                    "space": "O(M * N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize DP table of size 3x3 for word1='cat' and word2='cut'. Set boundary conditions.",
            "vars": {"word1": "cat", "word2": "cut", "dp": "[[0,1,2,3],[1,0,0,0],[2,0,0,0],[3,0,0,0]]"}
        },
        {
            "line": 13,
            "desc": "Process i = 1 ('c'), j = 1 ('c'). Characters match, dp[1][1] = dp[0][0] = 0.",
            "vars": {"i": 1, "j": 1, "dp[1][1]": 0}
        },
        {
            "line": 13,
            "desc": "Process i = 1 ('c'), j = 2 ('u'). Mismatch. dp[1][2] = 1 + min(dp[1][1], dp[0][2], dp[0][1]) = 1 + min(0, 2, 1) = 1.",
            "vars": {"i": 1, "j": 2, "dp[1][2]": 1}
        },
        {
            "line": 13,
            "desc": "Process i = 2 ('a'), j = 2 ('u'). Mismatch. dp[2][2] = 1 + min(dp[2][1], dp[1][2], dp[1][1]) = 1 + min(1, 1, 0) = 1.",
            "vars": {"i": 2, "j": 2, "dp[2][2]": 1}
        },
        {
            "line": 13,
            "desc": "After filling up to i=3, j=3, we match 't' at the end. dp[3][3] = dp[2][2] = 1.",
            "vars": {"dp[3][3]": 1}
        },
        {
            "line": 24,
            "desc": "Return dp[3][3] which is 1.",
            "vars": {"result": 1}
        }
    ]
}

# 9. Distinct Subsequences
data["Distinct Subsequences"] = {
    "solution": {
        "problemStatement": "Given two strings s and t, return the number of distinct subsequences of s which equals t.",
        "examples": [
            {
                "input": "s = \"rabbbit\", t = \"rabbit\"",
                "output": "3",
                "explanation": "There are 3 ways to form 'rabbit' from 'rabbbit'."
            }
        ],
        "constraints": [
            "1 <= s.length, t.length <= 1000",
            "s and t consist of English letters."
        ],
        "edgeCases": [
            "t is empty: return 1 (empty string is always a subsequence)",
            "s is shorter than t: return 0"
        ],
        "followUps": [
            "Can you solve this in O(N) space where N is the length of t?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Use two pointers i and j. If s[i] matches t[j], we have two options: either use s[i] to match t[j] and move both pointers, or skip s[i] and look for another match in the remaining part of s.",
                "algorithm": "1. Define helper(i, j) where i is index in s and j is index in t.\n2. If j == len(t), return 1.\n3. If i == len(s), return 0.\n4. If s[i] == t[j], return helper(i+1, j+1) + helper(i+1, j).\n5. Else, return helper(i+1, j).",
                "code": "def numDistinct(s: str, t: str) -> int:\n    # Helper recursive function\n    def helper(i, j):\n        # Base Case: all of t is matched\n        if j == len(t):\n            return 1\n        # Base Case: s is exhausted but t is not\n        if i == len(s):\n            return 0\n        # If characters match, try both matching this char and skipping it\n        if s[i] == t[j]:\n            return helper(i + 1, j + 1) + helper(i + 1, j)\n        # Else, skip this character of s\n        return helper(i + 1, j)\n    return helper(0, 0)",
                "complexity": {
                    "time": "O(2^M)",
                    "space": "O(M)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Let dp[i][j] represent the number of distinct subsequences of s[i:] that match t[j:]. We can optimize this space to a 1D array of size N+1 where N = len(t) because dp[j] only depends on its previous state and the diagonal state dp[j-1]. We iterate backwards to avoid using updated values.",
                "algorithm": "1. Initialize dp array of size len(t) + 1 with 0s, and dp[0] = 1.\n2. Iterate through s char by char.\n3. For each char in s, iterate j backwards from len(t) down to 1.\n4. If s[i] == t[j-1], dp[j] += dp[j-1].\n5. Return dp[len(t)].",
                "code": "def numDistinct(s: str, t: str) -> int:\n    m, n = len(s), len(t)\n    # dp[j] will store ways to match prefix t[0..j-1]\n    dp = [0] * (n + 1)\n    # Empty prefix t[0..-1] is matched by 1 way (empty string)\n    dp[0] = 1\n    # Loop through each character of s\n    for char in s:\n        # Loop backwards through t to use values from previous state\n        for j in range(n, 0, -1):\n            # If characters match\n            if char == t[j - 1]:\n                # Add number of ways to form t[0..j-2]\n                dp[j] += dp[j - 1]\n    # Return the answer for matching entire t\n    return dp[n]",
                "complexity": {
                    "time": "O(M * N)",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 4,
            "desc": "Initialize dp table of size len(t)+1 = 3 with [1, 0, 0] for s = 'ba' and t = 'a'.",
            "vars": {"s": "ba", "t": "a", "dp": "[1, 0]"}
        },
        {
            "line": 7,
            "desc": "Process first char 'b' from s. Inner loop j = 1 down to 1. 'b' != t[0] ('a'). No update.",
            "vars": {"char": "b", "dp": "[1, 0]"}
        },
        {
            "line": 7,
            "desc": "Process second char 'a' from s. Inner loop j = 1. 'a' == t[0] ('a'). dp[1] += dp[0] => 1.",
            "vars": {"char": "a", "j": 1, "dp": "[1, 1]"}
        },
        {
            "line": 13,
            "desc": "Return dp[1] which is 1.",
            "vars": {"result": 1}
        }
    ]
}

# 10. Wildcard Matching
data["Wildcard Matching"] = {
    "solution": {
        "problemStatement": "Given an input string (s) and a pattern (p), implement wildcard pattern matching with support for '?' and '*' where:\n- '?' Matches any single character.\n- '*' Matches any sequence of characters (including the empty sequence).",
        "examples": [
            {
                "input": "s = \"aa\", p = \"*\"",
                "output": "true",
                "explanation": "'*' matches any sequence."
            },
            {
                "input": "s = \"cb\", p = \"?a\"",
                "output": "false",
                "explanation": "'?' matches 'c', but 'a' does not match 'b'."
            }
        ],
        "constraints": [
            "0 <= s.length, p.length <= 2000",
            "s contains only lowercase English letters.",
            "p contains only lowercase English letters, '?' or '*'."
        ],
        "edgeCases": [
            "Both s and p empty: true",
            "p is '*' only: true",
            "p is all '*': true"
        ],
        "followUps": [
            "Can you solve this with O(1) extra space using two pointers and backtracking?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Use recursion with two pointers i and j. If p[j] is '*', we can either match 0 characters in s (j+1) or match 1 or more characters (i+1). If p[j] is '?' or matches s[i], we move both forward.",
                "algorithm": "1. Define helper(i, j).\n2. If j == len(p), return i == len(s).\n3. If i == len(s), return p[j] == '*' and helper(i, j+1).\n4. If p[j] == '*', return helper(i+1, j) or helper(i, j+1).\n5. If p[j] == '?' or p[j] == s[i], return helper(i+1, j+1).\n6. Else return false.",
                "code": "def isMatch(s: str, p: str) -> bool:\n    # Helper recursive function\n    def helper(i, j):\n        # Base Case: if pattern is fully consumed, check if string is too\n        if j == len(p):\n            return i == len(s)\n        # If string is fully consumed, pattern must only have '*' left\n        if i == len(s):\n            return p[j] == '*' and helper(i, j + 1)\n        # If wildcard '*', we can choose to match 0 or >=1 character\n        if p[j] == '*':\n            return helper(i + 1, j) or helper(i, j + 1)\n        # If characters match or '?', proceed to next\n        if p[j] == '?' or s[i] == p[j]:\n            return helper(i + 1, j + 1)\n        return False\n    return helper(0, 0)",
                "complexity": {
                    "time": "O(2^(M+N))",
                    "space": "O(M+N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use DP where dp[i][j] represents if s[i:] matches p[j:]. Or even better, iterative 2D DP. However, the O(1) space two-pointer approach is the most optimal in practice: keep track of match and starIdx, back-tracking to the last star whenever a mismatch occurs.",
                "algorithm": "1. Set sIdx = 0, pIdx = 0, matchIdx = 0, starIdx = -1.\n2. While sIdx < len(s):\n   - If pIdx < len(p) and (p[pIdx] == '?' or p[pIdx] == s[sIdx]), increment both.\n   - Else if pIdx < len(p) and p[pIdx] == '*', set starIdx = pIdx, matchIdx = sIdx, and pIdx += 1.\n   - Else if starIdx != -1, set pIdx = starIdx + 1, matchIdx += 1, and sIdx = matchIdx.\n   - Else return false.\n3. Check if remaining characters in p are all '*'. If so, return true; else false.",
                "code": "def isMatch(s: str, p: str) -> bool:\n    s_len, p_len = len(s), len(p)\n    s_idx, p_idx = 0, 0\n    star_idx = -1\n    match_idx = 0\n    # Process string s from left to right\n    while s_idx < s_len:\n        # Case 1: characters match or pattern has '?'\n        if p_idx < p_len and (p[p_idx] == '?' or p[p_idx] == s[s_idx]):\n            s_idx += 1\n            p_idx += 1\n        # Case 2: pattern has '*', record the position of '*' and match\n        elif p_idx < p_len and p[p_idx] == '*':\n            star_idx = p_idx\n            match_idx = s_idx\n            p_idx += 1\n        # Case 3: mismatch, but we had a star earlier; backtrack\n        elif star_idx != -1:\n            p_idx = star_idx + 1\n            match_idx += 1\n            s_idx = match_idx\n        # Case 4: mismatch and no star before\n        else:\n            return False\n    # Check if remaining characters in pattern are all '*'\n    while p_idx < p_len and p[p_idx] == '*':\n        p_idx += 1\n    return p_idx == p_len",
                "complexity": {
                    "time": "O(N * M) worst case, O(N + M) average",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 2,
            "desc": "Initialize pointers. s = 'adceb', p = '*a*b'.",
            "vars": {"s_idx": 0, "p_idx": 0, "star_idx": -1, "match_idx": 0}
        },
        {
            "line": 8,
            "desc": "Loop starts. p[0] is '*', set star_idx = 0, match_idx = 0, p_idx = 1.",
            "vars": {"star_idx": 0, "match_idx": 0, "p_idx": 1, "s_idx": 0}
        },
        {
            "line": 8,
            "desc": "Next loop step. s[0] ('a') matches p[1] ('a'). Advance both.",
            "vars": {"s_idx": 1, "p_idx": 2}
        },
        {
            "line": 8,
            "desc": "Next loop step. p[2] is '*', set star_idx = 2, match_idx = 1, p_idx = 3.",
            "vars": {"star_idx": 2, "match_idx": 1, "p_idx": 3, "s_idx": 1}
        },
        {
            "line": 8,
            "desc": "Next loop step. s[1] ('d') != p[3] ('b'). Backtrack to star: p_idx = 3, match_idx = 2, s_idx = 2 ('c').",
            "vars": {"s_idx": 2, "p_idx": 3, "match_idx": 2}
        },
        {
            "line": 8,
            "desc": "Next loop step. s[2] ('c') != p[3] ('b'). Backtrack to star: p_idx = 3, match_idx = 3, s_idx = 3 ('e').",
            "vars": {"s_idx": 3, "p_idx": 3, "match_idx": 3}
        },
        {
            "line": 8,
            "desc": "Next loop step. s[3] ('e') != p[3] ('b'). Backtrack to star: p_idx = 3, match_idx = 4, s_idx = 4 ('b').",
            "vars": {"s_idx": 4, "p_idx": 3, "match_idx": 4}
        },
        {
            "line": 8,
            "desc": "Next loop step. s[4] ('b') == p[3] ('b'). Advance both.",
            "vars": {"s_idx": 5, "p_idx": 4}
        },
        {
            "line": 20,
            "desc": "Loop terminates since s_idx == 5. Verify remaining pattern. None left. Return True.",
            "vars": {"result": true}
        }
    ]
}

# 11. Longest Increasing Subsequence
data["Longest Increasing Subsequence"] = {
    "solution": {
        "problemStatement": "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
        "examples": [
            {
                "input": "nums = [10, 9, 2, 5, 3, 7, 101, 18]",
                "output": "4",
                "explanation": "The longest increasing subsequence is [2, 3, 7, 101], therefore the length is 4."
            }
        ],
        "constraints": [
            "1 <= nums.length <= 2500",
            "-10^4 <= nums[i] <= 10^4"
        ],
        "edgeCases": [
            "Empty list (handled by constraints)",
            "All elements sorted descending: return 1",
            "All identical elements: return 1"
        ],
        "followUps": [
            "Can you solve it in O(N log N) time complexity?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Use recursion with a pointer index and prev_index. At each element, we decide to either include it (if it is larger than the previous element) or exclude it.",
                "algorithm": "1. Define helper(idx, prev_idx).\n2. If idx == len(nums), return 0.\n3. val1 = helper(idx+1, prev_idx).\n4. val2 = 0; if prev_idx == -1 or nums[idx] > nums[prev_idx], val2 = 1 + helper(idx+1, idx).\n5. Return max(val1, val2).",
                "code": "def lengthOfLIS(nums: list[int]) -> int:\n    # Helper recursive function\n    def helper(idx, prev_idx):\n        # Base Case: reached end of array\n        if idx == len(nums):\n            return 0\n        # Choice 1: Skip current element\n        skip = helper(idx + 1, prev_idx)\n        take = 0\n        # Choice 2: Take current element if it's greater than previous selection\n        if prev_idx == -1 or nums[idx] > nums[prev_idx]:\n            take = 1 + helper(idx + 1, idx)\n        # Return maximum of both paths\n        return max(skip, take)\n    return helper(0, -1)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use patience sorting with binary search. We maintain a list sub containing the smallest tail of all increasing subsequences of various lengths found so far. For each number x, if it's larger than the largest tail in sub, we append it. Otherwise, we find the first element in sub that is >= x and replace it. The length of sub will be the length of LIS.",
                "algorithm": "1. Initialize an empty list sub.\n2. Iterate through each num in nums.\n3. Use binary search to find the position to insert/replace num in sub.\n4. If position is equal to len(sub), append num to sub.\n5. Else, sub[pos] = num.\n6. Return len(sub).",
                "code": "def lengthOfLIS(nums: list[int]) -> int:\n    # sub will store the smallest tail values of increasing subsequences\n    sub = []\n    # Iterate through all numbers in nums\n    for num in nums:\n        # Binary search manually for insertion index\n        left, right = 0, len(sub)\n        while left < right:\n            mid = (left + right) // 2\n            # If mid element is less than num, search right half\n            if sub[mid] < num:\n                left = mid + 1\n            else:\n                # Else search left half\n                right = mid\n        # If num is larger than all elements in sub, append it\n        if left == len(sub):\n            sub.append(num)\n        else:\n            # Otherwise, replace the first element that is >= num\n            sub[left] = num\n    # Length of sub represents the length of LIS\n    return len(sub)",
                "complexity": {
                    "time": "O(N log N)",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize empty sub array.",
            "vars": {"nums": "[10, 9, 2, 5]", "sub": "[]"}
        },
        {
            "line": 5,
            "desc": "Process num = 10. Binary search returns left = 0. Append 10 to sub.",
            "vars": {"num": 10, "sub": "[10]"}
        },
        {
            "line": 5,
            "desc": "Process num = 9. Binary search returns left = 0. Replace sub[0] with 9.",
            "vars": {"num": 9, "sub": "[9]"}
        },
        {
            "line": 5,
            "desc": "Process num = 2. Binary search returns left = 0. Replace sub[0] with 2.",
            "vars": {"num": 2, "sub": "[2]"}
        },
        {
            "line": 5,
            "desc": "Process num = 5. Binary search returns left = 1. Append 5 to sub.",
            "vars": {"num": 5, "sub": "[2, 5]"}
        },
        {
            "line": 22,
            "desc": "Loop finished. Return len(sub) which is 2.",
            "vars": {"result": 2}
        }
    ]
}

# 12. Largest Divisible Subset
data["Largest Divisible Subset"] = {
    "solution": {
        "problemStatement": "Given a set of distinct positive integers nums, return the largest subset answer such that every pair (answer[i], answer[j]) of elements in this subset satisfies:\n- answer[i] % answer[j] == 0, or\n- answer[j] % answer[i] == 0\nIf there are multiple solutions, return any of them.",
        "examples": [
            {
                "input": "nums = [1, 2, 3]",
                "output": "[1, 2]",
                "explanation": "[1, 3] is also accepted."
            }
        ],
        "constraints": [
            "1 <= nums.length <= 1000",
            "1 <= nums[i] <= 2 * 10^9",
            "All the integers in nums are unique."
        ],
        "edgeCases": [
            "Single element: return itself",
            "No elements are divisible: return any single element"
        ],
        "followUps": [
            "Can you solve it without sorting first? (No, sorting is crucial to build the chain)"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Sort the array. For each number, recursively build subsets by either adding it if it divides the last element of the subset or skipping it. Return the largest subset.",
                "algorithm": "1. Sort nums.\n2. Define helper(idx, last_val).\n3. If idx == len(nums), return [].\n4. Option 1: skip = helper(idx+1, last_val).\n5. Option 2: if nums[idx] % last_val == 0, take = [nums[idx]] + helper(idx+1, nums[idx]).\n6. Return the longer of skip and take.",
                "code": "def largestDivisibleSubset(nums: list[int]) -> list[int]:\n    # Sort numbers first to facilitate divisibility check\n    nums.sort()\n    # Recursive helper\n    def helper(idx, last_val):\n        # Base Case: no numbers left\n        if idx == len(nums):\n            return []\n        # Skip current number\n        skip = helper(idx + 1, last_val)\n        take = []\n        # Take current number if it's divisible by the last value\n        if last_val == 1 or nums[idx] % last_val == 0:\n            take = [nums[idx]] + helper(idx + 1, nums[idx])\n        # Return the larger subset\n        return take if len(take) > len(skip) else skip\n    return helper(0, 1)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort the array. Define dp[i] as the size of the largest divisible subset ending with nums[i]. Also keep a parent array to reconstruct the subset. For each i, check all j < i. If nums[i] % nums[j] == 0, then we can append nums[i] to the subset ending at j.",
                "algorithm": "1. Sort nums.\n2. Initialize dp table of size N with 1s, and parent array with -1s.\n3. Loop i from 1 to N-1, and j from 0 to i-1.\n4. If nums[i] % nums[j] == 0 and dp[i] < dp[j] + 1, update dp[i] = dp[j] + 1 and parent[i] = j.\n5. Keep track of the index of the max value in dp.\n6. Reconstruct the subset using the parent pointers.",
                "code": "def largestDivisibleSubset(nums: list[int]) -> list[int]:\n    # Sort the input array\n    nums.sort()\n    n = len(nums)\n    # dp[i] stores the size of the largest divisible subset ending with nums[i]\n    dp = [1] * n\n    # parent[i] stores the index of the previous element in the subset\n    parent = [-1] * n\n    max_idx = 0\n    # Iterate through all elements to compute dp values\n    for i in range(1, n):\n        for j in range(i):\n            # Divisibility check and LIS-like update\n            if nums[i] % nums[j] == 0 and dp[i] < dp[j] + 1:\n                dp[i] = dp[j] + 1\n                parent[i] = j\n        # Track the index with the maximum subset size\n        if dp[i] > dp[max_idx]:\n            max_idx = i\n    # Reconstruct the subset\n    res = []\n    curr = max_idx\n    while curr != -1:\n        res.append(nums[curr])\n        curr = parent[curr]\n    # Return the reconstructed subset in sorted order\n    return res[::-1]",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort nums. nums = [1, 2, 4, 8]. Initialize dp = [1, 1, 1, 1], parent = [-1, -1, -1, -1].",
            "vars": {"nums": "[1, 2, 4, 8]", "dp": "[1,1,1,1]"}
        },
        {
            "line": 10,
            "desc": "i = 1 (val 2): check j = 0 (val 1). 2 % 1 == 0, update dp[1] = 2, parent[1] = 0.",
            "vars": {"i": 1, "j": 0, "dp": "[1, 2, 1, 1]", "parent": "[-1, 0, -1, -1]"}
        },
        {
            "line": 10,
            "desc": "i = 2 (val 4): check j = 0, 1. 4 % 2 == 0, update dp[2] = dp[1] + 1 = 3, parent[2] = 1.",
            "vars": {"i": 2, "dp": "[1, 2, 3, 1]", "parent": "[-1, 0, 1, -1]"}
        },
        {
            "line": 10,
            "desc": "i = 3 (val 8): check j = 2. 8 % 4 == 0, update dp[3] = dp[2] + 1 = 4, parent[3] = 2.",
            "vars": {"i": 3, "dp": "[1, 2, 3, 4]", "parent": "[-1, 0, 1, 2]"}
        },
        {
            "line": 20,
            "desc": "Trace back from max_idx = 3: index 3 -> 2 -> 1 -> 0. Values: [8, 4, 2, 1]. Return reverse: [1, 2, 4, 8].",
            "vars": {"result": "[1, 2, 4, 8]"}
        }
    ]
}

# 13. Longest String Chain
data["Longest String Chain"] = {
    "solution": {
        "problemStatement": "You are given an array of words where each word consists of lowercase English letters. wordA is a predecessor of wordB if and only if we can insert exactly one letter anywhere in wordA without changing the order of the other characters to make it equal to wordB. Return the length of the longest possible word chain.",
        "examples": [
            {
                "input": "words = [\"a\",\"b\",\"ba\",\"bca\",\"bda\",\"bdca\"]",
                "output": "4",
                "explanation": "One of the longest word chains is [\"a\",\"ba\",\"bda\",\"bdca\"] which has length 4."
            }
        ],
        "constraints": [
            "1 <= words.length <= 1000",
            "1 <= words[i].length <= 16",
            "words[i] consists of only lowercase English letters."
        ],
        "edgeCases": [
            "Single word: return 1",
            "All words same length: return 1"
        ],
        "followUps": [
            "Can you solve this using a Trie to match predecessors?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Sort words by length. For each word, recursively search for valid successors (words with length + 1 that can be formed by adding one char) and return the max length.",
                "algorithm": "1. Sort words by length.\n2. Define isPredecessor(w1, w2).\n3. Define helper(idx).\n4. Loop i from idx+1 to N: if isPredecessor(words[idx], words[i]), count = 1 + helper(i).\n5. Return max count.",
                "code": "def longestStrChain(words: list[str]) -> int:\n    # Helper to check if w1 is predecessor of w2\n    def isPredecessor(w1, w2):\n        if len(w2) != len(w1) + 1:\n            return False\n        i, j = 0, 0\n        while i < len(w1) and j < len(w2):\n            if w1[i] == w2[j]:\n                i += 1\n            j += 1\n        return i == len(w1)\n    \n    # Sort words by length\n    words.sort(key=len)\n    n = len(words)\n    # Recursive helper\n    def helper(idx):\n        max_len = 1\n        for i in range(idx + 1, n):\n            if isPredecessor(words[idx], words[i]):\n                max_len = max(max_len, 1 + helper(i))\n        return max_len\n        \n    ans = 0\n    for i in range(n):\n        ans = max(ans, helper(i))\n    return ans",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort words by length. Use a hash map dp where dp[word] stores the longest chain ending at word. For each word, generate all possible predecessors by removing one character at a time. If the predecessor is in dp, we can extend its chain: dp[word] = max(dp[word], dp[predecessor] + 1).",
                "algorithm": "1. Sort words by length.\n2. Initialize dp hash map.\n3. Loop through each word in sorted words.\n4. For each word, try deleting each char to get a predecessor.\n5. dp[word] = max(dp[word], dp.get(predecessor, 0) + 1).\n6. Keep track of max chain length.\n7. Return max chain length.",
                "code": "def longestStrChain(words: list[str]) -> int:\n    # Sort words by their length\n    words.sort(key=len)\n    # dp map to store word -> longest chain length\n    dp = {}\n    max_chain = 0\n    # Iterate through sorted words\n    for word in words:\n        current_max = 1\n        # Generate all possible predecessor words by deleting one character\n        for i in range(len(word)):\n            predecessor = word[:i] + word[i+1:]\n            # If predecessor was seen, update current word's chain length\n            if predecessor in dp:\n                current_max = max(current_max, dp[predecessor] + 1)\n        # Store the max chain length for current word\n        dp[word] = current_max\n        # Update global max chain length\n        max_chain = max(max_chain, current_max)\n    # Return the longest string chain found\n    return max_chain",
                "complexity": {
                    "time": "O(N * L^2) where L is max word length",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort words. words = ['a', 'ba', 'bca']. Initialize dp = {}.",
            "vars": {"words": "['a', 'ba', 'bca']", "dp": "{}"}
        },
        {
            "line": 8,
            "desc": "Process 'a'. Predecessor by deleting character: ''. Not in dp. dp['a'] = 1. max_chain = 1.",
            "vars": {"word": "a", "dp": "{'a': 1}"}
        },
        {
            "line": 8,
            "desc": "Process 'ba'. Predecessors: 'a' (found, dp['a']+1=2), 'b' (not found). dp['ba'] = 2. max_chain = 2.",
            "vars": {"word": "ba", "dp": "{'a': 1, 'ba': 2}"}
        },
        {
            "line": 8,
            "desc": "Process 'bca'. Predecessors: 'ca' (not found), 'ba' (found, dp['ba']+1=3), 'bc' (not found). dp['bca'] = 3. max_chain = 3.",
            "vars": {"word": "bca", "dp": "{'a': 1, 'ba': 2, 'bca': 3}", "max_chain": 3}
        },
        {
            "line": 21,
            "desc": "Return max_chain which is 3.",
            "vars": {"result": 3}
        }
    ]
}

# 14. Bitonic Subsequence
data["Bitonic Subsequence"] = {
    "solution": {
        "problemStatement": "Given an array of positive integers nums, find the maximum length of a Bitonic Subsequence. A subsequence is bitonic if it is first strictly increasing and then strictly decreasing. Note that a strictly increasing or strictly decreasing sequence is also bitonic.",
        "examples": [
            {
                "input": "nums = [1, 11, 2, 10, 4, 5, 2, 1]",
                "output": "6",
                "explanation": "The longest bitonic subsequence is [1, 2, 4, 5, 2, 1] of length 6."
            }
        ],
        "constraints": [
            "1 <= nums.length <= 1000",
            "1 <= nums[i] <= 10^5"
        ],
        "edgeCases": [
            "Strictly increasing: return length of LIS",
            "Strictly decreasing: return length of LDS",
            "Identical elements: return 1"
        ],
        "followUps": [
            "Can you solve this in O(N log N) time using binary search LIS technique twice?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "For each index i, we can find the longest increasing subsequence ending at i, and the longest decreasing subsequence starting at i, and then combine them.",
                "algorithm": "1. For each index i, find LIS ending at i by checking all subsets recursively.\n2. For each index i, find LDS starting at i by checking all subsets recursively.\n3. Return max(lis[i] + lds[i] - 1) over all i.",
                "code": "def LongestBitonicSequence(nums: list[int]) -> int:\n    n = len(nums)\n    # Recursive LIS helper\n    def get_lis(idx, prev_idx):\n        if idx < 0:\n            return 0\n        skip = get_lis(idx - 1, prev_idx)\n        take = 0\n        if prev_idx == -1 or nums[idx] < nums[prev_idx]:\n            take = 1 + get_lis(idx - 1, idx)\n        return max(skip, take)\n        \n    # Recursive LDS helper\n    def get_lds(idx, prev_idx):\n        if idx == n:\n            return 0\n        skip = get_lds(idx + 1, prev_idx)\n        take = 0\n        if prev_idx == -1 or nums[idx] < nums[prev_idx]:\n            take = 1 + get_lds(idx + 1, idx)\n        return max(skip, take)\n        \n    max_len = 0\n    # Try each element as the peak of the bitonic sequence\n    for i in range(n):\n        # LIS ending at i is get_lis(i, -1), LDS starting at i is get_lds(i, -1)\n        # Peak is counted twice, so subtract 1\n        max_len = max(max_len, get_lis(i, -1) + get_lds(i, -1) - 1)\n    return max_len",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use dynamic programming to precompute two arrays: lis[i] (length of LIS ending at i) and lds[i] (length of LDS starting at i). Then, the maximum bitonic subsequence length is max(lis[i] + lds[i] - 1) for all 0 <= i < N.",
                "algorithm": "1. Initialize lis array of size N with 1s. Loop i from 1 to N-1 and j from 0 to i-1. If nums[i] > nums[j], update lis[i] = max(lis[i], lis[j] + 1).\n2. Initialize lds array of size N with 1s. Loop i from N-2 down to 0 and j from N-1 down to i+1. If nums[i] > nums[j], update lds[i] = max(lds[i], lds[j] + 1).\n3. Calculate max bitonic length as max(lis[i] + lds[i] - 1) for all i.\n4. Return the maximum length.",
                "code": "def LongestBitonicSequence(nums: list[int]) -> int:\n    n = len(nums)\n    if n == 0:\n        return 0\n    # lis[i] stores the length of LIS ending at index i\n    lis = [1] * n\n    for i in range(1, n):\n        for j in range(i):\n            if nums[i] > nums[j]:\n                lis[i] = max(lis[i], lis[j] + 1)\n                \n    # lds[i] stores the length of LDS starting at index i\n    lds = [1] * n\n    for i in range(n - 2, -1, -1):\n        for j in range(n - 1, i, -1):\n            if nums[i] > nums[j]:\n                lds[i] = max(lds[i], lds[j] + 1)\n                \n    # Find the maximum value of (lis[i] + lds[i] - 1)\n    max_len = 0\n    for i in range(n):\n        max_len = max(max_len, lis[i] + lds[i] - 1)\n    # Return the maximum bitonic sequence length\n    return max_len",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize tables. nums = [1, 3, 2]. lis = [1, 1, 1], lds = [1, 1, 1].",
            "vars": {"nums": "[1, 3, 2]", "lis": "[1, 1, 1]", "lds": "[1, 1, 1]"}
        },
        {
            "line": 6,
            "desc": "Compute LIS ending at i. For i=1: 3 > 1 => lis[1] = 2. For i=2: 2 > 1 => lis[2] = 2.",
            "vars": {"lis": "[1, 2, 2]"}
        },
        {
            "line": 12,
            "desc": "Compute LDS starting at i. For i=1: 3 > 2 => lds[1] = 2. For i=0: 1 is not > any, lds[0] = 1.",
            "vars": {"lds": "[1, 2, 1]"}
        },
        {
            "line": 18,
            "desc": "Compute max bitonic length. i=0: 1+1-1=1. i=1: 2+2-1=3. i=2: 2+1-1=2. Max length is 3.",
            "vars": {"max_len": 3}
        },
        {
            "line": 21,
            "desc": "Return max_len which is 3.",
            "vars": {"result": 3}
        }
    ]
}

# 15. Matrix Chain Multiplication
data["Matrix Chain Multiplication"] = {
    "solution": {
        "problemStatement": "Given a sequence of matrices, find the most efficient way to multiply these matrices together. The problem is not actually to perform the multiplications, but merely to decide in which order to perform the multiplications. You are given an array arr[] which represents the chain of matrix dimensions such that the ith matrix has dimensions arr[i-1] x arr[i].",
        "examples": [
            {
                "input": "arr = [40, 20, 30, 10, 30]",
                "output": "26000",
                "explanation": "There are 4 matrices of dimensions 40x20, 20x30, 30x10, 10x30. The minimum cost is computed as:\n(A1 * A2) * (A3 * A4) => 40*20*30 + 30*10*30 + 40*30*30 = 24000 + 9000 + 36000 = 69000?\nActually, A1 * (A2 * A3) * A4 is 20*30*10 + 40*20*10 + 40*10*30 = 6000 + 8000 + 12000 = 26000."
            }
        ],
        "constraints": [
            "2 <= arr.length <= 100",
            "1 <= arr[i] <= 500"
        ],
        "edgeCases": [
            "Only two matrices (length of arr = 3): single way to multiply",
            "Identical dimensions"
        ],
        "followUps": [
            "Can you print the optimal parenthesis arrangement for matrix multiplication?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "To find the minimum cost to multiply matrices from index i to j, try placing parentheses at every partition point k (from i to j-1) and recursively calculate the cost of multiplying the two split chains, adding the cost of multiplying the resulting two matrices.",
                "algorithm": "1. Define helper(i, j) where i and j are the matrix boundary indices.\n2. If i == j, return 0 (only one matrix, cost is 0).\n3. Initialize min_cost = infinity.\n4. Loop k from i to j-1: cost = helper(i, k) + helper(k+1, j) + arr[i-1]*arr[k]*arr[j]. Update min_cost.\n5. Return min_cost.",
                "code": "def matrixMultiplication(arr: list[int]) -> int:\n    # Recursive helper function\n    def helper(i, j):\n        # Base Case: single matrix has 0 multiplication cost\n        if i == j:\n            return 0\n        min_cost = float('inf')\n        # Try all split points k between i and j-1\n        for k in range(i, j):\n            # Cost = left chain cost + right chain cost + multiplication cost of results\n            cost = helper(i, k) + helper(k + 1, j) + arr[i - 1] * arr[k] * arr[j]\n            min_cost = min(min_cost, cost)\n        return min_cost\n    # Call helper with first matrix index 1 and last matrix index N-1\n    return helper(1, len(arr) - 1)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use a 2D DP table dp of size N x N where dp[i][j] stores the minimum multiplication cost for matrices from index i to j. Build this table by checking chains of increasing lengths.",
                "algorithm": "1. Let n = len(arr) - 1 (number of matrices).\n2. Initialize dp table of size (n+1) x (n+1) with 0s.\n3. Loop length l from 2 to n.\n4. Loop start index i from 1 to n - l + 1. Let j = i + l - 1.\n5. Initialize dp[i][j] = infinity.\n6. Loop k from i to j-1: cost = dp[i][k] + dp[k+1][j] + arr[i-1]*arr[k]*arr[j]. Update dp[i][j] = min(dp[i][j], cost).\n7. Return dp[1][n].",
                "code": "def matrixMultiplication(arr: list[int]) -> int:\n    n = len(arr) - 1\n    # dp[i][j] will store the minimum cost to multiply matrices from index i to j\n    dp = [[0] * (n + 1) for _ in range(n + 1)]\n    # Loop over chain lengths from 2 to n\n    for length in range(2, n + 1):\n        for i in range(1, n - length + 2):\n            j = i + length - 1\n            dp[i][j] = float('inf')\n            # Test all possible partition points k\n            for k in range(i, j):\n                # Sum of left cost, right cost, and current multiplication cost\n                cost = dp[i][k] + dp[k + 1][j] + arr[i - 1] * arr[k] * arr[j]\n                dp[i][j] = min(dp[i][j], cost)\n    # Return the minimum cost for the entire chain of matrices\n    return dp[1][n]",
                "complexity": {
                    "time": "O(N^3)",
                    "space": "O(N^2)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 2,
            "desc": "Compute n = 3 (matrices A1, A2, A3). Initialize dp of size 4x4 with 0s.",
            "vars": {"arr": "[10, 20, 30, 40]", "n": 3, "dp": "4x4 zero matrix"}
        },
        {
            "line": 6,
            "desc": "Process length = 2. i = 1, j = 2. k = 1. dp[1][2] = dp[1][1] + dp[2][2] + 10*20*30 = 6000.",
            "vars": {"length": 2, "i": 1, "j": 2, "dp[1][2]": 6000}
        },
        {
            "line": 6,
            "desc": "Process length = 2. i = 2, j = 3. k = 2. dp[2][3] = dp[2][2] + dp[3][3] + 20*30*40 = 24000.",
            "vars": {"length": 2, "i": 2, "j": 3, "dp[2][3]": 24000}
        },
        {
            "line": 6,
            "desc": "Process length = 3. i = 1, j = 3. Test k = 1: dp[1][1]+dp[2][3]+10*20*40 = 0+24000+8000 = 32000. Test k = 2: dp[1][2]+dp[3][3]+10*30*40 = 6000+0+12000 = 18000. Min is 18000.",
            "vars": {"length": 3, "i": 1, "j": 3, "dp[1][3]": 18000}
        },
        {
            "line": 15,
            "desc": "Return dp[1][3] which is 18000.",
            "vars": {"result": 18000}
        }
    ]
}

# Write output to the destination file
output_dir = os.path.dirname("scratch/dsa_sol_9.json")
if output_dir and not os.path.exists(output_dir):
    os.makedirs(output_dir)

with open("scratch/dsa_sol_9.json", "w") as f:
    json.dump(data, f, indent=4)

print("SUCCESS")
