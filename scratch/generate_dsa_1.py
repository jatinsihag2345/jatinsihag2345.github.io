import json

# Define the dictionary containing all solutions and traces
dsa_sol_1 = {}

# 1. Count Subarrays with Given XOR
dsa_sol_1["Count Subarrays with Given XOR"] = {
    "solution": {
        "title": "Count Subarrays with Given XOR",
        "problemStatement": "Given an array of integers A and an integer B, find the total number of subarrays having bitwise XOR equal to B.",
        "examples": [
            {
                "input": "A = [4, 2, 2, 6, 4], B = 6",
                "output": "4",
                "explanation": "The subarrays are [4, 2], [2, 2, 6], [2, 6, 4], and [6]."
            },
            {
                "input": "A = [5, 6, 7, 8, 9], B = 5",
                "output": "2",
                "explanation": "The subarrays are [5] and [5, 6, 7, 8, 9] which result in XOR sum 5."
            }
        ],
        "constraints": [
            "1 <= len(A) <= 10^5",
            "0 <= A[i] <= 10^9",
            "0 <= B <= 10^9"
        ],
        "edgeCases": [
            "No subarray has the XOR sum B.",
            "All elements are 0, and B is 0.",
            "Array contains only one element which is equal to B."
        ],
        "followUps": [
            "Can you solve this in O(N) time complexity and O(N) space complexity?",
            "What if we need to output the count of subarrays with XOR sum at most B?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all possible subarrays, calculate their XOR sum, and count how many equal B.",
                "algorithm": "1. Initialize count to 0.\n2. Run a loop with index i from 0 to N-1 to define the start of subarray.\n3. Run a nested loop with index j from i to N-1 to define the end of subarray.\n4. Maintain a running XOR sum and check if it equals B.\n5. Return the count.",
                "code": "def solve(A, B):\n    # Initialize count of subarrays to 0\n    count = 0\n    # Loop over all possible starting indices of subarrays\n    for i in range(len(A)):\n        # Initialize the XOR sum for the current subarray\n        current_xor = 0\n        # Loop over all possible ending indices of subarrays starting from i\n        for j in range(i, len(A)):\n            # Update the running XOR sum by XORing with the current element\n            current_xor ^= A[j]\n            # If the current XOR sum equals B, increment the count\n            if current_xor == B:\n                count += 1\n    # Return the total count of subarrays with given XOR B\n    return count",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use prefix XOR. If prefix XOR from index 0 to i is XR, and we want a subarray with XOR B ending at i, the prefix XOR of the remaining part must be XR ^ B because XR ^ (XR ^ B) = B. We track counts of prefix XORs using a hash map.",
                "algorithm": "1. Initialize a hash map `xr_map` with {0: 1} to handle case where prefix XOR itself is B.\n2. Maintain a running prefix XOR `xr` initialized to 0.\n3. Loop through array. For each element, update `xr ^= val`.\n4. Check if `xr ^ B` is in `xr_map`. If yes, add its frequency to `count`.\n5. Increment frequency of `xr` in `xr_map`.\n6. Return `count`.",
                "code": "def solve(A, B):\n    # Initialize prefix XOR to 0\n    xr = 0\n    # Dictionary to store the frequency of prefix XORs encountered\n    xr_map = {0: 1}\n    # Initialize count of subarrays to 0\n    count = 0\n    # Iterate through the elements of the array A\n    for val in A:\n        # Calculate the prefix XOR up to the current index\n        xr ^= val\n        # The target prefix XOR we look for is xr ^ B\n        target = xr ^ B\n        # If the target exists in our map, add its frequency to the count\n        if target in xr_map:\n            count += xr_map[target]\n        # Update the frequency of the current prefix XOR in the map\n        xr_map[xr] = xr_map.get(xr, 0) + 1\n    # Return the total count of subarrays with XOR sum equal to B\n    return count",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(N)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 2,
            "desc": "Initialize prefix XOR xr to 0",
            "vars": {"xr": 0}
        },
        {
            "line": 4,
            "desc": "Initialize xr_map with default 0 prefix XOR",
            "vars": {"xr": 0, "xr_map": "{0: 1}"}
        },
        {
            "line": 6,
            "desc": "Initialize count to 0",
            "vars": {"xr": 0, "xr_map": "{0: 1}", "count": 0}
        },
        {
            "line": 8,
            "desc": "Process first element val = 4",
            "vars": {"val": 4, "xr": 0, "count": 0}
        },
        {
            "line": 10,
            "desc": "Update xr by XORing 4. xr = 0 ^ 4 = 4",
            "vars": {"val": 4, "xr": 4, "count": 0}
        },
        {
            "line": 12,
            "desc": "Compute target = xr ^ B = 4 ^ 6 = 2",
            "vars": {"val": 4, "xr": 4, "target": 2, "count": 0}
        },
        {
            "line": 14,
            "desc": "Check if target 2 is in xr_map. It is not. count remains 0",
            "vars": {"val": 4, "xr": 4, "target": 2, "count": 0}
        },
        {
            "line": 17,
            "desc": "Add current xr = 4 to xr_map",
            "vars": {"val": 4, "xr": 4, "xr_map": "{0: 1, 4: 1}", "count": 0}
        },
        {
            "line": 8,
            "desc": "Process second element val = 2",
            "vars": {"val": 2, "xr": 4, "count": 0}
        },
        {
            "line": 10,
            "desc": "Update xr by XORing 2. xr = 4 ^ 2 = 6",
            "vars": {"val": 2, "xr": 6, "count": 0}
        },
        {
            "line": 12,
            "desc": "Compute target = xr ^ B = 6 ^ 6 = 0",
            "vars": {"val": 2, "xr": 6, "target": 0, "count": 0}
        },
        {
            "line": 14,
            "desc": "Check if target 0 is in xr_map. It is, count becomes count + xr_map[0] = 0 + 1 = 1",
            "vars": {"val": 2, "xr": 6, "target": 0, "count": 1}
        },
        {
            "line": 17,
            "desc": "Add current xr = 6 to xr_map",
            "vars": {"val": 2, "xr": 6, "xr_map": "{0: 1, 4: 1, 6: 1}", "count": 1}
        },
        {
            "line": 8,
            "desc": "Process third element val = 2",
            "vars": {"val": 2, "xr": 6, "count": 1}
        },
        {
            "line": 10,
            "desc": "Update xr by XORing 2. xr = 6 ^ 2 = 4",
            "vars": {"val": 2, "xr": 4, "count": 1}
        },
        {
            "line": 12,
            "desc": "Compute target = xr ^ B = 4 ^ 6 = 2",
            "vars": {"val": 2, "xr": 4, "target": 2, "count": 1}
        },
        {
            "line": 14,
            "desc": "Check if target 2 is in xr_map. It is not.",
            "vars": {"val": 2, "xr": 4, "target": 2, "count": 1}
        },
        {
            "line": 17,
            "desc": "Add current xr = 4 to xr_map. xr_map[4] becomes 2",
            "vars": {"val": 2, "xr": 4, "xr_map": "{0: 1, 4: 2, 6: 1}", "count": 1}
        },
        {
            "line": 8,
            "desc": "Process fourth element val = 6",
            "vars": {"val": 6, "xr": 4, "count": 1}
        },
        {
            "line": 10,
            "desc": "Update xr by XORing 6. xr = 4 ^ 6 = 2",
            "vars": {"val": 6, "xr": 2, "count": 1}
        },
        {
            "line": 12,
            "desc": "Compute target = xr ^ B = 2 ^ 6 = 4",
            "vars": {"val": 6, "xr": 2, "target": 4, "count": 1}
        },
        {
            "line": 14,
            "desc": "Check if target 4 is in xr_map. It is. count becomes count + xr_map[4] = 1 + 2 = 3",
            "vars": {"val": 6, "xr": 2, "target": 4, "count": 3}
        },
        {
            "line": 17,
            "desc": "Add current xr = 2 to xr_map",
            "vars": {"val": 6, "xr": 2, "xr_map": "{0: 1, 4: 2, 6: 1, 2: 1}", "count": 3}
        },
        {
            "line": 8,
            "desc": "Process fifth element val = 4",
            "vars": {"val": 4, "xr": 2, "count": 3}
        },
        {
            "line": 10,
            "desc": "Update xr by XORing 4. xr = 2 ^ 4 = 6",
            "vars": {"val": 4, "xr": 6, "count": 3}
        },
        {
            "line": 12,
            "desc": "Compute target = xr ^ B = 6 ^ 6 = 0",
            "vars": {"val": 4, "xr": 6, "target": 0, "count": 3}
        },
        {
            "line": 14,
            "desc": "Check if target 0 is in xr_map. It is. count becomes count + xr_map[0] = 3 + 1 = 4",
            "vars": {"val": 4, "xr": 6, "target": 0, "count": 4}
        },
        {
            "line": 17,
            "desc": "Add current xr = 6 to xr_map. xr_map[6] becomes 2",
            "vars": {"val": 4, "xr": 6, "xr_map": "{0: 1, 4: 2, 6: 2, 2: 1}", "count": 4}
        },
        {
            "line": 19,
            "desc": "Loop finished, return count = 4",
            "vars": {"count": 4}
        }
    ]
}

# 2. Longest Substring Without Repeating Characters
dsa_sol_1["Longest Substring Without Repeating Characters"] = {
    "solution": {
        "title": "Longest Substring Without Repeating Characters",
        "problemStatement": "Given a string s, find the length of the longest substring without repeating characters.",
        "examples": [
            {
                "input": "s = \"abcabcbb\"",
                "output": "3",
                "explanation": "The answer is \"abc\", with the length of 3."
            },
            {
                "input": "s = \"bbbbb\"",
                "output": "1",
                "explanation": "The answer is \"b\", with the length of 1."
            }
        ],
        "constraints": [
            "0 <= len(s) <= 5 * 10^4",
            "s consists of English letters, digits, symbols, and spaces."
        ],
        "edgeCases": [
            "Empty string s = \"\"",
            "All characters are identical, e.g. \"aaaa\"",
            "String with all unique characters, e.g. \"abcdef\""
        ],
        "followUps": [
            "Can we optimize the lookup time if the character set is strictly ASCII?",
            "What if we want to print the actual longest substring?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Check all possible substrings. For each substring, determine if it has duplicate characters and keep track of the maximum length.",
                "algorithm": "1. Initialize max_len = 0.\n2. Iterate i from 0 to len(s) - 1.\n3. Iterate j from i to len(s) - 1.\n4. Use a set to detect duplicates. If a character is already present, break. Else, add it and update max_len.\n5. Return max_len.",
                "code": "def lengthOfLongestSubstring(s):\n    # Initialize the maximum length of substring to 0\n    max_len = 0\n    # Outer loop to choose the start index of the substring\n    for i in range(len(s)):\n        # Set to store unique characters in the current substring\n        seen = set()\n        # Inner loop to choose the end index of the substring\n        for j in range(i, len(s)):\n            # If the character is already in the set, break the loop\n            if s[j] in seen:\n                break\n            # Add the character to the set\n            seen.add(s[j])\n            # Update maximum length if the current length is greater\n            max_len = max(max_len, j - i + 1)\n    # Return the maximum length found\n    return max_len",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(min(N, M)) where M is alphabet size"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use sliding window with two pointers (left and right). Keep a map from character to its last seen index. When right pointer sees a duplicate character that lies within the current window, we update the left pointer to the position next to the character's last seen index.",
                "algorithm": "1. Initialize `char_map` = {}, `left` = 0, `max_len` = 0.\n2. Loop `right` from 0 to len(s)-1.\n3. If `s[right]` is in `char_map` and its index is >= `left`, set `left` = `char_map[s[right]] + 1`.\n4. Store/update `char_map[s[right]]` = `right`.\n5. Update `max_len` = max(max_len, right - left + 1).\n6. Return `max_len`.",
                "code": "def lengthOfLongestSubstring(s):\n    # Dictionary to store the last seen index of each character\n    char_map = {}\n    # Initialize maximum length of unique substring to 0\n    max_len = 0\n    # Initialize the left pointer of the sliding window to 0\n    left = 0\n    # Iterate through the string with the right pointer\n    for right in range(len(s)):\n        # If the character is already in the window, shrink the window\n        if s[right] in char_map and char_map[s[right]] >= left:\n            left = char_map[s[right]] + 1\n        # Update/store the last seen index of the character\n        char_map[s[right]] = right\n        # Update the maximum length of unique substring\n        max_len = max(max_len, right - left + 1)\n    # Return the maximum length found\n    return max_len",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(min(N, M)) where M is character set size"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 2,
            "desc": "Initialize empty char_map",
            "vars": {"char_map": "{}"}
        },
        {
            "line": 4,
            "desc": "Initialize max_len to 0",
            "vars": {"max_len": 0}
        },
        {
            "line": 6,
            "desc": "Initialize left pointer to 0",
            "vars": {"left": 0, "max_len": 0}
        },
        {
            "line": 8,
            "desc": "Start iteration: right = 0, char = 'a'",
            "vars": {"right": 0, "s[right]": "a", "left": 0}
        },
        {
            "line": 13,
            "desc": "Add 'a' to char_map at index 0",
            "vars": {"char_map": "{'a': 0}", "left": 0}
        },
        {
            "line": 15,
            "desc": "Update max_len to max(0, 0-0+1) = 1",
            "vars": {"max_len": 1}
        },
        {
            "line": 8,
            "desc": "right = 1, char = 'b'",
            "vars": {"right": 1, "s[right]": "b", "left": 0}
        },
        {
            "line": 13,
            "desc": "Add 'b' to char_map at index 1",
            "vars": {"char_map": "{'a': 0, 'b': 1}", "left": 0}
        },
        {
            "line": 15,
            "desc": "Update max_len to max(1, 1-0+1) = 2",
            "vars": {"max_len": 2}
        },
        {
            "line": 8,
            "desc": "right = 2, char = 'c'",
            "vars": {"right": 2, "s[right]": "c", "left": 0}
        },
        {
            "line": 13,
            "desc": "Add 'c' to char_map at index 2",
            "vars": {"char_map": "{'a': 0, 'b': 1, 'c': 2}", "left": 0}
        },
        {
            "line": 15,
            "desc": "Update max_len to max(2, 2-0+1) = 3",
            "vars": {"max_len": 3}
        },
        {
            "line": 8,
            "desc": "right = 3, char = 'a'",
            "vars": {"right": 3, "s[right]": "a", "left": 0}
        },
        {
            "line": 11,
            "desc": "Detected 'a' in map and index (0) >= left (0). Update left to 0 + 1 = 1",
            "vars": {"left": 1}
        },
        {
            "line": 13,
            "desc": "Update 'a' in char_map to index 3",
            "vars": {"char_map": "{'a': 3, 'b': 1, 'c': 2}", "left": 1}
        },
        {
            "line": 15,
            "desc": "max_len remains max(3, 3-1+1) = 3",
            "vars": {"max_len": 3}
        },
        {
            "line": 17,
            "desc": "Loop terminates eventually, return max_len = 3",
            "vars": {"max_len": 3}
        }
    ]
}

# 3. Remove Nth Node From End
dsa_sol_1["Remove Nth Node From End"] = {
    "solution": {
        "title": "Remove Nth Node From End",
        "problemStatement": "Given the head of a linked list, remove the n-th node from the end of the list and return its head.",
        "examples": [
            {
                "input": "head = [1,2,3,4,5], n = 2",
                "output": "[1,2,3,5]",
                "explanation": "The 2nd node from the end is 4. Removing it leaves 1->2->3->5."
            },
            {
                "input": "head = [1], n = 1",
                "output": "[]",
                "explanation": "Removing the only node leaves an empty list."
            }
        ],
        "constraints": [
            "The number of nodes in the list is sz.",
            "1 <= sz <= 30",
            "0 <= Node.val <= 100",
            "1 <= n <= sz"
        ],
        "edgeCases": [
            "List has only 1 node, n = 1.",
            "Removing the head node (n = length of list).",
            "Removing the last node (n = 1)."
        ],
        "followUps": [
            "Could you do this in one pass?",
            "Can we do this recursively without maintaining length?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Find the length of the list, calculate the index of the node to delete from the start, and delete it in a second pass.",
                "algorithm": "1. Traverse the list once to calculate its total length L.\n2. If L == n, return head.next.\n3. Traverse up to the (L - n - 1)-th node from start.\n4. Skip the L-n-th node by modifying next pointer: curr.next = curr.next.next.\n5. Return head.",
                "code": "def removeNthFromEnd(head, n):\n    # Initialize a pointer to traverse the list\n    temp = head\n    # Variable to store the total length of the list\n    length = 0\n    # Count the total number of nodes in the linked list\n    while temp:\n        length += 1\n        temp = temp.next\n    # If the node to be removed is the head node\n    if length == n:\n        return head.next\n    # Calculate the step count to reach the node before the target node\n    steps_to_move = length - n - 1\n    # Pointer to traverse up to the node before target node\n    curr = head\n    # Traverse to the target position\n    for _ in range(steps_to_move):\n        curr = curr.next\n    # Delete the target node by skipping it in the next pointer\n    curr.next = curr.next.next\n    # Return the head of the modified linked list\n    return head",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use two pointers, fast and slow, initialized at a dummy node. Advance fast by n steps. Then advance both fast and slow together. When fast reaches the end, slow will point to the node just before the target node.",
                "algorithm": "1. Create a `dummy` node pointing to `head`.\n2. Initialize `fast` and `slow` pointers to `dummy`.\n3. Move `fast` pointer n steps ahead.\n4. Move both `fast` and `slow` pointers together until `fast.next` is None.\n5. Skip the target node: `slow.next = slow.next.next`.\n6. Return `dummy.next`.",
                "code": "def removeNthFromEnd(head, n):\n    # Create a dummy node to handle edge cases like removing the head\n    dummy = ListNode(0)\n    # Link dummy node to the head of the list\n    dummy.next = head\n    # Initialize fast and slow pointers to dummy node\n    fast = dummy\n    slow = dummy\n    # Move the fast pointer n steps ahead\n    for _ in range(n):\n        fast = fast.next\n    # Move both fast and slow pointers together until fast reaches the end node\n    while fast.next:\n        fast = fast.next\n        slow = slow.next\n    # Skip the N-th node from the end\n    slow.next = slow.next.next\n    # Return the new head node, which is dummy.next\n    return dummy.next",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Create dummy node",
            "vars": {"dummy": "ListNode(0)"}
        },
        {
            "line": 5,
            "desc": "Link dummy.next to head [1,2,3,4,5]",
            "vars": {"dummy.next.val": 1}
        },
        {
            "line": 7,
            "desc": "Initialize fast and slow to dummy",
            "vars": {"fast.val": 0, "slow.val": 0}
        },
        {
            "line": 10,
            "desc": "Advance fast by 2 steps (n=2)",
            "vars": {"fast.val": 2, "slow.val": 0}
        },
        {
            "line": 13,
            "desc": "Loop starts. fast.next (val 3) is not None. Advance both pointers.",
            "vars": {"fast.val": 3, "slow.val": 1}
        },
        {
            "line": 13,
            "desc": "fast.next (val 4) is not None. Advance both pointers.",
            "vars": {"fast.val": 4, "slow.val": 2}
        },
        {
            "line": 13,
            "desc": "fast.next (val 5) is not None. Advance both pointers.",
            "vars": {"fast.val": 5, "slow.val": 3}
        },
        {
            "line": 13,
            "desc": "fast.next is None. Loop ends.",
            "vars": {"fast.val": 5, "slow.val": 3}
        },
        {
            "line": 17,
            "desc": "Skip node 4. slow.next = slow.next.next (3.next points to 5)",
            "vars": {"slow.val": 3, "slow.next.val": 5}
        },
        {
            "line": 19,
            "desc": "Return dummy.next",
            "vars": {"dummy.next.val": 1}
        }
    ]
}

# 4. Add Two Numbers as Linked Lists
dsa_sol_1["Add Two Numbers as Linked Lists"] = {
    "solution": {
        "title": "Add Two Numbers as Linked Lists",
        "problemStatement": "You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.",
        "examples": [
            {
                "input": "l1 = [2,4,3], l2 = [5,6,4]",
                "output": "[7,0,8]",
                "explanation": "342 + 465 = 807."
            },
            {
                "input": "l1 = [0], l2 = [0]",
                "output": "[0]",
                "explanation": "0 + 0 = 0."
            }
        ],
        "constraints": [
            "The number of nodes in each linked list is in the range [1, 100].",
            "0 <= Node.val <= 9",
            "It is guaranteed that the list represents a number that does not have leading zeros, except the number 0 itself."
        ],
        "edgeCases": [
            "Lists of different lengths.",
            "Sum results in a carry to a new node at the very end (e.g. 99 + 1 = 100).",
            "One or both lists are 0."
        ],
        "followUps": [
            "What if the digits are stored in non-reversed order? (most significant digit first)",
            "Can you solve this without creating new nodes, modifying one of the input lists in-place?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Extract the integers from both lists by traversing them, calculate their sum, and then construct a new linked list from the digits of the sum.",
                "algorithm": "1. Traverse l1 to build the number string, reverse it, convert to int.\n2. Traverse l2 to build the number string, reverse it, convert to int.\n3. Add both integers.\n4. Create a dummy head, loop through digits of the sum string in reverse, and build the nodes.\n5. Return dummy.next.",
                "code": "def addTwoNumbers(l1, l2):\n    # Initialize strings to construct values of both numbers\n    num1 = \"\"\n    num2 = \"\"\n    # Traverse l1 and build number representation in reverse\n    curr1 = l1\n    while curr1:\n        num1 = str(curr1.val) + num1\n        curr1 = curr1.next\n    # Traverse l2 and build number representation in reverse\n    curr2 = l2\n    while curr2:\n        num2 = str(curr2.val) + num2\n        curr2 = curr2.next\n    # Handle empty strings by converting to '0'\n    val1 = int(num1) if num1 else 0\n    val2 = int(num2) if num2 else 0\n    # Add both integer values\n    total_sum = val1 + val2\n    # Convert sum back to a string\n    sum_str = str(total_sum)\n    # Create a dummy head for the result linked list\n    dummy = ListNode(0)\n    # Pointer to build the result list\n    curr = dummy\n    # Iterate through the digits in reverse order\n    for char in reversed(sum_str):\n        curr.next = ListNode(int(char))\n        curr = curr.next\n    # Return the sum list starting after the dummy node\n    return dummy.next",
                "complexity": {
                    "time": "O(N + M)",
                    "space": "O(N + M) for strings"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Directly add node-by-node with carry propagation, similar to manual addition. We traverse both lists simultaneously, adding corresponding digits and maintaining a carry.",
                "algorithm": "1. Initialize dummy head `dummy = ListNode(0)`, `curr = dummy`, `carry = 0`.\n2. Loop while `l1`, `l2` are not empty, or `carry` is not 0.\n3. Sum = `carry` + (l1.val if l1 else 0) + (l2.val if l2 else 0).\n4. Update `carry = Sum // 10`.\n5. Create node `Sum % 10`, attach to `curr.next`, move `curr`.\n6. Advance `l1` and `l2` if they exist.\n7. Return `dummy.next`.",
                "code": "def addTwoNumbers(l1, l2):\n    # Initialize a dummy node to act as the head of the output list\n    dummy = ListNode(0)\n    # Pointer to the current node of the result list\n    curr = dummy\n    # Variable to keep track of the carry value\n    carry = 0\n    # Traverse through both lists as long as there are nodes or a carry\n    while l1 or l2 or carry:\n        # Sum starts with the carry from the previous step\n        val_sum = carry\n        # Add value of l1 if it exists\n        if l1:\n            val_sum += l1.val\n            l1 = l1.next\n        # Add value of l2 if it exists\n        if l2:\n            val_sum += l2.val\n            l2 = l2.next\n        # Calculate new carry for the next iteration\n        carry = val_sum // 10\n        # Create a new node with the digit value and append it\n        curr.next = ListNode(val_sum % 10)\n        # Advance the pointer in the result list\n        curr = curr.next\n    # Return the head of the sum linked list\n    return dummy.next",
                "complexity": {
                    "time": "O(max(N, M))",
                    "space": "O(max(N, M)) for output list"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Create dummy node",
            "vars": {"dummy.val": 0, "carry": 0}
        },
        {
            "line": 7,
            "desc": "Set carry = 0",
            "vars": {"carry": 0}
        },
        {
            "line": 9,
            "desc": "Loop iteration 1: l1=[2,4,3], l2=[5,6,4], carry=0",
            "vars": {"l1.val": 2, "l2.val": 5, "carry": 0}
        },
        {
            "line": 13,
            "desc": "Add l1.val (2) to val_sum. l1 moves to next (4)",
            "vars": {"val_sum": 2, "l1.val": 4}
        },
        {
            "line": 17,
            "desc": "Add l2.val (5) to val_sum. l2 moves to next (6)",
            "vars": {"val_sum": 7, "l2.val": 6}
        },
        {
            "line": 21,
            "desc": "Update carry = 7 // 10 = 0",
            "vars": {"carry": 0}
        },
        {
            "line": 23,
            "desc": "Create node 7 % 10 = 7. dummy -> 7",
            "vars": {"curr.next.val": 7}
        },
        {
            "line": 25,
            "desc": "curr moves to node 7",
            "vars": {"curr.val": 7}
        },
        {
            "line": 9,
            "desc": "Loop iteration 2: l1=[4,3], l2=[6,4], carry=0",
            "vars": {"l1.val": 4, "l2.val": 6, "carry": 0}
        },
        {
            "line": 13,
            "desc": "Add l1.val (4). l1 moves to next (3)",
            "vars": {"val_sum": 4, "l1.val": 3}
        },
        {
            "line": 17,
            "desc": "Add l2.val (6). l2 moves to next (4)",
            "vars": {"val_sum": 10, "l2.val": 4}
        },
        {
            "line": 21,
            "desc": "Update carry = 10 // 10 = 1",
            "vars": {"carry": 1}
        },
        {
            "line": 23,
            "desc": "Create node 10 % 10 = 0. List: 7 -> 0",
            "vars": {"curr.next.val": 0}
        },
        {
            "line": 25,
            "desc": "curr moves to node 0",
            "vars": {"curr.val": 0}
        },
        {
            "line": 9,
            "desc": "Loop iteration 3: l1=[3], l2=[4], carry=1",
            "vars": {"l1.val": 3, "l2.val": 4, "carry": 1}
        },
        {
            "line": 13,
            "desc": "Add l1.val (3). l1 becomes None",
            "vars": {"val_sum": 4, "l1": "None"}
        },
        {
            "line": 17,
            "desc": "Add l2.val (4). l2 becomes None",
            "vars": {"val_sum": 8, "l2": "None"}
        },
        {
            "line": 21,
            "desc": "Update carry = 8 // 10 = 0",
            "vars": {"carry": 0}
        },
        {
            "line": 23,
            "desc": "Create node 8 % 10 = 8. List: 7 -> 0 -> 8",
            "vars": {"curr.next.val": 8}
        },
        {
            "line": 25,
            "desc": "curr moves to node 8",
            "vars": {"curr.val": 8}
        },
        {
            "line": 27,
            "desc": "Return dummy.next (7)",
            "vars": {"dummy.next.val": 7}
        }
    ]
}

# 5. Delete a Given Node
dsa_sol_1["Delete a Given Node"] = {
    "solution": {
        "title": "Delete a Given Node",
        "problemStatement": "Write a function to delete a node in a singly-linked list. You will not be given access to the head of the list, instead you will be given access to the node to be deleted directly. It is guaranteed that the node to be deleted is not a tail node in the list.",
        "examples": [
            {
                "input": "head = [4,5,1,9], node = 5",
                "output": "[4,1,9]",
                "explanation": "You are given the second node with value 5, the linked list should become 4 -> 1 -> 9."
            },
            {
                "input": "head = [4,5,1,9], node = 1",
                "output": "[4,5,9]",
                "explanation": "You are given the third node with value 1, the linked list should become 4 -> 5 -> 9."
            }
        ],
        "constraints": [
            "The number of the nodes in the given list is in the range [2, 1000].",
            "-1000 <= Node.val <= 1000",
            "All the values of the nodes in the list are unique.",
            "The node to be deleted is in the list and is not a tail node."
        ],
        "edgeCases": [
            "Deleting the head node.",
            "Deleting the node adjacent to the tail node."
        ],
        "followUps": [
            "Can you delete a node if it is the tail node?",
            "What if we need to release the memory of the deleted node in low-level languages?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Shift values of all nodes following the target node one position to the left, and then delete the last node.",
                "algorithm": "1. Start at the node to delete.\n2. Iterate through the list, setting curr.val = curr.next.val.\n3. Maintain a pointer to the previous node.\n4. When you reach the tail, set prev.next = None.\n5. The node is effectively deleted.",
                "code": "def deleteNode(node):\n    # Initialize a pointer to the current node\n    curr = node\n    # Initialize a pointer to keep track of the parent node\n    prev = None\n    # Traverse and copy values of next nodes to current nodes\n    while curr.next:\n        # Copy next node's value to current node\n        curr.val = curr.next.val\n        # Keep track of current node as previous\n        prev = curr\n        # Move to the next node\n        curr = curr.next\n    # Sever connection to the last node which is now duplicate\n    if prev:\n        prev.next = None",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Copy the value of the next node to the current node, then delete the next node by linking the current node's next pointer to node.next.next.",
                "algorithm": "1. Set `node.val = node.next.val`.\n2. Set `node.next = node.next.next`.",
                "code": "def deleteNode(node):\n    # Copy the value of the next node to the current node\n    node.val = node.next.val\n    # Point the current node's next pointer to the next-next node\n    node.next = node.next.next",
                "complexity": {
                    "time": "O(1)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Copy value from next node node.next.val (1) to node.val. Node value updates from 5 to 1.",
            "vars": {"node.val": 1, "node.next.val": 1}
        },
        {
            "line": 5,
            "desc": "Update next pointer. node.next points to node.next.next (node 9). Node with value 1 in node.next is bypassed.",
            "vars": {"node.val": 1, "node.next.val": 9}
        }
    ]
}

# 6. Intersection of Two Linked Lists
dsa_sol_1["Intersection of Two Linked Lists"] = {
    "solution": {
        "title": "Intersection of Two Linked Lists",
        "problemStatement": "Given the heads of two singly linked-lists headA and headB, return the node at which the two lists intersect. If the two linked lists have no intersection at all, return null.",
        "examples": [
            {
                "input": "intersectVal = 8, listA = [4,1,8,4,5], listB = [5,6,1,8,4,5], skipA = 2, skipB = 3",
                "output": "Intersected at '8'",
                "explanation": "The intersected node's value is 8."
            },
            {
                "input": "listA = [2,6,4], listB = [1,5]",
                "output": "null",
                "explanation": "The two lists do not intersect."
            }
        ],
        "constraints": [
            "The number of nodes of listA is m.",
            "The number of nodes of listB is n.",
            "1 <= m, n <= 3 * 10^4",
            "1 <= Node.val <= 10^9"
        ],
        "edgeCases": [
            "Lists have no intersection.",
            "Intersection is at the head of one (or both) list.",
            "Lists are of equal or unequal lengths."
        ],
        "followUps": [
            "Can you write a solution that runs in O(m + n) time and use only O(1) memory?",
            "What if there are cycles inside the list? How does it affect intersection detection?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Compare every node of list A with every node of list B. The first node reference that is identical is the intersection node.",
                "algorithm": "1. Loop through each node A of list A.\n2. In a nested loop, loop through each node B of list B.\n3. If A == B, return A.\n4. If outer loop completes, return None.",
                "code": "def getIntersectionNode(headA, headB):\n    # Pointer for traversing list A\n    currA = headA\n    # Loop over all nodes of list A\n    while currA:\n        # Pointer for traversing list B\n        currB = headB\n        # Loop over all nodes of list B\n        while currB:\n            # If nodes are identical, intersection found\n            if currA == currB:\n                return currA\n            # Move to next node in list B\n            currB = currB.next\n        # Move to next node in list A\n        currA = currA.next\n    # Return None if no intersection is found\n    return None",
                "complexity": {
                    "time": "O(N * M)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use two pointers, pA and pB, starting at headA and headB. Traverse the lists. When pA reaches the end, reset it to headB. When pB reaches the end, reset it to headA. If they intersect, they will meet at the intersection point in the second pass because the combined distance traversed by both is equal (L_A + L_B).",
                "algorithm": "1. Initialize `pA = headA` and `pB = headB`.\n2. Loop while `pA != pB`.\n3. Set `pA = pA.next` if `pA` is not None, else `pA = headB`.\n4. Set `pB = pB.next` if `pB` is not None, else `pB = headA`.\n5. Return `pA` (which is either intersection node or None).",
                "code": "def getIntersectionNode(headA, headB):\n    # If either list is empty, there is no intersection\n    if not headA or not headB:\n        return None\n    # Initialize pointer A to the head of list A\n    pA = headA\n    # Initialize pointer B to the head of list B\n    pB = headB\n    # Traverse until the pointers meet\n    while pA != pB:\n        # If pointer A reaches the end, redirect to head of list B\n        pA = headB if pA is None else pA.next\n        # If pointer B reaches the end, redirect to head of list A\n        pB = headA if pB is None else pB.next\n    # Either both are None or both point to the intersection node\n    return pA",
                "complexity": {
                    "time": "O(N + M)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 6,
            "desc": "Initialize pointer A to headA",
            "vars": {"pA.val": 4}
        },
        {
            "line": 8,
            "desc": "Initialize pointer B to headB",
            "vars": {"pA.val": 4, "pB.val": 5}
        },
        {
            "line": 10,
            "desc": "Start loop: pA != pB",
            "vars": {"pA.val": 4, "pB.val": 5}
        },
        {
            "line": 12,
            "desc": "Advance pA to 1, redirect/advance pB to 6",
            "vars": {"pA.val": 1, "pB.val": 6}
        },
        {
            "line": 12,
            "desc": "Advance pA to 8, redirect/advance pB to 1",
            "vars": {"pA.val": 8, "pB.val": 1}
        },
        {
            "line": 12,
            "desc": "Advance pA to 4, redirect/advance pB to 8 (intersection)",
            "vars": {"pA.val": 4, "pB.val": 8}
        },
        {
            "line": 12,
            "desc": "Advance pA to 5, redirect/advance pB to 4",
            "vars": {"pA.val": 5, "pB.val": 4}
        },
        {
            "line": 12,
            "desc": "pA reaches None, redirect/advance pB to 5",
            "vars": {"pA": "None", "pB.val": 5}
        },
        {
            "line": 12,
            "desc": "Redirect pA to headB (5), pB reaches None",
            "vars": {"pA.val": 5, "pB": "None"}
        },
        {
            "line": 12,
            "desc": "Advance pA to 6, redirect pB to headA (4)",
            "vars": {"pA.val": 6, "pB.val": 4}
        },
        {
            "line": 12,
            "desc": "Advance pA to 1, advance pB to 1",
            "vars": {"pA.val": 1, "pB.val": 1}
        },
        {
            "line": 12,
            "desc": "Advance pA to 8, advance pB to 8. They match!",
            "vars": {"pA.val": 8, "pB.val": 8}
        },
        {
            "line": 15,
            "desc": "Loop terminates. Return pA",
            "vars": {"pA.val": 8}
        }
    ]
}

# 7. Reverse Nodes in K Group
dsa_sol_1["Reverse Nodes in K Group"] = {
    "solution": {
        "title": "Reverse Nodes in K Group",
        "problemStatement": "Given the head of a linked list, reverse the nodes of the list k at a time, and return its modified head. k is a positive integer and is less than or equal to the length of the linked list. If the number of nodes is not a multiple of k then left-out nodes, in the end, should remain as it is.",
        "examples": [
            {
                "input": "head = [1,2,3,4,5], k = 2",
                "output": "[2,1,4,3,5]",
                "explanation": "First 2 nodes reversed -> [2,1], next 2 nodes reversed -> [4,3], last node 5 is left as is."
            },
            {
                "input": "head = [1,2,3,4,5], k = 3",
                "output": "[3,2,1,4,5]",
                "explanation": "First 3 nodes reversed -> [3,2,1], remaining 4,5 left as is."
            }
        ],
        "constraints": [
            "The number of nodes in the list is sz.",
            "1 <= sz <= 5000",
            "0 <= Node.val <= 1000",
            "1 <= k <= sz"
        ],
        "edgeCases": [
            "k = 1 (no changes).",
            "k is equal to the length of the list.",
            "Remaining nodes at the end are less than k (should not be reversed)."
        ],
        "followUps": [
            "Can you solve it iteratively with O(1) auxiliary space?",
            "What if we want to reverse the remaining nodes too?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Copy nodes to an array, reverse the groups of size k, and then rebuild/re-link the nodes.",
                "algorithm": "1. Traverse the list and store node references in an array.\n2. Iterate through the array in steps of size k.\n3. Reverse each slice of size k.\n4. Reconnect all nodes sequentially.\n5. Return the new head.",
                "code": "def reverseKGroup(head, k):\n    # Store all nodes of the linked list in a Python list\n    nodes = []\n    curr = head\n    while curr:\n        nodes.append(curr)\n        curr = curr.next\n    # Find the total number of complete groups of size k\n    n = len(nodes)\n    # Loop over and reverse each segment of length k\n    for i in range(0, n - n % k, k):\n        # Reverse the sublist slice in place\n        nodes[i:i+k] = reversed(nodes[i:i+k])\n    # Reconnect the nodes according to the new ordering\n    for i in range(n - 1):\n        nodes[i].next = nodes[i+1]\n    # Set the next of the last node to None if there are nodes, else return None\n    if n > 0:\n        nodes[-1].next = None\n        return nodes[0]\n    return None",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Reverse K nodes recursively. First verify if at least K nodes exist. If yes, reverse them, and recursively call the function for the remaining list, connecting the result to the next of the current head (which becomes the tail of the reversed group).",
                "algorithm": "1. Count if at least `k` nodes are available.\n2. If not, return `head`.\n3. Reverse the first `k` nodes using a standard iterative list reverse.\n4. Call `reverseKGroup` on the remaining list (`curr` after the loop).\n5. Set `head.next` to the result of the recursive call.\n6. Return `prev` (the new head of the reversed segment).",
                "code": "def reverseKGroup(head, k):\n    # Check if there are at least k nodes left in the list\n    curr = head\n    count = 0\n    while curr and count < k:\n        curr = curr.next\n        count += 1\n    # If we have at least k nodes, reverse them\n    if count == k:\n        # Reverse the first k nodes of the list\n        prev = None\n        curr = head\n        for _ in range(k):\n            next_node = curr.next\n            curr.next = prev\n            prev = curr\n            curr = next_node\n        # Recursively reverse the rest of the list and connect it\n        if head:\n            head.next = reverseKGroup(curr, k)\n        # prev is the new head of this reversed block\n        return prev\n    # If there are fewer than k nodes left, leave them as is\n    return head",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(N/K) recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Check node count: curr initialized to head (1)",
            "vars": {"curr.val": 1, "count": 0}
        },
        {
            "line": 8,
            "desc": "Found at least 2 nodes. Start reversal. prev = None, curr = head (1)",
            "vars": {"prev": "None", "curr.val": 1, "count": 2}
        },
        {
            "line": 13,
            "desc": "Reversal Step 1: next_node = 2. 1.next = None. prev = 1, curr = 2.",
            "vars": {"prev.val": 1, "curr.val": 2, "next_node.val": 2}
        },
        {
            "line": 13,
            "desc": "Reversal Step 2: next_node = 3. 2.next = 1. prev = 2, curr = 3.",
            "vars": {"prev.val": 2, "curr.val": 3, "next_node.val": 3}
        },
        {
            "line": 20,
            "desc": "Call reverseKGroup recursively on node 3",
            "vars": {"curr.val": 3}
        },
        {
            "line": 3,
            "desc": "[Recursion 2] Check node count: curr = 3",
            "vars": {"curr.val": 3, "count": 0}
        },
        {
            "line": 8,
            "desc": "[Recursion 2] Found 2 nodes. Reverse. prev = None, curr = 3",
            "vars": {"prev": "None", "curr.val": 3, "count": 2}
        },
        {
            "line": 13,
            "desc": "[Recursion 2] Step 1: next_node = 4. 3.next = None. prev = 3, curr = 4.",
            "vars": {"prev.val": 3, "curr.val": 4, "next_node.val": 4}
        },
        {
            "line": 13,
            "desc": "[Recursion 2] Step 2: next_node = 5. 4.next = 3. prev = 4, curr = 5.",
            "vars": {"prev.val": 4, "curr.val": 5, "next_node.val": 5}
        },
        {
            "line": 20,
            "desc": "[Recursion 2] Call reverseKGroup recursively on node 5",
            "vars": {"curr.val": 5}
        },
        {
            "line": 3,
            "desc": "[Recursion 3] Only 1 node left (node 5). count = 1 < 2.",
            "vars": {"curr": "None", "count": 1}
        },
        {
            "line": 24,
            "desc": "[Recursion 3] Return node 5 as is",
            "vars": {"return.val": 5}
        },
        {
            "line": 20,
            "desc": "[Recursion 2] Set head.next (3.next) to result (5). Return prev (4).",
            "vars": {"head.val": 3, "head.next.val": 5, "return.val": 4}
        },
        {
            "line": 20,
            "desc": "Set head.next (1.next) to result (4). Return prev (2).",
            "vars": {"head.val": 1, "head.next.val": 4, "return.val": 2}
        }
    ]
}

# 8. Check if Linked List is Palindrome
dsa_sol_1["Check if Linked List is Palindrome"] = {
    "solution": {
        "title": "Check if Linked List is Palindrome",
        "problemStatement": "Given the head of a singly linked list, return true if it is a palindrome or false otherwise.",
        "examples": [
            {
                "input": "head = [1,2,2,1]",
                "output": "true",
                "explanation": "The list is symmetric, reading 1->2->2->1 from left and right."
            },
            {
                "input": "head = [1,2]",
                "output": "false",
                "explanation": "Reading forwards is 1->2, backwards is 2->1."
            }
        ],
        "constraints": [
            "The number of nodes in the list is in the range [1, 10^5].",
            "0 <= Node.val <= 9"
        ],
        "edgeCases": [
            "Single node list (always True).",
            "Even vs odd length lists.",
            "All elements are identical."
        ],
        "followUps": [
            "Could you do it in O(N) time and O(1) space?",
            "How would you restore the original list after verifying?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Copy values from the linked list into an array and check if the array is a palindrome.",
                "algorithm": "1. Traverse the linked list and append node values to a list.\n2. Use double pointers or array slicing to compare the list to its reverse.\n3. Return True if identical, else False.",
                "code": "def isPalindrome(head):\n    # List to store the values of nodes\n    values = []\n    # Traverse the linked list and append values to list\n    curr = head\n    while curr:\n        values.append(curr.val)\n        curr = curr.next\n    # Compare the list of values with its reversed version\n    return values == values[::-1]",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Find the middle of the linked list using slow and fast pointers. Reverse the second half of the list. Then compare the first half and the reversed second half node-by-node.",
                "algorithm": "1. Use slow/fast pointers to find middle of list.\n2. Reverse the list starting from the middle (slow pointer).\n3. Use two pointers to compare the values of first half and reversed second half.\n4. If values mismatch, return False. If end of second half is reached, return True.",
                "code": "def isPalindrome(head):\n    # Return True if list is empty or has only one node\n    if not head or not head.next:\n        return True\n    # Initialize slow and fast pointers to find the middle of list\n    slow = head\n    fast = head\n    # Move fast by 2 steps and slow by 1 step\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    # Reverse the second half of the linked list starting from slow\n    prev = None\n    curr = slow\n    while curr:\n        next_node = curr.next\n        curr.next = prev\n        prev = curr\n        curr = next_node\n    # Compare the first half and the reversed second half\n    left = head\n    right = prev\n    # Check for value equality in both halves\n    while right:\n        if left.val != right.val:\n            return False\n        left = left.next\n        right = right.next\n    # Return True if all values matched\n    return True",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Check if list has 0 or 1 node.",
            "vars": {"head.val": 1}
        },
        {
            "line": 6,
            "desc": "Initialize slow and fast pointers to head (1)",
            "vars": {"slow.val": 1, "fast.val": 1}
        },
        {
            "line": 10,
            "desc": "Iteration 1: Move slow to 2, fast to 2",
            "vars": {"slow.val": 2, "fast.val": 2}
        },
        {
            "line": 10,
            "desc": "Iteration 2: fast.next is not None. Move slow to 2 (second 2), fast to None",
            "vars": {"slow.val": 2, "fast": "None"}
        },
        {
            "line": 14,
            "desc": "Reversal of second half: initialize prev = None, curr = slow (2)",
            "vars": {"prev": "None", "curr.val": 2}
        },
        {
            "line": 16,
            "desc": "Reversal step 1: 2.next becomes None. prev = 2, curr = 1",
            "vars": {"prev.val": 2, "curr.val": 1}
        },
        {
            "line": 16,
            "desc": "Reversal step 2: 1.next becomes 2. prev = 1, curr = None",
            "vars": {"prev.val": 1, "curr": "None"}
        },
        {
            "line": 22,
            "desc": "Set left pointer to head (1), right pointer to prev (1)",
            "vars": {"left.val": 1, "right.val": 1}
        },
        {
            "line": 25,
            "desc": "Compare left.val (1) and right.val (1). Match! Move pointers.",
            "vars": {"left.val": 2, "right.val": 2}
        },
        {
            "line": 25,
            "desc": "Compare left.val (2) and right.val (2). Match! Move pointers.",
            "vars": {"left.val": 2, "right": "None"}
        },
        {
            "line": 30,
            "desc": "Comparison finished successfully. Return True.",
            "vars": {"return": "True"}
        }
    ]
}

# 9. Find Starting Point of Loop
dsa_sol_1["Find Starting Point of Loop"] = {
    "solution": {
        "title": "Find Starting Point of Loop",
        "problemStatement": "Given the head of a linked list, return the node where the cycle begins. If there is no cycle, return null.",
        "examples": [
            {
                "input": "head = [3,2,0,-4], pos = 1 (loop at node 2)",
                "output": "tail connects to node index 1",
                "explanation": "There is a cycle in the linked list, where tail connects to the second node."
            },
            {
                "input": "head = [1], pos = -1",
                "output": "no cycle",
                "explanation": "There is no cycle in the linked list."
            }
        ],
        "constraints": [
            "The number of nodes in the list is in the range [0, 10^4].",
            "-10^5 <= Node.val <= 10^5",
            "pos is -1 or a valid index in the linked-list."
        ],
        "edgeCases": [
            "No cycle in list.",
            "Cycle begins at the head node.",
            "Entire list is a self-loop on a single node."
        ],
        "followUps": [
            "Can you solve it using O(1) memory?",
            "What happens if there are multiple loops? (Not possible in standard singly-linked list)."
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Use a hash set to store the memory addresses of visited nodes. The first node we encounter that is already in the set is the start of the loop.",
                "algorithm": "1. Initialize an empty set `visited`.\n2. Traverse the list from head.\n3. If current node is in `visited`, return it.\n4. Else, add it to `visited` and move to next node.\n5. If end of list reached, return None.",
                "code": "def detectCycle(head):\n    # Set to store visited nodes\n    visited = set()\n    # Pointer to traverse the list\n    curr = head\n    # Loop until the end of the list or cycle is detected\n    while curr:\n        # If node already visited, it is the start of loop\n        if curr in visited:\n            return curr\n        # Add current node to visited set\n        visited.add(curr)\n        # Move to the next node\n        curr = curr.next\n    # Return None if there is no cycle\n    return None",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use Floyd's Cycle Detection Algorithm. Find collision point of slow and fast pointers. Reset slow to head. Move slow and fast pointers at the same speed (1 step). The node where they meet is the start of the loop.",
                "algorithm": "1. Initialize `slow = head`, `fast = head`.\n2. Move slow by 1 and fast by 2 steps. If they meet, a cycle exists.\n3. If they don't meet and fast reaches None, return None.\n4. Reset `slow = head`.\n5. Move both `slow` and `fast` by 1 step at a time.\n6. The node where they meet is the start of the loop.",
                "code": "def detectCycle(head):\n    # Initialize slow and fast pointers to head\n    slow = head\n    # Initialize fast pointer to head\n    fast = head\n    # Traverse the list to find a collision point\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        # Collision detected\n        if slow == fast:\n            # Move slow pointer back to the head\n            slow = head\n            # Move both pointers at same speed until they meet\n            while slow != fast:\n                slow = slow.next\n                fast = fast.next\n            # Meeting point is the start of the loop\n            return slow\n    # Return None if no cycle exists\n    return None",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize slow to head (3)",
            "vars": {"slow.val": 3}
        },
        {
            "line": 5,
            "desc": "Initialize fast to head (3)",
            "vars": {"slow.val": 3, "fast.val": 3}
        },
        {
            "line": 7,
            "desc": "Iteration 1: Move slow to 2, fast to 0",
            "vars": {"slow.val": 2, "fast.val": 0}
        },
        {
            "line": 7,
            "desc": "Iteration 2: Move slow to 0, fast to 2 (from loop)",
            "vars": {"slow.val": 0, "fast.val": 2}
        },
        {
            "line": 7,
            "desc": "Iteration 3: Move slow to -4, fast to -4. They collision!",
            "vars": {"slow.val": -4, "fast.val": -4}
        },
        {
            "line": 12,
            "desc": "Reset slow pointer to head (3)",
            "vars": {"slow.val": 3, "fast.val": -4}
        },
        {
            "line": 14,
            "desc": "Move slow to 2, fast to 2. They meet!",
            "vars": {"slow.val": 2, "fast.val": 2}
        },
        {
            "line": 18,
            "desc": "Return slow (node 2)",
            "vars": {"return.val": 2}
        }
    ]
}

# 10. Flatten a Linked List
dsa_sol_1["Flatten a Linked List"] = {
    "solution": {
        "title": "Flatten a Linked List",
        "problemStatement": "Given a Linked List of size N, where every node represents a sub-linked-list and contains two pointers: a next pointer to the next node, and a bottom pointer to a linked list where this node is head. Each sub-linked-list is sorted. Flatten the link list such that all nodes appear in a single sorted bottom-linked-list.",
        "examples": [
            {
                "input": "5 -> 10 -> 19 -> 28\n|    |     |     |\nV    V     V     V\n7    20    22    35\n|          |     |\nV          V     V\n8          50    40\n|                |\nV                V\n30               45",
                "output": "5 -> 7 -> 8 -> 10 -> 19 -> 20 -> 22 -> 28 -> 30 -> 35 -> 40 -> 45 -> 50",
                "explanation": "All elements merged in sorted order."
            }
        ],
        "constraints": [
            "0 <= N <= 50 (columns)",
            "0 <= M <= 20 (nodes per column)",
            "1 <= Node.data <= 1000"
        ],
        "edgeCases": [
            "Only one vertical list.",
            "Columns have different number of elements.",
            "Empty list."
        ],
        "followUps": [
            "Can we optimize the merge using a Min-Heap (Priority Queue)?",
            "What is the time complexity of the Min-Heap approach compared to recursive merging?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Traverse the entire 2D linked list structure, collect all node values in a list, sort them, and recreate a new flattened linked list.",
                "algorithm": "1. Initialize a list `values`.\n2. Push the root to a queue.\n3. Traverse the tree structure using `next` and `bottom` pointers, saving values.\n4. Sort `values`.\n5. Rebuild the list using `bottom` pointers.\n6. Return new root.",
                "code": "def flatten(root):\n    # List to store values of all nodes\n    values = []\n    # Queue for level-order/vertical traversal\n    queue = [root]\n    # Traverse and collect all values\n    while queue:\n        curr = queue.pop(0)\n        while curr:\n            values.append(curr.data)\n            # Add next pointer node to queue to visit other columns\n            if curr.next:\n                queue.append(curr.next)\n                curr.next = None\n            curr = curr.bottom\n    # If no nodes, return None\n    if not values:\n        return None\n    # Sort all collected values\n    values.sort()\n    # Rebuild flattened list using bottom pointer\n    new_root = Node(values[0])\n    curr = new_root\n    for val in values[1:]:\n        curr.bottom = Node(val)\n        curr = curr.bottom\n    # Return head of the rebuilt list\n    return new_root",
                "complexity": {
                    "time": "O(N * M * log(N * M))",
                    "space": "O(N * M)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Merge lists from right to left recursively. Merge two sorted lists at a time using bottom pointer. Recursively flatten the right part first, then merge current list with the flattened right part.",
                "algorithm": "1. If `root` or `root.next` is None, return `root`.\n2. Recursively call `flatten(root.next)` to obtain a flattened right list.\n3. Merge the current vertical list `root` with the flattened right list `root.next` using a sorted merge helper.\n4. Return the merged list.",
                "code": "def mergeTwoLists(a, b):\n    # Dummy node to start the merged list\n    dummy = Node(0)\n    temp = dummy\n    # Compare and merge nodes using the bottom pointer\n    while a and b:\n        if a.data < b.data:\n            temp.bottom = a\n            temp = temp.bottom\n            a = a.bottom\n        else:\n            temp.bottom = b\n            temp = temp.bottom\n            b = b.bottom\n    # Append the remaining nodes of list a or list b\n    if a:\n        temp.bottom = a\n    else:\n        temp.bottom = b\n    # Return the merged list starting from dummy's bottom\n    return dummy.bottom\n\def flatten(root):\n    # Base case: if root is None or there is no next column\n    if not root or not root.next:\n        return root\n    # Recursively flatten the rest of the list\n    root.next = flatten(root.next)\n    # Merge the current column with the flattened next columns\n    root = mergeTwoLists(root, root.next)\n    # Return the final flattened list\n    return root",
                "complexity": {
                    "time": "O(N * M) where N is number of columns, M is nodes per column",
                    "space": "O(N) recursion stack"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 17,
            "desc": "Check if root (5) has next. Yes, next is 10. Call flatten recursively on next.",
            "vars": {"root.data": 5}
        },
        {
            "line": 17,
            "desc": "[Recursion 1] Check if root (10) has next. Yes, next is 19. Call flatten recursively.",
            "vars": {"root.data": 10}
        },
        {
            "line": 17,
            "desc": "[Recursion 2] Check if root (19) has next. Yes, next is 28. Call flatten recursively.",
            "vars": {"root.data": 19}
        },
        {
            "line": 20,
            "desc": "[Recursion 3] root (28) has no next. Returns root (28).",
            "vars": {"root.data": 28}
        },
        {
            "line": 24,
            "desc": "[Recursion 2] Merge list 19 (19->22->50) and flattened right list 28 (28->35->40->45).",
            "vars": {"a.data": 19, "b.data": 28}
        },
        {
            "line": 5,
            "desc": "[Merge] 19 < 28: dummy.bottom -> 19.",
            "vars": {"a.data": 22, "b.data": 28}
        },
        {
            "line": 5,
            "desc": "[Merge] 22 < 28: dummy.bottom -> 19 -> 22.",
            "vars": {"a.data": 50, "b.data": 28}
        },
        {
            "line": 9,
            "desc": "[Merge] 28 < 50: dummy.bottom -> 19 -> 22 -> 28.",
            "vars": {"a.data": 50, "b.data": 35}
        },
        {
            "line": 26,
            "desc": "[Recursion 2] Return merged list starting at 19.",
            "vars": {"return.data": 19}
        },
        {
            "line": 24,
            "desc": "[Recursion 1] Merge list 10 (10->20) and flattened list starting at 19.",
            "vars": {"a.data": 10, "b.data": 19}
        },
        {
            "line": 26,
            "desc": "[Recursion 1] Return merged list starting at 10.",
            "vars": {"return.data": 10}
        },
        {
            "line": 24,
            "desc": "Merge list 5 (5->7->8->30) and flattened list starting at 10.",
            "vars": {"a.data": 5, "b.data": 10}
        },
        {
            "line": 26,
            "desc": "Return final flattened list starting at 5.",
            "vars": {"return.data": 5}
        }
    ]
}

# 11. Rotate a Linked List
dsa_sol_1["Rotate a Linked List"] = {
    "solution": {
        "title": "Rotate a Linked List",
        "problemStatement": "Given the head of a linked list, rotate the list to the right by k places.",
        "examples": [
            {
                "input": "head = [1,2,3,4,5], k = 2",
                "output": "[4,5,1,2,3]",
                "explanation": "Rotate 1 steps right -> [5,1,2,3,4]. Rotate 2 steps right -> [4,5,1,2,3]."
            },
            {
                "input": "head = [0,1,2], k = 4",
                "output": "[2,0,1]",
                "explanation": "Length = 3. Rotate 4 places is same as 4 % 3 = 1 place. [2,0,1]."
            }
        ],
        "constraints": [
            "The number of nodes in the list is in the range [0, 500].",
            "-100 <= Node.val <= 100",
            "0 <= k <= 2 * 10^9"
        ],
        "edgeCases": [
            "Empty list head = null.",
            "k is a multiple of list length.",
            "Single node list."
        ],
        "followUps": [
            "How does the solution change if we want to rotate left?",
            "Can you perform this rotation in-place without copying any values?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Shift the last node of the list to the head position, one by one, K times. Optimize by taking k % N.",
                "algorithm": "1. Find length of list L.\n2. Take k = k % L.\n3. Loop k times.\n4. Find the second to last node.\n5. Detach the last node, set last.next = head, set head = last, make second to last point to None.\n6. Return head.",
                "code": "def rotateRight(head, k):\n    # Check if list is empty, has one node, or rotation count is 0\n    if not head or not head.next or k == 0:\n        # Return head as no rotation is needed\n        return head\n    # Find the length of the linked list\n    length = 1\n    temp = head\n    while temp.next:\n        length += 1\n        temp = temp.next\n    # Calculate effective rotation count\n    k = k % length\n    # If no rotation is needed, return original head\n    if k == 0:\n        return head\n    # Perform k single rotations\n    for _ in range(k):\n        # Traverse to find the second-to-last node\n        curr = head\n        while curr.next.next:\n            curr = curr.next\n        # last node becomes new head\n        last = curr.next\n        curr.next = None\n        last.next = head\n        head = last\n    # Return the new head\n    return head",
                "complexity": {
                    "time": "O(N * (K % N))",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Traverse the list to find the tail and length. Connect tail.next to head to make it circular. Find the new tail at position `length - (k % length)` and new head at `new_tail.next`. Break the circular link.",
                "algorithm": "1. If list is empty or has 1 node, return head.\n2. Compute length L, pointing `tail` to the last node.\n3. Connect `tail.next = head`.\n4. Find new tail at L - (k % L) steps from head.\n5. Set `new_head = new_tail.next`.\n6. Set `new_tail.next = None`.\n7. Return `new_head`.",
                "code": "def rotateRight(head, k):\n    # Return head if list is empty or has only one node\n    if not head or not head.next or k == 0:\n        return head\n    # Pointer to find the tail node and length of the list\n    tail = head\n    length = 1\n    # Traverse to find the tail of the list\n    while tail.next:\n        length += 1\n        tail = tail.next\n    # Connect the tail to the head to form a circular list\n    tail.next = head\n    # Calculate the steps needed to reach the new tail node\n    steps_to_new_tail = length - (k % length)\n    # Find the new tail node\n    new_tail = head\n    for _ in range(steps_to_new_tail - 1):\n        new_tail = new_tail.next\n    # The node after the new tail becomes the new head\n    new_head = new_tail.next\n    # Break the circular list connection\n    new_tail.next = None\n    # Return the new head node\n    return new_head",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Check edge cases. head has 5 nodes, k=2. Proceed.",
            "vars": {"k": 2}
        },
        {
            "line": 5,
            "desc": "Initialize tail to head (node 1), length to 1",
            "vars": {"tail.val": 1, "length": 1}
        },
        {
            "line": 8,
            "desc": "Traverse list: tail reaches node 5, length = 5",
            "vars": {"tail.val": 5, "length": 5}
        },
        {
            "line": 12,
            "desc": "Form circular loop: 5.next points to 1",
            "vars": {"tail.next.val": 1}
        },
        {
            "line": 14,
            "desc": "Compute steps to new tail: 5 - (2 % 5) = 3",
            "vars": {"steps_to_new_tail": 3}
        },
        {
            "line": 16,
            "desc": "Initialize new_tail to head (1)",
            "vars": {"new_tail.val": 1}
        },
        {
            "line": 17,
            "desc": "Traverse steps_to_new_tail - 1 = 2 steps: new_tail becomes 3",
            "vars": {"new_tail.val": 3}
        },
        {
            "line": 20,
            "desc": "Set new_head to new_tail.next (node 4)",
            "vars": {"new_head.val": 4}
        },
        {
            "line": 22,
            "desc": "Break loop: 3.next points to None",
            "vars": {"new_tail.next": "None"}
        },
        {
            "line": 24,
            "desc": "Return new_head (4 -> 5 -> 1 -> 2 -> 3)",
            "vars": {"new_head.val": 4}
        }
    ]
}

# 12. Remove Duplicates from Sorted Array
dsa_sol_1["Remove Duplicates from Sorted Array"] = {
    "solution": {
        "title": "Remove Duplicates from Sorted Array",
        "problemStatement": "Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. The relative order of the elements should be kept the same. Then return the number of unique elements in nums.",
        "examples": [
            {
                "input": "nums = [1,1,2]",
                "output": "2, nums = [1,2,_]",
                "explanation": "Your function should return k = 2, with the first two elements of nums being 1 and 2 respectively."
            },
            {
                "input": "nums = [0,0,1,1,1,2,2,3,3,4]",
                "output": "5, nums = [0,1,2,3,4,_,_,_,_,_]",
                "explanation": "Your function should return k = 5, with the first five elements of nums being 0, 1, 2, 3, and 4."
            }
        ],
        "constraints": [
            "1 <= nums.length <= 3 * 10^4",
            "-100 <= nums[i] <= 100",
            "nums is sorted in non-decreasing order."
        ],
        "edgeCases": [
            "All elements are unique.",
            "All elements are duplicates.",
            "Single element array."
        ],
        "followUps": [
            "What if we are allowed to keep at most two duplicates of each element? (Remove Duplicates from Sorted Array II)",
            "Can you do it without shifting elements?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Use a hash set to collect unique elements, then write these elements back into the start of the original array.",
                "algorithm": "1. Initialize a set seen and unique list.\n2. Iterate through nums, appending unique elements to unique list.\n3. Overwrite prefix of nums with unique list elements.\n4. Return length of unique list.",
                "code": "def removeDuplicates(nums):\n    # Set to store unique elements\n    seen = set()\n    # List to store unique values in insertion order\n    unique_elements = []\n    for num in nums:\n        if num not in seen:\n            seen.add(num)\n            unique_elements.append(num)\n    # Overwrite the original array with unique elements\n    for i in range(len(unique_elements)):\n        nums[i] = unique_elements[i]\n    # Return the count of unique elements\n    return len(unique_elements)",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Use two-pointers. Since array is sorted, duplicates are adjacent. Pointer i tracks the position of the last unique element found. Pointer j scans the array. If nums[j] != nums[i], we increment i and set nums[i] = nums[j].",
                "algorithm": "1. If nums is empty, return 0.\n2. Initialize `i = 0`.\n3. Loop `j` from 1 to N-1.\n4. If `nums[j] != nums[i]`, increment `i` and set `nums[i] = nums[j]`.\n5. Return `i + 1`.",
                "code": "def removeDuplicates(nums):\n    # Return 0 if the array is empty\n    if not nums:\n        return 0\n    # Pointer for the position of unique elements\n    i = 0\n    # Iterate through the array with a scanning pointer\n    for j in range(1, len(nums)):\n        # If current element is different from the last unique element\n        if nums[j] != nums[i]:\n            # Move the unique pointer forward\n            i += 1\n            # Copy the unique element to its new position\n            nums[i] = nums[j]\n    # Return the length of array containing unique values\n    return i + 1",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Check if nums is empty. nums = [1,1,2]. Proceed.",
            "vars": {"nums": "[1, 1, 2]"}
        },
        {
            "line": 6,
            "desc": "Initialize i to 0",
            "vars": {"i": 0, "nums[i]": 1}
        },
        {
            "line": 8,
            "desc": "Iteration j=1: compare nums[1] (1) with nums[0] (1). Match.",
            "vars": {"i": 0, "j": 1, "nums[j]": 1, "nums[i]": 1}
        },
        {
            "line": 8,
            "desc": "Iteration j=2: compare nums[2] (2) with nums[0] (1). Mismatch.",
            "vars": {"i": 0, "j": 2, "nums[j]": 2, "nums[i]": 1}
        },
        {
            "line": 12,
            "desc": "Increment i to 1",
            "vars": {"i": 1}
        },
        {
            "line": 14,
            "desc": "Assign nums[1] = nums[2] = 2. Array becomes [1, 2, 2].",
            "vars": {"i": 1, "nums": "[1, 2, 2]"}
        },
        {
            "line": 16,
            "desc": "Loop finished. Return i + 1 = 2.",
            "vars": {"return": 2}
        }
    ]
}

# 13. Max Consecutive Ones
dsa_sol_1["Max Consecutive Ones"] = {
    "solution": {
        "title": "Max Consecutive Ones",
        "problemStatement": "Given a binary array nums, return the maximum number of consecutive 1's in the array.",
        "examples": [
            {
                "input": "nums = [1,1,0,1,1,1]",
                "output": "3",
                "explanation": "The first two digits or the last three digits are consecutive 1s. The maximum number of consecutive 1s is 3."
            },
            {
                "input": "nums = [1,0,1,1,0,1]",
                "output": "2",
                "explanation": "The maximum number of consecutive 1s is 2."
            }
        ],
        "constraints": [
            "1 <= nums.length <= 10^5",
            "nums[i] is either 0 or 1."
        ],
        "edgeCases": [
            "Array contains only 0s.",
            "Array contains only 1s.",
            "Alternating 1s and 0s."
        ],
        "followUps": [
            "What if we can flip at most one 0 to 1? Find maximum consecutive ones.",
            "What if we can flip K zeros?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Look at all possible subarrays of 1s, count their length, and find the maximum.",
                "algorithm": "1. Initialize max_count = 0.\n2. Loop over start index i from 0 to N-1.\n3. If nums[i] is not 1, continue.\n4. Count consecutive 1s starting at i using pointer j.\n5. Update max_count.\n6. Return max_count.",
                "code": "def findMaxConsecutiveOnes(nums):\n    # Variable to track maximum count of ones\n    max_count = 0\n    # Loop over all possible starting positions\n    for i in range(len(nums)):\n        # If current element is not 1, skip\n        if nums[i] != 1:\n            continue\n        # Count consecutive ones starting from index i\n        current_count = 0\n        for j in range(i, len(nums)):\n            if nums[j] == 1:\n                current_count += 1\n            else:\n                break\n        # Update the max count found so far\n        max_count = max(max_count, current_count)\n    # Return the maximum consecutive ones count\n    return max_count",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Traverse the array, maintaining a running count of 1s. If we see 1, increment count and update max. If we see 0, reset count to 0.",
                "algorithm": "1. Initialize `max_count = 0`, `current_count = 0`.\n2. Loop through `nums`.\n3. If `num == 1`, increment `current_count` and update `max_count = max(max_count, current_count)`.\n4. Else, reset `current_count = 0`.\n5. Return `max_count`.",
                "code": "def findMaxConsecutiveOnes(nums):\n    # Variable to store the maximum consecutive ones\n    max_count = 0\n    # Variable to store current consecutive ones count\n    current_count = 0\n    # Iterate through the array elements\n    for num in nums:\n        # If the element is 1, increment current count\n        if num == 1:\n            current_count += 1\n            # Update the maximum count seen so far\n            max_count = max(max_count, current_count)\n        else:\n            # Reset the count when 0 is encountered\n            current_count = 0\n    # Return the maximum consecutive ones count\n    return max_count",
                "complexity": {
                    "time": "O(N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Initialize max_count to 0",
            "vars": {"max_count": 0}
        },
        {
            "line": 5,
            "desc": "Initialize current_count to 0",
            "vars": {"max_count": 0, "current_count": 0}
        },
        {
            "line": 7,
            "desc": "Process nums[0] = 1",
            "vars": {"num": 1, "current_count": 0}
        },
        {
            "line": 10,
            "desc": "Increment current_count to 1, update max_count to 1",
            "vars": {"current_count": 1, "max_count": 1}
        },
        {
            "line": 7,
            "desc": "Process nums[1] = 1",
            "vars": {"num": 1, "current_count": 1}
        },
        {
            "line": 10,
            "desc": "Increment current_count to 2, update max_count to 2",
            "vars": {"current_count": 2, "max_count": 2}
        },
        {
            "line": 7,
            "desc": "Process nums[2] = 0",
            "vars": {"num": 0, "current_count": 2}
        },
        {
            "line": 14,
            "desc": "Reset current_count to 0",
            "vars": {"current_count": 0, "max_count": 2}
        },
        {
            "line": 7,
            "desc": "Process nums[3] = 1",
            "vars": {"num": 1, "current_count": 0}
        },
        {
            "line": 10,
            "desc": "Increment current_count to 1, max_count remains 2",
            "vars": {"current_count": 1, "max_count": 2}
        },
        {
            "line": 16,
            "desc": "Loop terminates eventually, return max_count = 3 (after processing trailing 1s)",
            "vars": {"max_count": 3}
        }
    ]
}

# 14. Minimum Number of Platforms
dsa_sol_1["Minimum Number of Platforms"] = {
    "solution": {
        "title": "Minimum Number of Platforms",
        "problemStatement": "Given arrival and departure times of all trains that reach a railway station, find the minimum number of platforms required for the railway station so that no train is kept waiting.",
        "examples": [
            {
                "input": "arr = [900, 940, 950, 1100, 1500, 1800], dep = [910, 1200, 1120, 1130, 1900, 2000]",
                "output": "3",
                "explanation": "Minimum 3 platforms are required to safely schedule all trains without overlap."
            }
        ],
        "constraints": [
            "1 <= N <= 50000",
            "0000 <= arr[i] < dep[i] <= 2359",
            "Times are represented in HHMM format."
        ],
        "edgeCases": [
            "Trains overlap completely (same arrival and departure times).",
            "No trains overlap.",
            "A train arrives exactly when another departs."
        ],
        "followUps": [
            "Can you solve this in O(N) time if time slots are discrete?",
            "How do you handle schedules spanning past midnight?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "For each train, count how many other trains have overlapping schedules, and find the maximum overlaps.",
                "algorithm": "1. Initialize max_platforms = 0.\n2. Iterate train i from 0 to N-1.\n3. Initialize overlaps = 1.\n4. Iterate train j from 0 to N-1 (where i != j).\n5. Check if train j is present when train i arrives: arr[i] >= arr[j] and arr[i] <= dep[j].\n6. Update overlaps.\n7. Update max_platforms = max(max_platforms, overlaps).\n8. Return max_platforms.",
                "code": "def findPlatform(arr, dep, n):\n    # Variable to store minimum platforms needed\n    max_platforms = 0\n    # Loop over each arrival and departure interval\n    for i in range(n):\n        # Count overlaps for interval of train i\n        overlaps = 1\n        for j in range(n):\n            if i != j:\n                # Check if train j is present at station when train i arrives\n                if arr[i] >= arr[j] and arr[i] <= dep[j]:\n                    overlaps += 1\n        # Update maximum platform count\n        max_platforms = max(max_platforms, overlaps)\n    # Return the maximum platforms needed\n    return max_platforms",
                "complexity": {
                    "time": "O(N^2)",
                    "space": "O(1)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort arrival and departure times independently. Use two pointers to process events. If a train arrives, increment active platform count. If a train departs, decrement active platform count. Maintain the maximum active count.",
                "algorithm": "1. Sort `arr` and `dep` arrays.\n2. Initialize two pointers `i = 0` (for `arr`) and `j = 0` (for `dep`).\n3. Initialize `platforms_needed = 0` and `max_platforms = 0`.\n4. If `arr[i] <= dep[j]`, increment `platforms_needed` and `i`.\n5. Else, decrement `platforms_needed` and increment `j`.\n6. Update `max_platforms` on each step.\n7. Return `max_platforms`.",
                "code": "def findPlatform(arr, dep, n):\n    # Sort arrival times\n    arr.sort()\n    # Sort departure times\n    dep.sort()\n    # Pointer for arrival times\n    i = 0\n    # Pointer for departure times\n    j = 0\n    # Variable to track active platforms\n    platforms_needed = 0\n    # Variable to store maximum platforms needed at any point\n    max_platforms = 0\n    # Traverse through both lists\n    while i < n and j < n:\n        # If a train arrives before or when the previous train departs\n        if arr[i] <= dep[j]:\n            # Platform is needed\n            platforms_needed += 1\n            # Move arrival pointer\n            i += 1\n        else:\n            # A train departed, platform is freed\n            platforms_needed -= 1\n            # Move departure pointer\n            j += 1\n        # Update maximum platforms needed\n        max_platforms = max(max_platforms, platforms_needed)\n    # Return the maximum platforms needed\n    return max_platforms",
                "complexity": {
                    "time": "O(N log N)",
                    "space": "O(1)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort arrival times arr = [900, 940, 950, 1100, 1500, 1800]",
            "vars": {"arr": "[900, 940, 950, 1100, 1500, 1800]"}
        },
        {
            "line": 5,
            "desc": "Sort departure times dep = [910, 1120, 1130, 1200, 1900, 2000]",
            "vars": {"dep": "[910, 1120, 1130, 1200, 1900, 2000]"}
        },
        {
            "line": 7,
            "desc": "Initialize pointers i = 0, j = 0, platforms = 0, max_platforms = 0",
            "vars": {"i": 0, "j": 0, "platforms_needed": 0, "max_platforms": 0}
        },
        {
            "line": 17,
            "desc": "arr[0] (900) <= dep[0] (910). Increment platforms_needed to 1, increment i to 1.",
            "vars": {"i": 1, "j": 0, "platforms_needed": 1, "max_platforms": 1}
        },
        {
            "line": 17,
            "desc": "arr[1] (940) > dep[0] (910). Decrement platforms_needed to 0, increment j to 1.",
            "vars": {"i": 1, "j": 1, "platforms_needed": 0, "max_platforms": 1}
        },
        {
            "line": 17,
            "desc": "arr[1] (940) <= dep[1] (1120). Increment platforms_needed to 1, increment i to 2.",
            "vars": {"i": 2, "j": 1, "platforms_needed": 1, "max_platforms": 1}
        },
        {
            "line": 17,
            "desc": "arr[2] (950) <= dep[1] (1120). Increment platforms_needed to 2, increment i to 3.",
            "vars": {"i": 3, "j": 1, "platforms_needed": 2, "max_platforms": 2}
        },
        {
            "line": 17,
            "desc": "arr[3] (1100) <= dep[1] (1120). Increment platforms_needed to 3, increment i to 4.",
            "vars": {"i": 4, "j": 1, "platforms_needed": 3, "max_platforms": 3}
        },
        {
            "line": 17,
            "desc": "arr[4] (1500) > dep[1] (1120). Decrement platforms_needed to 2, increment j to 2.",
            "vars": {"i": 4, "j": 2, "platforms_needed": 2, "max_platforms": 3}
        },
        {
            "line": 31,
            "desc": "Loop terminates eventually. Return max_platforms = 3.",
            "vars": {"max_platforms": 3}
        }
    ]
}

# 15. Job Sequencing Problem
dsa_sol_1["Job Sequencing Problem"] = {
    "solution": {
        "title": "Job Sequencing Problem",
        "problemStatement": "Given a set of N jobs where each job i has a deadline and profit associated with it. Each job takes 1 unit of time to complete and only one job can be scheduled at a time. We earn the profit associated with a job if and only if the job is completed by its deadline. Find the number of jobs done and the maximum profit.",
        "examples": [
            {
                "input": "Jobs = [(1,4,20), (2,1,10), (3,1,40), (4,1,30)]  # (id, deadline, profit)",
                "output": "[2, 60]",
                "explanation": "Job 3 (deadline 1, profit 40) is scheduled at slot 1. Job 1 (deadline 4, profit 20) is scheduled at slot 4. Total profit = 60."
            }
        ],
        "constraints": [
            "1 <= N <= 10^5",
            "1 <= Deadline <= N",
            "1 <= Profit <= 1000"
        ],
        "edgeCases": [
            "All jobs have deadline 1 (only one job can be done).",
            "All jobs have deadlines greater than N.",
            "All jobs have identical profits."
        ],
        "followUps": [
            "Can you optimize the slot search from O(N) to O(log N) using a Disjoint Set Union (DSU) data structure?",
            "What if jobs have different durations?"
        ],
        "approaches": [
            {
                "name": "Brute Force",
                "intuition": "Generate all subsets of jobs, verify if they can be scheduled within their deadlines, and pick the schedule with the maximum profit.",
                "algorithm": "1. Generate all possible subsets of jobs (2^N subsets).\n2. For each subset, sort them by deadline and verify if they can be scheduled (time <= deadline for each).\n3. If valid, compute total profit.\n4. Keep track of the maximum profit and count of jobs.\n5. Return [count, max_profit].",
                "code": "def JobScheduling(Jobs, n):\n    # Helper to check if a subset of jobs can be scheduled\n    def can_schedule(subset):\n        # Sort subset by deadline\n        subset.sort(key=lambda x: x.deadline)\n        time = 0\n        for job in subset:\n            time += 1\n            if time > job.deadline:\n                return False\n        return True\n    \n    max_profit = 0\n    count = 0\n    # Generate all subsets of jobs\n    for i in range(1 << n):\n        subset = [Jobs[j] for j in range(n) if (i & (1 << j))]\n        # Check if schedule is valid\n        if can_schedule(subset):\n            # Calculate total profit\n            curr_profit = sum(job.profit for job in subset)\n            if curr_profit > max_profit:\n                max_profit = curr_profit\n                count = len(subset)\n    # Return count of jobs and maximum profit\n    return [count, max_profit]",
                "complexity": {
                    "time": "O(2^N * N log N)",
                    "space": "O(N)"
                }
            },
            {
                "name": "Optimal",
                "intuition": "Sort jobs in descending order of profit. For each job, try to schedule it as late as possible (closer to its deadline) to keep earlier slots open for jobs with tighter deadlines. Use an array to track occupied slots.",
                "algorithm": "1. Sort all jobs by profit in descending order.\n2. Find the maximum deadline to size the schedule array.\n3. Create a schedule array initialized to -1 (indicating slot is empty).\n4. For each job, iterate from its deadline down to 1.\n5. If slot is empty, assign this job to that slot, update total profit, increment count, and break.\n6. Return [count, total_profit].",
                "code": "def JobScheduling(Jobs, n):\n    # Sort all jobs in descending order of profit\n    Jobs.sort(key=lambda x: x.profit, reverse=True)\n    # Find the maximum deadline among all jobs\n    max_deadline = max(job.deadline for job in Jobs)\n    # Create a schedule array initialized to -1 (indicating empty slot)\n    schedule = [-1] * (max_deadline + 1)\n    # Count of jobs done\n    count_jobs = 0\n    # Total profit accumulated\n    total_profit = 0\n    # Iterate through the sorted jobs\n    for job in Jobs:\n        # Find a free slot for this job, from its deadline down to 1\n        for curr_slot in range(job.deadline, 0, -1):\n            # If the slot is empty, schedule the job here\n            if schedule[curr_slot] == -1:\n                schedule[curr_slot] = job.id\n                count_jobs += 1\n                total_profit += job.profit\n                # Break to move to the next job\n                break\n    # Return the count of scheduled jobs and total profit\n    return [count_jobs, total_profit]",
                "complexity": {
                    "time": "O(N * max_deadline) worst case, can be optimized to O(N log N) with DSU",
                    "space": "O(max_deadline)"
                }
            }
        ]
    },
    "trace": [
        {
            "line": 3,
            "desc": "Sort jobs by profit descending. Sorted: [Job 3 (profit 40), Job 4 (profit 30), Job 1 (profit 20), Job 2 (profit 10)]",
            "vars": {"Jobs": "[Job 3, Job 4, Job 1, Job 2]"}
        },
        {
            "line": 5,
            "desc": "Find max deadline: 4.",
            "vars": {"max_deadline": 4}
        },
        {
            "line": 7,
            "desc": "Initialize schedule array of size 5: [-1, -1, -1, -1, -1]",
            "vars": {"schedule": "[-1, -1, -1, -1, -1]"}
        },
        {
            "line": 13,
            "desc": "Process Job 3: profit 40, deadline 1.",
            "vars": {"job.id": 3, "job.profit": 40, "job.deadline": 1}
        },
        {
            "line": 15,
            "desc": "Find slot starting at 1. slot 1 is free. Assign schedule[1] = 3.",
            "vars": {"schedule": "[-1, 3, -1, -1, -1]", "count_jobs": 1, "total_profit": 40}
        },
        {
            "line": 13,
            "desc": "Process Job 4: profit 30, deadline 1.",
            "vars": {"job.id": 4, "job.profit": 30, "job.deadline": 1}
        },
        {
            "line": 15,
            "desc": "Find slot starting at 1. slot 1 is occupied. No slot available.",
            "vars": {"schedule": "[-1, 3, -1, -1, -1]"}
        },
        {
            "line": 13,
            "desc": "Process Job 1: profit 20, deadline 4.",
            "vars": {"job.id": 1, "job.profit": 20, "job.deadline": 4}
        },
        {
            "line": 15,
            "desc": "Find slot starting at 4. slot 4 is free. Assign schedule[4] = 1.",
            "vars": {"schedule": "[-1, 3, -1, -1, 1]", "count_jobs": 2, "total_profit": 60}
        },
        {
            "line": 13,
            "desc": "Process Job 2: profit 10, deadline 1.",
            "vars": {"job.id": 2, "job.profit": 10, "job.deadline": 1}
        },
        {
            "line": 15,
            "desc": "Find slot starting at 1. slot 1 is occupied. No slot available.",
            "vars": {"schedule": "[-1, 3, -1, -1, 1]"}
        },
        {
            "line": 23,
            "desc": "Return count of scheduled jobs and total profit.",
            "vars": {"return": "[2, 60]"}
        }
    ]
}

# Write out to target JSON file
target_path = "/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_1.json"
with open(target_path, "w") as f:
    json.dump(dsa_sol_1, f, indent=2)

print("JSON generation completed successfully!")
