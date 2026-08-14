import json

# Define the dictionary containing all solutions and traces
dsa_sol_2 = {}

# 1. Fractional Knapsack
dsa_sol_2["Fractional Knapsack"] = {
    "solution": {
        "title": "Fractional Knapsack",
        "problemStatement": "Given weights and values of N items, we need to put these items in a knapsack of capacity W to get the maximum total value in the knapsack. We can break items for maximizing the total value.",
        "examples": [
            {
                "input": "W = 50, arr = [Item(60, 10), Item(100, 20), Item(120, 30)], n = 3",
                "output": "240.0",
                "explanation": "Take the first and second items fully (total weight 30, value 160). Take 20 units of the third item (value 120 * 20/30 = 80). Total value = 160 + 80 = 240.0"
            }
        ],
        "constraints": [
            "1 <= N <= 10^5",
            "1 <= W <= 10^9",
            "1 <= value_i, weight_i <= 10^4"
        ],
        "edgeCases": [
            "Knapsack capacity W is 0.",
            "All items have the same value/weight ratio.",
            "The total weight of all items is less than W."
        ],
        "followUps": [
            "What if we cannot break items (0-1 Knapsack)?",
            "How can we solve the fractional knapsack in O(N) time without sorting (using Quickselect)?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Try all subsets of items. If a subset fits fully, accumulate its value. If it exceeds capacity, take the remaining capacity fractionally from one of the remaining items. Find the max value.",
                "algorithm": "1. Define a recursive function solve(index, current_weight, current_value).\n2. At each item, we can either exclude it or try to include it.\n3. If including it exceeds capacity W, take the fractional part to fill the knapsack and return.\n4. Take the maximum of excluding or including the item.\n5. Return the maximum value found.",
                "code": "class Item:\n    def __init__(self, value, weight):\n        # Initialize value and weight of the item\n        self.value = value\n        self.weight = weight\n\ndef fractionalKnapsackBruteForce(W, arr, n):\n    # Recursive helper to find maximum value\n    def solve(index, current_weight, current_value):\n        # Base case: if we processed all items or knapsack is full\n        if index == n or current_weight >= W:\n            # Return current accumulated value\n            return current_value\n        \n        # Option 1: Exclude the current item\n        exclude = solve(index + 1, current_weight, current_value)\n        \n        # Option 2: Include the current item (fully or partially)\n        include = 0\n        # Check if the entire item can fit in the remaining capacity\n        if current_weight + arr[index].weight <= W:\n            # Include fully and move to the next item\n            include = solve(index + 1, current_weight + arr[index].weight, current_value + arr[index].value)\n        else:\n            # Calculate remaining capacity in the knapsack\n            remaining_capacity = W - current_weight\n            # Take the fractional value of the current item\n            fraction_value = arr[index].value * (remaining_capacity / arr[index].weight)\n            # Calculate total value with this fractional part\n            include = current_value + fraction_value\n            \n        # Return the maximum of both options\n        return max(exclude, include)\n    \n    # Start recursion from the first item with zero weight and value\n    return solve(0, 0, 0)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N) for recursion stack"
                }
            },
            {
                "name": "Optimal",
                "intuition": "To maximize the total value, we should prioritize items with the highest value per unit weight. By sorting items by their value-to-weight ratio in descending order, we can greedily fill the knapsack.",
                "algorithm": "1. Sort all items based on their value-to-weight ratio (value / weight) in descending order.\n2. Initialize total_value to 0.0.\n3. Iterate through the sorted items.\n4. If the item's weight is less than or equal to the remaining capacity W, add its value to total_value and subtract its weight from W.\n5. If the item's weight is greater than the remaining capacity W, add the fraction of the item's value that fits, and break the loop.\n6. Return total_value.",
                "code": "class Item:\n    def __init__(self, value, weight):\n        # Initialize value and weight of the item\n        self.value = value\n        self.weight = weight\n\ndef fractionalKnapsack(W, arr, n):\n    # Sort items based on value-to-weight ratio in descending order\n    arr.sort(key=lambda x: x.value / x.weight, reverse=True)\n    # Variable to store the maximum value we can accumulate\n    total_value = 0.0\n    # Iterate through all the sorted items\n    for i in range(n):\n        # If the item fits completely in the remaining capacity\n        if arr[i].weight <= W:\n            # Add the complete value of the item to our total value\n            total_value += arr[i].value\n            # Decrease the remaining capacity of the knapsack\n            W -= arr[i].weight\n        # If the item cannot fit completely\n        else:\n            # Add the fraction of the value corresponding to remaining capacity\n            total_value += arr[i].value * (W / arr[i].weight)\n            # The knapsack is now full, break the loop\n            break\n    # Return the accumulated maximum value\n    return total_value",
                "complexity": {
                    "time": "O(N log N)",
                    "space": "O(1) if sorting in-place"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 9,
            "desc": "Sort items by value-to-weight ratio in descending order. Ratios: Item 1 (6.0), Item 2 (5.0), Item 3 (4.0). Items remain in same order.",
            "vars": {"arr": "[Item(60,10), Item(100,20), Item(120,30)]"}
        },
        {
            "line": 11,
            "desc": "Initialize total_value to 0.0",
            "vars": {"total_value": 0.0, "W": 50}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 0, item = Item(60, 10)",
            "vars": {"i": 0, "total_value": 0.0, "W": 50, "arr[0].weight": 10}
        },
        {
            "line": 15,
            "desc": "Check if weight (10) <= remaining capacity W (50). It is True.",
            "vars": {"i": 0, "W": 50, "arr[0].weight": 10}
        },
        {
            "line": 17,
            "desc": "Add item value to total_value. total_value = 0.0 + 60 = 60.0",
            "vars": {"i": 0, "total_value": 60.0, "W": 50}
        },
        {
            "line": 19,
            "desc": "Reduce W by item weight. W = 50 - 10 = 40",
            "vars": {"i": 0, "total_value": 60.0, "W": 40}
        },
        {
            "line": 13,
            "desc": "Loop continues: i = 1, item = Item(100, 20)",
            "vars": {"i": 1, "total_value": 60.0, "W": 40, "arr[1].weight": 20}
        },
        {
            "line": 15,
            "desc": "Check if weight (20) <= remaining capacity W (40). It is True.",
            "vars": {"i": 1, "W": 40, "arr[1].weight": 20}
        },
        {
            "line": 17,
            "desc": "Add item value to total_value. total_value = 60.0 + 100 = 160.0",
            "vars": {"i": 1, "total_value": 160.0, "W": 40}
        },
        {
            "line": 19,
            "desc": "Reduce W by item weight. W = 40 - 20 = 20",
            "vars": {"i": 1, "total_value": 160.0, "W": 20}
        },
        {
            "line": 13,
            "desc": "Loop continues: i = 2, item = Item(120, 30)",
            "vars": {"i": 2, "total_value": 160.0, "W": 20, "arr[2].weight": 30}
        },
        {
            "line": 15,
            "desc": "Check if weight (30) <= remaining capacity W (20). It is False.",
            "vars": {"i": 2, "W": 20, "arr[2].weight": 30}
        },
        {
            "line": 23,
            "desc": "Add fractional value of Item 3. total_value = 160.0 + 120 * (20 / 30) = 240.0",
            "vars": {"i": 2, "total_value": 240.0, "W": 20}
        },
        {
            "line": 25,
            "desc": "Break out of loop",
            "vars": {"total_value": 240.0}
        },
        {
            "line": 27,
            "desc": "Return total_value",
            "vars": {"total_value": 240.0}
        }
    ]
}

# 2. Greedy Coin Change
dsa_sol_2["Greedy Coin Change"] = {
    "solution": {
        "title": "Greedy Coin Change",
        "problemStatement": "Given an array of denominations of coins, and a target value V, find the minimum number of coins/notes to make the change. Assume we have infinite supply of each denomination. The greedy algorithm is optimal for canonical coin systems like the Indian currency system.",
        "examples": [
            {
                "input": "coins = [1, 2, 5, 10, 20, 50, 100, 500, 1000], V = 70",
                "output": "(2, [50, 20])",
                "explanation": "Use one 50 coin and one 20 coin to get 70 with 2 coins."
            }
        ],
        "constraints": [
            "1 <= len(coins) <= 20",
            "1 <= coins[i] <= 2000",
            "1 <= V <= 10^6"
        ],
        "edgeCases": [
            "V is 0 (requires 0 coins).",
            "V is already a standard denomination.",
            "Canonical vs non-canonical coin sets where greedy might fail."
        ],
        "followUps": [
            "For which coin systems does the greedy approach fail to find the optimal solution?",
            "How would you solve this if greedy was not optimal (e.g., using Dynamic Programming)?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Try all combinations of coins that sum to V, or use recursion to try every coin at each step and find the minimum path.",
                "algorithm": "1. Define recursive function solve(v) to return min coins needed to form value v.\n2. For each coin, if coin <= v, compute 1 + solve(v - coin).\n3. Return the minimum count among all options.",
                "code": "def minCoinsBruteForce(coins, V):\n    # Recursive function to find the minimum coins needed\n    def solve(v):\n        # Base Case: if target value is 0, we need 0 coins\n        if v == 0:\n            return 0\n        # Initialize result as infinity\n        res = float('inf')\n        # Try every coin that is smaller than or equal to current v\n        for coin in coins:\n            # If coin is less than or equal to current value v\n            if coin <= v:\n                # Compute min coins for remaining value\n                sub_res = solve(v - coin)\n                # If subproblem has a valid solution, update res\n                if sub_res != float('inf') and sub_res + 1 < res:\n                    res = sub_res + 1\n        # Return the minimum result found\n        return res\n    # Return the result from recursive solver\n    return solve(V)",
                "complexity": {
                    "time": "O(len(coins)^V)",
                    "space": "O(V) for recursion depth"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Start from the largest denomination, take as many coins of that denomination as possible, then move to the next smaller denomination.",
                "algorithm": "1. Sort the coins array in descending order.\n2. Initialize coin_count to 0 and chosen_coins as an empty list.\n3. Iterate through each coin denomination.\n4. Use a while loop to repeatedly subtract the current coin value from V as long as V is greater than or equal to the coin value.\n5. For each successful subtraction, increment coin_count and append the coin value to chosen_coins.\n6. Return coin_count and chosen_coins.",
                "code": "def minCoinsGreedy(coins, V):\n    # Sort denominations in descending order\n    coins.sort(reverse=True)\n    # Initialize count of coins to 0\n    coin_count = 0\n    # List to store the chosen coins\n    chosen_coins = []\n    # Iterate through each coin denomination\n    for coin in coins:\n        # While the current coin denomination can be used\n        while V >= coin:\n            # Subtract the coin value from remaining change V\n            V -= coin\n            # Increment the count of coins\n            coin_count += 1\n            # Add the coin to our list of chosen coins\n            chosen_coins.append(coin)\n    # Return the list of chosen coins and the count\n    return coin_count, chosen_coins",
                "complexity": {
                    "time": "O(N log N + V/min_coin)",
                    "space": "O(1) extra space"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort denominations in descending order. coins becomes [1000, 500, 100, 50, 20, 10, 5, 2, 1]",
            "vars": {"coins": "[1000, 500, 100, 50, 20, 10, 5, 2, 1]"}
        },
        {
            "line": 5,
            "desc": "Initialize coin_count to 0",
            "vars": {"coin_count": 0, "V": 70}
        },
        {
            "line": 7,
            "desc": "Initialize empty chosen_coins list",
            "vars": {"coin_count": 0, "chosen_coins": "[]"}
        },
        {
            "line": 9,
            "desc": "Loop starts: coin = 1000. 70 >= 1000 is False, skip while loop.",
            "vars": {"coin": 1000, "V": 70}
        },
        {
            "line": 9,
            "desc": "Loop continues: coin = 500. 70 >= 500 is False, skip while loop.",
            "vars": {"coin": 500, "V": 70}
        },
        {
            "line": 9,
            "desc": "Loop continues: coin = 100. 70 >= 100 is False, skip while loop.",
            "vars": {"coin": 100, "V": 70}
        },
        {
            "line": 9,
            "desc": "Loop continues: coin = 50. 70 >= 50 is True, enter while loop.",
            "vars": {"coin": 50, "V": 70}
        },
        {
            "line": 13,
            "desc": "Subtract 50 from V. V = 70 - 50 = 20",
            "vars": {"coin": 50, "V": 20}
        },
        {
            "line": 15,
            "desc": "Increment coin_count. coin_count = 1",
            "vars": {"coin_count": 1}
        },
        {
            "line": 17,
            "desc": "Append 50 to chosen_coins. chosen_coins = [50]",
            "vars": {"chosen_coins": "[50]"}
        },
        {
            "line": 11,
            "desc": "Check V >= coin (20 >= 50). False, exit while loop.",
            "vars": {"V": 20}
        },
        {
            "line": 9,
            "desc": "Loop continues: coin = 20. 20 >= 20 is True, enter while loop.",
            "vars": {"coin": 20, "V": 20}
        },
        {
            "line": 13,
            "desc": "Subtract 20 from V. V = 20 - 20 = 0",
            "vars": {"coin": 20, "V": 0}
        },
        {
            "line": 15,
            "desc": "Increment coin_count. coin_count = 2",
            "vars": {"coin_count": 2}
        },
        {
            "line": 17,
            "desc": "Append 20 to chosen_coins. chosen_coins = [50, 20]",
            "vars": {"chosen_coins": "[50, 20]"}
        },
        {
            "line": 11,
            "desc": "Check V >= coin (0 >= 20). False, exit while loop.",
            "vars": {"V": 0}
        },
        {
            "line": 19,
            "desc": "Loop finishes, return coin_count and chosen_coins.",
            "vars": {"coin_count": 2, "chosen_coins": "[50, 20]"}
        }
    ]
}

# 3. Subsets II
dsa_sol_2["Subsets II"] = {
    "solution": {
        "title": "Subsets II",
        "problemStatement": "Given an integer array nums that may contain duplicates, return all possible subsets (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.",
        "examples": [
            {
                "input": "nums = [1, 2, 2]",
                "output": "[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]",
                "explanation": "All unique subsets of [1, 2, 2] are returned."
            }
        ],
        "constraints": [
            "1 <= len(nums) <= 10",
            "-10 <= nums[i] <= 10"
        ],
        "edgeCases": [
            "Array contains all duplicates like [2, 2, 2].",
            "Array has only 1 element.",
            "No duplicate elements in array."
        ],
        "followUps": [
            "Can you solve this iteratively instead of recursively?",
            "What is the time complexity of generating all subsets?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all possible subsets using recursion/backtracking or bitmasking, sort each subset, and add to a hash set to eliminate duplicates.",
                "algorithm": "1. Iterate from i = 0 to 2^n - 1.\n2. For each number i, build a subset based on the set bits of i.\n3. Sort the subset to normalize it.\n4. Add to a set to remove duplicates, and then return the elements of the set.",
                "code": "def subsetsWithDupBruteForce(nums):\n    # List to store all unique subsets\n    result_set = set()\n    # Length of the array\n    n = len(nums)\n    # Iterate through all 2^n possibilities\n    for i in range(1 << n):\n        # Temporary list for current subset\n        subset = []\n        for j in range(n):\n            # If the j-th bit is set, include nums[j]\n            if (i & (1 << j)) > 0:\n                # Append element to subset\n                subset.append(nums[j])\n        # Sort the subset to handle duplicates consistently\n        subset.sort()\n        # Convert to tuple and add to set\n        result_set.add(tuple(subset))\n    # Convert tuples back to lists\n    return [list(t) for t in result_set]",
                "complexity": {
                    "time": "O(N * 2^N)",
                    "space": "O(N * 2^N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort the array first. When backtracking, we decide which element to include. To avoid duplicate subsets, if we are at step `i` and have a duplicate element (nums[j] == nums[j-1] where j > i), we skip it.",
                "algorithm": "1. Sort the array so that duplicate elements are adjacent.\n2. Initialize an empty result list.\n3. Define a backtrack helper backtrack(start, current_subset).\n4. Append a copy of current_subset to result.\n5. Iterate i from start to len(nums) - 1.\n6. If i > start and nums[i] == nums[i-1], skip to avoid duplicate paths.\n7. Otherwise, push nums[i] to current_subset, recurse with backtrack(i + 1, current_subset), then pop.",
                "code": "def subsetsWithDup(nums):\n    # Sort the array so that duplicate elements are adjacent\n    nums.sort()\n    # List to store all the unique subsets\n    result = []\n    # Helper function for backtracking\n    def backtrack(start, current_subset):\n        # Append a copy of the current subset to the result\n        result.append(list(current_subset))\n        # Iterate through the array starting from 'start'\n        for i in range(start, len(nums)):\n            # Skip duplicates to ensure subsets are unique\n            if i > start and nums[i] == nums[i - 1]:\n                continue\n            # Include the current element in the subset\n            current_subset.append(nums[i])\n            # Move to the next element recursively\n            backtrack(i + 1, current_subset)\n            # Backtrack: remove the last added element\n            current_subset.pop()\n    # Invoke backtracking starting from index 0 and empty subset\n    backtrack(0, [])\n    # Return the accumulated list of subsets\n    return result",
                "complexity": {
                    "time": "O(N * 2^N)",
                    "space": "O(N) for recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort the array nums = [1, 2, 2]. Already sorted.",
            "vars": {"nums": "[1, 2, 2]"}
        },
        {
            "line": 5,
            "desc": "Initialize empty result list",
            "vars": {"result": "[]"}
        },
        {
            "line": 22,
            "desc": "Start backtrack with start = 0, current_subset = []",
            "vars": {"start": 0, "current_subset": "[]"}
        },
        {
            "line": 9,
            "desc": "Add [] to result list.",
            "vars": {"result": "[[]]"}
        },
        {
            "line": 11,
            "desc": "Loop starts: i = 0, range(0, 3)",
            "vars": {"i": 0, "start": 0}
        },
        {
            "line": 13,
            "desc": "Check i > start (0 > 0 is False). No duplicate skip.",
            "vars": {"i": 0}
        },
        {
            "line": 16,
            "desc": "Append nums[0] = 1. current_subset = [1]",
            "vars": {"current_subset": "[1]"}
        },
        {
            "line": 18,
            "desc": "Recurse backtrack(1, [1])",
            "vars": {"start": 1, "current_subset": "[1]"}
        },
        {
            "line": 9,
            "desc": "Add [1] to result list.",
            "vars": {"result": "[[], [1]]"}
        },
        {
            "line": 11,
            "desc": "Loop starts in backtrack(1): i = 1, range(1, 3)",
            "vars": {"i": 1, "start": 1}
        },
        {
            "line": 13,
            "desc": "Check i > start (1 > 1 is False).",
            "vars": {"i": 1}
        },
        {
            "line": 16,
            "desc": "Append nums[1] = 2. current_subset = [1, 2]",
            "vars": {"current_subset": "[1, 2]"}
        },
        {
            "line": 18,
            "desc": "Recurse backtrack(2, [1, 2])",
            "vars": {"start": 2, "current_subset": "[1, 2]"}
        },
        {
            "line": 9,
            "desc": "Add [1, 2] to result list.",
            "vars": {"result": "[[], [1], [1, 2]]"}
        },
        {
            "line": 11,
            "desc": "Loop starts in backtrack(2): i = 2, range(2, 3)",
            "vars": {"i": 2, "start": 2}
        },
        {
            "line": 16,
            "desc": "Append nums[2] = 2. current_subset = [1, 2, 2]",
            "vars": {"current_subset": "[1, 2, 2]"}
        },
        {
            "line": 18,
            "desc": "Recurse backtrack(3, [1, 2, 2])",
            "vars": {"start": 3}
        },
        {
            "line": 9,
            "desc": "Add [1, 2, 2] to result list.",
            "vars": {"result": "[[], [1], [1, 2], [1, 2, 2]]"}
        },
        {
            "line": 11,
            "desc": "Loop in backtrack(3) range(3, 3) is empty. Return.",
            "vars": {}
        },
        {
            "line": 20,
            "desc": "Backtrack: pop from [1, 2, 2] -> [1, 2]",
            "vars": {"current_subset": "[1, 2]"}
        },
        {
            "line": 20,
            "desc": "Backtrack: pop from [1, 2] -> [1]",
            "vars": {"current_subset": "[1]"}
        },
        {
            "line": 11,
            "desc": "Loop continue in backtrack(1): i = 2, range(1, 3)",
            "vars": {"i": 2, "start": 1}
        },
        {
            "line": 13,
            "desc": "i > start (2 > 1 is True) and nums[2] == nums[1] (2 == 2 is True). Skip!",
            "vars": {"i": 2, "nums[2]": 2, "nums[1]": 2}
        },
        {
            "line": 20,
            "desc": "Backtrack: pop from [1] -> []",
            "vars": {"current_subset": "[]"}
        },
        {
            "line": 11,
            "desc": "Loop continue in backtrack(0): i = 1, range(0, 3)",
            "vars": {"i": 1, "start": 0}
        },
        {
            "line": 13,
            "desc": "i > start (1 > 0 is True) and nums[1] == nums[0] (2 == 1 is False). Process.",
            "vars": {"i": 1}
        },
        {
            "line": 16,
            "desc": "Append nums[1] = 2. current_subset = [2]",
            "vars": {"current_subset": "[2]"}
        },
        {
            "line": 18,
            "desc": "Recurse backtrack(2, [2])",
            "vars": {"start": 2}
        },
        {
            "line": 9,
            "desc": "Add [2] to result.",
            "vars": {"result": "[..., [2]]"}
        },
        {
            "line": 24,
            "desc": "Complete backtrack steps and return final result.",
            "vars": {"result": "[[], [1], [1, 2], [1, 2, 2], [2], [2, 2]]"}
        }
    ]
}

# 4. Combination Sum
dsa_sol_2["Combination Sum"] = {
    "solution": {
        "title": "Combination Sum",
        "problemStatement": "Given an array of distinct integers candidates and a target integer target, return a list of all unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen from candidates an unlimited number of times.",
        "examples": [
            {
                "input": "candidates = [2, 3, 6, 7], target = 7",
                "output": "[[2, 2, 3], [7]]",
                "explanation": "2 and 3 can be chosen multiple times to sum to 7, and 7 itself can be chosen."
            }
        ],
        "constraints": [
            "1 <= len(candidates) <= 30",
            "2 <= candidates[i] <= 40",
            "All elements of candidates are distinct.",
            "1 <= target <= 40"
        ],
        "edgeCases": [
            "Target is smaller than the minimum element in candidates.",
            "Target can only be formed by using one element multiple times.",
            "No combination sums to target."
        ],
        "followUps": [
            "How does sorting candidates help in optimizing backtracking (early pruning)?",
            "Can you solve this problem iteratively?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Perform a recursive search (DFS) trying every candidate at each step. Track the path and the current sum. If the sum exceeds target, backtrack.",
                "algorithm": "1. Define recursive function dfs(index, path, current_sum).\n2. If current_sum == target, add path to result.\n3. If current_sum > target or index >= len(candidates), return.\n4. Include candidates[index] and call dfs(index, path, current_sum + candidates[index]).\n5. Exclude candidates[index] and call dfs(index + 1, path, current_sum).",
                "code": "def combinationSumBrute(candidates, target):\n    # List to store final combinations\n    result = []\n    # Helper DFS function\n    def dfs(index, path, current_sum):\n        # If we have reached the exact target, record path\n        if current_sum == target:\n            result.append(list(path))\n            return\n        # If current sum exceeds target or no more elements left, return\n        if current_sum > target or index >= len(candidates):\n            return\n        # Option 1: Take the current candidate (can reuse, index remains same)\n        path.append(candidates[index])\n        dfs(index, path, current_sum + candidates[index])\n        path.pop()\n        # Option 2: Skip the current candidate and move to next index\n        dfs(index + 1, path, current_sum)\n    # Start DFS traversal from index 0 with empty path\n    dfs(0, [], 0)\n    # Return result combinations\n    return result",
                "complexity": {
                    "time": "O(2^target)",
                    "space": "O(target) recursion depth"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort candidates first. We can then perform backtracking. If candidates[i] > remaining_target, we can immediately break out of the loop since all subsequent candidates are also too large. This prunes invalid branches early.",
                "algorithm": "1. Sort candidates in ascending order.\n2. Define backtrack(start, current_combination, remaining_target).\n3. If remaining_target is 0, add current_combination to results.\n4. Loop i from start to len(candidates) - 1.\n5. If candidates[i] > remaining_target, break (pruning).\n6. Else, append candidates[i] to current_combination, recurse backtrack(i, current_combination, remaining_target - candidates[i]), then pop.",
                "code": "def combinationSum(candidates, target):\n    # Sort candidates to allow for early pruning\n    candidates.sort()\n    # List to store all the valid combinations\n    result = []\n    # Helper function for backtracking\n    def backtrack(start, current_combination, remaining_target):\n        # If target is met, we found a valid combination\n        if remaining_target == 0:\n            result.append(list(current_combination))\n            return\n        # Iterate through candidates starting from 'start' index\n        for i in range(start, len(candidates)):\n            # If current candidate is greater than remaining target, we prune\n            if candidates[i] > remaining_target:\n                break\n            # Include the current candidate in the combination\n            current_combination.append(candidates[i])\n            # Call recursively, keeping 'i' as start since we can reuse elements\n            backtrack(i, current_combination, remaining_target - candidates[i])\n            # Backtrack: remove the last added candidate\n            current_combination.pop()\n    # Start backtracking with start=0, empty path, and full target\n    backtrack(0, [], target)\n    # Return all valid combinations\n    return result",
                "complexity": {
                    "time": "O(2^T) where T is target / min(candidates)",
                    "space": "O(T) for recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort candidates: [2, 3]",
            "vars": {"candidates": "[2, 3]"}
        },
        {
            "line": 5,
            "desc": "Initialize result list",
            "vars": {"result": "[]"}
        },
        {
            "line": 24,
            "desc": "Start backtrack with start = 0, current_combination = [], target = 5",
            "vars": {"start": 0, "current_combination": "[]", "remaining_target": 5}
        },
        {
            "line": 9,
            "desc": "Check remaining_target == 0. False.",
            "vars": {"remaining_target": 5}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 0, range(0, 2)",
            "vars": {"i": 0}
        },
        {
            "line": 15,
            "desc": "Check candidates[0] (2) > remaining_target (5). False.",
            "vars": {"candidates[0]": 2, "remaining_target": 5}
        },
        {
            "line": 18,
            "desc": "Append candidate 2. current_combination = [2]",
            "vars": {"current_combination": "[2]"}
        },
        {
            "line": 20,
            "desc": "Recurse backtrack(0, [2], 3)",
            "vars": {"start": 0, "remaining_target": 3}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 0, range(0, 2)",
            "vars": {"i": 0}
        },
        {
            "line": 15,
            "desc": "Check candidates[0] (2) > remaining_target (3). False.",
            "vars": {"remaining_target": 3}
        },
        {
            "line": 18,
            "desc": "Append candidate 2. current_combination = [2, 2]",
            "vars": {"current_combination": "[2, 2]"}
        },
        {
            "line": 20,
            "desc": "Recurse backtrack(0, [2, 2], 1)",
            "vars": {"start": 0, "remaining_target": 1}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 0, range(0, 2)",
            "vars": {"i": 0}
        },
        {
            "line": 15,
            "desc": "Check candidates[0] (2) > remaining_target (1). True! Break loop (Prune).",
            "vars": {"candidates[0]": 2, "remaining_target": 1}
        },
        {
            "line": 22,
            "desc": "Backtrack: pop from [2, 2] -> [2]",
            "vars": {"current_combination": "[2]"}
        },
        {
            "line": 13,
            "desc": "Loop continues in backtrack(0, [2], 3): i = 1, range(0, 2)",
            "vars": {"i": 1}
        },
        {
            "line": 15,
            "desc": "Check candidates[1] (3) > remaining_target (3). False.",
            "vars": {"candidates[1]": 3, "remaining_target": 3}
        },
        {
            "line": 18,
            "desc": "Append candidate 3. current_combination = [2, 3]",
            "vars": {"current_combination": "[2, 3]"}
        },
        {
            "line": 20,
            "desc": "Recurse backtrack(1, [2, 3], 0)",
            "vars": {"start": 1, "remaining_target": 0}
        },
        {
            "line": 9,
            "desc": "remaining_target == 0. Add [2, 3] to result.",
            "vars": {"result": "[[2, 3]]"}
        },
        {
            "line": 22,
            "desc": "Backtrack: pop from [2, 3] -> [2]",
            "vars": {"current_combination": "[2]"}
        },
        {
            "line": 22,
            "desc": "Backtrack: pop from [2] -> []",
            "vars": {"current_combination": "[]"}
        },
        {
            "line": 13,
            "desc": "Loop continue in backtrack(0, [], 5): i = 1, range(0, 2)",
            "vars": {"i": 1}
        },
        {
            "line": 18,
            "desc": "Append candidate 3. current_combination = [3]",
            "vars": {"current_combination": "[3]"}
        },
        {
            "line": 20,
            "desc": "Recurse backtrack(1, [3], 2)",
            "vars": {"start": 1, "remaining_target": 2}
        },
        {
            "line": 15,
            "desc": "Check candidates[1] (3) > remaining_target (2). True. Break (Prune).",
            "vars": {"candidates[1]": 3}
        },
        {
            "line": 22,
            "desc": "Backtrack: pop from [3] -> []",
            "vars": {"current_combination": "[]"}
        },
        {
            "line": 26,
            "desc": "Return final result.",
            "vars": {"result": "[[2, 3]]"}
        }
    ]
}

# 5. Combination Sum II
dsa_sol_2["Combination Sum II"] = {
    "solution": {
        "title": "Combination Sum II",
        "problemStatement": "Given a collection of candidate numbers (candidates) and a target number (target), find all unique combinations in candidates where the candidate numbers sum to target. Each number in candidates may only be used once in the combination. Note: The solution set must not contain duplicate combinations.",
        "examples": [
            {
                "input": "candidates = [10, 1, 2, 7, 6, 1, 5], target = 8",
                "output": "[[1, 1, 6], [1, 2, 5], [1, 7], [2, 6]]",
                "explanation": "Each candidate is used at most once, and all unique combinations are returned."
            }
        ],
        "constraints": [
            "1 <= len(candidates) <= 100",
            "1 <= candidates[i] <= 50",
            "1 <= target <= 30"
        ],
        "edgeCases": [
            "No combination can sum to target.",
            "Array contains duplicate elements (handled correctly to avoid duplicates).",
            "Sum of all elements is smaller than target."
        ],
        "followUps": [
            "Why is the duplicate checking condition i > start necessary in the loop?",
            "Can you optimize recursion space by avoiding path copies?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all possible subset combinations recursively, calculate their sums, sort each combination, and add to a set to filter duplicates.",
                "algorithm": "1. Sort candidates to structure traversal.\n2. Run recursive DFS. At each index, decide whether to include the element or not.\n3. Keep track of current sum. If sum == target, sort current path, convert to tuple, and add to set.\n4. Convert set elements back to lists and return.",
                "code": "def combinationSum2Brute(candidates, target):\n    # Sort candidates first\n    candidates.sort()\n    # Set to store unique combination tuples\n    result_set = set()\n    # Helper DFS function\n    def dfs(index, path, current_sum):\n        # If we have reached the exact target, record path\n        if current_sum == target:\n            result_set.add(tuple(path))\n            return\n        # Base Case: out of range or sum exceeds target\n        if current_sum > target or index >= len(candidates):\n            return\n        # Option 1: Include current candidate\n        path.append(candidates[index])\n        dfs(index + 1, path, current_sum + candidates[index])\n        path.pop()\n        # Option 2: Exclude current candidate\n        dfs(index + 1, path, current_sum)\n    # Start DFS from index 0 with empty path\n    dfs(0, [], 0)\n    # Convert tuples back to lists\n    return [list(t) for t in result_set]",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(2^N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort candidates. During backtracking, we loop through candidates from 'start' index. If candidates[i] == candidates[i-1] for i > start, we skip it since that choice would lead to duplicate combinations.",
                "algorithm": "1. Sort candidates in ascending order.\n2. Define backtrack(start, current_combination, remaining_target).\n3. If remaining_target == 0, add a copy of current_combination to result.\n4. Loop i from start to len(candidates) - 1.\n5. If i > start and candidates[i] == candidates[i-1], skip.\n6. If candidates[i] > remaining_target, break (pruning).\n7. Include candidates[i], recurse backtrack(i + 1, current_combination, remaining_target - candidates[i]), then pop.",
                "code": "def combinationSum2(candidates, target):\n    # Sort candidates to handle duplicates and allow early pruning\n    candidates.sort()\n    # List to store the valid unique combinations\n    result = []\n    # Helper function for backtracking\n    def backtrack(start, current_combination, remaining_target):\n        # If target is met, add combination to results\n        if remaining_target == 0:\n            result.append(list(current_combination))\n            return\n        # Iterate through candidates from the 'start' index\n        for i in range(start, len(candidates)):\n            # Skip duplicates to avoid duplicate combinations\n            if i > start and candidates[i] == candidates[i - 1]:\n                continue\n            # Early pruning: if candidate is larger than target, no need to check further\n            if candidates[i] > remaining_target:\n                break\n            # Include the current candidate\n            current_combination.append(candidates[i])\n            # Move to the next element recursively (index i + 1)\n            backtrack(i + 1, current_combination, remaining_target - candidates[i])\n            # Backtrack: remove the last added candidate\n            current_combination.pop()\n    # Begin backtracking from index 0 with empty path\n    backtrack(0, [], target)\n    # Return results\n    return result",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N) for recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort candidates: [1, 1, 2]",
            "vars": {"candidates": "[1, 1, 2]"}
        },
        {
            "line": 5,
            "desc": "Initialize result list",
            "vars": {"result": "[]"}
        },
        {
            "line": 27,
            "desc": "Start backtrack with start = 0, current_combination = [], target = 3",
            "vars": {"start": 0, "current_combination": "[]", "remaining_target": 3}
        },
        {
            "line": 9,
            "desc": "remaining_target == 0 is False.",
            "vars": {"remaining_target": 3}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 0, range(0, 3)",
            "vars": {"i": 0}
        },
        {
            "line": 15,
            "desc": "Check i > start (0 > 0 is False). No duplicate skip.",
            "vars": {"i": 0}
        },
        {
            "line": 18,
            "desc": "Check candidates[0] (1) > remaining_target (3). False.",
            "vars": {"remaining_target": 3}
        },
        {
            "line": 21,
            "desc": "Append candidate 1. current_combination = [1]",
            "vars": {"current_combination": "[1]"}
        },
        {
            "line": 23,
            "desc": "Recurse backtrack(1, [1], 2)",
            "vars": {"start": 1, "remaining_target": 2}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 1, range(1, 3)",
            "vars": {"i": 1}
        },
        {
            "line": 15,
            "desc": "Check i > start (1 > 1 is False). No duplicate skip.",
            "vars": {"i": 1}
        },
        {
            "line": 21,
            "desc": "Append candidate 1. current_combination = [1, 1]",
            "vars": {"current_combination": "[1, 1]"}
        },
        {
            "line": 23,
            "desc": "Recurse backtrack(2, [1, 1], 1)",
            "vars": {"start": 2, "remaining_target": 1}
        },
        {
            "line": 13,
            "desc": "Loop starts: i = 2, range(2, 3)",
            "vars": {"i": 2}
        },
        {
            "line": 18,
            "desc": "Check candidates[2] (2) > remaining_target (1). True. Break loop.",
            "vars": {"candidates[2]": 2, "remaining_target": 1}
        },
        {
            "line": 25,
            "desc": "Backtrack: pop from [1, 1] -> [1]",
            "vars": {"current_combination": "[1]"}
        },
        {
            "line": 13,
            "desc": "Loop continues in backtrack(1): i = 2, range(1, 3)",
            "vars": {"i": 2}
        },
        {
            "line": 15,
            "desc": "i > start (2 > 1 is True) and candidates[2] == candidates[1] (2 == 1 is False). Proceed.",
            "vars": {"i": 2}
        },
        {
            "line": 21,
            "desc": "Append candidate 2. current_combination = [1, 2]",
            "vars": {"current_combination": "[1, 2]"}
        },
        {
            "line": 23,
            "desc": "Recurse backtrack(3, [1, 2], 0)",
            "vars": {"start": 3, "remaining_target": 0}
        },
        {
            "line": 9,
            "desc": "remaining_target == 0 is True. Add [1, 2] to result.",
            "vars": {"result": "[[1, 2]]"}
        },
        {
            "line": 25,
            "desc": "Backtrack: pop from [1, 2] -> [1]",
            "vars": {"current_combination": "[1]"}
        },
        {
            "line": 25,
            "desc": "Backtrack: pop from [1] -> []",
            "vars": {"current_combination": "[]"}
        },
        {
            "line": 13,
            "desc": "Loop continues in backtrack(0): i = 1, range(0, 3)",
            "vars": {"i": 1}
        },
        {
            "line": 15,
            "desc": "i > start (1 > 0 is True) and candidates[1] == candidates[0] (1 == 1 is True). Duplicate! Skip loop iteration.",
            "vars": {"i": 1, "candidates[1]": 1, "candidates[0]": 1}
        },
        {
            "line": 13,
            "desc": "Loop continues in backtrack(0): i = 2, range(0, 3)",
            "vars": {"i": 2}
        },
        {
            "line": 21,
            "desc": "Append candidate 2. current_combination = [2]",
            "vars": {"current_combination": "[2]"}
        },
        {
            "line": 23,
            "desc": "Recurse backtrack(3, [2], 1)",
            "vars": {"start": 3}
        },
        {
            "line": 25,
            "desc": "Backtrack: pop from [2] -> []",
            "vars": {"current_combination": "[]"}
        },
        {
            "line": 29,
            "desc": "Backtrack completes, return results.",
            "vars": {"result": "[[1, 2]]"}
        }
    ]
}

# 6. Palindrome Partitioning
dsa_sol_2["Palindrome Partitioning"] = {
    "solution": {
        "title": "Palindrome Partitioning",
        "problemStatement": "Given a string s, partition s such that every substring of the partition is a palindrome. Return all possible palindrome partitioning of s.",
        "examples": [
            {
                "input": "s = \"aab\"",
                "output": "[[\"a\", \"a\", \"b\"], [\"aa\", \"b\"]]",
                "explanation": "Both partitions have only palindromic substrings."
            }
        ],
        "constraints": [
            "1 <= len(s) <= 16",
            "s contains only lowercase English letters."
        ],
        "edgeCases": [
            "s has only 1 character.",
            "s consists of all identical characters (e.g. \"aaa\").",
            "s has no palindromic substrings of length > 1."
        ],
        "followUps": [
            "How can we optimize the palindrome check using dynamic programming?",
            "What is the worst-case space complexity of recursion here?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all possible partitioning schemes (2^(N-1) schemes), then verify each substring in the partition. If all are palindromes, add to result.",
                "algorithm": "1. Generate all ways to split string s recursively.\n2. For each scheme, check if all split substrings are palindromes.\n3. If yes, add to result.",
                "code": "def partitionBrute(s):\n    # List to store results\n    result = []\n    # Check if a substring is a palindrome\n    def is_palindrome(sub):\n        return sub == sub[::-1]\n    # Helper to generate partitions\n    def solve(index, current_partition):\n        if index == len(s):\n            # Verify all parts are palindromes\n            if all(is_palindrome(sub) for sub in current_partition):\n                result.append(list(current_partition))\n            return\n        # Try splits at different positions\n        for i in range(index, len(s)):\n            current_partition.append(s[index:i+1])\n            solve(i + 1, current_partition)\n            current_partition.pop()\n    # Invoke solver\n    solve(0, [])\n    return result",
                "complexity": {
                    "time": "O(N * 2^N)",
                    "space": "O(N * 2^N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use backtracking. Only recurse to find subsequent partitions if the current prefix is a palindrome. This prunes invalid partitioning branches early.",
                "algorithm": "1. Define is_palindrome(start, end) helper.\n2. Define backtrack(start, current_partition).\n3. If start reaches len(s), append current_partition to results.\n4. Loop i from start to len(s) - 1.\n5. If is_palindrome(start, i) is True, append s[start:i+1] to current_partition, recurse backtrack(i + 1, current_partition), then pop.",
                "code": "def partition(s):\n    # List to store all valid partitioning results\n    result = []\n    # Helper function to check if a string segment is a palindrome\n    def is_palindrome(start_idx, end_idx):\n        while start_idx < end_idx:\n            if s[start_idx] != s[end_idx]:\n                return False\n            start_idx += 1\n            end_idx -= 1\n        return True\n    # Helper function for backtracking\n    def backtrack(start, current_partition):\n        # If we have reached the end of the string, record the partition\n        if start == len(s):\n            result.append(list(current_partition))\n            return\n        # Explore all possible substring partitions starting from 'start'\n        for i in range(start, len(s)):\n            # If the current substring s[start:i+1] is a palindrome\n            if is_palindrome(start, i):\n                # Append the substring to the current partition path\n                current_partition.append(s[start:i+1])\n                # Recurse for the remaining substring starting at index i + 1\n                backtrack(i + 1, current_partition)\n                # Backtrack: remove the last added substring\n                current_partition.pop()\n    # Begin backtracking from index 0 with an empty partition\n    backtrack(0, [])\n    # Return all valid palindrome partitions\n    return result",
                "complexity": {
                    "time": "O(N * 2^N)",
                    "space": "O(N) for recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize result list to empty.",
            "vars": {"result": "[]"}
        },
        {
            "line": 29,
            "desc": "Start backtrack with start = 0, current_partition = []",
            "vars": {"start": 0, "current_partition": "[]"}
        },
        {
            "line": 15,
            "desc": "Check start == len(s) (0 == 3). False.",
            "vars": {"start": 0}
        },
        {
            "line": 19,
            "desc": "Loop starts: i = 0, range(0, 3)",
            "vars": {"i": 0}
        },
        {
            "line": 21,
            "desc": "Check is_palindrome(0, 0) for substring 'a'. True.",
            "vars": {"substring": "a"}
        },
        {
            "line": 23,
            "desc": "Append 'a' to current_partition. current_partition = ['a']",
            "vars": {"current_partition": "['a']"}
        },
        {
            "line": 25,
            "desc": "Recurse backtrack(1, ['a'])",
            "vars": {"start": 1}
        },
        {
            "line": 19,
            "desc": "Loop starts in backtrack(1): i = 1, range(1, 3)",
            "vars": {"i": 1}
        },
        {
            "line": 21,
            "desc": "Check is_palindrome(1, 1) for substring 'a'. True.",
            "vars": {"substring": "a"}
        },
        {
            "line": 23,
            "desc": "Append 'a'. current_partition = ['a', 'a']",
            "vars": {"current_partition": "['a', 'a']"}
        },
        {
            "line": 25,
            "desc": "Recurse backtrack(2, ['a', 'a'])",
            "vars": {"start": 2}
        },
        {
            "line": 19,
            "desc": "Loop starts in backtrack(2): i = 2, range(2, 3)",
            "vars": {"i": 2}
        },
        {
            "line": 21,
            "desc": "Check is_palindrome(2, 2) for substring 'b'. True.",
            "vars": {"substring": "b"}
        },
        {
            "line": 23,
            "desc": "Append 'b'. current_partition = ['a', 'a', 'b']",
            "vars": {"current_partition": "['a', 'a', 'b']"}
        },
        {
            "line": 25,
            "desc": "Recurse backtrack(3, ['a', 'a', 'b'])",
            "vars": {"start": 3}
        },
        {
            "line": 15,
            "desc": "start == len(s) (3 == 3). Add ['a', 'a', 'b'] to result.",
            "vars": {"result": "[['a', 'a', 'b']]"}
        },
        {
            "line": 27,
            "desc": "Backtrack: pop 'b' -> ['a', 'a']",
            "vars": {"current_partition": "['a', 'a']"}
        },
        {
            "line": 27,
            "desc": "Backtrack: pop 'a' -> ['a']",
            "vars": {"current_partition": "['a']"}
        },
        {
            "line": 19,
            "desc": "Loop continues in backtrack(1): i = 2, range(1, 3)",
            "vars": {"i": 2}
        },
        {
            "line": 21,
            "desc": "Check is_palindrome(1, 2) for substring 'ab'. False. No recursion.",
            "vars": {"substring": "ab"}
        },
        {
            "line": 27,
            "desc": "Backtrack: pop 'a' -> []",
            "vars": {"current_partition": "[]"}
        },
        {
            "line": 19,
            "desc": "Loop continues in backtrack(0): i = 1, range(0, 3)",
            "vars": {"i": 1}
        },
        {
            "line": 21,
            "desc": "Check is_palindrome(0, 1) for substring 'aa'. True.",
            "vars": {"substring": "aa"}
        },
        {
            "line": 23,
            "desc": "Append 'aa'. current_partition = ['aa']",
            "vars": {"current_partition": "['aa']"}
        },
        {
            "line": 25,
            "desc": "Recurse backtrack(2, ['aa'])",
            "vars": {"start": 2}
        },
        {
            "line": 19,
            "desc": "Loop starts in backtrack(2): i = 2, range(2, 3)",
            "vars": {"i": 2}
        },
        {
            "line": 21,
            "desc": "Check is_palindrome(2, 2) for substring 'b'. True.",
            "vars": {"substring": "b"}
        },
        {
            "line": 23,
            "desc": "Append 'b'. current_partition = ['aa', 'b']",
            "vars": {"current_partition": "['aa', 'b']"}
        },
        {
            "line": 25,
            "desc": "Recurse backtrack(3, ['aa', 'b'])",
            "vars": {"start": 3}
        },
        {
            "line": 15,
            "desc": "start == len(s) (3 == 3). Add ['aa', 'b'] to result.",
            "vars": {"result": "[['a', 'a', 'b'], ['aa', 'b']]"}
        },
        {
            "line": 31,
            "desc": "Backtracking complete. Return result.",
            "vars": {"result": "[['a', 'a', 'b'], ['aa', 'b']]"}
        }
    ]
}

# 7. K-th Permutation Sequence
dsa_sol_2["K-th Permutation Sequence"] = {
    "solution": {
        "title": "K-th Permutation Sequence",
        "problemStatement": "The set [1, 2, 3, ..., n] contains a total of n! unique permutations. By listing and labeling all of the permutations in order, we get the sorted sequence. Given n and k, return the k-th permutation sequence.",
        "examples": [
            {
                "input": "n = 4, k = 9",
                "output": "\"2314\"",
                "explanation": "The sequence of permutations for n=4 starts with 1xxx (6 perms), then 2xxx (6 perms). The 9th permutation is the 3rd permutation starting with 2, which is '2314'."
            }
        ],
        "constraints": [
            "1 <= n <= 9",
            "1 <= k <= n!"
        ],
        "edgeCases": [
            "n = 1.",
            "k = 1 (first permutation).",
            "k = n! (last permutation)."
        ],
        "followUps": [
            "Can you solve this without computing factorials at each step?",
            "How would you generalize this to permutations of a list with duplicate elements?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all permutations of numbers from 1 to n recursively, sort them lexicographically, and return the k-th permutation.",
                "algorithm": "1. Build number list [1, 2, ..., n].\n2. Recursively generate all permutations.\n3. Sort the resulting list of strings.\n4. Return the k-th element.",
                "code": "def getPermutationBrute(n, k):\n    # Generate all permutations recursively\n    def generate(nums):\n        if len(nums) == 0:\n            return [[]]\n        res = []\n        for i in range(len(nums)):\n            current = nums[i]\n            remaining = nums[:i] + nums[i+1:]\n            for p in generate(remaining):\n                res.append([current] + p)\n        return res\n    # List of numbers\n    nums = [str(i) for i in range(1, n + 1)]\n    # Generate all permutations\n    all_perms = generate(nums)\n    # Sort permutations\n    all_perms.sort()\n    # Return the k-th permutation\n    return \"\".join(all_perms[k - 1])",
                "complexity": {
                    "time": "O(N! * N)",
                    "space": "O(N! * N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "We can determine the digits of the permutation one by one. The total number of permutations starting with a specific first digit is (n-1)!. Thus, the first digit index is k // (n-1)!. We update k to k % (n-1)!, remove the chosen digit, and repeat for the next position.",
                "algorithm": "1. Store numbers 1 to n in a list.\n2. Compute (n-1)! factorial.\n3. Decrement k by 1 to make it 0-indexed.\n4. Loop to determine each digit: index = k // factorial, append numbers[index] to result, remove numbers[index], update k = k % factorial, update factorial = factorial // len(numbers).\n5. Return the result string.",
                "code": "import math\n\ndef getPermutation(n, k):\n    # List to store numbers 1 to n\n    numbers = []\n    # Factorial value accumulator\n    fact = 1\n    # Initialize numbers list and calculate (n-1)!\n    for i in range(1, n):\n        fact = fact * i\n        numbers.append(i)\n    # Add the last number n to the list\n    numbers.append(n)\n    # Convert k to 0-indexed for division/modulo arithmetic\n    k = k - 1\n    # String to store the final permutation sequence\n    ans = \"\"\n    # Process digit by digit\n    while True:\n        # Determine the index of the current digit in the remaining numbers\n        index = k // fact\n        # Append the selected number to answer string\n        ans += str(numbers[index])\n        # Remove the selected number from the list\n        numbers.pop(index)\n        # If no more numbers are left, break\n        if len(numbers) == 0:\n            break\n        # Update k for the next position\n        k = k % fact\n        # Calculate the factorial for the next remaining count\n        fact = fact // len(numbers)\n    # Return the k-th permutation string\n    return ans",
                "complexity": {
                    "time": "O(N^2) due to list popping",
                    "space": "O(N) to store list"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 9,
            "desc": "Calculate factorial (n-1)! for n=4 -> 3! = 6, and populate numbers = [1, 2, 3].",
            "vars": {"numbers": "[1, 2, 3]", "fact": 6}
        },
        {
            "line": 13,
            "desc": "Append last number (4) to list.",
            "vars": {"numbers": "[1, 2, 3, 4]"}
        },
        {
            "line": 15,
            "desc": "Set k = k - 1 to make it 0-indexed. k = 9 - 1 = 8.",
            "vars": {"k": 8}
        },
        {
            "line": 17,
            "desc": "Initialize empty answer string.",
            "vars": {"ans": "\"\""}
        },
        {
            "line": 19,
            "desc": "Enter while loop. Determine first digit index. index = 8 // 6 = 1.",
            "vars": {"index": 1, "k": 8, "fact": 6}
        },
        {
            "line": 23,
            "desc": "Append numbers[1] = 2 to answer. ans = '2'.",
            "vars": {"ans": "\"2\""}
        },
        {
            "line": 25,
            "desc": "Pop 2 from list. Remaining numbers = [1, 3, 4].",
            "vars": {"numbers": "[1, 3, 4]"}
        },
        {
            "line": 27,
            "desc": "Check len(numbers) == 0. False.",
            "vars": {}
        },
        {
            "line": 30,
            "desc": "Update k. k = 8 % 6 = 2.",
            "vars": {"k": 2}
        },
        {
            "line": 32,
            "desc": "Update fact. fact = 6 // 3 = 2.",
            "vars": {"fact": 2}
        },
        {
            "line": 19,
            "desc": "Loop continues. index = 2 // 2 = 1.",
            "vars": {"index": 1, "k": 2, "fact": 2}
        },
        {
            "line": 23,
            "desc": "Append numbers[1] = 3. ans = '23'.",
            "vars": {"ans": "\"23\""}
        },
        {
            "line": 25,
            "desc": "Pop 3 from list. Remaining numbers = [1, 4].",
            "vars": {"numbers": "[1, 4]"}
        },
        {
            "line": 30,
            "desc": "Update k. k = 2 % 2 = 0.",
            "vars": {"k": 0}
        },
        {
            "line": 32,
            "desc": "Update fact. fact = 2 // 2 = 1.",
            "vars": {"fact": 1}
        },
        {
            "line": 19,
            "desc": "Loop continues. index = 0 // 1 = 0.",
            "vars": {"index": 0, "k": 0, "fact": 1}
        },
        {
            "line": 23,
            "desc": "Append numbers[0] = 1. ans = '231'.",
            "vars": {"ans": "\"231\""}
        },
        {
            "line": 25,
            "desc": "Pop 1 from list. Remaining numbers = [4].",
            "vars": {"numbers": "[4]"}
        },
        {
            "line": 30,
            "desc": "Update k. k = 0 % 1 = 0.",
            "vars": {"k": 0}
        },
        {
            "line": 32,
            "desc": "Update fact. fact = 1 // 1 = 1.",
            "vars": {"fact": 1}
        },
        {
            "line": 19,
            "desc": "Loop continues. index = 0 // 1 = 0.",
            "vars": {"index": 0}
        },
        {
            "line": 23,
            "desc": "Append numbers[0] = 4. ans = '2314'.",
            "vars": {"ans": "\"2314\""}
        },
        {
            "line": 25,
            "desc": "Pop 4. Remaining numbers = [].",
            "vars": {"numbers": "[]"}
        },
        {
            "line": 27,
            "desc": "Check len(numbers) == 0. True. Break loop.",
            "vars": {}
        },
        {
            "line": 34,
            "desc": "Return final answer string.",
            "vars": {"ans": "\"2314\""}
        }
    ]
}

# 8. Sudoku Solver
dsa_sol_2["Sudoku Solver"] = {
    "solution": {
        "title": "Sudoku Solver",
        "problemStatement": "Write a program to solve a Sudoku puzzle by filling the empty cells. A sudoku solution must satisfy row, column, and 3x3 box constraints.",
        "examples": [
            {
                "input": "board = [[\"5\",\"3\",\".\",\".\",\"7\",...]]",
                "output": "(solves board in-place)",
                "explanation": "The function modifies the 2D list in place to fill all empty cells marked with '.'."
            }
        ],
        "constraints": [
            "board.length == 9",
            "board[i].length == 9",
            "board[i][j] is a digit or '.'"
        ],
        "edgeCases": [
            "Board requiring deep backtracks.",
            "Partially solved board."
        ],
        "followUps": [
            "How can we choose the next cell to fill to minimize the search space (MRV heuristic)?",
            "Can we optimize row/col/box lookups using bitmasking?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all possible digit configurations for empty cells, then check which configuration is valid.",
                "algorithm": "1. Find all empty cells.\n2. Try all 9^k combinations.\n3. Validate the board at the end.",
                "code": "# Brute force represents trying all possible digit assignments\n# and then verifying validity. Since it is extremely slow, we represent the outline:\ndef solveSudokuBrute(board):\n    # Helper to check if the entire board is valid\n    def isBoardValid():\n        # Check row, col, and box rules for all cells\n        return True\n    # Place digits recursively and check validity at the end\n    def backtrack(r, c):\n        if r == 9:\n            return isBoardValid()\n        next_r = r + 1 if c == 8 else r\n        next_c = 0 if c == 8 else c + 1\n        if board[r][c] != '.':\n            return backtrack(next_r, next_c)\n        for digit in '123456789':\n            board[r][c] = digit\n            if backtrack(next_r, next_c):\n                return True\n            board[r][c] = '.'\n        return False\n    backtrack(0, 0)",
                "complexity": {
                    "time": "O(9^81)",
                    "space": "O(81) call stack"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use backtracking with pruning. For each empty cell, try placing a digit from 1 to 9. Check if placing this digit is valid in the current row, column, and 3x3 subgrid. If valid, place the digit and recursively call solver. If it fails downstream, backtrack.",
                "algorithm": "1. Scan the board for empty cell ('.').\n2. If no empty cell is found, return True (solved).\n3. For the empty cell (i, j), loop character 'c' from '1' to '9'.\n4. If isSafe(i, j, c) is True, place board[i][j] = c.\n5. Call solve() recursively. If solve() returns True, return True.\n6. Otherwise, backtrack: board[i][j] = '.'.\n7. If no digit fits, return False.",
                "code": "def solveSudoku(board):\n    # Helper function to check if placing char 'c' is valid\n    def isValid(row, col, c):\n        # Check row, column and 3x3 grid\n        for i in range(9):\n            # Check row for duplicate\n            if board[i][col] == c:\n                return False\n            # Check column for duplicate\n            if board[row][i] == c:\n                return False\n            # Check 3x3 box for duplicate\n            box_row = 3 * (row // 3) + i // 3\n            box_col = 3 * (col // 3) + i % 3\n            if board[box_row][box_col] == c:\n                return False\n        return True\n\n    # Main recursive solver function\n    def solve():\n        for i in range(len(board)):\n            for j in range(len(board[0])):\n                # Check if cell is empty\n                if board[i][j] == '.':\n                    # Try placing characters '1' to '9'\n                    for c in '123456789':\n                        # If valid to place\n                        if isValid(i, j, c):\n                            # Place character on the board\n                            board[i][j] = c\n                            # Recurse to solve next cells\n                            if solve():\n                                return True\n                            else:\n                                # Backtrack: reset cell if it fails later\n                                board[i][j] = '.'\n                    # Return False if no character 1-9 fits here\n                    return False\n        # Board is completely solved\n        return True\n\n    # Trigger the solver\n    solve()",
                "complexity": {
                    "time": "O(9^(R*C))",
                    "space": "O(R*C) recursion depth"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 43,
            "desc": "Trigger solve() function.",
            "vars": {}
        },
        {
            "line": 21,
            "desc": "Scan board. Row 0, Col 2 is empty cell ('.').",
            "vars": {"row": 0, "col": 2}
        },
        {
            "line": 26,
            "desc": "Try digit '1' for empty cell (0, 2).",
            "vars": {"c": "1"}
        },
        {
            "line": 28,
            "desc": "Check isValid(0, 2, '1'). Finds '1' already exists in Row 0 or Col 2. Returns False.",
            "vars": {"isValid": False}
        },
        {
            "line": 26,
            "desc": "Try next digit '2' for cell (0, 2).",
            "vars": {"c": "2"}
        },
        {
            "line": 28,
            "desc": "Check isValid(0, 2, '2'). No duplicate found. Returns True.",
            "vars": {"isValid": True}
        },
        {
            "line": 30,
            "desc": "Place '2' on board. board[0][2] = '2'.",
            "vars": {"board[0][2]": "2"}
        },
        {
            "line": 32,
            "desc": "Recurse solve() to find solution for remaining cells.",
            "vars": {}
        }
    ]
}

# 9. M Coloring Problem
dsa_sol_2["M Coloring Problem"] = {
    "solution": {
        "title": "M Coloring Problem",
        "problemStatement": "Given an undirected graph represented as an adjacency matrix and an integer M, determine if the graph can be colored with at most M colors such that no two adjacent vertices are colored with the same color.",
        "examples": [
            {
                "input": "graph = [[0, 1], [1, 0]], m = 2, N = 2",
                "output": "True",
                "explanation": "Color vertex 0 with color 1, vertex 1 with color 2. Safe."
            }
        ],
        "constraints": [
            "1 <= N <= 20",
            "1 <= M <= N"
        ],
        "edgeCases": [
            "Disconnected graph.",
            "Complete graph (requires N colors).",
            "Graph with no edges (can be colored with 1 color)."
        ],
        "followUps": [
            "Can you count the total number of valid colorings?",
            "What is the minimal number of colors needed to color any planar graph?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Try all possible color combinations for all vertices (M^N combinations), then check which one is valid.",
                "algorithm": "1. Generate all color assignments using recursion.\n2. Validate that no adjacent vertices share colors.\n3. Return True if any valid assignment is found.",
                "code": "def graphColoringBrute(graph, m, N):\n    # Helper to check if current coloring is valid\n    def isValid(color):\n        for i in range(N):\n            for j in range(N):\n                # If there is an edge and colors are identical, invalid\n                if graph[i][j] == 1 and color[i] == color[j] and i != j:\n                    return False\n        return True\n    \n    # Recurse to try all colorings\n    def solve(vertex, color):\n        if vertex == N:\n            return isValid(color)\n        \n        # Try all colors for current vertex\n        for col in range(1, m + 1):\n            color[vertex] = col\n            if solve(vertex + 1, color):\n                return True\n            color[vertex] = 0\n        return False\n    \n    color = [0] * N\n    return solve(0, color)",
                "complexity": {
                    "time": "O(M^N * N^2)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use backtracking vertex by vertex. For vertex v, try coloring it with colors 1 to M. Check if safe (no neighbors have the same color). If safe, assign and recurse. If it fails later, backtrack.",
                "algorithm": "1. Create color array of size N initialized to 0.\n2. Define recursive solve(v).\n3. If v == N, return True.\n4. Loop color col from 1 to M.\n5. If isSafe(v, col) is True, assign color[v] = col.\n6. Recurse solve(v+1). If True, return True.\n7. Else, backtrack color[v] = 0.\n8. Return False if no color works.",
                "code": "def graphColoring(graph, m, N):\n    # Array to store color assigned to each vertex\n    color = [0] * N\n    \n    # Helper function to check if it's safe to color vertex 'v' with color 'col'\n    def isSafe(v, col):\n        # Check all other vertices\n        for i in range(N):\n            # If there is an edge and the neighbor has the same color, it is not safe\n            if graph[v][i] == 1 and color[i] == col:\n                return False\n        # Safe to color\n        return True\n\n    # Recursive function to solve coloring problem\n    def solve(v):\n        # Base Case: If all vertices are colored, return True\n        if v == N:\n            return True\n        # Try different colors for vertex v\n        for col in range(1, m + 1):\n            # Check if assigning color 'col' is safe\n            if isSafe(v, col):\n                # Assign color to vertex v\n                color[v] = col\n                # Recurse to color the rest of the vertices\n                if solve(v + 1):\n                    return True\n                # Backtrack: Reset color assignment\n                color[v] = 0\n        # If no color can be assigned, return False\n        return False\n\n    # Start solver from vertex 0\n    return solve(0)",
                "complexity": {
                    "time": "O(M^N)",
                    "space": "O(N) recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 35,
            "desc": "Start solver from vertex 0.",
            "vars": {"v": 0, "color": "[0, 0]"}
        },
        {
            "line": 18,
            "desc": "v == N check (0 == 2). False.",
            "vars": {"v": 0}
        },
        {
            "line": 21,
            "desc": "Loop color col = 1.",
            "vars": {"col": 1}
        },
        {
            "line": 23,
            "desc": "Check isSafe(0, 1). Neighbors of 0 are uncolored (color 0). Returns True.",
            "vars": {"isSafe": True}
        },
        {
            "line": 25,
            "desc": "Assign color[0] = 1.",
            "vars": {"color": "[1, 0]"}
        },
        {
            "line": 27,
            "desc": "Recurse solve(1).",
            "vars": {"v": 1}
        },
        {
            "line": 21,
            "desc": "Loop color col = 1 in solve(1).",
            "vars": {"col": 1}
        },
        {
            "line": 23,
            "desc": "Check isSafe(1, 1). Neighbor 0 has color 1. Conflict! Returns False.",
            "vars": {"isSafe": False}
        },
        {
            "line": 21,
            "desc": "Loop color col = 2 in solve(1).",
            "vars": {"col": 2}
        },
        {
            "line": 23,
            "desc": "Check isSafe(1, 2). Neighbor 0 has color 1 (no conflict). Returns True.",
            "vars": {"isSafe": True}
        },
        {
            "line": 25,
            "desc": "Assign color[1] = 2.",
            "vars": {"color": "[1, 2]"}
        },
        {
            "line": 27,
            "desc": "Recurse solve(2).",
            "vars": {"v": 2}
        },
        {
            "line": 18,
            "desc": "v == N check (2 == 2). True! Return True.",
            "vars": {}
        },
        {
            "line": 35,
            "desc": "All solver calls returned True. Return True.",
            "vars": {"result": True}
        }
    ]
}

# 10. Rat in a Maze
dsa_sol_2["Rat in a Maze"] = {
    "solution": {
        "title": "Rat in a Maze",
        "problemStatement": "Consider a rat placed at (0, 0) in a square matrix of order N * N. It has to reach the destination at (N - 1, N - 1). Find all possible paths that the rat can take. Valid directions are U, D, L, R.",
        "examples": [
            {
                "input": "m = [[1, 0], [1, 1]], n = 2",
                "output": "[\"DR\"]",
                "explanation": "The path is Down (D) to (1, 0) then Right (R) to (1, 1)."
            }
        ],
        "constraints": [
            "2 <= N <= 5",
            "0 <= m[i][j] <= 1"
        ],
        "edgeCases": [
            "Start or end cell is blocked (returns empty result).",
            "No paths exist.",
            "Paths with loops (cycles prevented by visited matrix)."
        ],
        "followUps": [
            "Can you find the shortest path using BFS?",
            "How would you modify this to print paths in alphabetical order?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all possible walk paths of length up to N*N without checking grid cell state in advance, and check validity at the end.",
                "algorithm": "1. Recursively construct paths in 4 directions.\n2. If length reaches maximum capacity, check if the path is valid and reaches the destination.",
                "code": "# Simple outline of brute force representing random path walks:\ndef findPathBrute(m, n):\n    result = []\n    def dfs(row, col, path):\n        # Check if out of bounds or visited or blocked\n        if row < 0 or row >= n or col < 0 or col >= n or m[row][col] == 0:\n            return\n        if row == n-1 and col == n-1:\n            result.append(path)\n            return\n        # Try walking without tracking coordinates strictly inside a visited matrix\n        # (might loop infinitely if we don't prevent cycles)\n    return result",
                "complexity": {
                    "time": "O(4^(N^2))",
                    "space": "O(N^2)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use DFS with a visited matrix to avoid cycles. Explore directions in alphabetical order (D, L, R, U) to easily sort the path lexicographically.",
                "algorithm": "1. Initialize visited matrix with False.\n2. Define solve(row, col, path).\n3. If row == n-1 and col == n-1, append path to results.\n4. Loop through standard directions: ('D', 1, 0), ('L', 0, -1), ('R', 0, 1), ('U', -1, 0).\n5. Check if next cell is in boundaries, not visited, and open (1).\n6. Mark visited, recurse solve, then backtrack visited = False.",
                "code": "def findPath(m, n):\n    # List to store the valid path strings\n    result = []\n    # 2D list to keep track of visited cells\n    visited = [[False] * n for _ in range(n)]\n    \n    # Helper function for backtracking\n    def solve(row, col, path):\n        # Base Case: If destination is reached, add path to results\n        if row == n - 1 and col == n - 1:\n            result.append(path)\n            return\n        \n        # Direction strings and corresponding row/col offsets\n        # Standard order: D (Down), L (Left), R (Right), U (Up)\n        directions = [('D', 1, 0), ('L', 0, -1), ('R', 0, 1), ('U', -1, 0)]\n        \n        # Try moving in each direction\n        for dir_char, d_row, d_col in directions:\n            next_row = row + d_row\n            next_col = col + d_col\n            \n            # Check if the next cell is inside boundaries, not visited, and open (1)\n            if 0 <= next_row < n and 0 <= next_col < n:\n                if not visited[next_row][next_col] and m[next_row][next_col] == 1:\n                    # Mark next cell as visited\n                    visited[next_row][next_col] = True\n                    # Recurse with updated position and path\n                    solve(next_row, next_col, path + dir_char)\n                    # Backtrack: mark next cell as unvisited for other paths\n                    visited[next_row][next_col] = False\n\n    # Edge Case: If start or end cell is blocked, return empty list\n    if m[0][0] == 0 or m[n-1][n-1] == 0:\n        return result\n        \n    # Mark start cell as visited\n    visited[0][0] = True\n    # Start backtracking solver\n    solve(0, 0, \"\")\n    # Return sorted paths\n    return result",
                "complexity": {
                    "time": "O(4^(N^2))",
                    "space": "O(N^2) recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 34,
            "desc": "Check start/end cell blockages. m[0][0] is 1, m[1][1] is 1. Proceed.",
            "vars": {}
        },
        {
            "line": 38,
            "desc": "Mark visited[0][0] = True.",
            "vars": {"visited": "[[True, False], [False, False]]"}
        },
        {
            "line": 40,
            "desc": "Call solve(0, 0, '').",
            "vars": {"row": 0, "col": 0, "path": "\"\""}
        },
        {
            "line": 10,
            "desc": "Check row == n-1 and col == n-1. False.",
            "vars": {}
        },
        {
            "line": 19,
            "desc": "Loop directions: dir_char = 'D'. next_row = 1, next_col = 0.",
            "vars": {"next_row": 1, "next_col": 0}
        },
        {
            "line": 24,
            "desc": "Check boundaries. 1,0 is inside.",
            "vars": {}
        },
        {
            "line": 25,
            "desc": "Check not visited[1][0] (True) and m[1][0] == 1 (True).",
            "vars": {"visited[1][0]": False, "m[1][0]": 1}
        },
        {
            "line": 27,
            "desc": "Mark visited[1][0] = True.",
            "vars": {"visited": "[[True, False], [True, False]]"}
        },
        {
            "line": 29,
            "desc": "Recurse solve(1, 0, 'D').",
            "vars": {"path": "\"D\""}
        },
        {
            "line": 19,
            "desc": "Loop directions in solve(1,0): dir_char = 'D' -> boundary check fails. Next L -> fails. Next R -> next_row = 1, next_col = 1.",
            "vars": {"next_row": 1, "next_col": 1}
        },
        {
            "line": 27,
            "desc": "Mark visited[1][1] = True.",
            "vars": {"visited": "[[True, False], [True, True]]"}
        },
        {
            "line": 29,
            "desc": "Recurse solve(1, 1, 'DR').",
            "vars": {"path": "\"DR\""}
        },
        {
            "line": 10,
            "desc": "destination (1,1) reached. Append 'DR' to result.",
            "vars": {"result": "['DR']"}
        },
        {
            "line": 31,
            "desc": "Backtrack visited[1][1] = False.",
            "vars": {"visited": "[[True, False], [True, False]]"}
        },
        {
            "line": 31,
            "desc": "Backtrack visited[1][0] = False.",
            "vars": {"visited": "[[True, False], [False, False]]"}
        },
        {
            "line": 42,
            "desc": "Return final results.",
            "vars": {"result": "['DR']"}
        }
    ]
}

# 11. Word Break
dsa_sol_2["Word Break"] = {
    "solution": {
        "title": "Word Break",
        "problemStatement": "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
        "examples": [
            {
                "input": "s = \"applepen\", wordDict = [\"apple\", \"pen\"]",
                "output": "True",
                "explanation": "\"applepen\" can be segmented as \"apple pen\"."
            }
        ],
        "constraints": [
            "1 <= len(s) <= 300",
            "1 <= len(wordDict) <= 1000",
            "s consists of only lowercase English letters."
        ],
        "edgeCases": [
            "s can be segmented in multiple ways.",
            "s is composed of multiple overlapping prefixes.",
            "No word in dictionary matches s."
        ],
        "followUps": [
            "Can you print the actual segmented sentences (Word Break II)?",
            "How does Trie optimization help if the dictionary is extremely large?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Try partitioning the string at every possible index recursively and check if the prefix is in the dictionary.",
                "algorithm": "1. Start recursive solve(start).\n2. Loop end from start + 1 to len(s).\n3. If s[start:end] is in wordDict and solve(end) is True, return True.\n4. If loop completes, return False.",
                "code": "def wordBreakBrute(s, wordDict):\n    # Set for O(1) word validation\n    word_set = set(wordDict)\n    # Recursive helper\n    def solve(start):\n        # Base case: reached end of string\n        if start == len(s):\n            return True\n        # Try all possible ending indices for current word segment\n        for end in range(start + 1, len(s) + 1):\n            # If current substring is in dict, solve recursively for remaining\n            if s[start:end] in word_set:\n                if solve(end):\n                    return True\n        # Return False if no valid partition works\n        return False\n    return solve(0)",
                "complexity": {
                    "time": "O(2^N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use Dynamic Programming. Define dp[i] as True if s[0:i] can be segmented. To calculate dp[i], we check all partition points j < i. If dp[j] is True and s[j:i] is in the dictionary, then dp[i] is True.",
                "algorithm": "1. Convert wordDict to set.\n2. Initialize dp array of size len(s)+1 with False, dp[0] = True.\n3. Loop i from 1 to len(s).\n4. Loop j from 0 to i-1.\n5. If dp[j] is True and s[j:i] in word_set, set dp[i] = True, break.\n6. Return dp[len(s)].",
                "code": "def wordBreak(s, wordDict):\n    # Convert wordDict to a set for O(1) lookups\n    word_set = set(wordDict)\n    # DP array where dp[i] is True if s[0:i] can be segmented\n    dp = [False] * (len(s) + 1)\n    # Base Case: empty string can always be segmented\n    dp[0] = True\n    # Iterate through all lengths from 1 to len(s)\n    for i in range(1, len(s) + 1):\n        # Check all partition points j before i\n        for j in range(i):\n            # If s[0:j] is valid and s[j:i] is in dictionary\n            if dp[j] and s[j:i] in word_set:\n                # Mark s[0:i] as valid\n                dp[i] = True\n                # No need to look for other partitions for length i\n                break\n    # Return whether the entire string is validly segmentable\n    return dp[len(s)]",
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
            "desc": "Convert wordDict to set.",
            "vars": {"word_set": "{'apple', 'pen'}"}
        },
        {
            "line": 5,
            "desc": "Initialize dp array of size 9 with False.",
            "vars": {"dp": "[False, False, False, False, False, False, False, False, False]"}
        },
        {
            "line": 7,
            "desc": "Set dp[0] = True.",
            "vars": {"dp": "[True, False, False, False, False, False, False, False, False]"}
        },
        {
            "line": 9,
            "desc": "Loop starts: i = 1.",
            "vars": {"i": 1}
        },
        {
            "line": 11,
            "desc": "Loop j: j = 0. s[0:1] is 'a'. 'a' not in word_set.",
            "vars": {"j": 0, "s[0:1]": "\"a\""}
        },
        {
            "line": 9,
            "desc": "Loop continues: i = 5.",
            "vars": {"i": 5}
        },
        {
            "line": 13,
            "desc": "j = 0. dp[0] is True, s[0:5] is 'apple' in word_set.",
            "vars": {"j": 0, "s[0:5]": "\"apple\""}
        },
        {
            "line": 15,
            "desc": "Set dp[5] = True.",
            "vars": {"dp[5]": True}
        },
        {
            "line": 17,
            "desc": "Break out of inner loop.",
            "vars": {}
        },
        {
            "line": 9,
            "desc": "Loop continues: i = 8.",
            "vars": {"i": 8}
        },
        {
            "line": 13,
            "desc": "j = 5. dp[5] is True, s[5:8] is 'pen' in word_set.",
            "vars": {"j": 5, "s[5:8]": "\"pen\""}
        },
        {
            "line": 15,
            "desc": "Set dp[8] = True.",
            "vars": {"dp[8]": True}
        },
        {
            "line": 17,
            "desc": "Break out of inner loop.",
            "vars": {}
        },
        {
            "line": 19,
            "desc": "Return dp[8] which is True.",
            "vars": {"result": True}
        }
    ]
}

# 12. Nth Root of a Number
dsa_sol_2["Nth Root of a Number"] = {
    "solution": {
        "title": "Nth Root of a Number",
        "problemStatement": "You are given two positive integers N and M. You have to find the Nth root of M. If it is an integer, return it; otherwise, return -1.",
        "examples": [
            {
                "input": "n = 3, m = 27",
                "output": "3",
                "explanation": "3^3 = 27, so the 3rd root of 27 is 3."
            }
        ],
        "constraints": [
            "1 <= N <= 30",
            "1 <= M <= 10^9"
        ],
        "edgeCases": [
            "M = 1.",
            "N = 1.",
            "M is not a perfect N-th power."
        ],
        "followUps": [
            "How can we extend this to find decimal floating roots?",
            "Why do we check mid^n state by multiplying step-by-step instead of direct pow()?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Iterate from 1 to M. Check if i^N equals M. If i^N > M, break and return -1.",
                "algorithm": "1. Loop i from 1 to M.\n2. Compute val = i^N.\n3. If val == M, return i.\n4. If val > M, return -1.",
                "code": "def NthRootBrute(n, m):\n    # Iterate starting from 1\n    for i in range(1, m + 1):\n        # Calculate power i^n\n        val = i ** n\n        # If we reach target, return i\n        if val == m:\n            return i\n        # If we exceed target, root cannot be an integer\n        elif val > m:\n            return -1\n    return -1",
                "complexity": {
                    "time": "O(M^(1/N))",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use Binary Search on the range [1, M]. For each mid, compute mid^N. To prevent overflow, evaluate mid^N multiplication incrementally and return whether it is less than, equal to, or greater than M.",
                "algorithm": "1. Set low = 1, high = m.\n2. Define check(mid) helper: computes mid^n and returns 0 (< m), 1 (== m), 2 (> m).\n3. Loop while low <= high.\n4. Compute mid = (low + high) // 2.\n5. mid_state = check(mid).\n6. If mid_state == 1, return mid.\n7. If mid_state == 0, low = mid + 1.\n8. Else, high = mid - 1.\n9. Return -1.",
                "code": "def NthRoot(n, m):\n    # Helper function to check state of mid^n compared to m\n    # Returns:\n    # 0 if mid^n < m\n    # 1 if mid^n == m\n    # 2 if mid^n > m\n    def check(mid):\n        ans = 1\n        for i in range(1, n + 1):\n            ans = ans * mid\n            if ans > m:\n                return 2\n        if ans == m:\n            return 1\n        return 0\n    # Set search range for binary search\n    low = 1\n    high = m\n    # Perform binary search\n    while low <= high:\n        mid = (low + high) // 2\n        mid_state = check(mid)\n        # If mid^n is exactly m, we found the integer root\n        if mid_state == 1:\n            return mid\n        # If mid^n is less than m, search higher half\n        elif mid_state == 0:\n            low = mid + 1\n        # If mid^n is greater than m, search lower half\n        else:\n            high = mid - 1\n    # No integer Nth root found\n    return -1",
                "complexity": {
                    "time": "O(N log M)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 18,
            "desc": "Set low = 1.",
            "vars": {"low": 1}
        },
        {
            "line": 19,
            "desc": "Set high = 27.",
            "vars": {"high": 27}
        },
        {
            "line": 21,
            "desc": "Check low <= high (1 <= 27). True.",
            "vars": {}
        },
        {
            "line": 22,
            "desc": "Compute mid = (1 + 27) // 2 = 14.",
            "vars": {"mid": 14}
        },
        {
            "line": 23,
            "desc": "Check state for mid = 14. 14^3 = 2744 > 27. Returns 2.",
            "vars": {"mid_state": 2}
        },
        {
            "line": 32,
            "desc": "Since mid_state = 2, update high = mid - 1 = 13.",
            "vars": {"high": 13}
        },
        {
            "line": 21,
            "desc": "Check low <= high (1 <= 13). True.",
            "vars": {}
        },
        {
            "line": 22,
            "desc": "Compute mid = (1 + 13) // 2 = 7.",
            "vars": {"mid": 7}
        },
        {
            "line": 23,
            "desc": "Check state for mid = 7. 7^3 = 343 > 27. Returns 2.",
            "vars": {"mid_state": 2}
        },
        {
            "line": 32,
            "desc": "Update high = mid - 1 = 6.",
            "vars": {"high": 6}
        },
        {
            "line": 21,
            "desc": "Check low <= high (1 <= 6). True.",
            "vars": {}
        },
        {
            "line": 22,
            "desc": "Compute mid = (1 + 6) // 2 = 3.",
            "vars": {"mid": 3}
        },
        {
            "line": 23,
            "desc": "Check state for mid = 3. 3^3 = 27 == 27. Returns 1.",
            "vars": {"mid_state": 1}
        },
        {
            "line": 25,
            "desc": "mid_state == 1 check succeeds. Return mid = 3.",
            "vars": {"result": 3}
        }
    ]
}

# 13. Matrix Median
dsa_sol_2["Matrix Median"] = {
    "solution": {
        "title": "Matrix Median",
        "problemStatement": "Given a matrix of integers of size R x C where each row is sorted, find the median of the matrix. The matrix will always have an odd number of elements.",
        "examples": [
            {
                "input": "matrix = [[1, 3, 5], [2, 6, 9], [3, 6, 9]]",
                "output": "5",
                "explanation": "Flattened sorted array: [1, 2, 3, 3, 5, 6, 6, 9, 9]. The median is 5."
            }
        ],
        "constraints": [
            "1 <= R, C <= 1000",
            "1 <= matrix[i][j] <= 10^9",
            "R * C is odd."
        ],
        "edgeCases": [
            "Matrix of size 1x1.",
            "All elements in matrix are identical.",
            "All elements in one row are smaller than all elements in another row."
        ],
        "followUps": [
            "What if R * C was even?",
            "How would you solve this if rows were not sorted?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Flatten the 2D matrix into a 1D list, sort it, and return the middle element.",
                "algorithm": "1. Initialize an empty list temp.\n2. Iterate through each cell in the matrix and append to temp.\n3. Sort temp.\n4. Return temp[len(temp) // 2].",
                "code": "def findMedianBrute(matrix):\n    # Flatten the matrix\n    temp = []\n    # Iterate over each row and append elements to temp\n    for row in matrix:\n        for val in row:\n            temp.append(val)\n    # Sort the flattened array\n    temp.sort()\n    # Return the middle element\n    return temp[len(temp) // 2]",
                "complexity": {
                    "time": "O(R * C * log(R * C))",
                    "space": "O(R * C)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use binary search on the value range [min_element, max_element]. For any candidate mid, count how many elements are <= mid using bisect_right on each row. If the count <= (R * C) // 2, the median must be strictly greater than mid, so low = mid + 1. Otherwise, high = mid.",
                "algorithm": "1. R, C = dimensions of matrix.\n2. low = min of first column elements; high = max of last column elements.\n3. Loop while low < high.\n4. mid = (low + high) // 2.\n5. Count elements <= mid. If count <= (R * C) // 2, set low = mid + 1.\n6. Else, high = mid.\n7. Return low.",
                "code": "from bisect import bisect_right\n\ndef findMedian(matrix):\n    R = len(matrix)\n    C = len(matrix[0])\n    \n    # Helper function to count elements <= x in the entire matrix\n    def countLessEqual(x):\n        count = 0\n        for i in range(R):\n            # Use binary search to find index of first element > x in row i\n            count += bisect_right(matrix[i], x)\n        return count\n    # The search space is bounded by the minimum and maximum elements in matrix\n    # Since rows are sorted, min is in first column, max is in last column\n    low = min(matrix[i][0] for i in range(R))\n    high = max(matrix[i][C - 1] for i in range(R))\n    # The target number of elements we want to be <= median\n    required_count = (R * C) // 2\n    # Binary search range on values\n    while low < high:\n        mid = (low + high) // 2\n        # Count how many elements in the matrix are <= mid\n        if countLessEqual(mid) <= required_count:\n            # Median must be strictly greater than mid\n            low = mid + 1\n        else:\n            # Median is <= mid\n            high = mid\n            \n    # 'low' will converge to the median\n    return low",
                "complexity": {
                    "time": "O(R * log C * log(max-min))",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 17,
            "desc": "Find min element from first col. min(1, 2, 3) = 1.",
            "vars": {"low": 1}
        },
        {
            "line": 18,
            "desc": "Find max element from last col. max(5, 9, 9) = 9.",
            "vars": {"high": 9}
        },
        {
            "line": 21,
            "desc": "Calculate required_count = 9 // 2 = 4.",
            "vars": {"required_count": 4}
        },
        {
            "line": 24,
            "desc": "Check low < high (1 < 9). True.",
            "vars": {}
        },
        {
            "line": 25,
            "desc": "Compute mid = (1 + 9) // 2 = 5.",
            "vars": {"mid": 5}
        },
        {
            "line": 27,
            "desc": "Count elements <= 5. row0: 3, row1: 1, row2: 1. Total = 5. Check 5 <= 4 (False).",
            "vars": {"count": 5}
        },
        {
            "line": 32,
            "desc": "Update high = mid = 5.",
            "vars": {"high": 5}
        },
        {
            "line": 24,
            "desc": "Check low < high (1 < 5). True.",
            "vars": {}
        },
        {
            "line": 25,
            "desc": "Compute mid = (1 + 5) // 2 = 3.",
            "vars": {"mid": 3}
        },
        {
            "line": 27,
            "desc": "Count elements <= 3. row0: 2, row1: 1, row2: 1. Total = 4. Check 4 <= 4 (True).",
            "vars": {"count": 4}
        },
        {
            "line": 29,
            "desc": "Update low = mid + 1 = 4.",
            "vars": {"low": 4}
        },
        {
            "line": 24,
            "desc": "Check low < high (4 < 5). True.",
            "vars": {}
        },
        {
            "line": 25,
            "desc": "Compute mid = (4 + 5) // 2 = 4.",
            "vars": {"mid": 4}
        },
        {
            "line": 27,
            "desc": "Count elements <= 4. row0: 2, row1: 1, row2: 1. Total = 4. Check 4 <= 4 (True).",
            "vars": {"count": 4}
        },
        {
            "line": 29,
            "desc": "Update low = mid + 1 = 5.",
            "vars": {"low": 5}
        },
        {
            "line": 24,
            "desc": "Check low < high (5 < 5). False. Loop ends.",
            "vars": {}
        },
        {
            "line": 35,
            "desc": "Return low which is 5.",
            "vars": {"result": 5}
        }
    ]
}

# 14. Find Single Element in Sorted Array
dsa_sol_2["Find Single Element in Sorted Array"] = {
    "solution": {
        "title": "Find Single Element in Sorted Array",
        "problemStatement": "You are given a sorted array consisting of only integers where every element appears exactly twice, except for one element which appears exactly once. Find this single element. Your solution must run in O(log n) time and O(1) space.",
        "examples": [
            {
                "input": "nums = [1, 1, 2, 3, 3, 4, 4]",
                "output": "2",
                "explanation": "All elements except 2 appear twice."
            }
        ],
        "constraints": [
            "1 <= len(nums) <= 10^5",
            "0 <= nums[i] <= 10^5"
        ],
        "edgeCases": [
            "Single element is at index 0.",
            "Single element is at the end of the array.",
            "Array has only 1 element."
        ],
        "followUps": [
            "Can you solve this if the array was not sorted?",
            "Why does nums[mid] == nums[mid ^ 1] check work cleanly?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "XOR all the elements. Since x ^ x = 0, all paired elements cancel out, leaving the single element.",
                "algorithm": "1. Initialize xor_sum = 0.\n2. Iterate through nums, xor_sum ^= num.\n3. Return xor_sum.",
                "code": "def singleNonDuplicateBrute(nums):\n    # Initialize the XOR result to 0\n    xor_sum = 0\n    # XOR all elements in the array\n    for num in nums:\n        xor_sum ^= num\n    # The remaining xor_sum is the single non-duplicate element\n    return xor_sum",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "In a paired sorted array, first occurrences of pairs are at even indices, second at odd indices. The single element breaks this pattern. For index mid, we check if nums[mid] matches its partner at mid ^ 1. If it matches, we are to the left of the single element, so low = mid + 1. Otherwise, high = mid.",
                "algorithm": "1. low = 0, high = len(nums) - 1.\n2. Loop while low < high.\n3. mid = (low + high) // 2.\n4. If nums[mid] == nums[mid ^ 1], low = mid + 1.\n5. Else, high = mid.\n6. Return nums[low].",
                "code": "def singleNonDuplicate(nums):\n    # Initialize binary search boundaries\n    low = 0\n    high = len(nums) - 1\n    # Loop until low and high pointers converge\n    while low < high:\n        mid = (low + high) // 2\n        # If mid is even, mid ^ 1 is mid + 1. If mid is odd, mid ^ 1 is mid - 1.\n        # If nums[mid] is equal to its paired partner, it means we are in the left half of the single element.\n        if nums[mid] == nums[mid ^ 1]:\n            # Single element lies in the right half, so search from mid + 1\n            low = mid + 1\n        else:\n            # Single element is mid or lies in the left half, search up to mid\n            high = mid\n    # Low pointer converges to the single non-duplicate element\n    return nums[low]",
                "complexity": {
                    "time": "O(log N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Set low = 0.",
            "vars": {"low": 0}
        },
        {
            "line": 4,
            "desc": "Set high = 6.",
            "vars": {"high": 6}
        },
        {
            "line": 6,
            "desc": "Check low < high (0 < 6). True.",
            "vars": {}
        },
        {
            "line": 7,
            "desc": "Compute mid = (0 + 6) // 2 = 3.",
            "vars": {"mid": 3}
        },
        {
            "line": 10,
            "desc": "Compare nums[3] (3) with nums[3 ^ 1 = 2] (2). Not equal.",
            "vars": {"nums[3]": 3, "nums[2]": 2}
        },
        {
            "line": 15,
            "desc": "Set high = mid = 3.",
            "vars": {"high": 3}
        },
        {
            "line": 6,
            "desc": "Check low < high (0 < 3). True.",
            "vars": {}
        },
        {
            "line": 7,
            "desc": "Compute mid = (0 + 3) // 2 = 1.",
            "vars": {"mid": 1}
        },
        {
            "line": 10,
            "desc": "Compare nums[1] (1) with nums[1 ^ 1 = 0] (1). Equal.",
            "vars": {"nums[1]": 1, "nums[0]": 1}
        },
        {
            "line": 12,
            "desc": "Set low = mid + 1 = 2.",
            "vars": {"low": 2}
        },
        {
            "line": 6,
            "desc": "Check low < high (2 < 3). True.",
            "vars": {}
        },
        {
            "line": 7,
            "desc": "Compute mid = (2 + 3) // 2 = 2.",
            "vars": {"mid": 2}
        },
        {
            "line": 10,
            "desc": "Compare nums[2] (2) with nums[2 ^ 1 = 3] (3). Not equal.",
            "vars": {"nums[2]": 2, "nums[3]": 3}
        },
        {
            "line": 15,
            "desc": "Set high = mid = 2.",
            "vars": {"high": 2}
        },
        {
            "line": 6,
            "desc": "Check low < high (2 < 2). False. Loop ends.",
            "vars": {}
        },
        {
            "line": 17,
            "desc": "Return nums[low] which is 2.",
            "vars": {"result": 2}
        }
    ]
}

# 15. Median of Two Sorted Arrays
dsa_sol_2["Median of Two Sorted Arrays"] = {
    "solution": {
        "title": "Median of Two Sorted Arrays",
        "problemStatement": "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).",
        "examples": [
            {
                "input": "nums1 = [1, 3], nums2 = [2]",
                "output": "2.0",
                "explanation": "Combined sorted array: [1, 2, 3]. Median is 2.0."
            }
        ],
        "constraints": [
            "0 <= m, n <= 1000",
            "1 <= m + n <= 2000",
            "-10^6 <= nums1[i], nums2[j] <= 10^6"
        ],
        "edgeCases": [
            "One array is empty.",
            "Arrays have non-overlapping range.",
            "Single element in both arrays."
        ],
        "followUps": [
            "How can we find the k-th smallest element of two sorted arrays?",
            "What if we cannot fit arrays in memory?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Merge both sorted arrays using a two-pointer approach into a single sorted array, then select the median.",
                "algorithm": "1. Initialize two pointers i = 0, j = 0 and an empty merged list.\n2. Compare nums1[i] and nums2[j], append the smaller to merged, advance pointer.\n3. Append remaining elements of either array.\n4. If size is odd, return middle element. Else, return average of middle two.",
                "code": "def findMedianSortedArraysBrute(nums1, nums2):\n    m, n = len(nums1), len(nums2)\n    merged = []\n    i, j = 0, 0\n    # Merge elements from both arrays in sorted order\n    while i < m and j < n:\n        if nums1[i] < nums2[j]:\n            merged.append(nums1[i])\n            i += 1\n        else:\n            merged.append(nums2[j])\n            j += 1\n    # Append remaining elements\n    while i < m:\n        merged.append(nums1[i])\n        i += 1\n    while j < n:\n        merged.append(nums2[j])\n        j += 1\n    \n    total_len = len(merged)\n    # Calculate median based on size\n    if total_len % 2 == 1:\n        return float(merged[total_len // 2])\n    else:\n        return (merged[total_len // 2 - 1] + merged[total_len // 2]) / 2.0",
                "complexity": {
                    "time": "O(M + N)",
                    "space": "O(M + N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Perform binary search on the smaller array to find a partition point such that the left half of both arrays contains exactly half of the total elements. Check if the elements adjacent to the partitions are correctly ordered. If yes, compute median based on left maxes and right mins.",
                "algorithm": "1. Ensure nums1 is smaller.\n2. low = 0, high = m.\n3. Loop while low <= high.\n4. partition1 = (low + high) // 2.\n5. partition2 = (m + n + 1) // 2 - partition1.\n6. Find maxLeft1, minRight1, maxLeft2, minRight2.\n7. If maxLeft1 <= minRight2 and maxLeft2 <= minRight1, correct partition is found. Compute median.\n8. Else if maxLeft1 > minRight2, high = partition1 - 1.\n9. Else, low = partition1 + 1.",
                "code": "def findMedianSortedArrays(nums1, nums2):\n    # Ensure nums1 is the smaller array to optimize binary search complexity\n    if len(nums1) > len(nums2):\n        nums1, nums2 = nums2, nums1\n        \n    m = len(nums1)\n    n = len(nums2)\n    low = 0\n    high = m\n    \n    # Binary search on the smaller array\n    while low <= high:\n        # Partition point for nums1\n        partition1 = (low + high) // 2\n        # Partition point for nums2 to keep left half size balanced\n        partition2 = (m + n + 1) // 2 - partition1\n        \n        # Edge cases: if partition is 0, use negative infinity.\n        # If partition is at array length, use positive infinity.\n        maxLeft1 = float('-inf') if partition1 == 0 else nums1[partition1 - 1]\n        minRight1 = float('inf') if partition1 == m else nums1[partition1]\n        \n        maxLeft2 = float('-inf') if partition2 == 0 else nums2[partition2 - 1]\n        minRight2 = float('inf') if partition2 == n else nums2[partition2]\n        \n        # Check if we found the correct partition\n        if maxLeft1 <= minRight2 and maxLeft2 <= minRight1:\n            # If total length is odd\n            if (m + n) % 2 == 1:\n                return float(max(maxLeft1, maxLeft2))\n            # If total length is even\n            else:\n                return (max(maxLeft1, maxLeft2) + min(minRight1, minRight2)) / 2.0\n        # If nums1 partition is too far right\n        elif maxLeft1 > minRight2:\n            high = partition1 - 1\n        # If nums1 partition is too far left\n        else:\n            low = partition1 + 1\n            \n    # Default return value (should not be reached if inputs are sorted)\n    return 0.0",
                "complexity": {
                    "time": "O(log(min(M, N)))",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Check if len(nums1) > len(nums2) (2 > 1). True, swap them. nums1 becomes [2], nums2 becomes [1, 3].",
            "vars": {"nums1": "[2]", "nums2": "[1, 3]"}
        },
        {
            "line": 6,
            "desc": "Initialize dimensions. m = 1, n = 2.",
            "vars": {"m": 1, "n": 2}
        },
        {
            "line": 8,
            "desc": "Initialize binary search range. low = 0, high = 1.",
            "vars": {"low": 0, "high": 1}
        },
        {
            "line": 12,
            "desc": "Check low <= high (0 <= 1). True.",
            "vars": {}
        },
        {
            "line": 14,
            "desc": "Compute partition1 = (0 + 1) // 2 = 0.",
            "vars": {"partition1": 0}
        },
        {
            "line": 16,
            "desc": "Compute partition2 = (1 + 2 + 1) // 2 - 0 = 2.",
            "vars": {"partition2": 2}
        },
        {
            "line": 20,
            "desc": "Since partition1 = 0, maxLeft1 = -inf. Since partition1 != m, minRight1 = nums1[0] = 2.",
            "vars": {"maxLeft1": "-inf", "minRight1": 2}
        },
        {
            "line": 23,
            "desc": "Since partition2 != 0, maxLeft2 = nums2[1] = 3. Since partition2 == n (2), minRight2 = inf.",
            "vars": {"maxLeft2": 3, "minRight2": "inf"}
        },
        {
            "line": 27,
            "desc": "Check partition validity: -inf <= inf (True) and 3 <= 2 (False).",
            "vars": {}
        },
        {
            "line": 35,
            "desc": "Check maxLeft1 > minRight2 (-inf > inf). False.",
            "vars": {}
        },
        {
            "line": 38,
            "desc": "Condition fails, update low = partition1 + 1 = 1.",
            "vars": {"low": 1}
        },
        {
            "line": 12,
            "desc": "Check low <= high (1 <= 1). True.",
            "vars": {}
        },
        {
            "line": 14,
            "desc": "Compute partition1 = (1 + 1) // 2 = 1.",
            "vars": {"partition1": 1}
        },
        {
            "line": 16,
            "desc": "Compute partition2 = 2 - 1 = 1.",
            "vars": {"partition2": 1}
        },
        {
            "line": 20,
            "desc": "Since partition1 == m (1), maxLeft1 = nums1[0] = 2, minRight1 = inf.",
            "vars": {"maxLeft1": 2, "minRight1": "inf"}
        },
        {
            "line": 23,
            "desc": "Since partition2 = 1, maxLeft2 = nums2[0] = 1, minRight2 = nums2[1] = 3.",
            "vars": {"maxLeft2": 1, "minRight2": 3}
        },
        {
            "line": 27,
            "desc": "Check validity: 2 <= 3 (True) and 1 <= inf (True). Partition correct!",
            "vars": {}
        },
        {
            "line": 29,
            "desc": "Check if total length is odd: (1 + 2) % 2 == 1 (True).",
            "vars": {}
        },
        {
            "line": 30,
            "desc": "Return max(maxLeft1, maxLeft2) = max(2, 1) = 2.0.",
            "vars": {"result": 2.0}
        }
    ]
}

# Dump the solutions to the output json path
with open("/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_2.json", "w") as f:
    json.dump(dsa_sol_2, f, indent=4)
print("Successfully wrote dsa_sol_2.json")
