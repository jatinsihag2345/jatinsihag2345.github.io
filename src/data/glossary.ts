/**
 * Plain-language definitions for every technical term the site's prose leans on.
 *
 * The content audit found the writing repeatedly uses jargon it never introduces —
 * "invariant" alone appears 100+ times with no definition anywhere. The reader this
 * site serves is switching careers and studying alone; a term they cannot look up
 * in-place is a wall, not a vocabulary lesson. These definitions surface as hover
 * tooltips wherever prose renders, and as a browsable list in the theory tab.
 *
 * Style rules: 1–3 sentences. Say what it IS, then why anyone cares, in words a
 * first-year could repeat. A tiny example beats an abstraction.
 */

export interface GlossaryEntry {
  term: string;
  /** Other spellings/forms that should match in prose (lowercase). */
  aliases: string[];
  definition: string;
}

export const glossary: GlossaryEntry[] = [
  {
    term: 'invariant',
    aliases: ['invariants', 'loop invariant'],
    definition:
      'Something that stays true at every step of an algorithm, no matter how many steps have run — e.g. "everything left of the write pointer is already sorted". If you can name the invariant and show each step preserves it, you have proved the algorithm correct.',
  },
  {
    term: 'amortized',
    aliases: ['amortised', 'amortized o(1)', 'amortised o(1)'],
    definition:
      'Cheap on average across many operations, even though a single operation is occasionally expensive. A dynamic array append is usually instant but sometimes copies everything; spread over all appends, each one still costs O(1).',
  },
  {
    term: 'monotonic stack',
    aliases: ['monotonic deque', 'monotonic'],
    definition:
      'A stack you keep sorted by popping anything that would break the order before pushing. Each element is pushed and popped at most once, so a whole scan stays O(n) — the standard tool for "nearest greater/smaller element" questions.',
  },
  {
    term: 'memoization',
    aliases: ['memoisation', 'memoized', 'memoised', 'memo'],
    definition:
      'Caching a function\'s answers so repeating the same call is a lookup instead of a recomputation. It turns a recursion that revisits the same states exponentially often into one that solves each state once.',
  },
  {
    term: 'DP state',
    aliases: ['dp state', 'state transition', 'subproblem'],
    definition:
      'The precise question a dynamic-programming table cell answers, e.g. dp[i][j] = "minimum edits to turn the first i letters into the first j letters". Getting the state definition right IS solving the problem; the loops just fill it in.',
  },
  {
    term: 'in-place',
    aliases: ['in place'],
    definition:
      'Modifying the input structure itself instead of building a new one, using at most O(1) extra memory. The trade: you save space but destroy the original — callers who still need it will be surprised.',
  },
  {
    term: 'stable sort',
    aliases: ['stability', 'stable'],
    definition:
      'A sort that keeps equal elements in their original relative order. Python\'s sort is stable, which is why sorting by one key and then another gives a correct two-level ordering.',
  },
  {
    term: 'sentinel',
    aliases: ['sentinel value', 'dummy node', 'dummy head'],
    definition:
      'An extra fake value or node added so edge cases stop being special — a dummy head means "insert at the front" uses the same code as "insert in the middle". The risk: a sentinel chosen from real data\'s possible values can collide with it.',
  },
  {
    term: 'adjacency list',
    aliases: ['adjacency lists', 'adjacency matrix'],
    definition:
      'The standard way to store a graph: for each node, a list of its neighbours. For V nodes and E edges it costs O(V+E) space, versus O(V²) for a full matrix — which is why sparse graphs always use lists.',
  },
  {
    term: 'relax',
    aliases: ['relaxation', 'relaxing an edge', 'decrease-key'],
    definition:
      'In shortest-path algorithms, checking whether going through an edge gives a shorter route than the best known, and updating if so: if dist[u] + w < dist[v], set dist[v] = dist[u] + w. "Decrease-key" is a heap update that records the improved distance.',
  },
  {
    term: 'union-find',
    aliases: ['dsu', 'disjoint set', 'disjoint set union', 'path compression'],
    definition:
      'A structure answering "are these two things in the same group?" and "merge these two groups" in nearly O(1). Each group is a tree of pointers to a representative; path compression flattens the tree every time you look something up.',
  },
  {
    term: 'MSB',
    aliases: ['most significant bit', 'msb-first'],
    definition:
      'The most significant bit — the leftmost, highest-value bit of a number. XOR-maximisation tricks work MSB-first because winning a higher bit outweighs every bit below it combined.',
  },
  {
    term: 'LPS array',
    aliases: ['lps', 'failure function', 'prefix function', 'border'],
    definition:
      'For each position in a string, the length of the Longest Proper prefix that is also a Suffix ending there ("proper" = not the whole string; a "border" is such a prefix-suffix). It is KMP\'s cheat sheet: on a mismatch it says exactly how far the pattern can shift without skipping a possible match.',
  },
  {
    term: 'pruning',
    aliases: ['prune', 'pruned', 'branch and bound'],
    definition:
      'Cutting off a branch of a search the moment you can prove nothing down there can be a valid answer — e.g. stopping a combination search once the running sum exceeds the target. Same answers, far fewer paths walked.',
  },
  {
    term: 'base case',
    aliases: ['base cases'],
    definition:
      'The input a recursion answers directly without calling itself — an empty list, a null node, zero remaining. Every recursion is "base case + how to shrink toward it"; a missing or wrong base case is the most common recursion bug.',
  },
  {
    term: 'call stack',
    aliases: ['recursion depth', 'stack frame', 'stack overflow'],
    definition:
      'Where the language keeps track of every function call that has started but not finished. Each nested call adds a frame; recurse 100,000 deep and you exhaust it — which is why deep recursions get rewritten with an explicit stack.',
  },
  {
    term: 'hash collision',
    aliases: ['collision', 'collisions'],
    definition:
      'Two different values landing on the same hash. Hash maps handle it internally (costing a little speed); rolling-hash algorithms like Rabin-Karp must re-check matches character by character, because a matching hash only means "maybe equal".',
  },
  {
    term: 'topological order',
    aliases: ['topological sort', 'topo sort', 'toposort'],
    definition:
      'An ordering of a dependency graph where every arrow points forward — prerequisites before the things that need them. Only possible when there is no cycle, which is why topological sort doubles as a cycle detector.',
  },
  {
    term: 'DAG',
    aliases: ['directed acyclic graph'],
    definition:
      'A Directed Acyclic Graph: edges have direction and no path loops back to its start. Course prerequisites and build dependencies are DAGs, and DAGs are exactly the graphs that can be processed in topological order.',
  },
  {
    term: 'bipartite',
    aliases: ['bipartite graph', 'two-coloring', 'two-colouring'],
    definition:
      'A graph whose nodes can be split into two teams so that every edge connects the teams, never teammates. Equivalent to being 2-colourable, and impossible exactly when the graph contains an odd-length cycle.',
  },
  {
    term: 'heap property',
    aliases: ['min-heap', 'max-heap', 'priority queue'],
    definition:
      'In a min-heap, every parent is ≤ its children, so the smallest element is always on top — found in O(1), removed in O(log n). A priority queue is the abstract "always give me the best item next", and a heap is its standard implementation.',
  },
  {
    term: 'binary search on answer',
    aliases: ['search on answer', 'parametric search'],
    definition:
      'Binary searching the answer\'s value rather than a position in an array. Works when "could the answer be at most X?" is a yes/no question that flips exactly once as X grows — find the flip point and you have the optimum.',
  },
  {
    term: 'prefix sum',
    aliases: ['prefix sums', 'prefix xor', 'running sum', 'cumulative sum'],
    definition:
      'An array where position i holds the total of everything up to i. Any range total then costs O(1): sum(l..r) = prefix[r] - prefix[l-1]. The same trick works for XOR and products.',
  },
  {
    term: 'two pointers',
    aliases: ['two-pointer', 'two pointer'],
    definition:
      'Two indices walking the same data under a rule that guarantees nothing valid is skipped — usually one from each end, or a slow writer chased by a fast reader. The proof obligation is always the same sentence: "moving this pointer cannot skip an answer because …".',
  },
  {
    term: 'sliding window',
    aliases: ['window'],
    definition:
      'A contiguous range [left..right] that grows on the right and shrinks on the left, maintaining some property (all-distinct, sum ≤ k). Each pointer only ever moves forward, so the whole scan is O(n) even though the window wobbles.',
  },
  {
    term: 'fast and slow pointers',
    aliases: ['fast & slow pointers', 'floyd', "floyd's cycle detection", 'tortoise and hare'],
    definition:
      'Two walkers on a linked structure, one moving twice as fast. If there is a cycle they must eventually meet inside it (the fast one gains one step per move); from the meeting point, arithmetic recovers the cycle\'s start.',
  },
  {
    term: 'level-order',
    aliases: ['level order', 'breadth-first', 'bfs'],
    definition:
      'Visiting a tree or graph one layer at a time — everything at distance 1, then distance 2, and so on — using a queue. In unweighted graphs the first time BFS reaches a node is provably via a shortest path.',
  },
  {
    term: 'subarray vs subsequence',
    aliases: ['subarray', 'subsequence', 'substring'],
    definition:
      'A subarray (or substring) is contiguous — you cut one block out. A subsequence keeps the original order but may skip elements. [2,4] is a subsequence of [2,3,4] but not a subarray; the distinction changes which techniques apply.',
  },
  {
    term: 'lazy deletion',
    aliases: ['lazy removal'],
    definition:
      'Instead of digging an outdated item out of a structure (expensive in a heap), leave it and discard it when it surfaces at the top. Correct as long as you can recognise stale entries when you see them.',
  },
  {
    term: 'canonical coin system',
    aliases: ['canonical'],
    definition:
      'A coin system where the greedy strategy (always take the biggest coin that fits) provably yields the fewest coins — US and Indian denominations qualify. There is no eyeball test for it: [1, 5, 11] looks fine and fails at 15 (11+1+1+1+1 vs 5+5+5).',
  },
  {
    term: 'asymptotic complexity',
    aliases: ['big o', 'big-o', 'time complexity', 'space complexity', 'o-notation'],
    definition:
      'How cost grows as input size grows, ignoring constant factors: O(n) doubles when input doubles, O(n²) quadruples, O(log n) barely moves. It answers "will this still work at a million elements?", not "how many milliseconds?".',
  },
  {
    term: 'worst case',
    aliases: ['average case', 'expected time'],
    definition:
      'The most an algorithm can cost over any input of a given size. "Expected" or "average" cost describes typical inputs — hash maps are expected O(1) but a worst case of colliding keys degrades them, which is why guarantees matter in interviews.',
  },
  {
    term: 'divide and conquer',
    aliases: ['divide & conquer'],
    definition:
      'Split the problem in half, solve each half (usually recursively), then combine the halves\' answers. Merge sort is the archetype; the interesting work is almost always in the combine step.',
  },
  {
    term: 'backtracking',
    aliases: ['backtrack'],
    definition:
      'Depth-first search over partial solutions: extend the current attempt one choice at a time, and when a choice cannot lead anywhere valid, undo it (backtrack) and try the next option. The undo step is what lets one shared path array explore every branch.',
  },
  {
    term: 'trie',
    aliases: ['prefix tree', 'tries'],
    definition:
      'A tree keyed by characters: each root-to-node path spells a prefix, so all words sharing a prefix share a path. Lookup and insert cost O(word length) regardless of how many words are stored.',
  },
  {
    term: 'rolling hash',
    aliases: ['rabin-karp hash', 'polynomial hash'],
    definition:
      'A hash of a window that can be updated in O(1) when the window slides one character — subtract the outgoing character\'s contribution, multiply, add the incoming one. Powers Rabin-Karp string search.',
  },
  {
    term: 'kadane',
    aliases: ["kadane's algorithm", 'kadane’s algorithm'],
    definition:
      'The O(n) maximum-subarray trick: walk left to right keeping "best sum ending exactly here"; if that running sum ever goes negative it can only hurt whatever follows, so reset it to zero. The global best seen along the way is the answer.',
  },
  {
    term: 'matrix traversal',
    aliases: ['grid traversal', 'flood fill'],
    definition:
      'Walking a 2-D grid cell by cell, usually with a direction array like [(0,1),(1,0),(0,-1),(-1,0)] for the four neighbours. Flood fill is BFS/DFS from a cell across same-valued neighbours — Number of Islands is the classic.',
  },
  {
    term: 'tie-breaking',
    aliases: ['tie break', 'tiebreak'],
    definition:
      'The rule for choosing between equally-good options — smallest index, alphabetical, earliest deadline. Problems often hide the real difficulty here: the algorithm is easy, and the stated tie-break is what forces a particular data structure.',
  },
  {
    term: 'greedy',
    aliases: ['greedy choice', 'exchange argument'],
    definition:
      'Taking the locally best option at each step and never reconsidering. Fast, but only correct when a proof (usually an exchange argument: "any optimal solution can be reshaped to start with the greedy choice without getting worse") backs it — greedy without a proof is a guess.',
  },
];

/** Longest-alias-first list, so "monotonic stack" wins over "monotonic" when both match. */
export const glossaryMatchers: { alias: string; entry: GlossaryEntry }[] = glossary
  .flatMap(entry => [entry.term.toLowerCase(), ...entry.aliases].map(alias => ({ alias, entry })))
  .sort((a, b) => b.alias.length - a.alias.length);
