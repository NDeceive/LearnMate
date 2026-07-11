import { UserProfile, Course, WeakPoint, QuizQuestion, ChatSession, ErrorRecord } from './types';

export const initialProfile: UserProfile = {
  name: "张同学",
  proficiency: 88,
  totalHours: 124,
  completionRate: 92,
  knowledgeCoverage: 85,
  streak: 15,
  testsTaken: 12,
  pendingTasks: 5,
  weakPointsCount: 8,
  extraPoints: 350
};

export const initialCourses: Course[] = [
  { id: "c-lang", name: "C语言程序设计", code: "CS101", proficiency: 92, totalHours: 32, completionRate: 100, color: "blue" },
  { id: "data-struct", name: "数据结构与算法", code: "CS201", proficiency: 84, totalHours: 45, completionRate: 95, color: "blue" },
  { id: "comp-org", name: "计算机组成原理", code: "CS202", proficiency: 81, totalHours: 20, completionRate: 85, color: "sky" },
  { id: "os", name: "操作系统", code: "CS301", proficiency: 89, totalHours: 18, completionRate: 90, color: "emerald" },
  { id: "networks", name: "计算机网络", code: "CS302", proficiency: 78, totalHours: 9, completionRate: 70, color: "rose" }
];

export const initialWeakPoints: WeakPoint[] = [
  { id: "wp1", name: "动态规划 (DP) 状态转移方程", level: "High", count: 7, course: "数据结构与算法", remediationProgress: 45 },
  { id: "wp2", name: "红黑树 (R-B Tree) 旋转与自平衡", level: "Medium", count: 5, course: "数据结构与算法", remediationProgress: 60 },
  { id: "wp3", name: "多线程并发控制与死锁避免", level: "Medium", count: 4, course: "操作系统", remediationProgress: 55 },
  { id: "wp4", name: "哈希冲突解决与装填因子调整", level: "Low", count: 2, course: "数据结构与算法", remediationProgress: 85 },
  { id: "wp5", name: "TCP 拥塞控制机制 (慢启动与拥塞避免)", level: "Medium", count: 3, course: "计算机网络", remediationProgress: 70 }
];

export const initialQuizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    domain: "数据结构与算法",
    question: "给定一棵二叉树，其前序遍历序列为 ABDECFG，中序遍历序列为 DBEAFCG。请问该二叉树的后序遍历序列是什么？",
    code: `前序遍历 (Pre-order): A -> B -> D -> E -> C -> F -> G
中序遍历 (In-order) : D -> B -> E -> A -> F -> C -> G

           [Root = A]
          /          \\
     [LeftSub]      [RightSub]
  (In: D B E)    (In: F C G)
  (Pre: B D E)   (Pre: C F G)`,
    options: [
      "DEBFGCA",
      "DEBFCG_A", // wait, let's write correct choices
      "DEBFCGA",
      "DEBAFGC"
    ],
    answerIndex: 0, // DEBFGCA
    explanation: "通过前序和中序可以唯一确定二叉树结构。前序第一个元素A为根，中序中A左边DBE为左子树，右边FCG为右子树。同理，在左子树Pre为BDE，In为DBE，B为左子树根，D为B左子，E为B右子。在右子树Pre为CFG，In为FCG，C为右子树根，F为C左子，G为C右子。因此该二叉树结构为：根A，左孩子B（有左D右E），右孩子C（有左F右G）。其后序遍历（左右根）为：D -> E -> B -> F -> G -> C -> A，即 DEBFGCA。",
    hint: "前序遍历的第一个节点必定是当前子树的根节点，根据此根节点在中序遍历中的位置，可以将中序序列切分为左子树序列和右子树序列，然后递归构建子树。后序遍历最后访问根节点。"
  },
  {
    id: "q2",
    domain: "操作系统",
    question: "在进程管理中，使用PV操作（信号量）解决生产者-消费者问题。假定缓冲区大小为 N，信号量 mutex 用于互斥，empty 用于表示空位，full 用于表示产品数。在消费者进程中，正确的PV操作顺序应当是：",
    code: `// 消费者进程 Consumer
void Consumer() {
    while(true) {
        [位置①];
        [位置②];
        // 从缓冲区取出一件产品
        TakeItem();
        [位置③];
        [位置④];
        // 消费产品
        ConsumeItem();
    }
}`,
    options: [
      "① P(empty), ② P(mutex), ③ V(mutex), ④ V(full)",
      "① P(full), ② P(mutex), ③ V(mutex), ④ V(empty)",
      "① P(mutex), ② P(full), ③ V(empty), ④ V(mutex)",
      "① P(full), ② P(mutex), ③ V(empty), ④ V(mutex)"
    ],
    answerIndex: 1, // ① P(full), ② P(mutex), ③ V(mutex), ④ V(empty)
    explanation: "消费者进程必须先检查缓冲区中是否有商品（P(full)），然后再对缓冲区加锁（P(mutex)）。如果顺序相反，即先P(mutex)再P(full)，当缓冲区为空时，消费者会持有mutex锁并阻塞在P(full)上，生产者因无法获得mutex而无法生产，导致死锁。释放锁和空间的顺序为先释放互斥锁（V(mutex)），再增加一个空位信号量（V(empty)）。",
    hint: "注意预防死锁！互斥信号量的 P 操作永远应当放在同步信号量的 P 操作之后，否则极易发生死锁。而 V 操作的顺序则不会引发死锁，但对称书写是个好习惯。"
  },
  {
    id: "q3",
    domain: "数据结构与算法",
    question: "以下是一段实现斐波那契数列第 n 项的递归 C 语言函数，该函数的时间复杂度是多少？如果采用动态规划（记忆化）优化，时间复杂度可降低到多少？",
    code: `int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}`,
    options: [
      "O(2^n) 优化后为 O(n)",
      "O(n^2) 优化后为 O(n)",
      "O(2^n) 优化后为 O(log n)",
      "O(n log n) 优化后为 O(n)"
    ],
    answerIndex: 0, // O(2^n) 优化后为 O(n)
    explanation: "原递归函数在计算过程中存在大量的重复子问题计算，状态递归树的分支因子为2，深度为n，因此其时间复杂度为指数级 O(2^n)。如果使用动态规划或记忆化搜索，每个子问题（0 到 n）只需计算一次，时间复杂度将降为线性级的 O(n)。",
    hint: "画出递归调用树。普通的递归树会产生大量重复分支（比如 fib(n-2) 会在两边重复调用）。动态规划则可以将这些计算结果保存，避免重复计算。"
  }
];

export const initialSessions: ChatSession[] = [
  {
    id: "session-1",
    title: "递归与迭代的时空复杂度分析",
    knowledgePoints: ["递归", "迭代", "时间复杂度", "空间复杂度", "斐波那契数列"],
    recommendedResources: [
      { title: "《算法导论》第3章：渐近记号与递归求解", type: "书籍章节" },
      { title: "LeetCode 极客时间：动态规划核心原理", type: "在线网课" },
      { title: "递归状态空间树的可视化动画演示", type: "互动网页" }
    ],
    suggestedFollowups: [
      "如何将一个深层递归函数改写为尾递归形式？",
      "请用 C++ 演示红黑树左旋的完整状态变化与指针修改代码。",
      "虚拟内存中 LRU 算法在极端情况下会发生抖动吗？该如何检测？"
    ],
    messages: [
      {
        id: "m1",
        sender: "user",
        timestamp: "10:30 AM",
        text: "老师好，我想深入理解一下递归算法。以经典的斐波那契数列为例，为什么普通的递归写法时间复杂度是指数级的？怎么用动态规划优化，能帮我写个 Python 示例吗？"
      },
      {
        id: "m2",
        sender: "assistant",
        timestamp: "10:31 AM",
        parts: [
          {
            agent: "coordinator",
            title: "计智引擎 (综合协调)",
            content: "收到您的学术疑问。关于斐波那契数列的递归效率低下、动态规划优化原理，我将协同本平台的 **TheoryAgent (学术理论智能体)** 和 **CodeAgent (代码工程智能体)** 为您联合诊断。理论智能体将解答复杂度机理，代码智能体将提供工程优化代码并作对比。"
          },
          {
            agent: "TheoryAgent",
            title: "TheoryAgent (学术理论智能体)",
            content: "#### 1. 为什么普通递归复杂度是 O(2^n)？\n\n普通递归计算 `fib(n)` 时会引发如下的分治展开：\n```\n                  fib(5)\n                 /      \\\n             fib(4)      fib(3)\n            /     \\     /     \\\n        fib(3)  fib(2) fib(2)  fib(1)\n```\n**根本原因：大量的重复计算。** 如上图，`fib(3)` 被计算了 2 次，`fib(2)` 被计算了 3 次。随着 $n$ 的增长，递归树的节点数呈指数级增加。精确的时间复杂度为 $O(\\phi^n)$（其中 $\\phi \\approx 1.618$），通常简写作 $O(2^n)$。\n\n**空间复杂度：$O(n)$。** 递归调用会在系统栈中留下调用记录，栈的最大深度等于树的高度 $n$。"
          },
          {
            agent: "CodeAgent",
            title: "CodeAgent (代码工程智能体)",
            content: "#### 2. Python 动态规划（自底向上）与记忆化优化实现\n\n通过使用数组存储已经计算过的状态，我们可以避免任何重复计算，将时间复杂度降低到 $O(n)$。以下是两种优化写法：",
            code: `# 方法一：自顶向下 + 记忆化搜索 (Memoization)
def fib_memo(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_memo(n - 1, memo) + fib_memo(n - 2, memo)
    return memo[n]

# 方法二：自底向上 + 空间优化 (Dynamic Programming)
def fib_dp(n):
    if n <= 1:
        return n
    dp = [0] * (n + 1)
    dp[0], dp[1] = 0, 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

# 进一步空间优化：O(1) 空间
def fib_optimized(n):
    if n <= 1:
        return n
    prev2, prev1 = 0, 1
    for _ in range(2, n + 1):
        current = prev1 + prev2
        prev2 = prev1
        prev1 = current
    return prev1`,
            codeLanguage: "python"
          },
          {
            agent: "ReviewAgent",
            title: "ReviewAgent (代码审查与评估智能体)",
            content: "#### 3. 性能评测总结\n\n| 写法 | 时间复杂度 | 空间复杂度 | 溢出风险 |\n| :--- | :--- | :--- | :--- |\n| 原始递归 | $O(2^n)$ | $O(n)$ (栈溢出) | 极高 (n>40 无法运行) |\n| 记忆化搜索 | $O(n)$ | $O(n)$ (辅助字典) | 中等 (受到递归深度限制) |\n| 自底向上DP | $O(n)$ | $O(n)$ (数组) | 极低 (无栈溢出问题) |\n| 空间优化DP | $O(n)$ | $O(1)$ (仅需2个变量) | 无 |\n\n对于 $n = 100$：原始递归需要地球毁灭级别的计算时间，而空间优化DP可在 $10^{-6}$ 秒内瞬间得出结果。"
          }
        ]
      }
    ]
  },
  {
    id: "session-2",
    title: "红黑树的旋转与自平衡核心步骤",
    knowledgePoints: ["红黑树", "二叉搜索树", "平衡因子", "左旋/右旋", "插入调整"],
    recommendedResources: [
      { title: "红黑树插入删除 2D 全交互式可视化演示", type: "互动网页" },
      { title: "《算法导论》第13章：红黑树平衡条件", type: "书籍章节" }
    ],
    suggestedFollowups: [
      "请问红黑树和 AVL 树的区别是什么？如何选择？",
      "红黑树插入一个新节点时，为什么默认涂为红色而不是黑色？"
    ],
    messages: [
      {
        id: "m3",
        sender: "user",
        timestamp: "Yesterday",
        text: "红黑树左旋之后，指针是怎么改变的？老是记不住。能不能用图解和简单的代码讲一讲？"
      },
      {
        id: "m4",
        sender: "assistant",
        timestamp: "Yesterday",
        parts: [
          {
            agent: "coordinator",
            title: "计智引擎 (综合协调)",
            content: "这个问题属于数据结构的高难度知识点。我已调度 **TheoryAgent** 帮您解构左旋的指针变换图解，并让 **CodeAgent** 编写出极其直观的 C 代码实现指针变更，最后由 **ReviewAgent** 给出记忆口诀。"
          },
          {
            agent: "TheoryAgent",
            title: "TheoryAgent (学术理论智能体)",
            content: "#### 1. 左旋 (Left Rotate) 的本质与图解\n\n左旋是以某个节点 $X$ 及其右孩子 $Y$ 为支点，使 $Y$ 成为新的根，而 $X$ 降为 $Y$ 的左孩子。旋转**必须保持二叉搜索树的性质不变**（即左子树 < 根 < 右子树）。\n\n旋转前关系：$X < \\beta < Y$\n```\n        X                      Y\n       / \\                    / \\\n      α   Y       ===>       X   γ\n         / \\                / \\\n        β   γ              α   β\n```\n**指针变化的三个核心绑定关系：**\n1. $X$ 的右孩子指向 $\\beta$ (即 $Y$ 的左孩子)。\n2. $\\beta$ 的父亲指向 $X$ (若 $\\beta$ 非空)。\n3. $Y$ 顶替原 $X$ 的位置（其父亲变成原 $X$ 的父亲）。\n4. $Y$ 的左孩子重新指向 $X$，$X$ 的父亲变成 $Y$。"
          },
          {
            agent: "CodeAgent",
            title: "CodeAgent (代码工程智能体)",
            content: "#### 2. C 语言经典左旋代码实现\n\n以下是经典教科书级别的左旋指针操作实现，请注意每一步指针绑定的先后顺序：",
            code: `typedef struct Node {
    int key;
    struct Node *left;
    struct Node *right;
    struct Node *parent;
    int color; // 0: BLACK, 1: RED
} Node;

void leftRotate(Node **root, Node *x) {
    Node *y = x->right; // 记下右孩子 y
    
    // 1. 将 y 的左子树 beta 挂到 x 的右侧
    x->right = y->left;
    if (y->left != NULL) {
        y->left->parent = x;
    }
    
    // 2. 将 y 的父亲指向 x 的父亲
    y->parent = x->parent;
    if (x->parent == NULL) {
        *root = y; // x 原来是根节点，旋转后 y 变为根
    } else if (x == x->parent->left) {
        x->parent->left = y;
    } else {
        x->parent->right = y;
    }
    
    // 3. 将 x 挂到 y 的左侧
    y->left = x;
    x->parent = y;
}`,
            codeLanguage: "c"
          },
          {
            agent: "ReviewAgent",
            title: "ReviewAgent (记忆辅助与审查智能体)",
            content: "#### 3. 终极记忆口诀\n\n想要闭眼写出左旋，只需记住「**右子提为父，右子之左，变我之右；我挂右子之左，父辈交接完成**」。\n- **第一步**：右子的左子，变成我右臂（`x->right = y->left`）。\n- **第二步**：右子接替我，向上认父母（`y->parent = x->parent`）。\n- **第三步**：我变右子左，向下孝敬他（`y->left = x`）。"
          }
        ]
      }
    ]
  }
];

export const initialErrorRecords: ErrorRecord[] = [
  {
    id: "err-1",
    title: "二叉树的非递归中序遍历（栈操作边界溢出）",
    course: "数据结构与算法",
    question: "在使用辅助栈实现二叉树的非递归中序遍历时，下面给出的代码片段中，由于漏掉了某个核心状态转移，会导致部分子树节点无法入栈而陷入死循环或遍历不全。请问应当在 marked 标记处补充什么逻辑？",
    code: `void inOrder(TreeNode* root) {
    stack<TreeNode*> s;
    TreeNode* curr = root;
    while (curr != NULL || !s.empty()) {
        while (curr != NULL) {
            s.push(curr);
            curr = curr->left;
        }
        curr = s.top();
        s.pop();
        print(curr->val);
        
        // --- MISSING SECTION ---
        // [⚠️ BUG HERE: curr = ???]
    }
}`,
    options: [
      "curr = curr->left;",
      "curr = curr->right;",
      "curr = NULL;",
      "s.push(curr->right);"
    ],
    userAnswer: 2, // User selected curr = NULL (wrong)
    correctAnswer: 1, // Correct is curr = curr->right
    diagnosis: {
      rootCause: "在访问完当前根节点并弹出栈后，中序遍历的下一步是转向其右子树。如果漏掉了 'curr = curr->right'，下一次循环时 `curr` 为 `NULL`（因为你先前已经把所有左节点入栈并弹出，且无路可走），程序将会从栈中弹出父节点，然而由于未更新 `curr` 的指向，你会丢失右子树的所有数据，或者在某些不严谨的控制流中因为无法推动 `curr` 而导致无线循环或提前终止。",
      cognitiveTrap: "误认为当访问完一个节点后需要将其设为 NULL 以强迫外层循环从栈中读取。实际上，指针 `curr` 承担着探索者的角色：当向左走到尽头并访问该点后，必须跨出一步转向其右子树，从而开始新一轮的「向左走到底」。",
      learningPathAdjustment: "建议到「AI智能问答」板块输入关键词「非递归中序遍历 栈图解」，通过视觉化堆栈动画理解左、根、右在栈中分配的生命周期。计智引擎已将「迭代遍历深度优先搜索」列入您的当前重点补足包。"
    },
    similarRecommendations: ["1. 非递归后序遍历的双栈实现与标记法 (高难度)", "2. 二叉树的 Morris 遍历算法 (O(1)空间复杂度)"],
    remediated: false,
    timestamp: "2026-07-02"
  },
  {
    id: "err-2",
    title: "多进程死锁与信号量分配（银行家算法边界）",
    course: "操作系统",
    question: "三个进程P1, P2, P3共同争夺同类独占资源。系统中有该类资源共11个。已知进程需求最大量分别是：P1需5个，P2需4个，P3需 X 个。为了保证系统绝不会发生死锁，X 的最大值应当是多少？",
    code: `系统中资源总量 R = 11
P1 Max_Need = 5
P2 Max_Need = 4
P3 Max_Need = X

死锁的最坏临界状态 (Extreme Deadlock State):
每个进程都持有了比其最大需求少1个的资源，且系统没有多余资源分配，导致永久等待。`,
    options: [
      "3",
      "4",
      "5",
      "6"
    ],
    userAnswer: 3, // User selected 6 (wrong)
    correctAnswer: 1, // Correct is 4
    diagnosis: {
      rootCause: "系统不发生死锁的临界条件是：所有进程都分到了比最大需求少1个的资源，此时系统只要再多出1个资源，就能让其中某个进程顺利完成并释放其所有占有资源。\n即：(Max1 - 1) + (Max2 - 1) + (Max3 - 1) < Total\n带入数据：(5 - 1) + (4 - 1) + (X - 1) < 11\n化简：4 + 3 + X - 1 < 11 => X + 6 < 11 => X < 5。\n因此 X 的最大整型取值是 4。",
      cognitiveTrap: "公式套用错误或计算时漏掉了“-1”的边界。误将所有最大需求相加直接等于资源数，忽略了进程可以串行释放资源这一根本特性，在死锁最差边界计算上出现偏差。",
      learningPathAdjustment: "需要强化对「资源分配图」和「死锁充要条件」的推导。已在您的「个性化路径」中增加两道关于死锁避免与银行家算法的推演题。"
    },
    similarRecommendations: ["1. 银行家算法中的安全序列计算与可分配性检验", "2. 哲学家就餐问题的死锁预防三种策略代码实现"],
    remediated: true,
    timestamp: "2026-06-28"
  }
];
