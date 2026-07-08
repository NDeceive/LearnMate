import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini SDK initialized successfully server-side.");
  } catch (error) {
    console.error("Failed to initialize Gemini SDK:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY found, running in mock/fallback mode.");
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", aiEnabled: !!ai });
});

// 2. Chat endpoint (Multi-Agent Coordinator)
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Fallback response if Gemini isn't configured
  const getFallbackResponse = (query: string) => {
    const q = query.toLowerCase();
    if (q.includes("并发") || q.includes("进程") || q.includes("死锁") || q.includes("pv")) {
      return [
        {
          agent: "coordinator",
          title: "计智引擎 (综合协调)",
          content: "已协调操作系统领域的智能体为您解答。当前问题涉及进程同步与信号量互斥控制。正在组织 TheoryAgent 提供死锁充要条件，CodeAgent 提供经典哲学家就餐或死锁防御代码。"
        },
        {
          agent: "TheoryAgent",
          title: "TheoryAgent (学术理论智能体)",
          content: "#### 1. 信号量与进程同步机理\n在操作系统中，信号量（Semaphore）是一种重要的同步工具，用于控制对共享资源的访问。信号量 $S$ 是一个整型变量，除了初始化外，仅能通过两个标准原子操作 $P$（Wait）和 $V$（Signal）来访问。\n\n**死锁产生的四个必要条件：**\n1. **互斥条件**：资源是临界资源，一次仅允许一个进程使用。\n2. **占有且等待**：进程至少持有一个资源，并等待获取其他被占用的资源。\n3. **不可剥夺条件**：资源只能由占有它的进程自愿释放。\n4. **循环等待条件**：存在一个闭合的进程等待链。"
        },
        {
          agent: "CodeAgent",
          title: "CodeAgent (代码工程智能体)",
          content: "#### 2. C语言实现信号量控制下的死锁预防机制\n在并发编程中，我们可以通过「资源有序分配法」来破坏循环等待条件。以下代码展示了如何按递增顺序请求信号量，以优雅避开经典的哲学家就餐问题死锁：",
          code: `#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

pthread_mutex_t chopstick[5];

void* philosopher(void* num) {
    int id = *(int*)num;
    int left = id;
    int right = (id + 1) % 5;

    // 资源有序分配：规定先拿小编号的筷子，再拿大编号的筷子
    int first = (left < right) ? left : right;
    int second = (left < right) ? right : left;

    while (1) {
        printf("Philosopher %d is thinking...\\n", id);
        sleep(1);

        pthread_mutex_lock(&chopstick[first]);
        printf("Philosopher %d picked up chopstick %d (first)\\n", id, first);

        pthread_mutex_lock(&chopstick[second]);
        printf("Philosopher %d picked up chopstick %d (second)\\n", id, second);

        // 进餐
        printf("Philosopher %d is eating...\\n", id);
        sleep(1);

        pthread_mutex_unlock(&chopstick[second]);
        pthread_mutex_unlock(&chopstick[first]);
        printf("Philosopher %d finished eating\\n", id);
    }
}`,
          codeLanguage: "c"
        },
        {
          agent: "ReviewAgent",
          title: "ReviewAgent (代码审查与评估智能体)",
          content: "#### 3. 协作审查报告\n- **优点**：此策略使得不存在任何循环等待环路（如1等待2，2等待3，...，4等待0），因此绝对不会死锁。\n- **替代方案**：亦可限制进餐人数（最多4人同时坐下），或使用 `pthread_mutex_trylock` 实现超时退出重试。在分布式系统下，建议采用基于租约 (Lease) 或两阶段锁 (2PL) 协议实现更健壮的并发控制。"
        }
      ];
    }

    // Default general fallback
    return [
      {
        agent: "coordinator",
        title: "计智引擎 (综合协调)",
        content: `您好！由于尚未配置真实的 GEMINI_API_KEY（您可在 [Settings > Secrets] 菜单中进行配置），我作为综合协调智能体，带领我的学术与代码子智能体为您呈现此模拟解答。您输入的请求为: "${query}"`
      },
      {
        agent: "TheoryAgent",
        title: "TheoryAgent (学术理论智能体)",
        content: `#### 学术理论诊断\n\n针对您的学术疑问，我们需要回溯到计算机科学的基本原理上。对于您提问的知识点，在核心专业教材（如《算法导论》、《深入理解计算机系统》）中均有深度定义：\n\n1. **核心模型建立**：所有工程问题本质上都是状态空间的变换。在分析时，首先定义输入规模 $N$，从而确立算法演进的边界条件。\n2. **空间与时间置换**：算法设计的精髓在于时空权衡（Time-Space Tradeoff）。例如，哈希表用 $O(n)$ 空间换取了 $O(1)$ 时间；而二分搜索则利用已经排好序的确定性结构，在 $O(1)$ 辅助空间下实现 $O(\\log n)$ 时间检索。`
      },
      {
        agent: "CodeAgent",
        title: "CodeAgent (代码工程智能体)",
        content: "#### 算法逻辑模拟与最佳实践\n\n为了展示该知识点的工程表达，我们在 C++/TypeScript 中给出高可读性、高防错性的典型代码模板：",
        code: `// 计算机专业课程核心算法实现模板
#include <iostream>
#include <vector>
#include <unordered_map>

class Solution {
public:
    // 计算核心函数，引入缓存支持 O(1) 或 O(n) 查询
    int solveCore(int n, std::vector<int>& memo) {
        // 1. 边界防御
        if (n < 0) return 0;
        if (n == 0 || n == 1) return n;
        
        // 2. 查表阻断
        if (memo[n] != -1) return memo[n];
        
        // 3. 状态转移递推
        memo[n] = solveCore(n - 1, memo) + solveCore(n - 2, memo);
        return memo[n];
    }
};`,
        codeLanguage: "cpp"
      },
      {
        agent: "ReviewAgent",
        title: "ReviewAgent (代码审查与评估智能体)",
        content: "#### 评估与温盘建议\n- **边界情况 (Edge Cases)**：需警惕 $N$ 很大时的整型溢出（Integer Overflow），建议在工程实践中使用 64 位无符号长整型 (`uint64_t`)，或按大数模 $10^9+7$ 运算。\n- **练习建议**：该结构同属于二叉树的分治与极值求解。建议下一步练习：LeetCode 104 二叉树的最大深度、LeetCode 70 爬楼梯问题。"
      }
    ];
  };

  if (!ai) {
    return res.json({ parts: getFallbackResponse(message) });
  }

  try {
    const formattedHistory = (history || []).map((h: any) => {
      return `Role: ${h.sender === 'user' ? 'User' : 'Assistant'}\nContent: ${h.text || JSON.stringify(h.parts)}`;
    }).join("\n\n");

    const prompt = `You are the back-end cognitive coordinator of JiZhi Engine (计智引擎), an AI-driven multi-agent personalized learning resource generation platform for CS professional courses (C Programming, Data Structures, Operating Systems, Computer Organization, Networks).

The student has sent a message. Your job is to collaborate with three virtual sub-agents under you and output a single, unified JSON array of response parts representing the cooperative response.

Your sub-agents are:
1. "coordinator": 计智引擎 (综合协调) - Speaks first. Acknowledges user request, routes the cognitive tasks, and summarizes.
2. "TheoryAgent": TheoryAgent (学术理论智能体) - Focuses on core CS theories, definitions, mathematically precise complexity analyses ($O(n)$, $O(\\log n)$ etc.), concepts, and textbook-style breakdowns.
3. "CodeAgent": CodeAgent (代码工程智能体) - Focuses on writing exceptionally clean, production-grade, bug-free C, C++, Python, or Java code blocks to demonstrate the concept. Always includes helpful comments.
4. "ReviewAgent": ReviewAgent (代码审查与评估智能体) - Conducts a strict review of the code, lists edge cases, offers memory/performance trade-offs, and provides quick formulas or recovery suggestions.

You MUST respond strictly with a valid JSON array. Do NOT wrap the JSON in Markdown block formatting like \`\`\`json \`\`\`. Output ONLY raw valid JSON text so it can be parsed directly.

Here is the JSON schema you MUST follow:
[
  {
    "agent": "coordinator",
    "title": "计智引擎 (综合协调)",
    "content": "Brief overview and agent routing message in Chinese."
  },
  {
    "agent": "TheoryAgent",
    "title": "TheoryAgent (学术理论智能体)",
    "content": "Deep theoretical breakdown of the concepts in Chinese, using markdown and LaTeX math notation if needed."
  },
  {
    "agent": "CodeAgent",
    "title": "CodeAgent (代码工程智能体)",
    "content": "Explanation of the code in Chinese.",
    "code": "Actual code block here",
    "codeLanguage": "c" // or cpp, python, etc.
  },
  {
    "agent": "ReviewAgent",
    "title": "ReviewAgent (代码审查与评估智能体)",
    "content": "Strict analysis of limitations, edge cases, space/time complexities table, and memorization tips in Chinese."
  }
]

Do not omit any agent. Give rich, high-quality, professional CS teaching answers. Make sure all JSON strings are properly escaped (especially backslashes in code, LaTeX formulas like \\\\phi or \\\\beta, and newlines).

Here is the conversation history:
${formattedHistory}

Student's new message:
${message}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parts = JSON.parse(cleanText);
    return res.json({ parts });

  } catch (err: any) {
    console.error("Gemini Chat API Error:", err);
    // Graceful fallback on API error
    return res.json({ parts: getFallbackResponse(message), apiError: err.message });
  }
});

// 3. Personalized Resource Generator
app.post("/api/generate-resource", async (req, res) => {
  const { subject, topic, resourceType, difficulty } = req.body;

  if (!subject || !topic || !resourceType) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const getFallbackResource = () => {
    return `## 🎓 计智引擎个性化学习资源：${topic}

> **科目**：${subject} | **难度级别**：${difficulty || '中等'} | **资源类型**：${resourceType}
> *注：当前处于离线仿真模式。您可以随时配置 API Key 获得全新的动态大纲生成支持。*

---

### 一、 核心概念与多维拆解
在《${subject}》课程体系中，**${topic}** 占据着极其核心的地位。通常被定义为系统设计的关键基石。

#### 1. 概念基准与数学模型
根据权威学术文献定义，该结构可以建模为一个状态转移图或特征集合：
$$S = \\{ D, R, P \\}$$
其中：
- $D$ 代表核心数据元素。
- $R$ 代表数据关联关系。
- $P$ 代表定义其上的核心操作函数。

#### 2. 学术痛点分析
学生在此知识点上常犯的错误可总结为三点：
1. **边界条件处理不当**：例如多线程未加锁保护，或者指针操作前未判空，导致段错误 (\`Segment Fault\`)。
2. **时空平衡失误**：在需要 $O(1)$ 高频读取的场景下误用了 $O(n)$ 线性搜索结构，导致整体系统吞吐量雪崩。
3. **缓存未命中与内存碎片**：链表结构的连续物理内存不友好性导致 CPU L1/L2 缓存频繁失效。

---

### 二、 核心算法与工程源码剖析
为了实现最优的运行效率，通常采用高度内联的结构控制。以下是我们在 **${difficulty || 'Intermediate'}** 难度下推举的高质量参考实现：

\`\`\`cpp
// 计智引擎特制：高质量 C++ 实现模板
#include <iostream>
#include <vector>
#include <memory>

template <typename T>
class SmartEngineNode {
private:
    T data;
    std::vector<std::shared_ptr<SmartEngineNode<T>>> children;

public:
    explicit SmartEngineNode(T val) : data(val) {}

    void addChild(const std::shared_ptr<SmartEngineNode<T>>& child) {
        if (child == nullptr) {
            throw std::invalid_argument("子节点不能为空指针！");
        }
        children.push_back(child);
    }

    const T& getData() const { return data; }
    
    // 执行深度遍历
    void depthFirstTraverse(int depth = 0) {
        for (int i = 0; i < depth; ++i) std::cout << "  ";
        std::cout << "|-- " << data << std::endl;
        for (const auto& child : children) {
            child->depthFirstTraverse(depth + 1);
        }
    }
};
\`\`\`

---

### 三、 思考与精炼专项练习
为了检测您的吸收情况，请尝试完成以下课后温盘习题：

1. **[基础思考题]**：分析在最坏情况下，此算法的空间复杂度是否会退化为 $O(N)$？如何通过尾递归或者迭代栈防止系统栈溢出？
2. **[工程实战题]**：如果引入智能指针 (\`std::shared_ptr\`)，在相互引用时是否会造成「循环引用」导致内存泄漏？该如何使用 \`std::weak_ptr\` 加以预防？
3. **[性能优化题]**：在大规模高并发环境下，如果要对此结构实施线程安全锁，应该对整棵树加锁，还是引入「分段锁 (Segment Locking)」？`;
  };

  if (!ai) {
    return res.json({ content: getFallbackResource() });
  }

  try {
    const prompt = `You are an elite Computer Science Professor and curriculum architect. Your task is to generate an incredibly comprehensive, textbook-quality personalized educational study resource on the topic of "${topic}" under the course "${subject}".

Resource Configuration:
- Resource Type: ${resourceType} (e.g. Lecture Notes, Homework with Solutions, Case Study, or condensed Cheat Sheet)
- Difficulty Level: ${difficulty}

You must write a deeply pedagogical, academic, and practical resource in Chinese (简体中文).
Make sure to include:
1. Core theoretical explanations with mathematical and algorithmic formulations (use LaTeX math like $$S = \\{D, R, P\\}$$ for display and $O(n)$ inline).
2. Complete, highly structured, syntactically correct code blocks in C, C++, or Python with generous comments to illustrate the concepts.
3. Common bugs, common misconceptions, edge cases, and architectural best practices.
4. Deep review questions, practice problems, or code exercises (with explanations for homework).

Write this resource in Markdown formatting. Do not output anything else but the Markdown text itself. Ensure to start with a main heading, and structure it beautifully with subheadings (##) and visual highlights.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview", // Use pro preview for high-quality CS textbooks
      contents: prompt,
    });

    return res.json({ content: response.text || getFallbackResource() });

  } catch (err: any) {
    console.error("Gemini Resource Gen Error:", err);
    return res.json({ content: getFallbackResource(), apiError: err.message });
  }
});

// 4. Adaptive Quiz Question Generator (Generates fresh questions matching difficulty)
app.post("/api/generate-question", async (req, res) => {
  const { domain, difficulty } = req.body;

  const getFallbackQuestion = () => {
    return {
      id: "gen-" + Math.random().toString(36).substr(2, 9),
      domain: domain || "数据结构与算法",
      question: `在大型分布式存储系统的索引设计中，对于经常需要范围查询（Range Query）且内存容量有限的场景，通常会优先选择以下哪种数据结构？`,
      code: `// 备选存储引擎选型考量：
// A. 散列表 (Hash Table)
// B. B+ 树 (B+ Tree)
// C. 红黑树 (Red-Black Tree)
// D. 最小堆 (Min Heap)`,
      options: [
        "A. 散列表：能实现 O(1) 的超高随机检索，空间紧凑",
        "B. B+ 树：所有叶子节点构成有序双向链表，极度友好于范围查询，且叶子节点均在磁盘上，内存占用少",
        "C. 红黑树：高度自平衡，适合作为内存中的高速缓存索引",
        "D. 最小堆：能以 O(1) 的时间获取最小元素，有利于优先级检索"
      ],
      answerIndex: 1, // B
      explanation: "对于需要频繁范围查询（如找 key 处于 10 到 100 之间的所有记录）且磁盘 I/O 是主要制约瓶颈的场景，B+ 树是黄金标准。B+ 树非叶子节点只存储索引，能拥有极大的扇出（Fan-out），从而树高度极低（通常3-4层），使得定位首个元素只需极少磁盘 I/O；且所有叶子节点首尾相连构成有序双向链表，范围扫描时只需在叶子层沿链表遍历即可。相比之下，哈希表无法支持范围查询；红黑树在磁盘上表现极差，且不便进行顺序区间扫描。",
      hint: "重点关注「范围查询（顺序扫描）」和「外存/磁盘友好」这两个限制。想想为什么大部分数据库（如 MySQL Innodb）都选择它作为索引结构。"
    };
  };

  if (!ai) {
    return res.json({ question: getFallbackQuestion() });
  }

  try {
    const prompt = `You are a curriculum evaluator for a university CS program. Generate a unique, challenging multiple-choice exam question in Chinese (简体中文) about "${domain || 'Data Structures and Algorithms'}".

Target Difficulty: ${difficulty || 'advanced'}

The JSON schema you MUST strictly follow:
{
  "question": "The question body. It should be academically rigorous and challenging.",
  "code": "Optional pre-formatted code block (in C, C++, or pseudocode) representing the context of the question or algorithm.",
  "options": [
    "Option A...",
    "Option B...",
    "Option C...",
    "Option D..."
  ],
  "answerIndex": 0, // Integer (0 to 3) representing the index of the correct option
  "explanation": "Extremely detailed, step-by-step academic explanation of why this option is correct and why other options are wrong.",
  "hint": "A guiding conceptual hint to help students when they request assistance."
}

Ensure the question is creative and different from standard elementary questions. Output ONLY the raw JSON block, do not include any Markdown wrap.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleanText);

    // Assign a unique id
    parsed.id = "gen-" + Math.random().toString(36).substr(2, 9);
    parsed.domain = domain || "数据结构与算法";

    return res.json({ question: parsed });

  } catch (err: any) {
    console.error("Gemini Question Gen Error:", err);
    return res.json({ question: getFallbackQuestion(), apiError: err.message });
  }
});

// AI Quiz Hint generator
app.post("/api/quiz-hint", async (req, res) => {
  const { question, code, options } = req.body;

  if (!ai) {
    return res.json({ hint: "提示：通过画图推演核心步骤。如果是二叉树，试着手绘其拓扑形态；如果是进程，试着推敲资源占用的死锁边界。" });
  }

  try {
    const prompt = `You are a supportive academic assistant. The student is stuck on a multiple-choice CS question:
Question: ${question}
Code context: ${code || 'None'}
Options: ${JSON.stringify(options)}

Provide a very short, encouraging, and highly educational conceptual tip (in Chinese) that points them in the right direction without giving away the exact answer index. Be concise (max 3 sentences).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return res.json({ hint: response.text || "提示：画出状态图推演。" });
  } catch (err) {
    return res.json({ hint: "提示：试着反向排除不合逻辑的选项，并对临界条件进行极值推导。" });
  }
});

// Setup Vite Dev Server / Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Serve index.html for SPA routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production files from dist/.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JiZhi Engine full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
