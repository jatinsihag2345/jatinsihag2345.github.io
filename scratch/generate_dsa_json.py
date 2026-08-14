import json
import os

null = None
true = True
false = False

data = {
  "Kth Smallest Element in BST": {
    "title": "Kth Smallest Element in BST",
    "problemStatement": "Given the root of a binary search tree, and an integer k, return the kth smallest value (1-indexed) of all the values of the nodes in the tree.",
    "examples": [
      {
        "input": "root = [3,1,4,null,2], k = 1",
        "output": "1",
        "explanation": "The sorted values of this BST are [1, 2, 3, 4], so the 1st smallest is 1."
      },
      {
        "input": "root = [5,3,6,2,4,null,null,1], k = 3",
        "output": "3",
        "explanation": "The sorted values of this BST are [1, 2, 3, 4, 5, 6], so the 3rd smallest is 3."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is n.",
      "1 <= k <= n <= 10^4",
      "0 <= Node.val <= 10^4"
    ],
    "edgeCases": [
      "Single node tree where k = 1.",
      "k equals the number of nodes in the BST (maximum node value).",
      "Highly skewed tree (degenerate tree behaving like a linked list)."
    ],
    "followUps": [
      "If the BST is modified often (i.e., we can do insert and delete operations) and you need to find the kth smallest frequently, how would you optimize the kthSmallest routine? (Answer: Store the size of the subtree rooted at each node to achieve O(H) search time.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "An inorder traversal of a Binary Search Tree (BST) visits the nodes in sorted order. We can perform a full recursive inorder traversal, collect all values in an array, and retrieve the element at index k - 1.",
        "algorithm": "1. Initialize an empty list 'elements'.\n2. Define a helper function 'inorder(node)' that performs recursive inorder traversal: visits left, appends node.val, and visits right.\n3. Call 'inorder(root)'.\n4. Return the (k-1)-th element from the 'elements' list.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef kthSmallest(root: TreeNode, k: int) -> int:\n    # List to store the inorder traversal elements\n    elements = []\n    \n    # Helper function for recursive inorder traversal\n    def inorder(node):\n        # If current node is None, return back\n        if not node:\n            return\n        # Traverse the left subtree first\n        inorder(node.left)\n        # Visit current node and store its value\n        elements.append(node.val)\n        # Traverse the right subtree next\n        inorder(node.right)\n        \n    # Execute the inorder traversal starting from root\n    inorder(root)\n    # Return the kth smallest element (k is 1-indexed)\n    return elements[k - 1]",
        "complexity": {
          "time": "O(N) where N is the total number of nodes in the tree, since we visit every node exactly once.",
          "space": "O(N) to store the inorder traversal elements in the list, plus recursive call stack space."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Instead of traversing the entire BST, we can do an iterative inorder traversal using a stack. This allows us to stop the traversal immediately when we hit the k-th smallest element, optimizing both time and stack space.",
        "algorithm": "1. Initialize an empty stack and set 'curr' pointer to the root.\n2. In a loop, push the current node and all its left descendants onto the stack.\n3. Pop the top node from the stack.\n4. Decrement k by 1.\n5. If k reaches 0, we have found the kth smallest node; return its value.\n6. Set 'curr' to the right child of the popped node and repeat.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef kthSmallest(root: TreeNode, k: int) -> int:\n    # Initialize an empty stack for traversal\n    stack = []\n    # Track the current node starting from root\n    curr = root\n    # Traverse until stack is empty or curr is None\n    while curr or stack:\n        # Traverse to leftmost descendant\n        while curr:\n            # Push current node to stack\n            stack.append(curr)\n            # Move to the left child\n            curr = curr.left\n        # Pop node from the stack\n        curr = stack.pop()\n        # Decrement k\n        k -= 1\n        # Return value if k is 0\n        if k == 0:\n            return curr.val\n        # Move to right child\n        curr = curr.right",
        "complexity": {
          "time": "O(H + k) where H is the height of the tree. This is O(log N + k) for balanced trees and O(N + k) for skewed trees.",
          "space": "O(H) space for the stack tracking the height of the tree."
        }
      }
    ],
    "trace": [
      {
        "line": 8,
        "desc": "Stack is empty, curr is set to root (3). Enters outer while loop.",
        "vars": { "stack": [], "curr": 3, "k": 1 }
      },
      {
        "line": 10,
        "desc": "Inner loop starts: curr is 3. Pushes root node 3 to stack.",
        "vars": { "stack": [3], "curr": 3, "k": 1 }
      },
      {
        "line": 13,
        "desc": "curr moves to left child (1).",
        "vars": { "stack": [3], "curr": 1, "k": 1 }
      },
      {
        "line": 10,
        "desc": "Inner loop check: curr is 1. Pushes node 1 to stack.",
        "vars": { "stack": [3, 1], "curr": 1, "k": 1 }
      },
      {
        "line": 13,
        "desc": "curr moves to left child (None).",
        "vars": { "stack": [3, 1], "curr": null, "k": 1 }
      },
      {
        "line": 15,
        "desc": "Exits inner loop. Pops top node (1) from stack.",
        "vars": { "stack": [3], "curr": 1, "k": 1 }
      },
      {
        "line": 17,
        "desc": "Decrements k from 1 to 0.",
        "vars": { "stack": [3], "curr": 1, "k": 0 }
      },
      {
        "line": 19,
        "desc": "Checks if k is 0. Condition is True.",
        "vars": { "stack": [3], "curr": 1, "k": 0 }
      },
      {
        "line": 20,
        "desc": "Returns curr.val (1) as the kth smallest element.",
        "vars": { "stack": [3], "curr": 1, "k": 0 }
      }
    ]
  },
  "Lowest Common Ancestor in BST": {
    "title": "Lowest Common Ancestor in BST",
    "problemStatement": "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.",
    "examples": [
      {
        "input": "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 8",
        "output": "6",
        "explanation": "The LCA of nodes 2 and 8 is 6."
      },
      {
        "input": "root = [6,2,8,0,4,7,9,null,null,3,5], p = 2, q = 4",
        "output": "2",
        "explanation": "The LCA of nodes 2 and 4 is 2, since a node can be a descendant of itself."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [2, 10^5].",
      "-10^9 <= Node.val <= 10^9",
      "All Node.val are unique.",
      "p and q will exist in the BST and p != q."
    ],
    "edgeCases": [
      "p or q is the root node of the tree.",
      "p and q reside in the same subtree.",
      "Skewed BST behaves like a sorted linked list."
    ],
    "followUps": [
      "Can you solve this iteratively with O(1) auxiliary space? (Yes, the optimal approach does this.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "We can find the path from the root to node p and the path from the root to node q, storing both paths as lists of nodes. Then, we traverse both lists together from the start; the last node that is common to both paths is the lowest common ancestor.",
        "algorithm": "1. Define a helper function 'find_path(node, target, path)' to build the path from root to a target node.\n2. Find paths for both nodes p and q.\n3. Compare elements of both paths starting from the root.\n4. Return the last node that is present in both path lists.",
        "code": "class TreeNode:\n    def __init__(self, x):\n        self.val = x\n        self.left = None\n        self.right = None\n\ndef lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:\n    # Helper function to find path from root to target node\n    def find_path(node, target, path):\n        # Base case: if node is None, path doesn't exist\n        if not node:\n            return False\n        # Append current node to path list\n        path.append(node)\n        # If target node found, return True\n        if node.val == target.val:\n            return True\n        # Search in left or right subtrees recursively\n        if (node.left and find_path(node.left, target, path)) or \\\n           (node.right and find_path(node.right, target, path)):\n            return True\n        # Backtrack if target not in this branch\n        path.pop()\n        return False\n        \n    # Lists to store paths from root to p and q\n    path_p, path_q = [], []\n    find_path(root, p, path_p)\n    find_path(root, q, path_q)\n    \n    # Traverse paths and find the last matching element\n    lca = None\n    for n1, n2 in zip(path_p, path_q):\n        if n1.val == n2.val:\n            lca = n1\n        else:break\n    # Return lowest common ancestor\n    return lca",
        "complexity": {
          "time": "O(N) since we may have to traverse all nodes in the tree to find the paths.",
          "space": "O(N) to store the paths in arrays and recursive call stack."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Using the properties of BST, we can find the split point. If both nodes p and q have values smaller than the current node, the LCA must be in the left subtree. If both are larger, it must be in the right subtree. Otherwise, the current node is the split point (the LCA).",
        "algorithm": "1. Initialize 'curr' to root.\n2. Loop while 'curr' is not None:\n   a. If both p.val and q.val are greater than curr.val, move right: curr = curr.right.\n   b. If both p.val and q.val are less than curr.val, move left: curr = curr.left.\n   c. Else, current node is the LCA, return 'curr'.",
        "code": "class TreeNode:\n    def __init__(self, x):\n        self.val = x\n        self.left = None\n        self.right = None\n\ndef lowestCommonAncestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:\n    # Start traversal from root node\n    curr = root\n    # Loop until LCA is found\n    while curr:\n        # If both nodes are greater than current, LCA is in right subtree\n        if p.val > curr.val and q.val > curr.val:\n            curr = curr.right\n        # If both nodes are smaller than current, LCA is in left subtree\n        elif p.val < curr.val and q.val < curr.val:\n            curr = curr.left\n        # We found the split point or one of the nodes is current\n        else:\n            return curr",
        "complexity": {
          "time": "O(H) where H is the height of the tree. This is O(log N) for balanced trees and O(N) for skewed trees.",
          "space": "O(1) auxiliary space as it is implemented iteratively."
        }
      }
    ],
    "trace": [
      {
        "line": 7,
        "desc": "curr initialized to root node (6).",
        "vars": { "curr.val": 6, "p.val": 2, "q.val": 4 }
      },
      {
        "line": 9,
        "desc": "Enters while loop. curr is not None (6).",
        "vars": { "curr.val": 6 }
      },
      {
        "line": 11,
        "desc": "Checks if p.val (2) and q.val (4) are both greater than 6. False.",
        "vars": { "curr.val": 6 }
      },
      {
        "line": 14,
        "desc": "Checks if p.val (2) and q.val (4) are both less than 6. True.",
        "vars": { "curr.val": 6 }
      },
      {
        "line": 15,
        "desc": "Moves curr to left child (2).",
        "vars": { "curr.val": 2 }
      },
      {
        "line": 9,
        "desc": "Enters loop again. curr is not None (2).",
        "vars": { "curr.val": 2 }
      },
      {
        "line": 11,
        "desc": "Checks if both are greater than 2. False (p.val is 2, not greater).",
        "vars": { "curr.val": 2 }
      },
      {
        "line": 14,
        "desc": "Checks if both are less than 2. False.",
        "vars": { "curr.val": 2 }
      },
      {
        "line": 18,
        "desc": "LCA split point reached. Returns current node (2).",
        "vars": { "curr.val": 2 }
      }
    ]
  },
  "Construct BST from Preorder Traversal": {
    "title": "Construct BST from Preorder Traversal",
    "problemStatement": "Given an array of integers preorder, which represents the preorder traversal of a BST, construct the tree and return its root.",
    "examples": [
      {
        "input": "preorder = [8,5,1,7,10,12]",
        "output": "[8,5,10,1,7,null,12]",
        "explanation": "Constructed BST has root 8, left subtree root 5, and right subtree root 10."
      },
      {
        "input": "preorder = [1,3]",
        "output": "[1,null,3]"
      }
    ],
    "constraints": [
      "1 <= preorder.length <= 100",
      "1 <= preorder[i] <= 1000",
      "All the values of preorder are unique."
    ],
    "edgeCases": [
      "Array length is 1.",
      "Preorder represents a completely skewed BST (increasing or decreasing sorted order)."
    ],
    "followUps": [
      "Can you solve it in O(N) time complexity? (Yes, the optimal approach achieves this.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Insert each element from the preorder traversal one-by-one into a BST. The first element is the root. For subsequent elements, start from the root and go left or right based on value comparison until an empty spot is found.",
        "algorithm": "1. Create root node using preorder[0].\n2. For each subsequent element in preorder list:\n   a. Call recursive insert function starting from root.\n   b. If element < current node val, go left. If left is None, set left to new node; else recurse.\n   c. If element > current node val, go right. If right is None, set right to new node; else recurse.\n3. Return root.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef bstFromPreorder(preorder: list[int]) -> TreeNode:\n    # Base case check for empty preorder list\n    if not preorder:\n        return None\n    # Root is the first element\n    root = TreeNode(preorder[0])\n    \n    # Helper function to insert a value into the BST\n    def insert(node, val):\n        # If value is smaller, go to left subtree\n        if val < node.val:\n            if not node.left:\n                node.left = TreeNode(val)\n            else:\n                insert(node.left, val)\n        # If value is larger, go to right subtree\n        else:\n            if not node.right:\n                node.right = TreeNode(val)\n            else:\n                insert(node.right, val)\n                \n    # Insert remaining elements one by one\n    for i in range(1, len(preorder)):\n        insert(root, preorder[i])\n    # Return constructed root node\n    return root",
        "complexity": {
          "time": "O(N^2) in the worst case (skewed tree), O(N log N) on average.",
          "space": "O(H) recursion stack where H is the height of the tree."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Instead of repeatedly searching from the root, we can build the tree recursively by restricting each node construction within a valid range. We only need to keep track of a global index and pass the maximum upper bound constraint down to children.",
        "algorithm": "1. Maintain a global/nonlocal index 'idx' pointing to current element in preorder.\n2. Define helper function 'helper(limit)':\n   a. If 'idx' reaches end of preorder or preorder[idx] > limit, return None.\n   b. Create a node with preorder[idx], and increment 'idx'.\n   c. Construct left subtree with upper bound set to node.val.\n   d. Construct right subtree with upper bound set to original limit.\n3. Invoke 'helper(inf)'.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef bstFromPreorder(preorder: list[int]) -> TreeNode:\n    # Index to track current element in preorder list\n    idx = 0\n    \n    # Helper function with upper limit constraint\n    def helper(limit):\n        nonlocal idx\n        # Base case: if all elements processed or element exceeds limit\n        if idx == len(preorder) or preorder[idx] > limit:\n            return None\n        # Create current node\n        root = TreeNode(preorder[idx])\n        # Move to next element\n        idx += 1\n        # Construct left child: must be smaller than current root value\n        root.left = helper(root.val)\n        # Construct right child: must be smaller than parent's limit\n        root.right = helper(limit)\n        # Return the constructed node\n        return root\n        \n    # Start construction with upper limit set to infinity\n    return helper(float('inf'))",
        "complexity": {
          "time": "O(N) since each element of preorder list is visited exactly once.",
          "space": "O(H) recursion stack where H is the height of the tree."
        }
      }
    ],
    "trace": [
      {
        "line": 8,
        "desc": "Index initialized to 0. Call helper with limit infinity.",
        "vars": { "idx": 0, "limit": "inf", "preorder": [8, 5, 10] }
      },
      {
        "line": 12,
        "desc": "preorder[0] is 8, limit is infinity. Condition False. Node 8 is created.",
        "vars": { "idx": 0, "root.val": 8 }
      },
      {
        "line": 16,
        "desc": "Index incremented to 1.",
        "vars": { "idx": 1 }
      },
      {
        "line": 18,
        "desc": "Call helper for left child with limit = 8.",
        "vars": { "idx": 1, "limit": 8 }
      },
      {
        "line": 12,
        "desc": "preorder[1] is 5 < 8. Condition False. Node 5 is created.",
        "vars": { "idx": 1, "root.val": 5 }
      },
      {
        "line": 16,
        "desc": "Index incremented to 2.",
        "vars": { "idx": 2 }
      },
      {
        "line": 18,
        "desc": "Call helper for left child of node 5 with limit = 5.",
        "vars": { "idx": 2, "limit": 5 }
      },
      {
        "line": 12,
        "desc": "preorder[2] is 10 > 5. Condition True. Returns None.",
        "vars": { "idx": 2, "limit": 5 }
      },
      {
        "line": 20,
        "desc": "Call helper for right child of node 5 with limit = 8.",
        "vars": { "idx": 2, "limit": 8 }
      },
      {
        "line": 12,
        "desc": "preorder[2] is 10 > 8. Condition True. Returns None.",
        "vars": { "idx": 2, "limit": 8 }
      },
      {
        "line": 20,
        "desc": "Call helper for right child of node 8 with limit = infinity.",
        "vars": { "idx": 2, "limit": "inf" }
      },
      {
        "line": 12,
        "desc": "preorder[2] is 10 < infinity. Condition False. Node 10 is created.",
        "vars": { "idx": 2, "root.val": 10 }
      }
    ]
  },
  "Inorder Successor in BST": {
    "title": "Inorder Successor in BST",
    "problemStatement": "Given a binary search tree and a node p in it, find the in-order successor of that node in the BST. The successor of a node p is the node with the smallest key greater than p.val.",
    "examples": [
      {
        "input": "root = [2,1,3], p = 1",
        "output": "2",
        "explanation": "The inorder traversal is [1, 2, 3], so the successor of node 1 is 2."
      },
      {
        "input": "root = [5,3,6,2,4,null,null,1], p = 6",
        "output": "null",
        "explanation": "There is no node in the BST greater than 6, so the successor is null."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [1, 10^4].",
      "-10^5 <= Node.val <= 10^5",
      "All Nodes have unique values."
    ],
    "edgeCases": [
      "Target node p has a right subtree (successor is leftmost node in right subtree).",
      "Target node p has no right subtree (successor is one of its ancestors).",
      "Target node p is the maximum node in the tree (returns None)."
    ],
    "followUps": [
      "Can you solve this without using parent pointers in O(H) time and O(1) space? (Yes, the optimal approach does this.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Perform a full inorder traversal and store the nodes in a list. Then search the list for node p, and return the node immediately following it.",
        "algorithm": "1. Initialize an empty list 'nodes'.\n2. Define helper 'inorder(node)' that recursively appends node pointers to 'nodes'.\n3. Call 'inorder(root)'.\n4. Traverse the list, find the target node p, and return the next node if it exists; else return None.",
        "code": "class TreeNode:\n    def __init__(self, x):\n        self.val = x\n        self.left = None\n        self.right = None\n\ndef inorderSuccessor(root: TreeNode, p: TreeNode) -> TreeNode:\n    # List to hold tree nodes in sorted order\n    nodes = []\n    \n    def inorder(node):\n        # Base case\n        if not node:\n            return\n        # Left subtree\n        inorder(node.left)\n        # Visit current\n        nodes.append(node)\n        # Right subtree\n        inorder(node.right)\n        \n    inorder(root)\n    # Search for successor node\n    for i in range(len(nodes)):\n        if nodes[i].val == p.val:\n            # Return next element if it exists\n            if i + 1 < len(nodes):\n                return nodes[i+1]\n            break\n    return None",
        "complexity": {
          "time": "O(N) to do a complete inorder traversal.",
          "space": "O(N) space to store nodes in the array."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Using BST property: start at root. If current node's value is greater than p's value, the current node is a candidate successor. We record this candidate and look left for a smaller successor. If current node's value is less than or equal to p's value, we move right.",
        "algorithm": "1. Initialize 'successor' to None and 'curr' to root.\n2. While 'curr' is not None:\n   a. If curr.val > p.val: set successor = curr, and move left (curr = curr.left).\n   b. Else: move right (curr = curr.right).\n3. Return 'successor'.",
        "code": "class TreeNode:\n    def __init__(self, x):\n        self.val = x\n        self.left = None\n        self.right = None\n\ndef inorderSuccessor(root: TreeNode, p: TreeNode) -> TreeNode:\n    # Successor candidate initialized to None\n    successor = None\n    # Start traversal at root\n    curr = root\n    # Loop until we hit None\n    while curr:\n        # If current node is greater than target, it's a potential successor\n        if curr.val > p.val:\n            # Record current node as candidate successor\n            successor = curr\n            # Go left to look for smaller successor\n            curr = curr.left\n        # Otherwise, successor must be in right subtree\n        else:\n            curr = curr.right\n    # Return successor\n    return successor",
        "complexity": {
          "time": "O(H) where H is tree height. O(log N) on average, O(N) in worst case.",
          "space": "O(1) auxiliary space as it is iterative."
        }
      }
    ],
    "trace": [
      {
        "line": 7,
        "desc": "Initialize successor to None.",
        "vars": { "successor": null }
      },
      {
        "line": 9,
        "desc": "Set curr to root node (2).",
        "vars": { "curr.val": 2, "p.val": 1 }
      },
      {
        "line": 11,
        "desc": "Loop condition curr is not None (2) is True.",
        "vars": { "curr.val": 2 }
      },
      {
        "line": 13,
        "desc": "Check curr.val (2) > p.val (1). Condition is True.",
        "vars": { "curr.val": 2 }
      },
      {
        "line": 15,
        "desc": "Record node 2 as successor.",
        "vars": { "successor.val": 2 }
      },
      {
        "line": 17,
        "desc": "Move curr to left child (1).",
        "vars": { "curr.val": 1 }
      },
      {
        "line": 11,
        "desc": "Loop condition curr is not None (1) is True.",
        "vars": { "curr.val": 1 }
      },
      {
        "line": 13,
        "desc": "Check curr.val (1) > p.val (1). Condition is False.",
        "vars": { "curr.val": 1 }
      },
      {
        "line": 20,
        "desc": "Move curr to right child (None).",
        "vars": { "curr.val": null }
      },
      {
        "line": 11,
        "desc": "Loop condition curr is None. Exits loop.",
        "vars": { "curr": null }
      },
      {
        "line": 22,
        "desc": "Returns successor node (2).",
        "vars": { "successor.val": 2 }
      }
    ]
  },
  "BST Iterator": {
    "title": "BST Iterator",
    "problemStatement": "Implement the BSTIterator class that represents an iterator over the in-order traversal of a binary search tree (BST). next() returns the next smallest number and hasNext() returns whether a next element exists.",
    "examples": [
      {
        "input": "[\"BSTIterator\", \"next\", \"next\", \"hasNext\", \"next\", \"hasNext\", \"next\", \"hasNext\", \"next\", \"hasNext\"]\n[[[7, 3, 15, null, null, 9, 20]], [], [], [], [], [], [], [], [], []]",
        "output": "[null, 3, 7, true, 9, true, 15, true, 20, false]",
        "explanation": "Initializes BSTIterator. next() retrieves 3, then 7. hasNext() is true. next() retrieves 9..."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [1, 10^5].",
      "0 <= Node.val <= 10^6",
      "At most 10^5 calls will be made to next and hasNext."
    ],
    "edgeCases": [
      "Completely left skewed tree (looks like a reverse linked list).",
      "Completely right skewed tree.",
      "Single node tree."
    ],
    "followUps": [
      "Could you implement next() and hasNext() to run in average O(1) time and use O(H) memory? (Yes, the optimal approach does this.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Flatten the entire tree in sorted order into an array during initialization using inorder traversal. The next() and hasNext() operations then just query the array using a pointer index.",
        "algorithm": "1. In constructor, initialize an empty list 'nodes' and an index pointer 'curr_idx' to 0.\n2. Execute recursive inorder traversal to fill 'nodes'.\n3. next(): Return nodes[curr_idx] and increment curr_idx.\n4. hasNext(): Return True if curr_idx < len(nodes); else False.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass BSTIterator:\n    def __init__(self, root: TreeNode):\n        # Array to hold the flattened tree values\n        self.values = []\n        # Pointer to trace current position\n        self.index = 0\n        # Populate array with inorder traversal\n        self._inorder(root)\n        \n    def _inorder(self, node):\n        # Helper to perform standard inorder traversal\n        if not node:\n            return\n        self._inorder(node.left)\n        self.values.append(node.val)\n        self._inorder(node.right)\n        \n    def next(self) -> int:\n        # Retrieve current element and advance pointer\n        val = self.values[self.index]\n        self.index += 1\n        return val\n        \n    def hasNext(self) -> bool:\n        # True if pointer has not reached end of array\n        return self.index < len(self.values)",
        "complexity": {
          "time": "Constructor: O(N) to traverse tree. next() and hasNext(): O(1).",
          "space": "O(N) to store the flattened tree elements."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Simulate the recursive inorder traversal iteratively using an explicit stack. We only store the left boundary of nodes. When next() is called, we pop the top element, push all the left children of its right child, and return its value. This yields O(H) space and average O(1) time.",
        "algorithm": "1. Initialize an empty stack 'stack'.\n2. Define helper '_push_left(node)': while node is not None, push it to stack and move to node.left.\n3. In constructor, call '_push_left(root)'.\n4. next(): Pop node from stack. If it has right child, call '_push_left(node.right)'. Return node.val.\n5. hasNext(): Return len(stack) > 0.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\nclass BSTIterator:\n    def __init__(self, root: TreeNode):\n        # Stack to store nodes for traversal\n        self.stack = []\n        # Initialize stack with left boundary nodes\n        self._push_left(root)\n        \n    def _push_left(self, node: TreeNode):\n        # Push node and all its left children to stack\n        while node:\n            self.stack.append(node)\n            node = node.left\n            \n    def next(self) -> int:\n        # Pop node at top of stack (current smallest)\n        node = self.stack.pop()\n        # If popped node has a right child, process its left boundary\n        if node.right:\n            self._push_left(node.right)\n        # Return node's value\n        return node.val\n        \n    def hasNext(self) -> bool:\n        # Return true if there are nodes left in stack\n        return len(self.stack) > 0",
        "complexity": {
          "time": "Constructor: O(H). next(): O(1) amortized, because each node is pushed and popped at most once. hasNext(): O(1).",
          "space": "O(H) where H is the height of the BST."
        }
      }
    ],
    "trace": [
      {
        "line": 8,
        "desc": "Constructor: stack is initialized to empty.",
        "vars": { "stack": [] }
      },
      {
        "line": 10,
        "desc": "Constructor: calls _push_left(root=7).",
        "vars": { "stack": [] }
      },
      {
        "line": 14,
        "desc": "_push_left: Node 7 is not None. Pushes 7 to stack.",
        "vars": { "stack": [7] }
      },
      {
        "line": 15,
        "desc": "_push_left: Moves node to left child (3).",
        "vars": { "stack": [7], "node.val": 3 }
      },
      {
        "line": 14,
        "desc": "_push_left: Node 3 is not None. Pushes 3 to stack.",
        "vars": { "stack": [7, 3] }
      },
      {
        "line": 15,
        "desc": "_push_left: Moves node to left child (None).",
        "vars": { "stack": [7, 3], "node": null }
      },
      {
        "line": 18,
        "desc": "Calls next(). Pops node 3 from stack.",
        "vars": { "stack": [7], "node.val": 3 }
      },
      {
        "line": 20,
        "desc": "Checks if node 3 has right child. None.",
        "vars": { "stack": [7] }
      },
      {
        "line": 22,
        "desc": "Returns 3.",
        "vars": { "stack": [7], "return_val": 3 }
      }
    ]
  },
  "Two Sum in BST": {
    "title": "Two Sum in BST",
    "problemStatement": "Given the root of a binary search tree and a target number k, return true if there exist two elements in the BST such that their sum is equal to the given target.",
    "examples": [
      {
        "input": "root = [5,3,6,2,4,null,7], k = 9",
        "output": "true",
        "explanation": "Nodes 2 and 7 sum up to 9 (2 + 7 = 9)."
      },
      {
        "input": "root = [5,3,6,2,4,null,7], k = 28",
        "output": "false",
        "explanation": "No two nodes sum up to 28."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [1, 10^4].",
      "-10^4 <= Node.val <= 10^4",
      "-10^5 <= k <= 10^5"
    ],
    "edgeCases": [
      "No two nodes sum to k.",
      "The only two values that sum to k are the same node's value (must be two distinct nodes).",
      "Tree has only one node."
    ],
    "followUps": [
      "Can you solve this in O(H) space where H is the height of the tree? (Yes, the optimal approach does this.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "We can flatten the BST into a sorted list using an inorder traversal, then apply the standard two-pointer search on this sorted list to find a pair that sums to k.",
        "algorithm": "1. Initialize an empty list 'nums'.\n2. Perform recursive inorder traversal to fill 'nums' with sorted BST values.\n3. Set two pointers: 'left = 0' and 'right = len(nums) - 1'.\n4. Loop while left < right:\n   a. Compute 'curr_sum = nums[left] + nums[right]'.\n   b. If curr_sum == k, return True.\n   c. If curr_sum < k, increment left.\n   d. Else, decrement right.\n5. If loop terminates without match, return False.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef findTarget(root: TreeNode, k: int) -> bool:\n    # List to hold the elements of the tree\n    nums = []\n    \n    # Standard recursive inorder traversal\n    def inorder(node):\n        if not node:\n            return\n        inorder(node.left)\n        nums.append(node.val)\n        inorder(node.right)\n        \n    inorder(root)\n    # Two pointers initialization\n    left, right = 0, len(nums) - 1\n    # Pointer search loop\n    while left < right:\n        curr_sum = nums[left] + nums[right]\n        if curr_sum == k:\n            return True\n        elif curr_sum < k:\n            left += 1\n        else:\n            right -= 1\n    # No two sum pair found\n    return False",
        "complexity": {
          "time": "O(N) where N is number of nodes in the tree.",
          "space": "O(N) to store tree elements in the list."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Instead of flattening the entire tree into memory, we can simulate two pointers dynamically using two custom BSTIterators: one doing normal inorder traversal (left pointer) and the other doing reverse inorder traversal (right pointer). This uses only O(H) space.",
        "algorithm": "1. Define 'BSTIterator' class that takes a 'reverse' flag.\n   - If reverse is False, it traverses left-to-right (inorder).\n   - If reverse is True, it traverses right-to-left (reverse inorder).\n2. Create 'left_iter' and 'right_iter'.\n3. Set 'l_val = left_iter.next_val()' and 'r_val = right_iter.next_val()'.\n4. While l_val < r_val:\n   - Check if l_val + r_val == k: return True.\n   - If less than k: l_val = left_iter.next_val().\n   - Else: r_val = right_iter.next_val().\n5. Return False.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\class BSTIterator:\n    def __init__(self, root: TreeNode, is_reverse: bool):\n        # Stack to keep traversal nodes\n        self.stack = []\n        # Flag indicating normal or reverse inorder traversal\n        self.is_reverse = is_reverse\n        # Push initial path to stack\n        self._push(root)\n        \n    def _push(self, node: TreeNode):\n        # Move node along left or right path\n        while node:\n            self.stack.append(node)\n            node = node.right if self.is_reverse else node.left\n            \n    def next_val(self) -> int:\n        # Pop next node\n        node = self.stack.pop()\n        # Push next sub-tree boundary\n        if self.is_reverse:\n            self._push(node.left)\n        else:\n            self._push(node.right)\n        # Return the node's value\n        return node.val\n\ndef findTarget(root: TreeNode, k: int) -> bool:\n    if not root:\n        return False\n    # Initialize left iterator for normal inorder\n    left_iter = BSTIterator(root, False)\n    # Initialize right iterator for reverse inorder\n    right_iter = BSTIterator(root, True)\n    # Get starting values from both iterators\n    l_val = left_iter.next_val()\n    r_val = right_iter.next_val()\n    # Loop until pointers cross\n    while l_val < r_val:\n        # Compute sum of current values\n        curr_sum = l_val + r_val\n        # Check if we found target sum\n        if curr_sum == k:\n            return True\n        # If sum is smaller, advance left iterator\n        elif curr_sum < k:\n            l_val = left_iter.next_val()\n        # If sum is larger, advance right iterator\n        else:\n            r_val = right_iter.next_val()\n    # Target sum not found\n    return False",
        "complexity": {
          "time": "O(N) in the worst case as we might visit all nodes.",
          "space": "O(H) auxiliary space to maintain stack sizes where H is the height of tree."
        }
      }
    ],
    "trace": [
      {
        "line": 34,
        "desc": "Initialize left_iter (normal inorder). Stack has root and its left children.",
        "vars": { "k": 4 }
      },
      {
        "line": 36,
        "desc": "Initialize right_iter (reverse inorder). Stack has root and its right children.",
        "vars": { "k": 4 }
      },
      {
        "line": 38,
        "desc": "l_val gets first value (1) from left_iter.",
        "vars": { "l_val": 1 }
      },
      {
        "line": 40,
        "desc": "r_val gets first value (3) from right_iter.",
        "vars": { "r_val": 3 }
      },
      {
        "line": 42,
        "desc": "Check l_val (1) < r_val (3). Condition is True.",
        "vars": { "l_val": 1, "r_val": 3 }
      },
      {
        "line": 44,
        "desc": "curr_sum = 1 + 3 = 4.",
        "vars": { "curr_sum": 4 }
      },
      {
        "line": 46,
        "desc": "Checks if curr_sum (4) == k (4). Condition is True.",
        "vars": { "curr_sum": 4 }
      },
      {
        "line": 47,
        "desc": "Returns True as target sum is found.",
        "vars": { "return_val": true }
      }
    ]
  },
  "Recover BST": {
    "title": "Recover BST",
    "problemStatement": "You are given the root of a binary search tree (BST), where the values of exactly two nodes were swapped by mistake. Recover the tree without changing its structure.",
    "examples": [
      {
        "input": "root = [1,3,null,null,2]",
        "output": "[3,1,null,null,2]",
        "explanation": "Nodes 1 and 3 were swapped. Swapping them back yields the correct BST."
      },
      {
        "input": "root = [3,1,4,null,null,2]",
        "output": "[2,1,4,null,null,3]",
        "explanation": "Nodes 3 and 2 were swapped. Swapping them back yields the correct BST."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [2, 1000].",
      "-2^31 <= Node.val <= 2^31 - 1"
    ],
    "edgeCases": [
      "Swapped nodes are adjacent in the inorder traversal sequence.",
      "Swapped nodes are non-adjacent in the inorder traversal sequence.",
      "One of the swapped nodes is the root node."
    ],
    "followUps": [
      "Can you solve it in O(1) space? (Yes, by using Morris Inorder Traversal, but the recursive O(H) space approach is standard and highly practical in interviews.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Traverse the BST using inorder, extract node values, sort them, and then reassign the sorted values to the nodes. This corrects the BST but takes O(N) auxiliary space.",
        "algorithm": "1. Perform a recursive inorder traversal, storing the node objects in a list 'nodes'.\n2. Extract the values, sort them.\n3. Loop through the list of nodes, and set node.val = sorted_vals[i].",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef recoverTree(root: TreeNode) -> None:\n    # List to hold node objects\n    nodes = []\n    \n    # Inorder helper to populate list\n    def inorder(node):\n        if not node:\n            return\n        inorder(node.left)\n        nodes.append(node)\n        inorder(node.right)\n        \n    inorder(root)\n    # Extract values and sort them\n    vals = sorted([node.val for node in nodes])\n    # Reassign sorted values to correct nodes\n    for i in range(len(nodes)):\n        nodes[i].val = vals[i]",
        "complexity": {
          "time": "O(N log N) to extract, sort, and reassign values.",
          "space": "O(N) to store node pointers and values in array."
        }
      },
      {
        "name": "Optimal",
        "intuition": "During inorder traversal of a BST, the values must be sorted. If a node is smaller than its predecessor, a violation occurs. If the swapped nodes are adjacent, only 1 violation is found. If they are non-adjacent, 2 violations are found. We track first, middle, last, and prev to swap first and last (or first and middle).",
        "algorithm": "1. Define pointers 'first', 'middle', 'last', and 'prev' as None.\n2. In recursive inorder traversal:\n   a. Traverse left child.\n   b. Check if prev is not None and prev.val > node.val. If so, a violation occurred.\n      - If 'first' is None, it is the first violation: set first = prev, middle = node.\n      - Else, it's the second violation: set last = node.\n   c. Update prev = node.\n   d. Traverse right child.\n3. If 'first' and 'last' are set, swap their values; else swap 'first' and 'middle'.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef recoverTree(root: TreeNode) -> None:\n    # Initialize pointers for tracking swapped nodes\n    first = middle = last = prev = None\n    \n    # Inorder traversal helper\n    def inorder(node):\n        nonlocal first, middle, last, prev\n        if not node:\n            return\n        # Left subtree traversal\n        inorder(node.left)\n        # Check for inorder violation\n        if prev and prev.val > node.val:\n            # If this is the first violation encountered\n            if not first:\n                first = prev\n                middle = node\n            # If this is the second violation encountered\n            else:\n                last = node\n        # Update prev pointer to current\n        prev = node\n        # Right subtree traversal\n        inorder(node.right)\n        \n    # Run traversal\n    inorder(root)\n    # Swap the values of the detected incorrect nodes\n    if first and last:\n        first.val, last.val = last.val, first.val\n    elif first and middle:\n        first.val, middle.val = middle.val, first.val",
        "complexity": {
          "time": "O(N) since we visit each node exactly once.",
          "space": "O(H) recursion stack space where H is the height of the tree."
        }
      }
    ],
    "trace": [
      {
        "line": 7,
        "desc": "Initialize first, middle, last, prev to None.",
        "vars": { "first": null, "middle": null, "last": null, "prev": null }
      },
      {
        "line": 28,
        "desc": "Calls inorder(root) with root val = 3.",
        "vars": { "node.val": 3 }
      },
      {
        "line": 15,
        "desc": "Recurses to left child (node 1).",
        "vars": { "node.val": 1 }
      },
      {
        "line": 17,
        "desc": "Condition prev and prev.val > node.val is False (prev is None).",
        "vars": { "prev": null }
      },
      {
        "line": 25,
        "desc": "Update prev to node 1.",
        "vars": { "prev.val": 1 }
      },
      {
        "line": 17,
        "desc": "Back at node 3. Check if prev (1) > curr (3). False.",
        "vars": { "prev.val": 1, "node.val": 3 }
      },
      {
        "line": 25,
        "desc": "Update prev to node 3.",
        "vars": { "prev.val": 3 }
      },
      {
        "line": 27,
        "desc": "Recurses to right child (node 4).",
        "vars": { "node.val": 4 }
      },
      {
        "line": 15,
        "desc": "Recurses to left child of 4 (node 2).",
        "vars": { "node.val": 2 }
      },
      {
        "line": 17,
        "desc": "Check if prev (3) > curr (2). True (Violation!).",
        "vars": { "prev.val": 3, "node.val": 2 }
      },
      {
        "line": 19,
        "desc": "first is None, so set first = node 3 and middle = node 2.",
        "vars": { "first.val": 3, "middle.val": 2 }
      },
      {
        "line": 31,
        "desc": "After traversal completes, swaps first.val and middle.val (3 and 2).",
        "vars": { "first.val": 2, "middle.val": 3 }
      }
    ]
  },
  "Largest BST in Binary Tree": {
    "title": "Largest BST in Binary Tree",
    "problemStatement": "Given a binary tree, find the size of the largest subtree which is a Binary Search Tree (BST). A subtree of a binary tree is a tree consisting of a node and all of its descendants.",
    "examples": [
      {
        "input": "root = [10,5,15,1,8,null,7]",
        "output": "3",
        "explanation": "The largest BST subtree is [5,1,8] (size 3)."
      },
      {
        "input": "root = [4,2,7,2,3,5,null,2,null,null,null,null,null,1]",
        "output": "2"
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 1000].",
      "-10^4 <= Node.val <= 10^4"
    ],
    "edgeCases": [
      "The entire tree is already a valid BST.",
      "The tree is empty (returns 0).",
      "No subtrees of size > 1 are valid BSTs (returns 1 for any single node)."
    ],
    "followUps": [
      "Can you solve this in O(N) time complexity? (Yes, the optimal approach does this.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "For each node in the binary tree, verify if the subtree rooted at that node is a valid BST. If it is, count its size and update the maximum size recorded.",
        "algorithm": "1. Write a helper 'is_bst(node, min, max)' to check if a subtree is a BST.\n2. Write a helper 'get_size(node)' to count the nodes in a subtree.\n3. Traverse the tree. For each node, if 'is_bst(node)' is True, record 'get_size(node)'.\n4. Return the maximum size found.",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef largestBSTSubtree(root: TreeNode) -> int:\n    # Verification helper for BST property\n    def is_bst(node, min_val, max_val):\n        if not node:\n            return True\n        if not (min_val < node.val < max_val):\n            return False\n        return is_bst(node.left, min_val, node.val) and \\\n               is_bst(node.right, node.val, max_val)\n               \n    # Helper to count size of a subtree\n    def get_size(node):\n        if not node:\n            return 0\n        return 1 + get_size(node.left) + get_size(node.right)\n        \n    # If tree is empty\n    if not root:\n        return 0\n    # If current subtree is a valid BST\n    if is_bst(root, float('-inf'), float('inf')):\n        return get_size(root)\n    # Otherwise search in left and right subtrees\n    return max(largestBSTSubtree(root.left), largestBSTSubtree(root.right))",
        "complexity": {
          "time": "O(N^2) in worst case (skewed tree where we check isBST for every node).",
          "space": "O(H) recursion stack where H is the height of tree."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Use bottom-up postorder traversal. For each node, collect: (is_bst, size, min_val, max_val). A node forms a BST if both left and right subtrees are BSTs, and node.val is strictly greater than the maximum value in left subtree and strictly less than the minimum value in right subtree.",
        "algorithm": "1. Define recursive function 'postorder(node)' returning (is_bst, size, min_val, max_val).\n2. Base case: empty node returns (True, 0, inf, -inf).\n3. Get properties from left and right children.\n4. If left_bst, right_bst, and left_max < node.val < right_min:\n   - form new BST size = left_size + right_size + 1.\n   - update global max_size.\n   - return (True, size, min(left_min, node.val), max(right_max, node.val)).\n5. Else return (False, 0, -inf, inf).",
        "code": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef largestBSTSubtree(root: TreeNode) -> int:\n    # Global tracker for maximum BST size\n    max_size = 0\n    \n    # Postorder traversal helper returning (is_bst, size, min_val, max_val)\n    def postorder(node):\n        nonlocal max_size\n        # An empty tree is a valid BST of size 0\n        if not node:\n            return True, 0, float('inf'), float('-inf')\n        \n        # Recursively process left and right subtrees\n        left_bst, left_size, left_min, left_max = postorder(node.left)\n        right_bst, right_size, right_min, right_max = postorder(node.right)\n        \n        # Validate if the current node forms a BST\n        if left_bst and right_bst and left_max < node.val < right_min:\n            # Compute current BST size\n            curr_size = left_size + right_size + 1\n            # Update the global maximum BST size\n            max_size = max(max_size, curr_size)\n            # Return BST details\n            return True, curr_size, min(left_min, node.val), max(right_max, node.val)\n            \n        # If not a BST, return failure status\n        return False, 0, float('-inf'), float('inf')\n        \n    # Initiate the traversal\n    postorder(root)\n    # Return the largest BST size recorded\n    return max_size",
        "complexity": {
          "time": "O(N) since we visit every node exactly once bottom-up.",
          "space": "O(H) recursion stack space."
        }
      }
    ],
    "trace": [
      {
        "line": 7,
        "desc": "Initialize max_size to 0.",
        "vars": { "max_size": 0 }
      },
      {
        "line": 31,
        "desc": "Calls postorder on root node (10).",
        "vars": { "node.val": 10 }
      },
      {
        "line": 17,
        "desc": "Recurses to left child (node 5).",
        "vars": { "node.val": 5 }
      },
      {
        "line": 17,
        "desc": "Recurses to left child of 5 (None). Returns (True, 0, inf, -inf).",
        "vars": { "node": null }
      },
      {
        "line": 18,
        "desc": "Recurses to right child of 5 (None). Returns (True, 0, inf, -inf).",
        "vars": { "node": null }
      },
      {
        "line": 21,
        "desc": "Checks if node 5 forms a BST: True and True and -inf < 5 < inf. True.",
        "vars": { "left_bst": true, "right_bst": true, "node.val": 5 }
      },
      {
        "line": 23,
        "desc": "curr_size of BST at 5 is 1.",
        "vars": { "curr_size": 1 }
      },
      {
        "line": 25,
        "desc": "Updates max_size to 1.",
        "vars": { "max_size": 1 }
      },
      {
        "line": 27,
        "desc": "Returns (True, 1, 5, 5) to parent node 10.",
        "vars": { "max_size": 1 }
      }
    ]
  },
  "DFS Traversal": {
    "title": "DFS Traversal",
    "problemStatement": "Given a connected undirected graph represented as an adjacency list, return a list containing the DFS traversal of the graph starting from vertex 0.",
    "examples": [
      {
        "input": "V = 5, adj = [[1, 2, 4], [0], [0, 3], [2], [0]]",
        "output": "[0, 1, 2, 3, 4]",
        "explanation": "Starting from 0, DFS visits 1 (since adj[0] starts with 1), backtracks, visits 2, then visits 3, backtracks, and visits 4."
      },
      {
        "input": "V = 4, adj = [[1, 3], [2, 0], [1], [0]]",
        "output": "[0, 1, 2, 3]"
      }
    ],
    "constraints": [
      "1 <= V <= 10^4",
      "0 <= E <= 10^4"
    ],
    "edgeCases": [
      "Graph has cyclic connections (handled by visited set).",
      "Graph is a tree structure.",
      "Graph is a simple linear path."
    ],
    "followUps": [
      "Can you write the DFS traversal iteratively using an explicit stack? (Yes, by using a stack instead of recursion.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "We perform recursion to visit vertices. Without a hash set for tracking visited status, a brute force check searches the output list directly to see if a node was visited, causing O(V) scan time per step.",
        "algorithm": "1. Initialize an empty list 'result'.\n2. Define helper 'dfs(node)':\n   - Append node to 'result'.\n   - For neighbor in adj[node]: check if neighbor is not in result (O(V) check). If not, recurse dfs(neighbor).\n3. Invoke 'dfs(0)'.\n4. Return 'result'.",
        "code": "def dfsOfGraph(V: int, adj: list[list[int]]) -> list[int]:\n    # Result list to store traversed nodes\n    result = []\n    \n    # Recursive DFS helper\n    def dfs(node):\n        # Add node to result list\n        result.append(node)\n        # Check each neighbor\n        for neighbor in adj[node]:\n            # If neighbor is not already in result list (expensive O(N) check)\n            if neighbor not in result:\n                dfs(neighbor)\n                \n    # Start DFS from node 0\n    dfs(0)\n    return result",
        "complexity": {
          "time": "O(V * (V + E)) because checking membership in the result list takes O(V) time.",
          "space": "O(V) for result list and recursion stack."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Use a hash set to track visited nodes. This allows for O(1) membership checks, keeping the runtime linear with the number of vertices and edges.",
        "algorithm": "1. Initialize 'result' list and 'visited' set.\n2. Define helper 'dfs(node)':\n   - Add node to 'visited' and append to 'result'.\n   - For neighbor in adj[node]: if neighbor not in visited, recurse 'dfs(neighbor)'.\n3. Invoke 'dfs(0)'.\n4. Return 'result'.",
        "code": "def dfsOfGraph(V: int, adj: list[list[int]]) -> list[int]:\n    # List to hold the DFS traversal sequence\n    result = []\n    # Set to keep track of visited vertices in O(1) time\n    visited = set()\n    \n    # DFS recursive function\n    def dfs(node):\n        # Mark the current node as visited\n        visited.add(node)\n        # Add current node to traversal path\n        result.append(node)\n        # Visit all adjacent neighbors of the current node\n        for neighbor in adj[node]:\n            # If neighbor has not been visited yet\n            if neighbor not in visited:\n                # Recurse on neighbor\n                dfs(neighbor)\n                \n    # Start DFS traversal from node 0\n    dfs(0)\n    # Return the final sequence\n    return result",
        "complexity": {
          "time": "O(V + E) where V is the number of vertices and E is the number of edges.",
          "space": "O(V) for the visited set and the recursion stack."
        }
      }
    ],
    "trace": [
      {
        "line": 20,
        "desc": "Starts DFS by invoking dfs(0).",
        "vars": { "result": [], "visited": [] }
      },
      {
        "line": 9,
        "desc": "dfs(0): adds 0 to visited set.",
        "vars": { "visited": [0] }
      },
      {
        "line": 11,
        "desc": "dfs(0): appends 0 to result list.",
        "vars": { "result": [0] }
      },
      {
        "line": 13,
        "desc": "dfs(0): loops neighbor list [1, 2]. neighbor = 1.",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 15,
        "desc": "Checks if 1 is visited. False. Recurses dfs(1).",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 9,
        "desc": "dfs(1): adds 1 to visited.",
        "vars": { "visited": [0, 1] }
      },
      {
        "line": 11,
        "desc": "dfs(1): appends 1 to result.",
        "vars": { "result": [0, 1] }
      }
    ]
  },
  "Number of Provinces": {
    "title": "Number of Provinces",
    "problemStatement": "There are n cities. Some of them are connected, while some are not. If city a is connected directly with city b, and city b is connected directly with city c, then city a is connected indirectly with city c. A province is a group of directly or indirectly connected cities. Return the total number of provinces.",
    "examples": [
      {
        "input": "isConnected = [[1,1,0],[1,1,0],[0,0,1]]",
        "output": "2",
        "explanation": "City 0 and 1 are connected, forming province 1. City 2 is separate, forming province 2."
      },
      {
        "input": "isConnected = [[1,0,0],[0,1,0],[0,0,1]]",
        "output": "3"
      }
    ],
    "constraints": [
      "1 <= n <= 200",
      "n == isConnected.length == isConnected[i].length",
      "isConnected[i][j] is 1 or 0.",
      "isConnected[i][i] == 1",
      "isConnected[i][j] == isConnected[j][i]"
    ],
    "edgeCases": [
      "All cities are disconnected (n provinces).",
      "All cities are connected in a single component (1 province)."
    ],
    "followUps": [
      "Can you solve this using Union-Find? (Yes, by unioning connected vertices and finding number of unique root parents.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Use a simple list to track visited cities and perform DFS traversal, doing slow linear list scans to check if neighbors are already visited.",
        "algorithm": "1. Initialize empty visited list 'visited' and provinces count to 0.\n2. For each city i from 0 to n-1, if i not in 'visited':\n   - Increment provinces.\n   - Run DFS from i.\n3. In DFS, iterate through all cities, if connected and neighbor not in visited, append and recurse.",
        "code": "def findCircleNum(isConnected: list[list[int]]) -> int:\n    n = len(isConnected)\n    provinces = 0\n    visited = []\n    \n    # Recursive traversal that checks lists rather than set\n    def dfs(node):\n        for neighbor in range(n):\n            if isConnected[node][neighbor] == 1 and neighbor not in visited:\n                visited.append(neighbor)\n                dfs(neighbor)\n                \n    for i in range(n):\n        if i not in visited:\n            provinces += 1\n            visited.append(i)\n            dfs(i)\n    return provinces",
        "complexity": {
          "time": "O(N^3) because check 'neighbor not in visited' takes O(N) in worst case.",
          "space": "O(N) for recursion stack and visited list."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Treat the cities as a graph where provinces are connected components. Use a hash set for O(1) visited lookups. Loop through all vertices; if a vertex is unvisited, it belongs to a new province. Run DFS to mark all nodes in its component as visited.",
        "algorithm": "1. Maintain 'visited' set and 'provinces' count.\n2. Iterate through i from 0 to n-1.\n3. If i not in visited:\n   - provinces += 1\n   - visited.add(i)\n   - dfs(i)\n4. In dfs(city), loop through all possible neighbors. If connected and unvisited, add to visited and recurse.",
        "code": "def findCircleNum(isConnected: list[list[int]]) -> int:\n    # Number of cities\n    n = len(isConnected)\n    # Set to keep track of visited cities\n    visited = set()\n    # Counter for provinces (connected components)\n    provinces = 0\n    \n    # DFS function to visit all cities in a province\n    def dfs(city):\n        # Check connection with every other city\n        for neighbor in range(n):\n            # If there is a connection and neighbor has not been visited\n            if isConnected[city][neighbor] == 1 and neighbor not in visited:\n                # Mark neighbor as visited\n                visited.add(neighbor)\n                # Recurse for the neighbor\n                dfs(neighbor)\n                \n    # Iterate through each city\n    for i in range(n):\n        # If city is not yet visited, it's a new province\n        if i not in visited:\n            provinces += 1\n            # Mark current city as visited\n            visited.add(i)\n            # Traverse all connected cities\n            dfs(i)\n            \n    # Return total number of provinces\n    return provinces",
        "complexity": {
          "time": "O(N^2) since we traverse the entire isConnected matrix of size N x N.",
          "space": "O(N) for visited set and recursion stack."
        }
      }
    ],
    "trace": [
      {
        "line": 20,
        "desc": "Initialize n = 3, visited = set(), provinces = 0.",
        "vars": { "n": 3, "provinces": 0 }
      },
      {
        "line": 21,
        "desc": "Start outer loop. i = 0.",
        "vars": { "i": 0 }
      },
      {
        "line": 22,
        "desc": "i = 0 not in visited. provinces becomes 1.",
        "vars": { "provinces": 1, "i": 0 }
      },
      {
        "line": 24,
        "desc": "Mark 0 as visited.",
        "vars": { "visited": [0] }
      },
      {
        "line": 26,
        "desc": "Call dfs(0) to find connected nodes.",
        "vars": { "city": 0 }
      },
      {
        "line": 10,
        "desc": "dfs(0): Loops neighbor from 0 to 2. neighbor = 0.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 12,
        "desc": "neighbor 0 is already in visited. Skip.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 10,
        "desc": "neighbor = 1. isConnected[0][1] is 1, 1 not in visited. True.",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 14,
        "desc": "Mark 1 as visited.",
        "vars": { "visited": [0, 1] }
      },
      {
        "line": 16,
        "desc": "Call dfs(1).",
        "vars": { "city": 1 }
      }
    ]
  },
  "Number of Islands": {
    "title": "Number of Islands",
    "problemStatement": "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    "examples": [
      {
        "input": "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]",
        "output": "1",
        "explanation": "All land cells are connected to form one single island."
      },
      {
        "input": "grid = [[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]",
        "output": "3"
      }
    ],
    "constraints": [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300",
      "grid[i][j] is '0' or '1'."
    ],
    "edgeCases": [
      "Grid is entirely water (0 islands).",
      "Grid is entirely land (1 island).",
      "Diagonal lands (should not be connected)."
    ],
    "followUps": [
      "Can you solve this with BFS? How does the memory usage compare? (Yes, BFS has O(min(M,N)) memory queue size whereas DFS has O(M*N) call stack size.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Traverse the grid. For each '1', search for connected lands and store visited coordinates in a list, performing linear list lookups to avoid cycles.",
        "algorithm": "1. Initialize visited list and islands count.\n2. Iterate through each cell (r, c) in grid.\n3. If cell is '1' and not in visited list:\n   - Increment islands count.\n   - Run DFS from (r, c).\n4. In DFS, check bounds and if cell is '1' and not in visited, add to visited and recurse on 4 directions.",
        "code": "def numIslands(grid: list[list[str]]) -> int:\n    if not grid:\n        return 0\n    rows, cols = len(grid), len(grid[0])\n    visited = []\n    islands = 0\n    \n    def dfs(r, c):\n        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0' or (r, c) in visited:\n            return\n        visited.append((r, c))\n        dfs(r + 1, c)\n        dfs(r - 1, c)\n        dfs(r, c + 1)\n        dfs(r, c - 1)\n        \n    for r in range(rows):\n        for c in range(cols):\n            if grid[r][c] == '1' and (r, c) not in visited:\n                islands += 1\n                dfs(r, c)\n    return islands",
        "complexity": {
          "time": "O((M * N)^2) due to searching in the visited list for every single cell.",
          "space": "O(M * N) to store the visited coordinates."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Optimize space and lookup time by sinking the island: once we visit a land cell ('1'), we turn it into water ('0') in place. This avoids the need for an auxiliary visited set and gives O(1) checks.",
        "algorithm": "1. Traverse each cell (r, c) in the grid.\n2. If grid[r][c] == '1', increment islands count and invoke dfs(r, c).\n3. In dfs(r, c):\n   - If out of bounds or cell is '0', return.\n   - Change cell to '0'.\n   - Recurse in 4 directions: down, up, right, left.",
        "code": "def numIslands(grid: list[list[str]]) -> int:\n    # Check if grid is empty\n    if not grid or not grid[0]:\n        return 0\n    # Dimensions of the grid\n    rows, cols = len(grid), len(grid[0])\n    # Island counter\n    islands = 0\n    \n    # DFS helper to sink connected lands\n    def dfs(r, c):\n        # Check boundary conditions and if the cell is water\n        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':\n            return\n        # Mark current cell as visited by changing '1' to '0'\n        grid[r][c] = '0'\n        # Recurse in all 4 directions\n        dfs(r + 1, c)\n        dfs(r - 1, c)\n        dfs(r, c + 1)\n        dfs(r, c - 1)\n        \n    # Traverse the entire grid\n    for r in range(rows):\n        for c in range(cols):\n            # If we find a land cell\n            if grid[r][c] == '1':\n                # Increment island count\n                islands += 1\n                # Sink all connected land cells\n                dfs(r, c)\n                \n    # Return total count of islands\n    return islands",
        "complexity": {
          "time": "O(M * N) where M is row count and N is col count, as each cell is visited at most a constant number of times.",
          "space": "O(M * N) recursion stack space in the worst case (if the entire grid is land)."
        }
      }
    ],
    "trace": [
      {
        "line": 4,
        "desc": "Check grid. Grid has 2 rows and 2 cols.",
        "vars": { "rows": 2, "cols": 2, "islands": 0 }
      },
      {
        "line": 26,
        "desc": "Scan grid: r = 0, c = 0. grid[0][0] is '1'.",
        "vars": { "r": 0, "c": 0 }
      },
      {
        "line": 28,
        "desc": "Island found! Increment islands count.",
        "vars": { "islands": 1 }
      },
      {
        "line": 30,
        "desc": "Call dfs(0, 0) to sink the island.",
        "vars": { "r": 0, "c": 0 }
      },
      {
        "line": 13,
        "desc": "dfs(0,0): Bounds and water checks are False.",
        "vars": { "r": 0, "c": 0 }
      },
      {
        "line": 16,
        "desc": "Sinks cell (0, 0) by setting it to '0'.",
        "vars": { "r": 0, "c": 0 }
      },
      {
        "line": 18,
        "desc": "dfs(0,0): Calls dfs(1, 0).",
        "vars": { "r": 1, "c": 0 }
      },
      {
        "line": 16,
        "desc": "dfs(1,0): Sinks cell (1, 0) by setting it to '0'.",
        "vars": { "r": 1, "c": 0 }
      }
    ]
  },
  "Flood Fill Algorithm": {
    "title": "Flood Fill Algorithm",
    "problemStatement": "An image is represented by an m x n integer grid image where image[i][j] represents the pixel value of the image. You are also given three integers sr, sc, and color. Perform a flood fill starting from image[sr][sc].",
    "examples": [
      {
        "input": "image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2",
        "output": "[[2,2,2],[2,2,0],[2,0,2]]",
        "explanation": "Starting at (1, 1), all connected pixels of same color (1) are filled with color 2."
      },
      {
        "input": "image = [[0,0,0],[0,0,0]], sr = 0, sc = 0, color = 0",
        "output": "[[0,0,0],[0,0,0]]"
      }
    ],
    "constraints": [
      "m == image.length",
      "n == image[i].length",
      "1 <= m, n <= 50",
      "0 <= image[i][j], color < 2^16",
      "0 <= sr < m",
      "0 <= sc < n"
    ],
    "edgeCases": [
      "The starting pixel already has the target color (must return immediately to prevent infinite recursion loop).",
      "No neighbors match starting pixel's color."
    ],
    "followUps": [
      "Can you write an iterative BFS solution for this problem? (Yes, by using a queue and tracking matching color cells.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Directly run DFS starting from (sr, sc). If we do not check if original_color == color beforehand, the program will fall into infinite recursion stack overflow when starting color is already the target color.",
        "algorithm": "1. Store original_color.\n2. Recurse DFS changing grid cell to color and calling neighbors.\n3. Fail if starting color is target color.",
        "code": "def floodFill(image: list[list[int]], sr: int, sc: int, color: int) -> list[list[int]]:\n    original_color = image[sr][sc]\n    # Without early return, if original_color == color, it loops infinitely\n    \n    def dfs(r, c):\n        image[r][c] = color\n        for nr, nc in [(r+1,c), (r-1,c), (r,c+1), (r,c-1)]:\n            if 0 <= nr < len(image) and 0 <= nc < len(image[0]) and image[nr][nc] == original_color:\n                dfs(nr, nc)\n                \n    dfs(sr, sc)\n    return image",
        "complexity": {
          "time": "O(M * N) if original_color != color; infinite loop otherwise.",
          "space": "O(M * N) stack space."
        }
      },
      {
        "name": "Optimal",
        "intuition": "First check if the original color of the target pixel is already equal to 'color'. If it is, return the image immediately since no work is needed. Otherwise, run DFS to change the color of the current pixel and recurse on matching neighbors.",
        "algorithm": "1. Save 'original_color = image[sr][sc]'.\n2. If original_color == color, return image.\n3. Start dfs(sr, sc):\n   - If r, c is out of bounds or image[r][c] != original_color, return.\n   - Set image[r][c] = color.\n   - Call dfs on 4 directions.\n4. Return image.",
        "code": "def floodFill(image: list[list[int]], sr: int, sc: int, color: int) -> list[list[int]]:\n    # Store original color of the target cell\n    original_color = image[sr][sc]\n    # If target color is same as current color, return image immediately\n    if original_color == color:\n        return image\n    # Get grid bounds\n    rows, cols = len(image), len(image[0])\n    \n    # DFS function to fill pixels\n    def dfs(r, c):\n        # Check boundary conditions and if color matches original color\n        if 0 <= r < rows and 0 <= c < cols and image[r][c] == original_color:\n            # Set cell to new color\n            image[r][c] = color\n            # Recurse in 4 directions\n            dfs(r + 1, c)\n            dfs(r - 1, c)\n            dfs(r, c + 1)\n            dfs(r, c - 1)\n            \n    # Start DFS from starting coordinates\n    dfs(sr, sc)\n    # Return the updated image matrix\n    return image",
        "complexity": {
          "time": "O(M * N) since we visit each pixel at most once.",
          "space": "O(M * N) recursion stack space in the worst case."
        }
      }
    ],
    "trace": [
      {
        "line": 3,
        "desc": "original_color set to image[1][1] = 1.",
        "vars": { "original_color": 1, "sr": 1, "sc": 1, "color": 2 }
      },
      {
        "line": 5,
        "desc": "Check if original_color (1) == color (2). False.",
        "vars": { "color": 2 }
      },
      {
        "line": 7,
        "desc": "image dimensions: rows = 2, cols = 2.",
        "vars": { "rows": 2, "cols": 2 }
      },
      {
        "line": 23,
        "desc": "Call dfs(1, 1).",
        "vars": { "r": 1, "c": 1 }
      },
      {
        "line": 12,
        "desc": "dfs(1,1): Check bounds and color matching original_color. True.",
        "vars": { "r": 1, "c": 1 }
      },
      {
        "line": 14,
        "desc": "Set image[1][1] = 2.",
        "vars": { "image": "modified" }
      },
      {
        "line": 16,
        "desc": "dfs(1,1): Calls dfs(2, 1). Out of bounds, returns.",
        "vars": { "r": 2, "c": 1 }
      }
    ]
  },
  "Detect Cycle in Undirected Graph (BFS)": {
    "title": "Detect Cycle in Undirected Graph (BFS)",
    "problemStatement": "Given an undirected graph with V vertices and an adjacency list adj, detect if there is a cycle in the graph using BFS. The graph may contain disconnected components.",
    "examples": [
      {
        "input": "V = 5, adj = [[1], [0, 2, 4], [1, 3], [2], [1]]",
        "output": "false",
        "explanation": "No cycle exists in the tree graph."
      },
      {
        "input": "V = 4, adj = [[1, 2], [0, 2], [0, 1, 3], [2]]",
        "output": "true",
        "explanation": "0 - 1 - 2 - 0 forms a cycle."
      }
    ],
    "constraints": [
      "1 <= V <= 10^5",
      "0 <= E <= 10^5"
    ],
    "edgeCases": [
      "Graph has multiple disconnected components.",
      "Graph contains self loops or multi-edges.",
      "Graph is a single tree line path (acyclic)."
    ],
    "followUps": [
      "How would you solve this using Union-Find? (Iterate through all edges. If both vertices already share the same representative parent, a cycle is detected.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Execute standard BFS. Without tracking the parent vertex that led us to the current node, we will mistake the immediate back-edge to our parent as a cycle.",
        "algorithm": "1. Run BFS from all unvisited nodes.\n2. If any adjacent node is already visited, report cycle (fails because it flags parent connections).",
        "code": "from collections import deque\n\ndef isCycleBFS(V: int, adj: list[list[int]]) -> bool:\n    visited = set()\n    for start in range(V):\n        if start not in visited:\n            queue = deque([start])\n            visited.add(start)\n            while queue:\n                node = queue.popleft()\n                for neighbor in adj[node]:\n                    if neighbor in visited:\n                        return True\n                    visited.add(neighbor)\n                    queue.append(neighbor)\n    return False",
        "complexity": {
          "time": "O(V + E) but incorrect logic.",
          "space": "O(V) visited set."
        }
      },
      {
        "name": "Optimal",
        "intuition": "To prevent mistaking the parent node (where we came from) as a cycle, store the parent of each node along with the node itself in the BFS queue as a pair (node, parent). If we encounter a visited neighbor that is not the parent of the current node, a cycle must exist.",
        "algorithm": "1. Initialize 'visited' set.\n2. For each node i from 0 to V-1, if i not visited, call bfs(i).\n3. In bfs(start):\n   - queue starts with (start, -1). Mark start as visited.\n   - While queue is not empty, pop (node, parent).\n   - For neighbor in adj[node]:\n     - If neighbor not in visited: mark visited and queue.append((neighbor, node)).\n     - Else if neighbor != parent, return True.\n4. Return False if no cycles detected in any component.",
        "code": "from collections import deque\n\ndef isCycleBFS(V: int, adj: list[list[int]]) -> bool:\n    # Set to keep track of visited vertices\n    visited = set()\n    \n    # Helper function to run BFS on a component\n    def bfs(start):\n        # Queue stores tuples of (current_node, parent_node)\n        queue = deque([(start, -1)])\n        # Mark starting vertex as visited\n        visited.add(start)\n        \n        # Loop until queue is empty\n        while queue:\n            # Dequeue the current vertex and its parent\n            node, parent = queue.popleft()\n            \n            # Check all neighbors of the current vertex\n            for neighbor in adj[node]:\n                # If neighbor is not visited, visit and enqueue it\n                if neighbor not in visited:\n                    visited.add(neighbor)\n                    queue.append((neighbor, node))\n                # If neighbor is visited and is not the direct parent, a cycle is present\n                elif neighbor != parent:\n                    return True\n        # No cycle detected in this component\n        return False\n        \n    # Iterate through all vertices to handle disconnected graphs\n    for i in range(V):\n        if i not in visited:\n            if bfs(i):\n                return True\n    # No cycles found in the entire graph\n    return False",
        "complexity": {
          "time": "O(V + E) since we visit each node and edge at most once.",
          "space": "O(V) for visited set and BFS queue."
        }
      }
    ],
    "trace": [
      {
        "line": 32,
        "desc": "Loop starts: checking node 0. 0 not in visited.",
        "vars": { "i": 0 }
      },
      {
        "line": 34,
        "desc": "Invokes bfs(0).",
        "vars": { "start": 0 }
      },
      {
        "line": 8,
        "desc": "bfs(0): Initializes queue with (0, -1).",
        "vars": { "queue": [[0, -1]] }
      },
      {
        "line": 10,
        "desc": "bfs(0): Marks 0 as visited.",
        "vars": { "visited": [0] }
      },
      {
        "line": 15,
        "desc": "Pops node 0, parent -1 from queue.",
        "vars": { "node": 0, "parent": -1 }
      },
      {
        "line": 18,
        "desc": "Check neighbors of 0: [1, 2]. neighbor = 1.",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 20,
        "desc": "neighbor 1 is not visited. Mark visited and append to queue.",
        "vars": { "visited": [0, 1], "queue": [[1, 0]] }
      },
      {
        "line": 18,
        "desc": "neighbor = 2.",
        "vars": { "neighbor": 2 }
      },
      {
        "line": 20,
        "desc": "neighbor 2 is not visited. Mark visited and append to queue.",
        "vars": { "visited": [0, 1, 2], "queue": [[1, 0], [2, 0]] }
      },
      {
        "line": 15,
        "desc": "Pops node 1, parent 0 from queue.",
        "vars": { "node": 1, "parent": 0 }
      },
      {
        "line": 18,
        "desc": "Check neighbors of 1: [0, 2]. neighbor = 0.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 23,
        "desc": "neighbor 0 is visited, but neighbor == parent (0 == 0). Skip.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 18,
        "desc": "neighbor = 2.",
        "vars": { "neighbor": 2 }
      },
      {
        "line": 23,
        "desc": "neighbor 2 is visited and neighbor != parent (2 != 0). Cycle detected!",
        "vars": { "neighbor": 2, "parent": 0 }
      }
    ]
  },
  "Detect Cycle in Undirected Graph (DFS)": {
    "title": "Detect Cycle in Undirected Graph (DFS)",
    "problemStatement": "Given an undirected graph with V vertices and an adjacency list adj, detect if there is a cycle in the graph using DFS.",
    "examples": [
      {
        "input": "V = 5, adj = [[1], [0, 2, 4], [1, 3], [2], [1]]",
        "output": "false"
      },
      {
        "input": "V = 4, adj = [[1, 2], [0, 2], [0, 1, 3], [2]]",
        "output": "true"
      }
    ],
    "constraints": [
      "1 <= V <= 10^5",
      "0 <= E <= 10^5"
    ],
    "edgeCases": [
      "Disconnected components.",
      "Self loops.",
      "Graph is a tree line path."
    ],
    "followUps": [
      "Can you compare DFS and BFS cycle detection in terms of space? (DFS uses O(H) recursion stack space, which could be O(V) in worst case. BFS queue size is bounded by max width of graph.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Standard DFS. If we do not pass parent down, we will treat the connection back to the parent node as a cycle.",
        "algorithm": "1. Run DFS. If neighbor is visited, return True.",
        "code": "def isCycleDFS(V: int, adj: list[list[int]]) -> bool:\n    visited = set()\n    \n    def dfs(node):\n        visited.add(node)\n        for neighbor in adj[node]:\n            if neighbor in visited:\n                return True\n            if dfs(neighbor):\n                return True\n        return False\n        \n    for i in range(V):\n        if i not in visited:\n            if dfs(i):\n                return True\n    return False",
        "complexity": {
          "time": "O(V + E) but incorrect logic.",
          "space": "O(V) recursion stack."
        }
      },
      {
        "name": "Optimal",
        "intuition": "Pass parent information down the recursion stack. For each neighbor of a node: if it is not visited, recursively call DFS. If it is already visited and is not the parent of the current node, a cycle has been found.",
        "algorithm": "1. Maintain 'visited' set.\n2. Iterate i from 0 to V-1. If not visited, call dfs(i, -1).\n3. In dfs(node, parent):\n   - Add node to 'visited'.\n   - For neighbor in adj[node]:\n     - If neighbor not visited:\n       - Recurse dfs(neighbor, node). If True, return True.\n     - Else if neighbor != parent, return True.\n4. Return False.",
        "code": "def isCycleDFS(V: int, adj: list[list[int]]) -> bool:\n    # Keep track of visited nodes\n    visited = set()\n    \n    # Recursive DFS helper function\n    def dfs(node, parent):\n        # Mark current node as visited\n        visited.add(node)\n        # Check all adjacent nodes\n        for neighbor in adj[node]:\n            # If neighbor is not visited, recursively call DFS\n            if neighbor not in visited:\n                if dfs(neighbor, node):\n                    return True\n            # If visited and not parent, cycle detected\n            elif neighbor != parent:\n                return True\n        # No cycle detected in this path\n        return False\n        \n    # Iterate through all vertices to handle disconnected components\n    for i in range(V):\n        if i not in visited:\n            if dfs(i, -1):\n                return True\n    # No cycles found in graph\n    return False",
        "complexity": {
          "time": "O(V + E) since each node and edge is processed at most once.",
          "space": "O(V) for visited set and recursion stack."
        }
      }
    ],
    "trace": [
      {
        "line": 23,
        "desc": "Check node 0. 0 not in visited. Call dfs(0, -1).",
        "vars": { "i": 0 }
      },
      {
        "line": 8,
        "desc": "dfs(0, -1): adds 0 to visited set.",
        "vars": { "visited": [0] }
      },
      {
        "line": 10,
        "desc": "dfs(0, -1): loops neighbors of 0: [1, 2]. neighbor = 1.",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 12,
        "desc": "1 is not visited. Recursively calls dfs(1, 0).",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 8,
        "desc": "dfs(1, 0): adds 1 to visited.",
        "vars": { "visited": [0, 1] }
      },
      {
        "line": 10,
        "desc": "dfs(1, 0): loops neighbors of 1: [0, 2]. neighbor = 0.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 16,
        "desc": "0 is visited, but neighbor == parent (0 == 0). Skip.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 10,
        "desc": "dfs(1, 0): neighbor = 2.",
        "vars": { "neighbor": 2 }
      },
      {
        "line": 12,
        "desc": "2 is not visited. Recursively calls dfs(2, 1).",
        "vars": { "neighbor": 2 }
      },
      {
        "line": 8,
        "desc": "dfs(2, 1): adds 2 to visited.",
        "vars": { "visited": [0, 1, 2] }
      },
      {
        "line": 10,
        "desc": "dfs(2, 1): loops neighbors of 2: [0, 1]. neighbor = 0.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 16,
        "desc": "0 is visited, and neighbor != parent (0 != 1). Cycle detected! Returns True.",
        "vars": { "neighbor": 0, "parent": 1 }
      }
    ]
  },
  "Detect Cycle in Directed Graph": {
    "title": "Detect Cycle in Directed Graph",
    "problemStatement": "Given a directed graph with V vertices and an adjacency list adj, detect if there is a cycle in the graph.",
    "examples": [
      {
        "input": "V = 4, adj = [[1], [2], [3], [1]]",
        "output": "true",
        "explanation": "1 -> 2 -> 3 -> 1 forms a cycle."
      },
      {
        "input": "V = 3, adj = [[1], [2], []]",
        "output": "false"
      }
    ],
    "constraints": [
      "1 <= V <= 10^5",
      "0 <= E <= 10^5"
    ],
    "edgeCases": [
      "Disconnected components.",
      "Diamond topology: 0 -> 1, 0 -> 2, 1 -> 3, 2 -> 3 (not a cycle).",
      "Self loops (e.g. 0 -> 0)."
    ],
    "followUps": [
      "Can you solve this using Kahn's Algorithm (BFS Topological Sort)? (Yes, if the number of elements in the topological sort is less than V, then a cycle exists.)"
    ],
    "approaches": [
      {
        "name": "Brute Force",
        "intuition": "Apply the cycle detection algorithm for undirected graphs. In directed graphs, this incorrectly flags paths that meet at a shared descendant (like the diamond topology) as cycles.",
        "algorithm": "1. Run DFS. If neighbor is visited, return True.",
        "code": "def isCyclicDirected(V: int, adj: list[list[int]]) -> bool:\n    visited = set()\n    \n    # Incorrectly uses undirected cycle detection\n    def dfs(node, parent):\n        visited.add(node)\n        for neighbor in adj[node]:\n            if neighbor not in visited:\n                if dfs(neighbor, node):\n                    return True\n            elif neighbor != parent:\n                return True\n        return False\n        \n    for i in range(V):\n        if i not in visited:\n            if dfs(i, -1):\n                return True\n    return False",
        "complexity": {
          "time": "O(V + E) but incorrect logic for directed graphs.",
          "space": "O(V) recursion stack."
        }
      },
      {
        "name": "Optimal",
        "intuition": "In a directed graph, a cycle exists if and only if there is a back edge from a node to one of its ancestors in the current DFS recursion stack. We can track this using a 'path_visited' set representing the current DFS path, alongside a general 'visited' set.",
        "algorithm": "1. Initialize 'visited' and 'path_visited' sets.\n2. Iterate through all vertices. If vertex not visited, call dfs(vertex).\n3. In dfs(node):\n   - Add node to 'visited' and 'path_visited'.\n   - For neighbor in adj[node]:\n     - If neighbor in 'path_visited': cycle detected, return True.\n     - Else if neighbor not in 'visited': recurse dfs(neighbor). If True, return True.\n   - Remove node from 'path_visited' before returning (backtracking).\n4. Return False.",
        "code": "def isCyclicDirected(V: int, adj: list[list[int]]) -> bool:\n    # Set to store visited nodes\n    visited = set()\n    # Set to track nodes currently in the recursion stack\n    path_visited = set()\n    \n    def dfs(node):\n        # Mark node as visited\n        visited.add(node)\n        # Add node to active recursion path\n        path_visited.add(node)\n        \n        # Traverse all outgoing edges\n        for neighbor in adj[node]:\n            # If neighbor is in current recursion path, cycle found\n            if neighbor in path_visited:\n                return True\n            # If neighbor not visited, recurse DFS\n            elif neighbor not in visited:\n                if dfs(neighbor):\n                    return True\n                    \n        # Remove node from recursion path before returning\n        path_visited.remove(node)\n        # No cycle found from this node\n        return False\n        \n    # Loop through all vertices to handle disconnected components\n    for i in range(V):\n        if i not in visited:\n            if dfs(i):\n                return True\n    # No cycle found in entire graph\n    return False",
        "complexity": {
          "time": "O(V + E) where V is the number of vertices and E is the number of edges.",
          "space": "O(V) for visited and path_visited sets, and recursive call stack."
        }
      }
    ],
    "trace": [
      {
        "line": 30,
        "desc": "Check node 0. 0 not in visited. Call dfs(0).",
        "vars": { "i": 0 }
      },
      {
        "line": 8,
        "desc": "dfs(0): adds 0 to visited.",
        "vars": { "visited": [0] }
      },
      {
        "line": 10,
        "desc": "dfs(0): adds 0 to path_visited (active recursion path).",
        "vars": { "path_visited": [0] }
      },
      {
        "line": 13,
        "desc": "dfs(0): loops neighbor of 0: [1]. neighbor = 1.",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 17,
        "desc": "neighbor 1 is not in visited. Recurses dfs(1).",
        "vars": { "neighbor": 1 }
      },
      {
        "line": 8,
        "desc": "dfs(1): adds 1 to visited.",
        "vars": { "visited": [0, 1] }
      },
      {
        "line": 10,
        "desc": "dfs(1): adds 1 to path_visited.",
        "vars": { "path_visited": [0, 1] }
      },
      {
        "line": 13,
        "desc": "dfs(1): loops neighbor of 1: [2]. neighbor = 2.",
        "vars": { "neighbor": 2 }
      },
      {
        "line": 17,
        "desc": "neighbor 2 is not in visited. Recurses dfs(2).",
        "vars": { "neighbor": 2 }
      },
      {
        "line": 8,
        "desc": "dfs(2): adds 2 to visited.",
        "vars": { "visited": [0, 1, 2] }
      },
      {
        "line": 10,
        "desc": "dfs(2): adds 2 to path_visited.",
        "vars": { "path_visited": [0, 1, 2] }
      },
      {
        "line": 13,
        "desc": "dfs(2): loops neighbor of 2: [0]. neighbor = 0.",
        "vars": { "neighbor": 0 }
      },
      {
        "line": 15,
        "desc": "neighbor 0 is in path_visited! Cycle found. Returns True.",
        "vars": { "neighbor": 0, "path_visited": [0, 1, 2] }
      }
    ]
  }
}

target_file = "/Users/jatinsihag/Documents/DSAAAAAA/scratch/dsa_sol_7.json"
os.makedirs(os.path.dirname(target_file), exist_ok=True)

with open(target_file, "w") as f:
    json.dump(data, f, indent=2)

print("DSA JSON generated successfully.")
