import json
import os

data = {}

# -------------------------------------------------------------
# 1. Maximum Width of Binary Tree
# -------------------------------------------------------------
data["Maximum Width of Binary Tree"] = {
    "title": "Maximum Width of Binary Tree",
    "problemStatement": "Given the root of a binary tree, return the maximum width of the given tree. The maximum width of a tree is the maximum width among all levels. The width of one level is defined as the length between the end-nodes (the leftmost and rightmost non-null nodes), where the null nodes between the end-nodes that would be present in a complete binary tree extending down to that level are also counted into the length calculation. It is guaranteed that the answer will in the range of a 32-bit signed integer.",
    "examples": [
        {
            "input": "root = [1,3,2,5,3,null,9]",
            "output": "4",
            "explanation": "The maximum width exists at the third level with length 4 (5, 3, null, 9)."
        },
        {
            "input": "root = [1,3,2,5,null,null,9,6,null,7]",
            "output": "8",
            "explanation": "The maximum width exists at the fourth level with length 8 (6, null, null, null, null, null, null, 7)."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [1, 3000].",
        "-100 <= Node.val <= 100"
    ],
    "edgeCases": [
        "Single node tree: Width is 1.",
        "Skewed tree (left or right): Width at each level is 1, so max width is 1.",
        "Perfect binary tree: Width at depth d is 2^d, max width is at the last level."
    ],
    "followUps": [
        "Can you solve this using Depth First Search (DFS)?",
        "How do you handle potential index overflow in language environments that do not support arbitrary-precision integers (unlike Python)?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Traverse level by level using a queue. For missing children, insert None. For each level, find the distance between the first non-None node and the last non-None node. This approach will consume excessive memory (up to O(2^H) nodes) and time out for deeper trees.",
            "algorithm": "1. Add root to a queue.\n2. While queue is not empty and has any non-None node:\n   a. Find the first non-None index and the last non-None index.\n   b. Calculate level width as last_idx - first_idx + 1.\n   c. Update max_width.\n   d. Populate the next level queue by adding left and right children (including None) of all nodes from first to last.\n3. Return max_width.",
            "code": "def widthOfBinaryTree(root):\n    # If the root is None, the width is 0\n    if not root:\n        return 0\n    # Queue holds nodes at the current level, starting with the root\n    queue = [root]\n    # Track maximum width\n    max_width = 0\n    # Continue as long as there is at least one non-None node\n    while any(node is not None for node in queue):\n        # Find first non-None node index\n        first = 0\n        while first < len(queue) and queue[first] is None:\n            first += 1\n        # Find last non-None node index\n        last = len(queue) - 1\n        while last >= 0 and queue[last] is None:\n            last -= 1\n        # Compute level width\n        curr_width = last - first + 1\n        max_width = max(max_width, curr_width)\n        # Build the next level queue\n        next_level = []\n        for i in range(first, last + 1):\n            node = queue[i]\n            if node:\n                next_level.append(node.left)\n                next_level.append(node.right)\n            else:\n                next_level.append(None)\n                next_level.append(None)\n        queue = next_level\n    # Return the maximum width found\n    return max_width",
            "complexity": {
                "time": "O(2^H) in the worst case where H is the tree height, due to tracking nulls.",
                "space": "O(2^H) memory to store nodes (including nulls) at the deepest level."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Perform a level-order traversal (BFS) and assign virtual indices to the nodes. The root has index 0. For any node at index i, its left child is at index 2*i + 1 and its right child is at 2*i + 2. To avoid index overflow, we normalize the indices at each level by subtracting the index of the first node of that level.",
            "algorithm": "1. Initialize queue with (root, 0) and max_width = 0.\n2. Run BFS level-by-level:\n   a. Determine level_size and first_idx (index of first node in queue).\n   b. Iterate level_size times, pop (node, index).\n   c. Normalize current index: curr_id = index - first_idx.\n   d. Track first and last normalized indices to compute the width of the level.\n   e. Push left child with index 2 * curr_id + 1 and right child with index 2 * curr_id + 2.\n   f. Update max_width = max(max_width, last - first + 1).\n3. Return max_width.",
            "code": "from collections import deque\n\ndef widthOfBinaryTree(root):\n    # Check if the root node is null\n    if not root:\n        # Return 0 width if tree is empty\n        return 0\n    # Initialize maximum width to 0\n    max_width = 0\n    # Queue stores tuples of (node, index)\n    queue = deque([(root, 0)])\n    # Loop as long as the queue is not empty\n    while queue:\n        # Count number of nodes at the current level\n        level_size = len(queue)\n        # Get absolute index of first node at this level\n        _, first_idx = queue[0]\n        # Initialize boundary variables for the current level\n        first = 0\n        last = 0\n        # Iterate through all nodes at the current level\n        for i in range(level_size):\n            # Pop next node and its absolute index\n            node, index = queue.popleft()\n            # Normalize the index to prevent integer overflow\n            curr_id = index - first_idx\n            # If it is the first node, update the left bound\n            if i == 0:\n                first = curr_id\n            # If it is the last node, update the right bound\n            if i == level_size - 1:\n                last = curr_id\n            # Enqueue left child if it exists with calculated index\n            if node.left:\n                queue.append((node.left, 2 * curr_id + 1))\n            # Enqueue right child if it exists with calculated index\n            if node.right:\n                queue.append((node.right, 2 * curr_id + 2))\n        # Update maximum width with level width\n        max_width = max(max_width, last - first + 1)\n    # Return the maximum width found\n    return max_width",
            "complexity": {
                "time": "O(N) where N is the number of nodes in the tree, visiting each node once.",
                "space": "O(W) where W is the maximum width of the tree, to store level nodes in the queue."
            }
        }
    ],
    "trace": [
        {"line": 4, "desc": "Check if root is None", "vars": {"root": "TreeNode(1)"}},
        {"line": 8, "desc": "Initialize max_width to 0", "vars": {"max_width": 0}},
        {"line": 10, "desc": "Initialize queue with root and index 0", "vars": {"queue": "[(TreeNode(1), 0)]"}},
        {"line": 12, "desc": "Queue is not empty, start level processing", "vars": {"queue": "[(TreeNode(1), 0)]"}},
        {"line": 14, "desc": "Determine size of current level", "vars": {"level_size": 1}},
        {"line": 16, "desc": "Retrieve absolute index of first node", "vars": {"first_idx": 0}},
        {"line": 24, "desc": "Pop front node (1) and its index (0)", "vars": {"node": "TreeNode(1)", "index": 0, "i": 0}},
        {"line": 26, "desc": "Normalize index to avoid overflow", "vars": {"curr_id": 0}},
        {"line": 29, "desc": "Update first bound as i == 0", "vars": {"first": 0}},
        {"line": 32, "desc": "Update last bound as i == level_size - 1", "vars": {"last": 0}},
        {"line": 35, "desc": "Left child (3) exists, push to queue with index 1", "vars": {"queue": "[(TreeNode(3), 1)]"}},
        {"line": 38, "desc": "Right child (2) exists, push to queue with index 2", "vars": {"queue": "[(TreeNode(3), 1), (TreeNode(2), 2)]"}},
        {"line": 40, "desc": "Update max_width with current level width: max(0, 0 - 0 + 1) = 1", "vars": {"max_width": 1}},
        {"line": 12, "desc": "Queue is not empty, process level 1", "vars": {"queue": "[(TreeNode(3), 1), (TreeNode(2), 2)]"}},
        {"line": 14, "desc": "Level size is 2", "vars": {"level_size": 2}},
        {"line": 16, "desc": "First index at this level is 1", "vars": {"first_idx": 1}},
        {"line": 24, "desc": "Pop front node (3) and index (1)", "vars": {"node": "TreeNode(3)", "index": 1, "i": 0}},
        {"line": 26, "desc": "Normalize index: 1 - 1 = 0", "vars": {"curr_id": 0}},
        {"line": 29, "desc": "Update first bound to 0", "vars": {"first": 0}},
        {"line": 35, "desc": "Left child (5) exists, push to queue with index 2 * 0 + 1 = 1", "vars": {"queue": "[(TreeNode(2), 2), (TreeNode(5), 1)]"}},
        {"line": 24, "desc": "Pop next node (2) and index (2)", "vars": {"node": "TreeNode(2)", "index": 2, "i": 1}},
        {"line": 26, "desc": "Normalize index: 2 - 1 = 1", "vars": {"curr_id": 1}},
        {"line": 32, "desc": "Update last bound to 1", "vars": {"last": 1}},
        {"line": 38, "desc": "Right child (9) exists, push to queue with index 2 * 1 + 2 = 4", "vars": {"queue": "[(TreeNode(5), 1), (TreeNode(9), 4)]"}},
        {"line": 40, "desc": "Update max_width: max(1, 1 - 0 + 1) = 2", "vars": {"max_width": 2}}
    ]
}

# -------------------------------------------------------------
# 2. Children Sum Property
# -------------------------------------------------------------
data["Children Sum Property"] = {
    "title": "Children Sum Property",
    "problemStatement": "Given a binary tree, check if it satisfies the Children Sum Property. The Children Sum Property states that for every node in the binary tree (excluding leaf nodes), the value of the node must be equal to the sum of the values of its left and right children. If a node has only one child, the node's value must be equal to that child's value. If a node is a leaf node, its value is trivially valid. Return 1 if it satisfies the property, otherwise return 0.",
    "examples": [
        {
            "input": "root = [10, 8, 2, 8, null, null, 2]",
            "output": "1",
            "explanation": "Root (10) = 8 + 2. Node (8) has single child (8). Node (2) has single child (2). Leafs are trivially valid. Thus, property holds."
        },
        {
            "input": "root = [10, 4, 3, null, null, null, null]",
            "output": "0",
            "explanation": "Root (10) is not equal to left child (4) + right child (3) = 7. Hence it violates the property."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 10^5].",
        "-10^9 <= Node.val <= 10^9"
    ],
    "edgeCases": [
        "Empty tree: Returns 1.",
        "Single node tree (leaf): Returns 1.",
        "Negative values: The property still applies algebraic sum check."
    ],
    "followUps": [
        "How would you modify the tree in-place to satisfy the children sum property if it doesn't already, assuming you can only increase node values?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Perform level order traversal (BFS) and for every node that has children, compute the sum of the child values. If it does not equal the parent node's value, we flag the violation and return 0.",
            "algorithm": "1. Initialize a queue with root node.\n2. While queue is not empty:\n   a. Pop current node.\n   b. If it has children:\n      - Calculate sum of values of existing left and right children.\n      - If node.val != child_sum, return 0.\n   c. Push children to queue.\n3. Return 1.",
            "code": "from collections import deque\n\ndef isParentSum(root):\n    # Return 1 if the tree is empty\n    if not root:\n        return 1\n    # Initialize BFS queue with root node\n    queue = deque([root])\n    # Traverse level-order\n    while queue:\n        # Pop next node from queue\n        curr = queue.popleft()\n        # Count child sum and check existence of children\n        child_sum = 0\n        has_children = False\n        if curr.left:\n            child_sum += curr.left.val\n            has_children = True\n            queue.append(curr.left)\n        if curr.right:\n            child_sum += curr.right.val\n            has_children = True\n            queue.append(curr.right)\n        # If node has children, verify sum matches parent value\n        if has_children and curr.val != child_sum:\n            return 0\n    # Return 1 if no nodes violate the property\n    return 1",
            "complexity": {
                "time": "O(N) where N is number of nodes in the tree.",
                "space": "O(W) where W is the maximum width of the tree, for storing nodes in queue."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use recursion (DFS) to check the property. A binary tree satisfies the property if the current node satisfies it (if it is a leaf/None, or its value matches the sum of children), and both its left and right subtrees also satisfy it.",
            "algorithm": "1. Base case: If root is None, return 1.\n2. Base case: If root has no children (leaf), return 1.\n3. Compute sum of left and right children.\n4. If root.val != child_sum, return 0.\n5. Recursively check left and right subtrees.\n6. Return 1 if both subtrees return 1, else 0.",
            "code": "def isParentSum(root):\n    # Base case: empty tree satisfies the property\n    if not root:\n        return 1\n    # Base case: leaf node satisfies the property\n    if not root.left and not root.right:\n        return 1\n    # Initialize sum of children values\n    child_sum = 0\n    # Add left child value if present\n    if root.left:\n        child_sum += root.left.val\n    # Add right child value if present\n    if root.right:\n        child_sum += root.right.val\n    # Check if current node value equals children sum\n    if root.val != child_sum:\n        return 0\n    # Recursively verify children sum property in left and right subtrees\n    left_ok = isParentSum(root.left)\n    right_ok = isParentSum(root.right)\n    # Return 1 if both subtrees are valid, otherwise 0\n    if left_ok and right_ok:\n        return 1\n    return 0",
            "complexity": {
                "time": "O(N) to visit each node exactly once.",
                "space": "O(H) for recursion stack where H is the height of the tree."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Check if root is None", "vars": {"root": "TreeNode(10)"}},
        {"line": 6, "desc": "Check if root is leaf", "vars": {"root": "TreeNode(10)"}},
        {"line": 9, "desc": "Initialize children sum to 0", "vars": {"child_sum": 0}},
        {"line": 11, "desc": "Left child exists, add value to child_sum", "vars": {"child_sum": 8}},
        {"line": 14, "desc": "Right child exists, add value to child_sum", "vars": {"child_sum": 10}},
        {"line": 17, "desc": "Verify if root value (10) equals child_sum (10)", "vars": {"root.val": 10, "child_sum": 10}},
        {"line": 20, "desc": "Recursively check left subtree (root 8)", "vars": {}},
        {"line": 3, "desc": "Check if left child is None (in recursive call)", "vars": {"root": "TreeNode(8)"}},
        {"line": 6, "desc": "Check if left child is leaf", "vars": {"root": "TreeNode(8)"}},
        {"line": 11, "desc": "Left child of 8 (val 8) exists, update sum", "vars": {"child_sum": 8}},
        {"line": 17, "desc": "Verify 8 == 8", "vars": {"root.val": 8, "child_sum": 8}},
        {"line": 20, "desc": "Recurse on left child of 8 (val 8)", "vars": {}},
        {"line": 6, "desc": "Node 8 is a leaf node, returns 1", "vars": {"root": "TreeNode(8)"}}
    ]
}

# -------------------------------------------------------------
# 3. Nodes at Distance K
# -------------------------------------------------------------
data["Nodes at Distance K"] = {
    "title": "Nodes at Distance K",
    "problemStatement": "Given the root of a binary tree, the value of a target node target, and an integer k, return an array of the values of all nodes that have a distance k from the target node. You can return the answer in any order.",
    "examples": [
        {
            "input": "root = [3,5,1,6,2,0,8,null,null,7,4], target = 5, k = 2",
            "output": "[7, 4, 1]",
            "explanation": "The nodes at distance 2 from target node 5 are 7, 4, and 1."
        },
        {
            "input": "root = [1], target = 1, k = 3",
            "output": "[]",
            "explanation": "No node exists at distance 3 from the root."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [1, 500].",
        "0 <= Node.val <= 500",
        "All values Node.val are unique.",
        "target is the value of one of the nodes in the tree.",
        "0 <= k <= 1000"
    ],
    "edgeCases": [
        "k == 0: Should return [target.val].",
        "k is larger than height: Returns [].",
        "Target is leaf node: Correctly traverses back up through parent pointer."
    ],
    "followUps": [
        "What if the node values are not unique? Can we return node references instead of node values?",
        "Can we solve this without using extra memory for parent mapping?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Build a graph representation (adjacency list) of the binary tree using DFS. Then run BFS on the graph starting from target to find all nodes at distance k.",
            "algorithm": "1. Build an adjacency list `graph` using DFS. For each parent-child relation, add undirected edges between parent and child.\n2. Locate the target node's value.\n3. Run BFS starting with `(target_val, 0)` in queue.\n4. Use a visited set to keep track of visited node values.\n5. If current BFS depth equals k, append the node value to output list.\n6. Otherwise, add all unvisited neighbors to queue with depth + 1.\n7. Return output list.",
            "code": "from collections import deque, defaultdict\n\ndef distanceK(root, target, k):\n    # Adjacency list representation of the tree as a graph\n    graph = defaultdict(list)\n    # Inner helper function to convert tree to graph\n    def build_graph(node):\n        if not node:\n            return\n        if node.left:\n            graph[node.val].append(node.left.val)\n            graph[node.left.val].append(node.val)\n            build_graph(node.left)\n        if node.right:\n            graph[node.val].append(node.right.val)\n            graph[node.right.val].append(node.val)\n            build_graph(node.right)\n    # Build graph starting from root\n    build_graph(root)\n    # Queue for BFS, storing (node_value, distance)\n    queue = deque([(target.val, 0)])\n    # Set to record visited node values\n    visited = {target.val}\n    # List to store result\n    result = []\n    # BFS loop\n    while queue:\n        val, d = queue.popleft()\n        # If distance matches k, add to result\n        if d == k:\n            result.append(val)\n        elif d < k:\n            # Traverse neighbors in the graph\n            for neighbor in graph[val]:\n                if neighbor not in visited:\n                    visited.add(neighbor)\n                    queue.append((neighbor, d + 1))\n    # Return final results\n    return result",
            "complexity": {
                "time": "O(N) to build graph and perform BFS traversal.",
                "space": "O(N) to store graph edges and BFS queue."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Perform a preorder/BFS traversal to map each node to its parent. Once the parent pointers are known, do a BFS starting from target node. At each step of the BFS, traverse left, right, and parent (upwards) to find nodes at distance k.",
            "algorithm": "1. Run DFS to populate `parent_map` mapping each node to its parent.\n2. Initialize `queue` with `(target, 0)` and `visited` set with `target` node.\n3. Run BFS:\n   a. Pop front node `curr` and its distance `dist`.\n   b. If `dist == k`, add `curr.val` to result.\n   c. If `dist < k`, check left child, right child, and parent.\n   d. Enqueue any unvisited neighbor and mark it visited.\n4. Return result.",
            "code": "from collections import deque\n\ndef distanceK(root, target, k):\n    # Dictionary to keep track of parent pointers for each node\n    parent_map = {}\n    # Inner function to traverse tree and map parent pointers\n    def find_parents(node, parent):\n        if not node:\n            return\n        if parent:\n            parent_map[node] = parent\n        # Traverse left child\n        find_parents(node.left, node)\n        # Traverse right child\n        find_parents(node.right, node)\n    # Populate parent map starting from root\n    find_parents(root, None)\n    # Initialize BFS queue with target node and distance 0\n    queue = deque([(target, 0)])\n    # Set to track visited nodes to avoid cyclic loops\n    visited = {target}\n    # List to collect results at distance k\n    res = []\n    # Traverse level by level in BFS manner\n    while queue:\n        # Get current node and its distance from target\n        curr, dist = queue.popleft()\n        # If distance equals k, append node value\n        if dist == k:\n            res.append(curr.val)\n            continue\n        # Check left child\n        if curr.left and curr.left not in visited:\n            visited.add(curr.left)\n            queue.append((curr.left, dist + 1))\n        # Check right child\n        if curr.right and curr.right not in visited:\n            visited.add(curr.right)\n            queue.append((curr.right, dist + 1))\n        # Check parent node\n        if curr in parent_map and parent_map[curr] not in visited:\n            visited.add(parent_map[curr])\n            queue.append((parent_map[curr], dist + 1))\n    # Return the collected values\n    return res",
            "complexity": {
                "time": "O(N) to map parents and traverse using BFS.",
                "space": "O(N) for parent map, visited set, and BFS queue."
            }
        }
    ],
    "trace": [
        {"line": 5, "desc": "Initialize parent map", "vars": {"parent_map": "{}"}},
        {"line": 15, "desc": "Call find_parents helper from root", "vars": {"root": "TreeNode(3)"}},
        {"line": 17, "desc": "Initialize queue with target node (5) and distance 0", "vars": {"queue": "[(TreeNode(5), 0)]"}},
        {"line": 19, "desc": "Initialize visited set with target", "vars": {"visited": "{TreeNode(5)}"}},
        {"line": 23, "desc": "Start BFS loop", "vars": {"queue": "[(TreeNode(5), 0)]"}},
        {"line": 25, "desc": "Pop first element in queue", "vars": {"curr": "TreeNode(5)", "dist": 0}},
        {"line": 31, "desc": "Check left child (6). Unvisited, push to queue", "vars": {"queue": "[(TreeNode(6), 1)]", "visited": "{TreeNode(5), TreeNode(6)}"}},
        {"line": 35, "desc": "Check right child (2). Unvisited, push to queue", "vars": {"queue": "[(TreeNode(6), 1), (TreeNode(2), 1)]", "visited": "{TreeNode(5), TreeNode(6), TreeNode(2)}"}},
        {"line": 39, "desc": "Check parent (3). Unvisited, push to queue", "vars": {"queue": "[(TreeNode(6), 1), (TreeNode(2), 1), (TreeNode(3), 1)]", "visited": "{TreeNode(5), TreeNode(6), TreeNode(2), TreeNode(3)}"}},
        {"line": 23, "desc": "Next BFS iteration", "vars": {"queue": "[(TreeNode(6), 1), (TreeNode(2), 1), (TreeNode(3), 1)]"}},
        {"line": 25, "desc": "Pop front element", "vars": {"curr": "TreeNode(6)", "dist": 1}},
        {"line": 27, "desc": "Since dist (1) equals k (1), append node val to result", "vars": {"res": "[6]"}}
    ]
}

# -------------------------------------------------------------
# 4. Burn a Binary Tree
# -------------------------------------------------------------
data["Burn a Binary Tree"] = {
    "title": "Burn a Binary Tree",
    "problemStatement": "Given a binary tree and a target node start (the value of the node). The binary tree will be set on fire from the start node. It takes 1 second for the fire to spread from a node to its adjacent nodes (left child, right child, and parent). Return the minimum time (in seconds) required to burn the complete binary tree.",
    "examples": [
        {
            "input": "root = [1,5,3,null,4,10,6,9,2], start = 3",
            "output": "4",
            "explanation": "Start node is 3. Fire spreads: t=1 to 10, 6, 1. t=2 to 5. t=3 to 4. t=4 to 9, 2. Complete tree burned in 4 seconds."
        },
        {
            "input": "root = [1], start = 1",
            "output": "0",
            "explanation": "The tree has only one node, which is the start node. It is burned instantly."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [1, 10^5].",
        "1 <= Node.val <= 10^5",
        "All node values are unique.",
        "start node is guaranteed to exist in the tree."
    ],
    "edgeCases": [
        "Single node tree: Returns 0.",
        "Start node is root: Fire spreads down uniformly.",
        "Start node is leaf: Fire travels up first and then branches out."
    ],
    "followUps": [
        "Can we solve this in a single DFS pass without storing parent pointers in a map?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Build a general undirected graph from the binary tree, mapping node values to adjacent node values. Then run BFS from target node and calculate maximum distance in BFS level.",
            "algorithm": "1. Convert tree to undirected graph adjacency list using DFS.\n2. Perform BFS from start node using queue.\n3. Track maximum time. Increment time at each level.\n4. Return maximum time.",
            "code": "from collections import deque, defaultdict\n\ndef amountOfTime(root, start):\n    # Create graph represented as adjacency list of values\n    graph = defaultdict(list)\n    # Helper to traverse tree and populate graph\n    def build_graph(node):\n        if not node:\n            return\n        if node.left:\n            graph[node.val].append(node.left.val)\n            graph[node.left.val].append(node.val)\n            build_graph(node.left)\n        if node.right:\n            graph[node.val].append(node.right.val)\n            graph[node.right.val].append(node.val)\n            build_graph(node.right)\n    # Build graph from root\n    build_graph(root)\n    # Queue for BFS storing (value, time_elapsed)\n    queue = deque([(start, 0)])\n    # Visited set containing start node\n    visited = {start}\n    max_time = 0\n    # Traverse graph\n    while queue:\n        curr, time = queue.popleft()\n        max_time = max(max_time, time)\n        for neighbor in graph[curr]:\n            if neighbor not in visited:\n                visited.add(neighbor)\n                queue.append((neighbor, time + 1))\n    # Return maximum time taken to burn all nodes\n    return max_time",
            "complexity": {
                "time": "O(N) where N is number of nodes in the tree.",
                "space": "O(N) to store graph edges and BFS components."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Find parent pointers using a DFS, and also locate the starting node object. Then perform BFS starting from the start node, traversing to its left child, right child, and parent. The time elapsed is calculated based on the maximum level reached during the BFS traversal.",
            "algorithm": "1. Populate a parent map that stores parent pointers for each node.\n2. Locate the start node object.\n3. Initialize BFS queue with (start_node, 0) and visited set with start_node.\n4. Traverse through queue:\n   a. Pop (curr, time).\n   b. Update max_time.\n   c. Add unvisited left child, right child, and parent node to queue with time + 1.\n5. Return max_time.",
            "code": "from collections import deque\n\ndef amountOfTime(root, start):\n    # Dictionary to map each node to its parent\n    parent_map = {}\n    # Reference to the start node TreeNode\n    start_node = None\n    # Helper function to find start node and map parent pointers\n    def traverse(node, parent):\n        nonlocal start_node\n        if not node:\n            return\n        # Check if current node is the start node\n        if node.val == start:\n            start_node = node\n        # Map current node to its parent\n        if parent:\n            parent_map[node] = parent\n        traverse(node.left, node)\n        traverse(node.right, node)\n    # DFS to build parent mappings and find start node\n    traverse(root, None)\n    # BFS queue storing (TreeNode, time)\n    queue = deque([(start_node, 0)])\n    # Keep track of visited nodes to avoid circular updates\n    visited = {start_node}\n    max_time = 0\n    # Run level-order traversal\n    while queue:\n        curr, time = queue.popleft()\n        # Keep track of maximum time observed\n        max_time = max(max_time, time)\n        # If left child exists and is unvisited, add to queue\n        if curr.left and curr.left not in visited:\n            visited.add(curr.left)\n            queue.append((curr.left, time + 1))\n        # If right child exists and is unvisited, add to queue\n        if curr.right and curr.right not in visited:\n            visited.add(curr.right)\n            queue.append((curr.right, time + 1))\n        # If parent exists and is unvisited, add to queue\n        if curr in parent_map and parent_map[curr] not in visited:\n            visited.add(parent_map[curr])\n            queue.append((parent_map[curr], time + 1))\n    # Return the maximum time taken\n    return max_time",
            "complexity": {
                "time": "O(N) to traverse tree and map parent pointers, then BFS visits all nodes.",
                "space": "O(N) to store parent map and recursion stack."
            }
        }
    ],
    "trace": [
        {"line": 5, "desc": "Initialize parent map and start node", "vars": {"parent_map": "{}", "start_node": "None"}},
        {"line": 20, "desc": "Perform DFS traversal to map parents and locate start node", "vars": {}},
        {"line": 22, "desc": "Initialize queue with start node (val 3) at time 0", "vars": {"queue": "[(TreeNode(3), 0)]"}},
        {"line": 24, "desc": "Initialize visited set containing start node", "vars": {"visited": "{TreeNode(3)}"}},
        {"line": 27, "desc": "Queue not empty, pop first element", "vars": {"curr": "TreeNode(3)", "time": 0}},
        {"line": 29, "desc": "Update max_time to 0", "vars": {"max_time": 0}},
        {"line": 31, "desc": "Left child of 3 is 10, enqueue with time 1", "vars": {"queue": "[(TreeNode(10), 1)]", "visited": "{TreeNode(3), TreeNode(10)}"}},
        {"line": 35, "desc": "Right child of 3 is 6, enqueue with time 1", "vars": {"queue": "[(TreeNode(10), 1), (TreeNode(6), 1)]", "visited": "{TreeNode(3), TreeNode(10), TreeNode(6)}"}},
        {"line": 39, "desc": "Parent of 3 is 1, enqueue with time 1", "vars": {"queue": "[(TreeNode(10), 1), (TreeNode(6), 1), (TreeNode(1), 1)]", "visited": "{TreeNode(3), TreeNode(10), TreeNode(6), TreeNode(1)}"}},
        {"line": 27, "desc": "Pop TreeNode(10)", "vars": {"curr": "TreeNode(10)", "time": 1}},
        {"line": 29, "desc": "Update max_time to 1", "vars": {"max_time": 1}}
    ]
}

# -------------------------------------------------------------
# 5. Count Total Nodes in Complete Binary Tree
# -------------------------------------------------------------
data["Count Total Nodes in Complete Binary Tree"] = {
    "title": "Count Total Nodes in Complete Binary Tree",
    "problemStatement": "Given the root of a complete binary tree, return the number of nodes in the tree. According to Wikipedia, every level, except possibly the last, is completely filled in a complete binary tree, and all nodes in the last level are as far left as possible. It can have between 1 and 2^h nodes inclusive at the last level h. Design an algorithm that runs in less than O(N) time complexity.",
    "examples": [
        {
            "input": "root = [1,2,3,4,5,6]",
            "output": "6",
            "explanation": "The tree has 6 nodes. Level 0: [1], Level 1: [2, 3], Level 2: [4, 5, 6]."
        },
        {
            "input": "root = []",
            "output": "0",
            "explanation": "Empty tree contains 0 nodes."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 5 * 10^4].",
        "0 <= Node.val <= 5 * 10^4",
        "The tree is guaranteed to be complete."
    ],
    "edgeCases": [
        "Empty tree: Return 0.",
        "Single node tree: Return 1.",
        "Perfect binary tree: Returns (2^h) - 1 where h is height."
    ],
    "followUps": [
        "How would you explain the O(log^2 N) time complexity compared to O(N) to an interviewer?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Perform a standard tree traversal (like DFS) and increment a counter for each visited node. This takes linear time and does not utilize the properties of a complete binary tree.",
            "algorithm": "1. If the root is None, return 0.\n2. Otherwise, return 1 + countNodes(root.left) + countNodes(root.right).",
            "code": "def countNodes(root):\n    # Base case: empty tree has 0 nodes\n    if not root:\n        return 0\n    # Count current node and recursively count left and right subtrees\n    return 1 + countNodes(root.left) + countNodes(root.right)",
            "complexity": {
                "time": "O(N) since we visit every node once.",
                "space": "O(H) recursion stack where H is the height of the tree."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use the structure of a complete binary tree. Calculate the left height (by traversing only left children) and the right height (by traversing only right children). If they are equal, the subtree is a perfect binary tree, and the number of nodes is 2^height - 1. Otherwise, recursively sum the nodes of the left and right subtrees and add 1.",
            "algorithm": "1. If root is None, return 0.\n2. Compute left height `lh` by traversing left child pointers.\n3. Compute right height `rh` by traversing right child pointers.\n4. If `lh == rh`, the tree is a perfect binary tree. Return `(2^lh) - 1`.\n5. If `lh != rh`, return `1 + countNodes(root.left) + countNodes(root.right)`.",
            "code": "def countNodes(root):\n    # Base case: if node is None, return 0\n    if not root:\n        return 0\n    # Helper to calculate height along leftmost path\n    def get_left_height(node):\n        h = 0\n        while node:\n            h += 1\n            node = node.left\n        return h\n    # Helper to calculate height along rightmost path\n    def get_right_height(node):\n        h = 0\n        while node:\n            h += 1\n            node = node.right\n        return h\n    # Calculate left height of current subtree\n    lh = get_left_height(root)\n    # Calculate right height of current subtree\n    rh = get_right_height(root)\n    # If heights are equal, it's a perfect binary tree\n    if lh == rh:\n        # Node count is 2^lh - 1\n        return (1 << lh) - 1\n    # Otherwise, compute count recursively\n    return 1 + countNodes(root.left) + countNodes(root.right)",
            "complexity": {
                "time": "O(log^2 N) because we traverse down the height of tree (log N) and at each level do log N work to compute heights.",
                "space": "O(H) = O(log N) recursive stack depth."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Check if root is None", "vars": {"root": "TreeNode(1)"}},
        {"line": 21, "desc": "Compute left height of root node", "vars": {}},
        {"line": 23, "desc": "Compute right height of root node", "vars": {}},
        {"line": 25, "desc": "Compare heights (lh = 3, rh = 2)", "vars": {"lh": 3, "rh": 2}},
        {"line": 29, "desc": "Since heights are unequal, recursively count left child", "vars": {}},
        {"line": 3, "desc": "Check if left child (2) is None", "vars": {"root": "TreeNode(2)"}},
        {"line": 21, "desc": "Calculate left height for node 2", "vars": {}},
        {"line": 23, "desc": "Calculate right height for node 2", "vars": {}},
        {"line": 25, "desc": "Compare heights for node 2 (lh = 2, rh = 2)", "vars": {"lh": 2, "rh": 2}},
        {"line": 27, "desc": "Heights equal: return 2^2 - 1 = 3", "vars": {}}
    ]
}

# -------------------------------------------------------------
# 6. Construct Binary Tree from Preorder and Inorder
# -------------------------------------------------------------
data["Construct Binary Tree from Preorder and Inorder"] = {
    "title": "Construct Binary Tree from Preorder and Inorder",
    "problemStatement": "Given two integer arrays preorder and inorder where preorder is the preorder traversal of a binary tree and inorder is the inorder traversal of the same tree, construct and return the binary tree.",
    "examples": [
        {
            "input": "preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]",
            "output": "[3,9,20,null,null,15,7]",
            "explanation": "The root is 3. Elements to left in inorder is [9] (left subtree). Elements to right is [15, 20, 7] (right subtree)."
        },
        {
            "input": "preorder = [-1], inorder = [-1]",
            "output": "[-1]",
            "explanation": "Single element array produces single node tree."
        }
    ],
    "constraints": [
        "1 <= preorder.length <= 3000",
        "inorder.length == preorder.length",
        "-3000 <= preorder[i], inorder[i] <= 3000",
        "preorder and inorder consist of unique values.",
        "Each value of inorder also appears in preorder."
    ],
    "edgeCases": [
        "Single node tree.",
        "Left skewed tree: root.right is always None.",
        "Right skewed tree: root.left is always None."
    ],
    "followUps": [
        "Can we solve this iteratively using a stack instead of recursion?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Recursively split preorder and inorder arrays. The first element of preorder is root. We find this root in inorder using linear scan, which takes O(N) time. Then we slice the arrays and recursively call buildTree on left and right subtrees.",
            "algorithm": "1. If preorder or inorder is empty, return None.\n2. Root is preorder[0].\n3. Find index of root in inorder: `idx = inorder.index(root.val)`.\n4. Recurse left: `root.left = buildTree(preorder[1 : idx+1], inorder[:idx])`.\n5. Recurse right: `root.right = buildTree(preorder[idx+1 :], inorder[idx+1:])`.\n6. Return root.",
            "code": "def buildTree(preorder, inorder):\n    # Base case: if either array is empty, return None\n    if not preorder or not inorder:\n        return None\n    # First element of preorder traversal is the root value\n    root_val = preorder[0]\n    # Create a new TreeNode\n    root = TreeNode(root_val)\n    # Find index of root value in inorder to determine left/right subtree sizes\n    mid = inorder.index(root_val)\n    # Recursively build left subtree using array slices\n    root.left = buildTree(preorder[1 : mid + 1], inorder[:mid])\n    # Recursively build right subtree using array slices\n    root.right = buildTree(preorder[mid + 1 :], inorder[mid + 1 :])\n    # Return constructed root\n    return root",
            "complexity": {
                "time": "O(N^2) because of search (inorder.index) and array slicing at each recursive call.",
                "space": "O(N^2) to store array slices in memory."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Store elements of inorder in a hash map mapping values to their indices to locate root in O(1) time. Avoid array slicing by keeping track of boundary index pointers. Use a class-level or nonlocal variable to track the current index in preorder array.",
            "algorithm": "1. Map inorder elements to their indices.\n2. Define recursive helper `helper(in_left, in_right)` using `pre_idx` (index of current root in preorder).\n3. If `in_left > in_right`, return None.\n4. Pick `root_val = preorder[pre_idx]`, increment `pre_idx`.\n5. Create `root = TreeNode(root_val)`.\n6. Get root index in inorder `in_idx`.\n7. `root.left = helper(in_left, in_idx - 1)`.\n8. `root.right = helper(in_idx + 1, in_right)`.\n9. Return root.",
            "code": "def buildTree(preorder, inorder):\n    # Map each value in inorder to its index for O(1) lookup\n    inorder_index_map = {val: idx for idx, val in enumerate(inorder)}\n    # Initialize index pointer for preorder array\n    pre_idx = 0\n    # Inner helper function using binary search boundaries\n    def helper(in_left, in_right):\n        nonlocal pre_idx\n        # Base case: invalid boundary\n        if in_left > in_right:\n            return None\n        # Select current root value from preorder\n        root_val = preorder[pre_idx]\n        # Create root node\n        root = TreeNode(root_val)\n        # Increment index pointer for next recursive call\n        pre_idx += 1\n        # Locate root index in inorder array\n        in_idx = inorder_index_map[root_val]\n        # Build left subtree\n        root.left = helper(in_left, in_idx - 1)\n        # Build right subtree\n        root.right = helper(in_idx + 1, in_right)\n        # Return subtree root\n        return root\n    # Call helper with full inorder range\n    return helper(0, len(inorder) - 1)",
            "complexity": {
                "time": "O(N) to build tree since each node is processed once and index lookup is O(1).",
                "space": "O(N) to store the hash map and stack frames."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Initialize hash map for inorder index lookup", "vars": {"inorder_index_map": "{9: 0, 3: 1, 15: 2, 20: 3, 7: 4}"}},
        {"line": 5, "desc": "Initialize pre_idx to 0", "vars": {"pre_idx": 0}},
        {"line": 24, "desc": "Call helper with boundaries (0, 4)", "vars": {"in_left": 0, "in_right": 4}},
        {"line": 9, "desc": "Check boundary condition", "vars": {}},
        {"line": 12, "desc": "Retrieve current root val (3) from preorder", "vars": {"root_val": 3}},
        {"line": 14, "desc": "Create TreeNode for root (3)", "vars": {"root": "TreeNode(3)"}},
        {"line": 16, "desc": "Increment preorder index tracker", "vars": {"pre_idx": 1}},
        {"line": 18, "desc": "Find root index in inorder", "vars": {"in_idx": 1}},
        {"line": 20, "desc": "Call helper recursively to build left subtree", "vars": {"in_left": 0, "in_right": 0}},
        {"line": 12, "desc": "Retrieve left subtree root val (9)", "vars": {"root_val": 9}},
        {"line": 14, "desc": "Create TreeNode for left subtree (9)", "vars": {"root": "TreeNode(9)"}}
    ]
}

# -------------------------------------------------------------
# 7. Construct Binary Tree from Postorder and Inorder
# -------------------------------------------------------------
data["Construct Binary Tree from Postorder and Inorder"] = {
    "title": "Construct Binary Tree from Postorder and Inorder",
    "problemStatement": "Given two integer arrays inorder and postorder where inorder is the inorder traversal of a binary tree and postorder is the postorder traversal of the same tree, construct and return the binary tree.",
    "examples": [
        {
            "input": "inorder = [9,3,15,20,7], postorder = [9,15,7,20,3]",
            "output": "[3,9,20,null,null,15,7]",
            "explanation": "Root is last element of postorder (3). Left subtree has inorder [9], Right subtree has [15, 20, 7]."
        },
        {
            "input": "inorder = [-1], postorder = [-1]",
            "output": "[-1]",
            "explanation": "Single element reconstructions."
        }
    ],
    "constraints": [
        "1 <= inorder.length <= 3000",
        "postorder.length == inorder.length",
        "-3000 <= inorder[i], postorder[i] <= 3000",
        "inorder and postorder consist of unique values.",
        "Each value of postorder also appears in inorder."
    ],
    "edgeCases": [
        "Single element arrays.",
        "Left skewed tree.",
        "Right skewed tree."
    ],
    "followUps": [
        "How does the recursion stack sequence differ when constructing from postorder compared to preorder?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Identify the root from the end of postorder array. Find its index in inorder array using linear scan. Slice the arrays and recurse. Note that because postorder sequence is Left-Right-Root, we process root first, then right subtree, then left subtree.",
            "algorithm": "1. If postorder or inorder is empty, return None.\n2. Root is postorder[-1].\n3. Find index of root in inorder: `idx = inorder.index(root.val)`.\n4. Recurse right: `root.right = buildTree(inorder[idx+1:], postorder[idx:-1])`.\n5. Recurse left: `root.left = buildTree(inorder[:idx], postorder[:idx])`.\n6. Return root.",
            "code": "def buildTree(inorder, postorder):\n    # Base case: empty arrays\n    if not inorder or not postorder:\n        return None\n    # Root is the last element in postorder\n    root_val = postorder[-1]\n    # Create root node\n    root = TreeNode(root_val)\n    # Find root index in inorder\n    mid = inorder.index(root_val)\n    # Build right subtree first (since we read postorder from right to left)\n    root.right = buildTree(inorder[mid + 1 :], postorder[mid : -1])\n    # Build left subtree\n    root.left = buildTree(inorder[:mid], postorder[:mid])\n    # Return constructed root\n    return root",
            "complexity": {
                "time": "O(N^2) due to searching and slicing in each step.",
                "space": "O(N^2) to store slice copies."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use a hash map to look up inorder indices in O(1) time. Maintain a pointer `post_idx` initialized to the last index of `postorder` and decrement it sequentially. Since we process postorder backwards, we MUST build the right subtree before the left subtree.",
            "algorithm": "1. Build inorder lookup map.\n2. Set `post_idx = len(postorder) - 1`.\n3. Define recursive helper `helper(in_left, in_right)`:\n   a. If `in_left > in_right`, return None.\n   b. Pick `root_val = postorder[post_idx]`, decrement `post_idx`.\n   c. Find root index `in_idx` in inorder.\n   d. `root.right = helper(in_idx + 1, in_right)`.\n   e. `root.left = helper(in_left, in_idx - 1)`.\n   f. Return root.\n4. Call helper.",
            "code": "def buildTree(inorder, postorder):\n    # Map each value in inorder to its index for O(1) lookup\n    inorder_index_map = {val: idx for idx, val in enumerate(inorder)}\n    # Initialize index pointer starting from last element of postorder\n    post_idx = len(postorder) - 1\n    # Inner helper function utilizing binary boundaries\n    def helper(in_left, in_right):\n        nonlocal post_idx\n        # Base case: invalid boundaries\n        if in_left > in_right:\n            return None\n        # Get root value from current postorder pointer\n        root_val = postorder[post_idx]\n        # Create root node\n        root = TreeNode(root_val)\n        # Decrement pointer to read next root\n        post_idx -= 1\n        # Find index in inorder mapping\n        in_idx = inorder_index_map[root_val]\n        # Build right subtree first\n        root.right = helper(in_idx + 1, in_right)\n        # Build left subtree\n        root.left = helper(in_left, in_idx - 1)\n        # Return subtree root\n        return root\n    # Invoke helper with full range\n    return helper(0, len(inorder) - 1)",
            "complexity": {
                "time": "O(N) to process each node once.",
                "space": "O(N) for hash map and recursion stack frames."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Initialize hash map for inorder index lookup", "vars": {"inorder_index_map": "{9: 0, 3: 1, 15: 2, 20: 3, 7: 4}"}},
        {"line": 5, "desc": "Initialize post_idx pointer to last index (4)", "vars": {"post_idx": 4}},
        {"line": 24, "desc": "Call helper with boundaries (0, 4)", "vars": {"in_left": 0, "in_right": 4}},
        {"line": 10, "desc": "Check boundary condition", "vars": {}},
        {"line": 13, "desc": "Retrieve root val (3) from postorder", "vars": {"root_val": 3}},
        {"line": 15, "desc": "Create TreeNode for root (3)", "vars": {"root": "TreeNode(3)"}},
        {"line": 17, "desc": "Decrement post_idx pointer", "vars": {"post_idx": 3}},
        {"line": 19, "desc": "Find root index in inorder map", "vars": {"in_idx": 1}},
        {"line": 21, "desc": "Construct right subtree first (boundaries: 2, 4)", "vars": {"in_left": 2, "in_right": 4}}
    ]
}

# -------------------------------------------------------------
# 8. Serialize and Deserialize Binary Tree
# -------------------------------------------------------------
data["Serialize and Deserialize Binary Tree"] = {
    "title": "Serialize and Deserialize Binary Tree",
    "problemStatement": "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer, or transmitted across a network connection link to be reconstructed later in the same or another computer environment. Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization/deserialization algorithm should work. You just need to ensure that a binary tree can be serialized to a string and this string can be deserialized to the original tree structure.",
    "examples": [
        {
            "input": "root = [1,2,3,null,null,4,5]",
            "output": "[1,2,3,null,null,4,5]",
            "explanation": "BFS serialization yields: '1,2,3,#,#,4,5,#,#,#,#'. Deserialization rebuilds it perfectly."
        },
        {
            "input": "root = []",
            "output": "[]",
            "explanation": "An empty tree serializes to empty string."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 10^4].",
        "-1000 <= Node.val <= 1000"
    ],
    "edgeCases": [
        "Empty tree.",
        "Single node tree.",
        "Negative and zero values in node data: Must handle integer conversion correctly."
    ],
    "followUps": [
        "Can you serialize in-place using pre-order traversal? How does the string size compare?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Use recursive DFS pre-order traversal. Serialize by appending node value or '#' for null. Deserialize by using an iterator over the split string list, building the tree recursively left then right.",
            "algorithm": "Serialize:\n1. If root is None, return '#,'.\n2. Return root.val + ',' + serialize(root.left) + serialize(root.right).\nDeserialize:\n1. Split string by ',' into a list.\n2. Define helper():\n   - Pop first element.\n   - If '#', return None.\n   - Else create TreeNode, recurse left, recurse right.\n3. Return root.",
            "code": "def serialize(root):\n    # Helper to run preorder DFS\n    def dfs(node):\n        if not node:\n            return ['#']\n        # Preorder: Root, Left, Right\n        return [str(node.val)] + dfs(node.left) + dfs(node.right)\n    return ','.join(dfs(root))\n\ndef deserialize(data):\n    # Split data string into tokens\n    tokens = data.split(',')\n    # Create iterator/pointer for tokens\n    token_iter = iter(tokens)\n    # Recursive helper to build tree\n    def helper():\n        val = next(token_iter)\n        if val == '#':\n            return None\n        node = TreeNode(int(val))\n        node.left = helper()\n        node.right = helper()\n        return node\n    return helper()",
            "complexity": {
                "time": "O(N) for both serialization and deserialization.",
                "space": "O(N) for storage of recursion stack and parsed elements."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use level-order BFS traversal. Serialization pushes nodes to queue and builds a list containing node values or '#' for None nodes. Deserialization uses a queue to link parents to child values read sequentially from the tokens array.",
            "algorithm": "Serialize:\n1. Return '' if root is None.\n2. BFS traversal using queue, append str(node.val) or '#' to list.\n3. Return comma-joined string.\nDeserialize:\n1. Return None if data is empty.\n2. Split data by ',' to get values.\n3. Create root = TreeNode(int(values[0])), queue = deque([root]).\n4. Maintain pointer `i = 1` for child values.\n5. While queue has elements:\n   a. Pop parent.\n   b. If values[i] != '#', set parent.left = TreeNode(int(values[i])) and enqueue.\n   c. Increment i.\n   d. If values[i] != '#', set parent.right = TreeNode(int(values[i])) and enqueue.\n   e. Increment i.\n6. Return root.",
            "code": "from collections import deque\n\nclass Codec:\n    def serialize(self, root):\n        # Return empty string if tree is empty\n        if not root:\n            return \"\"\n        # List to store elements of serialized tree\n        res = []\n        # Queue for BFS level order traversal\n        queue = deque([root])\n        # Traverse the tree level by level\n        while queue:\n            node = queue.popleft()\n            # If node exists, record its value and enqueue children\n            if node:\n                res.append(str(node.val))\n                queue.append(node.left)\n                queue.append(node.right)\n            # If node is None, record helper symbol '#'\n            else:\n                res.append(\"#\")\n        # Return elements joined by commas\n        return \",\".join(res)\n\n    def deserialize(self, data):\n        # Return None if serialized string is empty\n        if not data:\n            return None\n        # Split elements by commas\n        vals = data.split(\",\")\n        # Create root node from first element\n        root = TreeNode(int(vals[0]))\n        # Queue to store parent nodes for child connection\n        queue = deque([root])\n        # Index to keep track of current token in vals\n        i = 1\n        # BFS restoration loop\n        while queue:\n            # Pop current parent node\n            curr = queue.popleft()\n            # Check and build left child\n            if vals[i] != \"#\":\n                curr.left = TreeNode(int(vals[i]))\n                queue.append(curr.left)\n            # Move to next index\n            i += 1\n            # Check and build right child\n            if vals[i] != \"#\":\n                curr.right = TreeNode(int(vals[i]))\n                queue.append(curr.right)\n            # Move to next index\n            i += 1\n        # Return the fully reconstructed root\n        return root",
            "complexity": {
                "time": "O(N) to traverse tree / parse values.",
                "space": "O(N) to store BFS queues and token lists."
            }
        }
    ],
    "trace": [
        {"line": 28, "desc": "Check if data is empty", "vars": {"data": "'1,2,3,#,#,4,5,#,#,#,#'"}},
        {"line": 31, "desc": "Split string data into array of tokens", "vars": {"vals": "['1', '2', '3', '#', '#', '4', '5', '#', '#', '#', '#']"}},
        {"line": 33, "desc": "Construct root node (val 1) from vals[0]", "vars": {"root": "TreeNode(1)"}},
        {"line": 35, "desc": "Initialize queue containing root", "vars": {"queue": "[TreeNode(1)]"}},
        {"line": 37, "desc": "Initialize current array token index pointer i to 1", "vars": {"i": 1}},
        {"line": 39, "desc": "Queue is not empty, start BFS reconstruction loop", "vars": {"queue": "[TreeNode(1)]"}},
        {"line": 41, "desc": "Pop first parent node from queue", "vars": {"curr": "TreeNode(1)"}},
        {"line": 43, "desc": "Check if vals[i] ('2') is a node. Yes, build left child and enqueue", "vars": {"curr.left": "TreeNode(2)", "queue": "[TreeNode(2)]"}},
        {"line": 46, "desc": "Increment index i to 2", "vars": {"i": 2}},
        {"line": 48, "desc": "Check if vals[i] ('3') is a node. Yes, build right child and enqueue", "vars": {"curr.right": "TreeNode(3)", "queue": "[TreeNode(2), TreeNode(3)]"}},
        {"line": 51, "desc": "Increment index i to 3", "vars": {"i": 3}}
    ]
}

# -------------------------------------------------------------
# 9. Morris Inorder Traversal
# -------------------------------------------------------------
data["Morris Inorder Traversal"] = {
    "title": "Morris Inorder Traversal",
    "problemStatement": "Given the root of a binary tree, return the inorder traversal of its nodes' values using Morris Traversal (which achieves O(1) auxiliary space complexity).",
    "examples": [
        {
            "input": "root = [1,null,2,3]",
            "output": "[1,3,2]",
            "explanation": "Inorder traversal is Left -> Root -> Right."
        },
        {
            "input": "root = []",
            "output": "[]",
            "explanation": "Empty tree yields empty traversal list."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 100].",
        "-100 <= Node.val <= 100"
    ],
    "edgeCases": [
        "Empty tree: Return [].",
        "Skewed trees (only left or only right child links).",
        "Perfect binary tree: Exercises all thread creations and deletions."
    ],
    "followUps": [
        "How would you explain the time complexity of Morris traversal to be O(N) when it seems like we are traversing some paths multiple times?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Standard recursive inorder traversal. It runs in O(N) time but uses O(H) auxiliary space due to the function call stack.",
            "algorithm": "1. Define recursive helper `inorder(node)`.\n2. If `node` is None, return.\n3. Recursively visit `node.left`.\n4. Add `node.val` to result list.\n5. Recursively visit `node.right`.\n6. Invoke helper and return result list.",
            "code": "def morrisInorder(root):\n    # List to hold traversal results\n    res = []\n    # Recursive helper function\n    def helper(node):\n        if not node:\n            return\n        # Visit left child\n        helper(node.left)\n        # Visit parent node\n        res.append(node.val)\n        # Visit right child\n        helper(node.right)\n    # Start recursion\n    helper(root)\n    # Return result\n    return res",
            "complexity": {
                "time": "O(N) to visit each node once.",
                "space": "O(H) recursion stack space, where H is tree height."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Morris Traversal uses threaded binary trees. For a current node `curr`:\n- If left child is None, visit `curr` and move to right child.\n- If left child exists, find the inorder predecessor (rightmost node in left subtree).\n  - If predecessor's right child is None, create a thread to `curr` and move `curr` to left child.\n  - If predecessor's right child is `curr`, destroy the thread (set right to None), visit `curr`, and move `curr` to right child.",
            "algorithm": "1. Initialize `inorder = []`, `curr = root`.\n2. While `curr` is not None:\n   a. If `curr.left` is None:\n      - Append `curr.val` to `inorder`.\n      - `curr = curr.right`.\n   b. Else:\n      - Find rightmost node `pre` in `curr`'s left subtree.\n      - If `pre.right` is None:\n        - Thread: `pre.right = curr`.\n        - `curr = curr.left`.\n      - If `pre.right` is `curr`:\n        - Remove thread: `pre.right = None`.\n        - Append `curr.val` to `inorder`.\n        - `curr = curr.right`.\n3. Return `inorder`.",
            "code": "def morrisInorder(root): inorder = []; curr = root; while curr: if not curr.left: inorder.append(curr.val); curr = curr.right; else: pre = curr.left; while pre.right and pre.right != curr: pre = pre.right; if not pre.right: pre.right = curr; curr = curr.left; else: pre.right = None; inorder.append(curr.val); curr = curr.right; return inorder",
            "complexity": {
                "time": "O(N) since each edge is traversed at most 3 times.",
                "space": "O(1) auxiliary space (modifies the tree structure temporarily)."
            }
        }
    ],
    "trace": [
        {"line": 5, "desc": "Set curr to root (node 1)", "vars": {"curr": "TreeNode(1)"}},
        {"line": 7, "desc": "Process loop since curr is not None", "vars": {}},
        {"line": 9, "desc": "Check if left child of curr exists. Yes, traverse to left child", "vars": {"curr.left": "TreeNode(3)"}},
        {"line": 14, "desc": "Initialize predecessor pre pointer to left child", "vars": {"pre": "TreeNode(3)"}},
        {"line": 15, "desc": "Find rightmost node in left subtree", "vars": {"pre": "TreeNode(3)"}},
        {"line": 18, "desc": "Check if pre.right is None. Yes, create thread", "vars": {"pre.right": "None"}},
        {"line": 19, "desc": "Set pre.right pointing to curr (1)", "vars": {"pre.right": "TreeNode(1)"}},
        {"line": 20, "desc": "Move curr to left child (3)", "vars": {"curr": "TreeNode(3)"}},
        {"line": 7, "desc": "Next loop iteration, curr is 3", "vars": {"curr": "TreeNode(3)"}},
        {"line": 9, "desc": "Check left child of 3 (val 5). Exists", "vars": {}}
    ]
}

# -------------------------------------------------------------
# 10. Morris Preorder Traversal
# -------------------------------------------------------------
data["Morris Preorder Traversal"] = {
    "title": "Morris Preorder Traversal",
    "problemStatement": "Given the root of a binary tree, return the preorder traversal of its nodes' values using Morris Traversal (which achieves O(1) auxiliary space complexity).",
    "examples": [
        {
            "input": "root = [1,null,2,3]",
            "output": "[1,2,3]",
            "explanation": "Preorder traversal is Root -> Left -> Right."
        },
        {
            "input": "root = []",
            "output": "[]",
            "explanation": "Empty tree yields empty list."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 100].",
        "-100 <= Node.val <= 100"
    ],
    "edgeCases": [
        "Empty tree.",
        "Left skewed tree.",
        "Right skewed tree."
    ],
    "followUps": [
        "Can we generalize this logic to perform Postorder traversal in O(1) space?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Standard recursive preorder traversal. Recursion uses stack frames under the hood, taking up O(H) auxiliary space.",
            "algorithm": "1. Define recursive helper `preorder(node)`.\n2. If `node` is None, return.\n3. Add `node.val` to results.\n4. Recurse left subtree.\n5. Recurse right subtree.\n6. Call helper.",
            "code": "def morrisPreorder(root):\n    # List to store preorder elements\n    res = []\n    # Recursive helper\n    def helper(node):\n        if not node:\n            return\n        # Visit root\n        res.append(node.val)\n        # Visit left subtree\n        helper(node.left)\n        # Visit right subtree\n        helper(node.right)\n    # Start recursion\n    helper(root)\n    # Return result\n    return res",
            "complexity": {
                "time": "O(N) to visit each node once.",
                "space": "O(H) recursion stack space."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Morris Preorder is identical to Inorder, except we visit the node `curr` when creating the thread (predecessor.right = curr) rather than when destroying it. If there is no left child, we visit `curr` directly.",
            "algorithm": "1. Initialize `preorder = []`, `curr = root`.\n2. While `curr` is not None:\n   a. If `curr.left` is None:\n      - Append `curr.val` to `preorder`.\n      - `curr = curr.right`.\n   b. Else:\n      - Find rightmost node `pre` in `curr`'s left subtree.\n      - If `pre.right` is None:\n        - Append `curr.val` to `preorder` (preorder specific).\n        - Thread: `pre.right = curr`.\n        - `curr = curr.left`.\n      - If `pre.right` is `curr`:\n        - Remove thread: `pre.right = None`.\n        - `curr = curr.right`.\n3. Return `preorder`.",
            "code": "def morrisPreorder(root):\n    # List to store preorder traversal values\n    preorder = []\n    # Start with the root node\n    curr = root\n    # Process until curr becomes None\n    while curr:\n        # If there is no left child, visit current node and move right\n        if not curr.left:\n            preorder.append(curr.val)\n            curr = curr.right\n        else:\n            # Find the inorder predecessor of current node\n            pre = curr.left\n            while pre.right and pre.right != curr:\n                pre = pre.right\n            # If the thread does not exist, record current value and create thread\n            if not pre.right:\n                preorder.append(curr.val)\n                pre.right = curr\n                curr = curr.left\n            # If thread exists, remove it and move right\n            else:\n                pre.right = None\n                curr = curr.right\n    # Return the collected preorder list\n    return preorder",
            "complexity": {
                "time": "O(N) time as each node is visited constant times.",
                "space": "O(1) auxiliary space."
            }
        }
    ],
    "trace": [
        {"line": 5, "desc": "Set curr to root (node 1)", "vars": {"curr": "TreeNode(1)"}},
        {"line": 7, "desc": "Start processing loop", "vars": {}},
        {"line": 9, "desc": "Check if left child exists. Yes, navigate left", "vars": {"curr.left": "TreeNode(3)"}},
        {"line": 14, "desc": "Find inorder predecessor", "vars": {"pre": "TreeNode(3)"}},
        {"line": 18, "desc": "Predecessor right is None. Prepare thread", "vars": {}},
        {"line": 19, "desc": "Record current root val (1) before moving left (preorder)", "vars": {"preorder": "[1]"}},
        {"line": 20, "desc": "Set predecessor's right to current node", "vars": {"pre.right": "TreeNode(1)"}},
        {"line": 21, "desc": "Move current node pointer to left child", "vars": {"curr": "TreeNode(3)"}}
    ]
}

# -------------------------------------------------------------
# 11. Flatten Binary Tree to Linked List
# -------------------------------------------------------------
data["Flatten Binary Tree to Linked List"] = {
    "title": "Flatten Binary Tree to Linked List",
    "problemStatement": "Given the root of a binary tree, flatten the tree into a 'linked list': The 'linked list' should use the same TreeNode class where the right child pointer points to the next node in the list and the left child pointer is always null. The 'linked list' should be in the same order as a pre-order traversal of the binary tree. Modify the tree in-place.",
    "examples": [
        {
            "input": "root = [1,2,5,3,4,null,6]",
            "output": "[1,null,2,null,3,null,4,null,5,null,6]",
            "explanation": "Preorder order is 1 -> 2 -> 3 -> 4 -> 5 -> 6. Right pointers link them, left pointers are null."
        },
        {
            "input": "root = []",
            "output": "[]",
            "explanation": "Empty tree flattens to empty tree."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 2000].",
        "-100 <= Node.val <= 100"
    ],
    "edgeCases": [
        "Empty tree.",
        "Single node tree.",
        "Tree already flattened (only right children)."
    ],
    "followUps": [
        "Can you do it in O(1) space?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Perform preorder traversal and store all nodes in a list. Then iterate through the list, setting each node's left child to None and right child to the next node in the list.",
            "algorithm": "1. Initialize an empty list `nodes`.\n2. DFS preorder traversal to populate `nodes`.\n3. Traverse `nodes` from `0` to `len(nodes) - 2`:\n   a. `nodes[i].left = None`.\n   b. `nodes[i].right = nodes[i+1]`.\n4. Set last node left and right to None.",
            "code": "def flatten(root):\n    # Base case: empty tree\n    if not root:\n        return\n    # List to store preorder sequence of nodes\n    nodes = []\n    # Preorder DFS helper\n    def dfs(node):\n        if not node:\n            return\n        nodes.append(node)\n        dfs(node.left)\n        dfs(node.right)\n    dfs(root)\n    # Re-link nodes in preorder list\n    for i in range(len(nodes) - 1):\n        nodes[i].left = None\n        nodes[i].right = nodes[i + 1]\n    # Set final node pointers\n    nodes[-1].left = None\n    nodes[-1].right = None",
            "complexity": {
                "time": "O(N) to traverse and relink.",
                "space": "O(N) to store nodes list."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use Morris-like traversal. For each node `curr` starting from root, if it has a left child, find the rightmost node in its left subtree. Set the right child of this rightmost node to `curr.right`. Then move the entire left subtree to the right, and set `curr.left` to None. Finally, move `curr` to its right child.",
            "algorithm": "1. Set `curr = root`.\n2. While `curr` is not None:\n   a. If `curr.left` exists:\n      - Find rightmost node `pre` in `curr`'s left subtree.\n      - `pre.right = curr.right`.\n      - `curr.right = curr.left`.\n      - `curr.left = None`.\n   b. `curr = curr.right`.",
            "code": "def flatten(root):\n    # Start with the root node\n    curr = root\n    # Process until curr becomes None\n    while curr:\n        # If left child exists, relocate the right subtree\n        if curr.left:\n            # Find the rightmost node in the left subtree\n            pre = curr.left\n            while pre.right:\n                pre = pre.right\n            # Connect rightmost node of left subtree to current's right child\n            pre.right = curr.right\n            # Move current's left subtree to its right child\n            curr.right = curr.left\n            # Set left child to None\n            curr.left = None\n        # Move to the next node in the flattened chain\n        curr = curr.right",
            "complexity": {
                "time": "O(N) since each node is visited at most twice.",
                "space": "O(1) auxiliary space (modified in-place)."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Set curr to root node (1)", "vars": {"curr": "TreeNode(1)"}},
        {"line": 5, "desc": "Start processing loop since curr is not None", "vars": {}},
        {"line": 7, "desc": "Check if left child of 1 (val 2) exists. Yes", "vars": {"curr.left": "TreeNode(2)"}},
        {"line": 9, "desc": "Initialize pre to left child", "vars": {"pre": "TreeNode(2)"}},
        {"line": 10, "desc": "Traverse to rightmost node in left subtree", "vars": {"pre": "TreeNode(4)"}},
        {"line": 13, "desc": "Connect rightmost node (4) right to current right (5)", "vars": {"pre.right": "TreeNode(5)"}},
        {"line": 15, "desc": "Set current right child to current left child (2)", "vars": {"curr.right": "TreeNode(2)"}},
        {"line": 17, "desc": "Set current left child to None", "vars": {"curr.left": "None"}},
        {"line": 19, "desc": "Move curr to next right child (2)", "vars": {"curr": "TreeNode(2)"}}
    ]
}

# -------------------------------------------------------------
# 12. Floor in BST
# -------------------------------------------------------------
data["Floor in BST"] = {
    "title": "Floor in BST",
    "problemStatement": "Given a Binary Search Tree (BST) and a key, find the floor of the key in the BST. The floor of a key in a BST is the largest key in the BST that is smaller than or equal to the given key. If no such key exists, return -1.",
    "examples": [
        {
            "input": "root = [8,4,12,2,6,10,14], key = 11",
            "output": "10",
            "explanation": "The largest key in BST smaller than or equal to 11 is 10."
        },
        {
            "input": "root = [8,4,12,2,6,10,14], key = 1",
            "output": "-1",
            "explanation": "No node val is smaller than or equal to 1."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [1, 10^5].",
        "1 <= Node.val, key <= 10^9"
    ],
    "edgeCases": [
        "Key is smaller than min element in BST (returns -1).",
        "Key matches a node exactly.",
        "Key is larger than max element in BST."
    ],
    "followUps": [
        "What if the key is float? How would the comparison logic adjust?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Perform inorder traversal of BST to collect values in sorted order. Then iterate through the list to find the largest value <= key.",
            "algorithm": "1. Collect inorder elements in list `nodes`.\n2. Iterate through `nodes`.\n3. Find largest value <= key, return it. If none, return -1.",
            "code": "def floorInBST(root, key):\n    # List to store inorder elements\n    nodes = []\n    # Inorder DFS helper\n    def dfs(node):\n        if not node:\n            return\n        dfs(node.left)\n        nodes.append(node.val)\n        dfs(node.right)\n    dfs(root)\n    # Scan sorted list for the floor value\n    floor = -1\n    for val in nodes:\n        if val <= key:\n            floor = val\n        else:\n            break\n    # Return the floor value\n    return floor",
            "complexity": {
                "time": "O(N) to traverse and search.",
                "space": "O(N) to store node values."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Use Binary Search on BST. Start at root. Maintain candidate `floor` initialized to -1.\n- If `root.val == key`, floor is `root.val` (return immediately).\n- If `root.val > key`, search left subtree (elements are smaller).\n- If `root.val < key`, candidate floor is `root.val`. Search right subtree (might find a larger value <= key).",
            "algorithm": "1. Initialize `floor = -1`, `curr = root`.\n2. While `curr` is not None:\n   a. If `curr.val == key`, return `curr.val`.\n   b. If `curr.val > key`, `curr = curr.left`.\n   c. Else, `floor = curr.val` and `curr = curr.right`.\n3. Return `floor`.",
            "code": "def floorInBST(root, key):\n    # Initialize floor value to -1\n    floor = -1\n    # Start traversing from root\n    curr = root\n    # Loop until we run out of nodes\n    while curr:\n        # If current node's value equals key, it is the floor\n        if curr.val == key:\n            floor = curr.val\n            return floor\n        # If current value is greater than key, search left subtree\n        elif curr.val > key:\n            curr = curr.left\n        # If current value is less than key, it is a candidate floor, search right\n        else:\n            floor = curr.val\n            curr = curr.right\n    # Return the largest candidate floor found\n    return floor",
            "complexity": {
                "time": "O(H) where H is the height of the BST.",
                "space": "O(1) auxiliary space."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Initialize floor to -1", "vars": {"floor": -1}},
        {"line": 5, "desc": "Set curr to root (8)", "vars": {"curr": "TreeNode(8)"}},
        {"line": 7, "desc": "Start search loop since curr is not None", "vars": {}},
        {"line": 9, "desc": "Compare curr value (8) with key (11). Unequal", "vars": {"curr.val": 8, "key": 11}},
        {"line": 13, "desc": "Check if curr.val > key. No", "vars": {}},
        {"line": 17, "desc": "Update floor candidate to 8", "vars": {"floor": 8}},
        {"line": 18, "desc": "Search right subtree (curr = 12)", "vars": {"curr": "TreeNode(12)"}},
        {"line": 7, "desc": "Next loop, curr is 12", "vars": {"curr": "TreeNode(12)"}},
        {"line": 13, "desc": "Compare curr.val (12) > key (11). Yes, search left (curr = 10)", "vars": {"curr": "TreeNode(10)"}},
        {"line": 7, "desc": "Next loop, curr is 10", "vars": {"curr": "TreeNode(10)"}},
        {"line": 17, "desc": "Update floor candidate to 10", "vars": {"floor": 10}},
        {"line": 18, "desc": "Search right subtree (curr = None)", "vars": {"curr": "None"}},
        {"line": 20, "desc": "Exit loop and return floor 10", "vars": {"floor": 10}}
    ]
}

# -------------------------------------------------------------
# 13. Ceil in BST
# -------------------------------------------------------------
data["Ceil in BST"] = {
    "title": "Ceil in BST",
    "problemStatement": "Given a Binary Search Tree (BST) and a key, find the ceil of the key in the BST. The ceil of a key in a BST is the smallest key in the BST that is greater than or equal to the given key. If no such key exists, return -1.",
    "examples": [
        {
            "input": "root = [8,4,12,2,6,10,14], key = 11",
            "output": "12",
            "explanation": "The smallest key in BST greater than or equal to 11 is 12."
        },
        {
            "input": "root = [8,4,12,2,6,10,14], key = 15",
            "output": "-1",
            "explanation": "No node val is greater than or equal to 15."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [1, 10^5].",
        "1 <= Node.val, key <= 10^9"
    ],
    "edgeCases": [
        "Key is larger than max element in BST (returns -1).",
        "Key matches a node exactly.",
        "Key is smaller than min element in BST."
    ],
    "followUps": [
        "How would you implement this recursively instead of iteratively?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Perform inorder traversal to collect BST values. Scan sorted list to find the first element >= key.",
            "algorithm": "1. Run DFS inorder to collect elements.\n2. Loop through elements list.\n3. Return first value >= key. If loop completes, return -1.",
            "code": "def findCeil(root, key):\n    # List to store inorder values\n    nodes = []\n    # Inorder DFS helper\n    def dfs(node):\n        if not node:\n            return\n        dfs(node.left)\n        nodes.append(node.val)\n        dfs(node.right)\n    dfs(root)\n    # Scan sorted list for ceil value\n    for val in nodes:\n        if val >= key:\n            return val\n    # Return -1 if no element found\n    return -1",
            "complexity": {
                "time": "O(N) to traverse and scan.",
                "space": "O(N) to store node values."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Binary search on BST. Maintain candidate `ceil` initialized to -1.\n- If `root.val == key`, ceil is `root.val`.\n- If `root.val < key`, search right subtree (elements are larger).\n- If `root.val > key`, candidate ceil is `root.val`. Search left subtree (might find a smaller value >= key).",
            "algorithm": "1. Initialize `ceil = -1`, `curr = root`.\n2. While `curr` is not None:\n   a. If `curr.val == key`, return `curr.val`.\n   b. If `curr.val < key`, `curr = curr.right`.\n   c. Else, `ceil = curr.val` and `curr = curr.left`.\n3. Return `ceil`.",
            "code": "def findCeil(root, key):\n    # Initialize ceil value to -1\n    ceil = -1\n    # Start traversing from root\n    curr = root\n    # Loop until we run out of nodes\n    while curr:\n        # If current node's value equals key, it is the ceil\n        if curr.val == key:\n            ceil = curr.val\n            return ceil\n        # If current value is less than key, search right subtree\n        elif curr.val < key:\n            curr = curr.right\n        # If current value is greater than key, candidate ceil, search left\n        else:\n            ceil = curr.val\n            curr = curr.left\n    # Return the smallest candidate ceil found\n    return ceil",
            "complexity": {
                "time": "O(H) where H is BST height.",
                "space": "O(1) auxiliary space."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Initialize ceil to -1", "vars": {"ceil": -1}},
        {"line": 5, "desc": "Set curr pointer to root node (8)", "vars": {"curr": "TreeNode(8)"}},
        {"line": 7, "desc": "Start searching loop", "vars": {}},
        {"line": 9, "desc": "Compare curr value (8) with key (11). Unequal", "vars": {"curr.val": 8, "key": 11}},
        {"line": 13, "desc": "Compare curr.val (8) < key (11). Yes, search right subtree", "vars": {"curr": "TreeNode(12)"}},
        {"line": 7, "desc": "Next loop, curr is 12", "vars": {"curr": "TreeNode(12)"}},
        {"line": 17, "desc": "Since 12 > 11, candidate ceil is 12, search left subtree", "vars": {"ceil": 12, "curr": "TreeNode(10)"}},
        {"line": 7, "desc": "Next loop, curr is 10", "vars": {"curr": "TreeNode(10)"}},
        {"line": 13, "desc": "Compare curr.val (10) < key (11). Yes, search right subtree", "vars": {"curr": "None"}},
        {"line": 20, "desc": "Exit loop and return ceil 12", "vars": {"ceil": 12}}
    ]
}

# -------------------------------------------------------------
# 14. Insert Node in BST
# -------------------------------------------------------------
data["Insert Node in BST"] = {
    "title": "Insert Node in BST",
    "problemStatement": "Given the root node of a Binary Search Tree (BST) and a value to insert into the tree, insert the value into the BST. Return the root node of the BST after the insertion. It is guaranteed that the new value does not exist in the original BST. Notice that there may exist multiple valid ways for the insertion, as long as the tree remains a BST after insertion. You can return any of them.",
    "examples": [
        {
            "input": "root = [4,2,7,1,3], val = 5",
            "output": "[4,2,7,1,3,5]",
            "explanation": "Another valid solution is [5,2,7,1,3,null,null,null,4]."
        },
        {
            "input": "root = [40,20,60,10,30,50,70], val = 25",
            "output": "[40,20,60,10,30,50,70,null,null,25]",
            "explanation": "25 is inserted as left child of 30."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 10^4].",
        "-10^8 <= Node.val <= 10^8",
        "All values Node.val are unique.",
        "-10^8 <= val <= 10^8",
        "It's guaranteed that val does not exist in the original BST."
    ],
    "edgeCases": [
        "Empty tree: Return a new node as root.",
        "Insert value smaller than all existing values (becomes leftmost leaf).",
        "Insert value larger than all existing values (becomes rightmost leaf)."
    ],
    "followUps": [
        "Can you implement a balanced BST insertion (like AVL tree) to maintain log N height?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Rebuild the tree. Traverse tree to get all node values, append the new value, sort the list of values, and construct a balanced BST from the sorted list.",
            "algorithm": "1. Collect all node values using DFS.\n2. Append new val.\n3. Sort values list.\n4. Build balanced BST from sorted values list by recursively setting middle element as parent node.",
            "code": "def insertIntoBST(root, val):\n    # List to store node values\n    nodes = []\n    # Inorder DFS helper\n    def dfs(node):\n        if not node:\n            return\n        dfs(node.left)\n        nodes.append(node.val)\n        dfs(node.right)\n    dfs(root)\n    # Add the new value to the list\n    nodes.append(val)\n    # Sort the list\n    nodes.sort()\n    # Helper to construct a balanced BST from sorted array\n    def build_balanced(left, right):\n        if left > right:\n            return None\n        mid = (left + right) // 2\n        node = TreeNode(nodes[mid])\n        node.left = build_balanced(left, mid - 1)\n        node.right = build_balanced(mid + 1, right)\n        return node\n    return build_balanced(0, len(nodes) - 1)",
            "complexity": {
                "time": "O(N log N) due to sorting, then O(N) to rebuild.",
                "space": "O(N) to store node values."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Find the appropriate location for insertion by traversing down the tree. Since we only need to return a valid BST, inserting the node as a leaf is the easiest and most efficient way. If `val < curr.val`, check if `curr.left` is None; if so, link the new node, otherwise go left. If `val > curr.val`, check `curr.right` similarly.",
            "algorithm": "1. If root is None, return `TreeNode(val)`.\n2. Set `curr = root`.\n3. While True:\n   a. If `val < curr.val`:\n      - If `curr.left` is None, `curr.left = TreeNode(val)`, break.\n      - Else, `curr = curr.left`.\n   b. Else:\n      - If `curr.right` is None, `curr.right = TreeNode(val)`, break.\n      - Else, `curr = curr.right`.\n4. Return `root`.",
            "code": "def insertIntoBST(root, val):\n    # If the root is None, return a new node containing the val\n    if not root:\n        return TreeNode(val)\n    # Start traversing with a pointer at the root\n    curr = root\n    # Loop to find the insertion point\n    while True:\n        # If value to insert is smaller, go to the left subtree\n        if val < curr.val:\n            # If left child is None, insert node here and exit loop\n            if not curr.left:\n                curr.left = TreeNode(val)\n                break\n            # Otherwise, move to left child\n            curr = curr.left\n        # If value to insert is larger, go to the right subtree\n        else:\n            # If right child is None, insert node here and exit loop\n            if not curr.right:\n                curr.right = TreeNode(val)\n                break\n            # Otherwise, move to right child\n            curr = curr.right\n    # Return the root node of the modified tree\n    return root",
            "complexity": {
                "time": "O(H) where H is height of BST.",
                "space": "O(1) auxiliary space."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Check if root is None", "vars": {"root": "TreeNode(4)"}},
        {"line": 6, "desc": "Set curr to root node (4)", "vars": {"curr": "TreeNode(4)"}},
        {"line": 10, "desc": "Compare val (5) with curr.val (4). Since 5 > 4, enter else block", "vars": {"val": 5, "curr.val": 4}},
        {"line": 20, "desc": "Check if right child of 4 exists. Yes (7)", "vars": {"curr.right": "TreeNode(7)"}},
        {"line": 24, "desc": "Move curr to right child (7)", "vars": {"curr": "TreeNode(7)"}},
        {"line": 10, "desc": "Compare val (5) with curr.val (7). Since 5 < 7, enter left branch block", "vars": {"curr.val": 7}},
        {"line": 13, "desc": "Check if left child of 7 is None. Yes", "vars": {"curr.left": "None"}},
        {"line": 14, "desc": "Insert new TreeNode(5) as left child of 7", "vars": {"curr.left": "TreeNode(5)"}},
        {"line": 15, "desc": "Break from loop", "vars": {}},
        {"line": 26, "desc": "Return root node (4)", "vars": {"root": "TreeNode(4)"}}
    ]
}

# -------------------------------------------------------------
# 15. Delete Node in BST
# -------------------------------------------------------------
data["Delete Node in BST"] = {
    "title": "Delete Node in BST",
    "problemStatement": "Given a root node reference of a BST and a key, delete the node with the given key in the BST. Return the root node reference (possibly updated) of the BST. Deletion is divided into: 1. Search for node to remove. 2. If node found, delete it.",
    "examples": [
        {
            "input": "root = [5,3,6,2,4,null,7], key = 3",
            "output": "[5,4,6,2,null,null,7]",
            "explanation": "Node 3 is deleted. Replacement can be its inorder successor 4."
        },
        {
            "input": "root = [5,3,6,2,4,null,7], key = 0",
            "output": "[5,3,6,2,4,null,7]",
            "explanation": "Key 0 does not exist in BST, so no modification is made."
        }
    ],
    "constraints": [
        "The number of nodes in the tree is in the range [0, 10^4].",
        "-10^5 <= Node.val <= 10^5",
        "Each node has a unique value.",
        "key is an integer.",
        "-10^5 <= key <= 10^5"
    ],
    "edgeCases": [
        "Key not found.",
        "Node is leaf (has no children).",
        "Node has only one child.",
        "Node has two children: Must replace with successor/predecessor."
    ],
    "followUps": [
        "Can you implement deletion iteratively instead of recursively?"
    ],
    "approaches": [
        {
            "name": "Brute Force",
            "intuition": "Rebuild tree. Collect all node values excluding `key`, sort them, and rebuild a balanced BST.",
            "algorithm": "1. Traversal to collect all values except `key`.\n2. Reconstruct a balanced BST using binary recursion.",
            "code": "def deleteNode(root, key):\n    # List to store values\n    nodes = []\n    # DFS traversal helper\n    def dfs(node):\n        if not node:\n            return\n        dfs(node.left)\n        if node.val != key:\n            nodes.append(node.val)\n        dfs(node.right)\n    dfs(root)\n    # Construct balanced BST\n    def build(left, right):\n        if left > right:\n            return None\n        mid = (left + right) // 2\n        node = TreeNode(nodes[mid])\n        node.left = build(left, mid - 1)\n        node.right = build(mid + 1, right)\n        return node\n    return build(0, len(nodes) - 1)",
            "complexity": {
                "time": "O(N) to traverse and O(N) to rebuild.",
                "space": "O(N) storage."
            }
        },
        {
            "name": "Optimal",
            "intuition": "Locate node recursively. Once found:\n- Case 1: Node has 0 or 1 child. Return the other child.\n- Case 2: Node has 2 children. Find inorder successor (minimum in right subtree). Replace current node value with successor value. Recursively delete successor value in right subtree.",
            "algorithm": "1. If root is None, return None.\n2. If key < root.val, root.left = deleteNode(root.left, key).\n3. If key > root.val, root.right = deleteNode(root.right, key).\n4. If key == root.val:\n   a. If not root.left, return root.right.\n   b. If not root.right, return root.left.\n   c. Find min node `temp` in root.right.\n   d. root.val = temp.val.\n   e. root.right = deleteNode(root.right, temp.val).\n5. Return root.",
            "code": "def deleteNode(root, key):\n    # Base case: key not found in the tree\n    if not root:\n        return None\n    # If key is smaller, search in left subtree\n    if key < root.val:\n        root.left = deleteNode(root.left, key)\n    # If key is larger, search in right subtree\n    elif key > root.val:\n        root.right = deleteNode(root.right, key)\n    # Found the node to delete\n    else:\n        # Case 1 & 2: Node has 0 or 1 child\n        if not root.left:\n            return root.right\n        elif not root.right:\n            return root.left\n        # Case 3: Node has 2 children\n        # Find inorder successor (minimum value in right subtree)\n        temp = root.right\n        while temp.left:\n            temp = temp.left\n        # Copy successor's value to current node\n        root.val = temp.val\n        # Delete successor node recursively\n        root.right = deleteNode(root.right, temp.val)\n    # Return the root node\n    return root",
            "complexity": {
                "time": "O(H) where H is height of BST.",
                "space": "O(H) recursion stack space."
            }
        }
    ],
    "trace": [
        {"line": 3, "desc": "Check if root is None", "vars": {"root": "TreeNode(5)", "key": 3}},
        {"line": 6, "desc": "Compare key (3) < root.val (5). Yes, go left", "vars": {}},
        {"line": 7, "desc": "Recursive deleteNode call on root.left (3)", "vars": {"root": "TreeNode(3)", "key": 3}},
        {"line": 3, "desc": "Check if root (3) is None (inside recursion)", "vars": {"root": "TreeNode(3)"}},
        {"line": 6, "desc": "Compare key (3) < 3. False", "vars": {}},
        {"line": 9, "desc": "Compare key (3) > 3. False", "vars": {}},
        {"line": 13, "desc": "Key matches current node (3). Proceed with deletion", "vars": {}},
        {"line": 15, "desc": "Check if left child of 3 is null. No, left is 2", "vars": {"root.left": "TreeNode(2)"}},
        {"line": 17, "desc": "Check if right child of 3 is null. No, right is 4", "vars": {"root.right": "TreeNode(4)"}},
        {"line": 21, "desc": "Two children. Find successor in right subtree (4)", "vars": {"temp": "TreeNode(4)"}},
        {"line": 22, "desc": "Successor has no left child, so min is 4", "vars": {"temp.val": 4}},
        {"line": 25, "desc": "Replace current node value 3 with successor value 4", "vars": {"root.val": 4}},
        {"line": 27, "desc": "Recursively delete successor value 4 from root.right (4)", "vars": {}},
        {"line": 15, "desc": "Successor node 4 has no left child, return its right child (None)", "vars": {}}
    ]
}

# -------------------------------------------------------------
# Write JSON output to target file
# -------------------------------------------------------------
target_file = "/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_6.json"
os.makedirs(os.path.dirname(target_file), exist_ok=True)

with open(target_file, "w") as f:
    json.dump(data, f, indent=2)

print("JSON successfully generated and written to target file.")
