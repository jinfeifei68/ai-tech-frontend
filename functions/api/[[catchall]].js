/**
 * AI科技前沿 — Cloudflare Pages Functions API
 * 统一入口：/api/*
 * 
 * 路由：
 *   POST /api/auth/login    — 管理员登录
 *   GET  /api/auth/verify   — 验证 token
 *   GET  /api/content       — 读取内容列表（公开，不含正文）
 *   GET  /api/article?id=   — 读取单篇文章详情（公开，含正文 + 阅读量+1）
 *   POST /api/content       — 新增内容（需认证）
 *   PUT  /api/content       — 更新内容（需认证）
 *   DELETE /api/content     — 删除内容（需认证）
 *   POST /api/init          — 初始化种子数据（需认证）
 *   POST /api/community/join      — 加入社区（公开，写 members）
 *   POST /api/community/like      — 讨论点赞（公开，IP 去重）
 *   POST /api/community/comment   — 提交评论（公开，进待审）
 *   GET  /api/community/comments  — 已审核评论（公开）
 *   GET  /api/community/admin     — 社区管理数据（需认证：members/pending/comments）
 *   POST /api/community/approve   — 审核通过评论（需认证）
 *   DELETE /api/community/member  — 删除成员（需认证）
 *   DELETE /api/community/comment — 删除评论（需认证）
 * 
 * KV 数据结构：
 *   articles          — 文章元数据数组（不含正文）
 *   article:<id>      — 单篇文章正文（Markdown 字符串）
 *   skills/videos/discussions/contributors/site_config — 其他内容
 *   members           — 社区注册成员 [{id, nickname, email, date}]
 *   pending_comments  — 待审核评论 [{id, discussionId, nickname, content, date}]
 *   comments          — 已审核评论（同上结构，前台公开）
 *   liked:<id>        — 讨论点赞 IP 去重 {ips: []}
 *   comment_guard:<ip>— 评论频率限制（120 秒过期）
 */

/* ===== CORS ===== */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

/* ===== Auth ===== */
async function verifyAuth(request, env) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  if (!token) return false;
  const stored = await env.CONTENT_KV.get("auth:token:" + token);
  if (!stored) return false;
  try {
    const session = JSON.parse(stored);
    if (session.expires && Date.now() > session.expires) {
      await env.CONTENT_KV.delete("auth:token:" + token);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function generateToken() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

/* ===== KV 安全读取 ===== */
async function kvGetJSON(env, key, fallback) {
  try {
    const val = await env.CONTENT_KV.get(key, "json");
    return val !== null && val !== undefined ? val : fallback;
  } catch {
    try {
      const raw = await env.CONTENT_KV.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
}

/* ===== 种子数据 ===== */
const SEED = {
  articles: [
    {
      id: "a1",
      category: "model",
      featured: true,
      badge: "热门",
      badgeType: "hot",
      image: "https://picsum.photos/seed/ai-model/800/450",
      title: "下一代多模态大模型发布：文本、图像、视频统一理解能力大幅提升",
      excerpt: "新模型在多项基准测试中刷新纪录，支持超长上下文窗口，可同时处理文本、图像和视频输入，推理速度较前代提升 3 倍……",
      content: "## 多模态统一架构\n\n研究团队发布了全新的多模态大模型，采用统一 Transformer 架构，可同时处理文本、图像和视频输入。\n\n### 核心突破\n\n- **超长上下文**：支持 128K token 上下文窗口，可处理整本书籍或长视频\n- **多模态融合**：文本、图像、视频不再需要独立模型，统一编码器实现跨模态理解\n- **推理加速**：通过 KV Cache 优化和投机解码，推理速度较前代提升 3 倍\n\n### 基准测试表现\n\n| 基准测试 | 前代得分 | 新模型得分 | 提升 |\n|---------|---------|-----------|------|\n| MMLU | 82.3 | 89.7 | +7.4 |\n| MMMU | 55.1 | 68.2 | +13.1 |\n| Video-MME | 45.3 | 62.8 | +17.5 |\n\n### 应用前景\n\n该模型在医疗影像分析、自动驾驶场景理解、视频内容审核等领域具有广阔应用前景。团队表示将在近期开源模型权重，届时开发者可在本地部署和微调。",
      date: "2026-08-16",
      reads: "12.5k",
    },
    {
      id: "a2",
      category: "application",
      featured: false,
      badge: "应用",
      badgeType: "",
      image: "https://picsum.photos/seed/ai-app/600/400",
      title: "AI 编程助手全面升级：代码生成准确率突破 92%",
      excerpt: "支持 40+ 编程语言，新增项目级上下文理解和自动测试生成功能……",
      content: "## AI 编程助手新版本发布\n\n全新版本的 AI 编程助手正式发布，代码生成准确率突破 92%，支持 40+ 编程语言。\n\n### 新功能亮点\n\n- **项目级上下文理解**：不再局限于单文件，可理解整个项目结构和依赖关系\n- **自动测试生成**：根据函数实现自动生成单元测试，覆盖率达到 85%+\n- **智能重构建议**：识别代码异味，提供重构建议并自动执行\n- **多文件协同编辑**：一次修改可跨多个文件同步更新\n\n### 性能对比\n\n在 HumanEval 基准测试中，新版本达到 92.3% 的通过率，相比上一版本的 78.6% 有显著提升。\n\n### 使用建议\n\n建议结合代码审查流程使用，AI 生成的代码仍需人工审核。对于复杂业务逻辑，可将需求拆分为小任务逐步生成。",
      date: "2026-08-15",
      reads: "8.3k",
    },
    {
      id: "a3",
      category: "research",
      featured: false,
      badge: "新",
      badgeType: "new",
      image: "https://picsum.photos/seed/ai-research/600/400",
      title: "新型注意力机制提出：计算复杂度降低至线性级别",
      excerpt: "研究团队提出 Linear Attention 变体，在保持性能的同时大幅降低计算开销……",
      content: "## Linear Attention 新进展\n\n研究团队提出了一种新型线性注意力机制，将传统 Self-Attention 的 O(n²) 计算复杂度降低至 O(n)。\n\n### 技术原理\n\n传统 Self-Attention 的计算复杂度为 O(n² × d)，其中 n 为序列长度。新方法通过分解注意力矩阵，将计算重构为线性操作。\n\n### 实验结果\n\n- 在 4K 序列长度下，推理速度提升 5.8 倍\n- 在 32K 序列长度下，推理速度提升 23 倍\n- 性能损失仅 1.2%（MMLU 基准）\n\n### 意义\n\n这一突破意味着在消费级 GPU 上运行超长上下文模型成为可能，对降低大模型推理成本具有重要意义。",
      date: "2026-08-14",
      reads: "5.7k",
    },
    {
      id: "a4",
      category: "industry",
      featured: false,
      badge: "产业",
      badgeType: "",
      image: "https://picsum.photos/seed/ai-industry/600/400",
      title: "全球 AI 芯片市场规模预计 2027 年突破 2000 亿美元",
      excerpt: "最新行业报告显示，AI 算力需求持续高速增长，芯片产业迎来新一轮投资热潮……",
      content: "## AI 芯片市场持续增长\n\n根据最新行业报告，全球 AI 芯片市场规模预计在 2027 年突破 2000 亿美元。\n\n### 市场驱动力\n\n1. **大模型训练需求**：参数量从百亿到万亿级增长，算力需求指数级上升\n2. **推理市场爆发**：AI 应用落地加速，推理芯片需求超过训练芯片\n3. **边缘 AI 崛起**：手机、汽车、IoT 设备端侧 AI 芯片需求激增\n\n### 竞争格局\n\nNVIDIA 仍占据数据中心 AI 芯片 80% 以上市场份额，但 AMD、Intel 及国产芯片厂商正在加速追赶。",
      date: "2026-08-13",
      reads: "9.1k",
    },
    {
      id: "a5",
      category: "model",
      featured: false,
      badge: "大模型",
      badgeType: "",
      image: "https://picsum.photos/seed/ai-agi/600/400",
      title: "开源大模型生态繁荣：新基座模型参数量达 700B",
      excerpt: "完全开源的商业可用大模型发布，支持本地部署与微调……",
      content: "## 700B 开源基座模型发布\n\n全新的 700B 参数开源大模型正式发布，采用 MoE 架构，激活参数仅 35B。\n\n### 开源协议\n\n采用 Apache 2.0 协议，允许商业使用、修改和分发。\n\n### 技术特点\n\n- MoE 架构：8 个专家模块，每次推理激活 1 个\n- 支持 32K 上下文\n- 多语言支持：中英日韩等 20+ 语言\n- 内置安全对齐\n\n### 部署要求\n\n- 全精度推理：需要 4×A100 80G\n- INT8 量化：需要 2×A100 80G\n- INT4 量化：可在单张 A100 上运行",
      date: "2026-08-12",
      reads: "15.2k",
    },
    {
      id: "a6",
      category: "application",
      featured: false,
      badge: "应用",
      badgeType: "",
      image: "https://picsum.photos/seed/ai-medical/600/400",
      title: "AI 辅助医疗诊断系统获准进入临床试验",
      excerpt: "多模态 AI 系统在影像诊断中准确率达到专家级水平……",
      content: "## AI 医疗诊断进入临床\n\nFDA 批准首款 AI 辅助医疗诊断系统进入临床试验阶段。\n\n### 系统能力\n\n- CT/MRI 影像分析：准确率 96.8%，超过放射科医生平均水平\n- 病理切片识别：支持 50+ 癌症类型筛查\n- 多模态融合：结合影像、病历和检验数据综合诊断\n\n### 临床试验计划\n\n将在 15 家三甲医院开展为期 12 个月的临床试验，预计覆盖 10,000+ 病例。",
      date: "2026-08-11",
      reads: "6.8k",
    },
  ],
  skills: [
    {
      id: "s1",
      path: "python",
      icon: "🐍",
      level: "入门",
      title: "Python 异步编程完全指南",
      desc: "深入理解 async/await、事件循环、协程调度，掌握高并发编程核心技能。",
      tags: ["asyncio", "协程", "并发"],
      duration: "⏱ 45 分钟",
      content: "## 为什么需要异步编程\n\n在 IO 密集型场景（网络请求、数据库查询、文件读写）中，同步代码会阻塞在等待上，异步编程可以让单线程在等待时切换去处理其他任务，成倍提升吞吐量。\n\n### 核心概念\n\n- **协程 (Coroutine)**：用 `async def` 定义的函数，可以在执行中暂停和恢复\n- **事件循环 (Event Loop)**：调度器，负责在协程之间切换\n- **await**：挂起当前协程，把控制权交还事件循环\n\n### 快速上手\n\n```python\nimport asyncio\n\nasync def fetch_data(name, delay):\n    print(f\"开始获取 {name}\")\n    await asyncio.sleep(delay)  # 模拟 IO 等待\n    print(f\"{name} 完成\")\n    return f\"{name} 的结果\"\n\nasync def main():\n    # 并发执行 3 个任务，总耗时 ≈ 最长的那个\n    results = await asyncio.gather(\n        fetch_data(\"任务A\", 2),\n        fetch_data(\"任务B\", 3),\n        fetch_data(\"任务C\", 1),\n    )\n    print(results)\n\nasyncio.run(main())\n```\n\n### 常见坑\n\n1. **忘记 await**：协程不 await 不会真正执行\n2. **在异步函数中使用同步阻塞调用**（如 `time.sleep`）：会卡死整个事件循环，改用 `asyncio.sleep`\n3. **CPU 密集任务不适合 asyncio**：应使用 `ProcessPoolExecutor`\n\n### 学习建议\n\n先掌握 `asyncio.gather` 和 `asyncio.TaskGroup`，再学习超时控制 (`wait_for`)、信号量 (`Semaphore`) 限流等进阶用法。",
    },
    {
      id: "s2",
      path: "ml",
      icon: "🧠",
      level: "进阶",
      title: "从零实现梯度下降算法",
      desc: "手写梯度下降与反向传播，理解神经网络优化的数学本质。",
      tags: ["梯度下降", "优化", "NumPy"],
      duration: "⏱ 60 分钟",
      content: "## 梯度下降的本质\n\n梯度下降是一种迭代优化算法：沿着损失函数下降最快的方向（负梯度）一小步一小步地走，直到到达最低点。\n\n### 数学形式\n\n参数更新公式：`θ = θ - α · ∇L(θ)`，其中 α 是学习率。\n\n### NumPy 实现\n\n```python\nimport numpy as np\n\n# 目标：拟合 y = 2x + 1\nX = np.array([1, 2, 3, 4], dtype=float)\ny = 2 * X + 1\n\nw, b = 0.0, 0.0  # 初始化参数\nlr = 0.01         # 学习率\n\nfor epoch in range(1000):\n    y_pred = w * X + b\n    error = y_pred - y\n    # 损失: MSE\n    loss = np.mean(error ** 2)\n    # 梯度\n    dw = 2 * np.mean(error * X)\n    db = 2 * np.mean(error)\n    # 更新\n    w -= lr * dw\n    b -= lr * db\n\nprint(f\"w={w:.4f}, b={b:.4f}\")  # w≈2.0, b≈1.0\n```\n\n### 三种变体\n\n| 变体 | 每次更新用的数据 | 特点 |\n|-----|----------------|------|\n| 批量 GD | 全部样本 | 稳定但慢 |\n| 随机 SGD | 单个样本 | 快但震荡大 |\n| Mini-batch | 一小批样本 | 折中，最常用 |\n\n### 关键调参技巧\n\n- 学习率过大 → 震荡不收敛；过小 → 收敛太慢\n- 学习率调度：训练后期减小学习率\n- 加动量 (Momentum) 可以冲过局部最优点",
    },
    {
      id: "s3",
      path: "dl",
      icon: "⚡",
      level: "高级",
      title: "Transformer 架构深度剖析",
      desc: "逐层拆解 Self-Attention、Multi-Head 机制与位置编码，附 PyTorch 实现。",
      tags: ["Transformer", "PyTorch", "Attention"],
      duration: "⏱ 90 分钟",
      content: "## Transformer 全景\n\nTransformer 由编码器和解码器组成，核心是 **自注意力机制 (Self-Attention)**：让序列中的每个位置都能直接「看到」其他所有位置。\n\n### Self-Attention 计算过程\n\n1. 每个词向量通过三个矩阵投影出 Q（查询）、K（键）、V（值）\n2. 计算注意力分数：`Score = QKᵀ / √d_k`\n3. Softmax 归一化后与 V 加权求和：`Output = softmax(QKᵀ/√d_k) · V`\n\n### PyTorch 简化实现\n\n```python\nimport torch\nimport torch.nn.functional as F\n\ndef self_attention(x, Wq, Wk, Wv):\n    Q, K, V = x @ Wq, x @ Wk, x @ Wv\n    d_k = Q.size(-1)\n    scores = Q @ K.transpose(-2, -1) / d_k ** 0.5\n    attn = F.softmax(scores, dim=-1)\n    return attn @ V\n```\n\n### 为什么需要 Multi-Head\n\n单头注意力只能捕捉一种关联模式。多头机制把向量拆到多个子空间并行做注意力，再拼接结果，让模型同时关注语法、语义、位置等不同关系。\n\n### 位置编码\n\nSelf-Attention 本身对顺序不敏感，需要给每个位置注入位置信息。经典做法是正弦位置编码，现代模型多用 RoPE（旋转位置编码）。\n\n### 延伸阅读\n\n- Attention Is All You Need (2017)\n- 可视化工具：The Illustrated Transformer",
    },
    {
      id: "s4",
      path: "nlp",
      icon: "💬",
      level: "进阶",
      title: "RAG 检索增强生成实战",
      desc: "构建企业级知识问答系统：向量数据库 + Embedding + LLM 端到端方案。",
      tags: ["RAG", "向量检索", "LangChain"],
      duration: "⏱ 75 分钟",
      content: "## 什么是 RAG\n\nRAG（Retrieval-Augmented Generation）= 先检索、后生成。用外部知识库弥补大模型的两个短板：知识时效性差、容易幻觉。\n\n### 标准流程\n\n1. **离线索引**：文档切分 → Embedding 向量化 → 写入向量库\n2. **在线问答**：问题向量化 → 相似度检索 Top-K → 拼接 Prompt → LLM 生成答案\n\n### 最小可用示例\n\n```python\nfrom openai import OpenAI\nimport numpy as np\n\nclient = OpenAI()\n\ndef embed(texts):\n    resp = client.embeddings.create(\n        model=\"text-embedding-3-small\",\n        input=texts\n    )\n    return np.array([d.embedding for d in resp.data])\n\n# 检索最相关的文档块\nsims = embed([query]) @ doc_vectors.T\ntop_idx = sims[0].argsort()[-3:][::-1]\ncontext = \"\\n\".join(chunks[i] for i in top_idx)\n```\n\n### 提升效果的 5 个关键点\n\n1. **切分策略**：按语义段落切分比固定长度好，重叠 10%-20%\n2. **混合检索**：向量检索 + BM25 关键词检索，效果更稳\n3. **重排序 (Rerank)**：用 cross-encoder 对 Top-50 精排出 Top-5\n4. **引用溯源**：让模型标注答案来源，方便核验\n5. **评估闭环**：构建测试集，持续优化切分与检索参数",
    },
    {
      id: "s5",
      path: "deploy",
      icon: "🚀",
      level: "实战",
      title: "大模型量化部署方案对比",
      desc: "INT8/INT4 量化、LoRA 微调、vLLM 部署 — 在消费级 GPU 上跑大模型。",
      tags: ["量化", "vLLM", "推理优化"],
      duration: "⏱ 55 分钟",
      content: "## 为什么需要量化\n\nFP16 精度下 7B 模型需要约 14GB 显存，70B 需要约 140GB。量化把权重从 16 位压缩到 8 位 / 4 位，显存占用直接减半甚至降到 1/4。\n\n### 主流量化方案对比\n\n| 方案 | 位数 | 7B 显存 | 质量 | 适用场景 |\n|-----|-----|---------|------|---------|\n| FP16 | 16 | ~14 GB | 100% | 基线 |\n| INT8 (LLM.int8) | 8 | ~8 GB | ≈99% | 通用 |\n| GPTQ 4bit | 4 | ~4 GB | ≈97% | GPU 推理 |\n| GGUF Q4 (llama.cpp) | 4 | ~4 GB | ≈96% | CPU/Mac |\n| AWQ 4bit | 4 | ~4 GB | ≈98% | 高吞吐 |\n\n### vLLM 部署示例\n\n```bash\npip install vllm\n\nvllm serve Qwen/Qwen2.5-7B-Instruct-AWQ \\\n  --quantization awq \\\n  --max-model-len 8192 \\\n  --gpu-memory-utilization 0.9\n```\n\n### 选型建议\n\n- **有 A100/H100**：直接 vLLM + AWQ，吞吐最高\n- **只有消费级显卡 (24G)**：7B-14B 用 GPTQ/AWQ 4bit\n- **只有 CPU 或 Mac**：llama.cpp + GGUF\n- **追求极致显存节省**：看 QLoRA 微调方案",
    },
    {
      id: "s6",
      path: "python",
      icon: "🐍",
      level: "入门",
      title: "数据可视化：Matplotlib & Seaborn 精要",
      desc: "从折线图到热力图，掌握科研级数据可视化的核心技巧。",
      tags: ["Matplotlib", "Seaborn", "可视化"],
      duration: "⏱ 40 分钟",
      content: "## 可视化库怎么选\n\n- **Matplotlib**：基础库，控制力最强，适合定制出版级图表\n- **Seaborn**：基于 Matplotlib，一行代码出统计图，默认样式好看\n- 建议快速出图用 Seaborn，精细调整回落到 Matplotlib\n\n### 常用图表速查\n\n```python\nimport seaborn as sns\nimport matplotlib.pyplot as plt\n\n# 折线图：趋势\nsns.lineplot(data=df, x=\"month\", y=\"sales\")\n\n# 柱状图：对比\nsns.barplot(data=df, x=\"city\", y=\"gdp\")\n\n# 散点图：相关性\nsns.scatterplot(data=df, x=\"x\", y=\"y\", hue=\"label\")\n\n# 热力图：相关矩阵\nsns.heatmap(df.corr(), annot=True, cmap=\"coolwarm\")\n\n# 直方图 + 密度曲线：分布\nsns.histplot(data=df, x=\"age\", kde=True)\n\nplt.show()\n```\n\n### 五个专业技巧\n\n1. 中文乱码：`plt.rcParams['font.sans-serif'] = ['SimHei']`\n2. 多子图：`fig, axes = plt.subplots(2, 2)`\n3. 保存高清图：`plt.savefig('out.png', dpi=300, bbox_inches='tight')`\n4. 配色统一：`sns.set_palette(\"Set2\")`\n5. 白底去边框：`sns.despine()`",
    },
  ],
  videos: [
    {
      id: "v0",
      isMain: true,
      title: "大模型微调实战：从数据准备到模型训练全流程",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      poster: "https://picsum.photos/seed/video-main/1280/720",
      duration: "28:35",
      date: "2026-08-15",
      views: "23.4k",
    },
    {
      id: "v1",
      isMain: false,
      title: "Python 数据处理三大神器对比",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      poster: "https://picsum.photos/seed/video-1/640/360",
      duration: "15:20",
      views: "12.3k",
    },
    {
      id: "v2",
      isMain: false,
      title: "Transformer 原理动画讲解",
      src: "https://www.w3schools.com/html/movie.mp4",
      poster: "https://picsum.photos/seed/video-2/640/360",
      duration: "22:08",
      views: "18.7k",
    },
    {
      id: "v3",
      isMain: false,
      title: "从零搭建 RAG 知识库系统",
      src: "https://www.w3schools.com/html/mov_bbb.mp4",
      poster: "https://picsum.photos/seed/video-3/640/360",
      duration: "35:42",
      views: "9.5k",
    },
    {
      id: "v4",
      isMain: false,
      title: "GPU 显存优化技巧大全",
      src: "https://www.w3schools.com/html/movie.mp4",
      poster: "https://picsum.photos/seed/video-4/640/360",
      duration: "18:55",
      views: "7.2k",
    },
  ],
  discussions: [
    {
      id: "d1",
      avatar: "张",
      avatarAlt: false,
      author: "张同学",
      time: "2 小时前",
      title: "本地部署 70B 模型需要什么配置？",
      text: "想在自己的工作站上跑 70B 开源模型，目前有 RTX 4090 24G，够用吗？需要量化到什么程度？",
      tags: ["模型部署", "量化"],
      replies: 23,
      likes: 87,
      views: "1.2k",
    },
    {
      id: "d2",
      avatar: "李",
      avatarAlt: true,
      author: "李工程师",
      time: "5 小时前",
      title: "RAG 系统中 Chunk 大小怎么选最优？",
      text: "不同文档类型（代码、论文、FAQ）的合理分块策略有什么区别？有没有经验值参考？",
      tags: ["RAG", "向量检索"],
      replies: 15,
      likes: 64,
      views: "892",
    },
    {
      id: "d3",
      avatar: "王",
      avatarAlt: false,
      author: "王研究员",
      time: "昨天",
      title: "分享：我用 LoRA 微调大模型的踩坑记录",
      text: "从数据清洗到训练参数调优，记录了完整的微调过程和遇到的 10 个坑及解决方案……",
      tags: ["LoRA", "微调", "经验分享"],
      replies: 42,
      likes: 156,
      views: "3.5k",
    },
  ],
  contributors: [
    { id: "c1", rank: 1, avatar: "王", name: "王研究员", score: "2,840" },
    { id: "c2", rank: 2, avatar: "李", name: "李工程师", score: "2,120" },
    { id: "c3", rank: 3, avatar: "陈", name: "陈博士", score: "1,860" },
    { id: "c4", rank: 4, avatar: "赵", name: "赵同学", score: "1,540" },
  ],
  site_config: {
    stats: [
      { count: 1280, label: "技术文章" },
      { count: 86, label: "视频教程" },
      { count: 15200, label: "社区成员" },
      { count: 42, label: "活跃专栏" },
    ],
    heroBadge: "每日更新 · 紧跟 AI 前沿",
    paths: [
      { id: "all", icon: "📚", text: "全部技能", count: 24 },
      { id: "python", icon: "🐍", text: "Python 进阶", count: 8 },
      { id: "ml", icon: "🧠", text: "机器学习", count: 6 },
      { id: "dl", icon: "⚡", text: "深度学习", count: 5 },
      { id: "nlp", icon: "💬", text: "NLP & LLM", count: 5 },
      { id: "deploy", icon: "🚀", text: "模型部署", count: 4 },
    ],
    learningTip: "建议按「Python 基础 → 机器学习 → 深度学习 → NLP → 部署实战」的顺序循序渐进。",
    charts: {
      trend: {
        title: "AI 模型参数量演进趋势 (2020-2026)",
        labels: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
        data: [175, 280, 540, 1760, 2400, 3600, 5200],
      },
      radar: {
        title: "热门 AI 技术方向",
        labels: ["大模型", "RAG/Agent", "计算机视觉", "语音处理", "多模态", "AI安全"],
        data: [95, 88, 72, 65, 82, 58],
      },
      doughnut: {
        title: "社区学习偏好分布",
        labels: ["大模型微调", "RAG 系统", "计算机视觉", "数据分析", "AI Agent"],
        data: [32, 24, 18, 15, 11],
      },
      bar: {
        title: "月度技术文章发布量 vs 阅读量",
        labels: ["3月", "4月", "5月", "6月", "7月", "8月"],
        sets: [
          { label: "文章数", data: [45, 62, 78, 85, 102, 96] },
          { label: "阅读量 (千)", data: [120, 185, 240, 310, 380, 350] },
        ],
      },
    },
  },
  /* 社区数据初始为空，由访客互动产生 */
  members: [],
  pending_comments: [],
  comments: [],
};

/* ===== 数组型内容类型 ===== */
/* 注意：members / pending_comments / comments 不在此列，
   它们通过 /api/community/* 专用接口读写，避免隐私数据泄露到公开的 type=all */
const ARRAY_TYPES = ["articles", "skills", "videos", "discussions", "contributors"];

/* ===== 社区工具函数 ===== */
function isValidName(name) {
  name = (name || "").trim();
  return name.length >= 2 && name.length <= 20;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || "").trim());
}

function clientIP(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    "unknown"
  );
}

function nowString() {
  const d = new Date();
  return d.toISOString().slice(0, 10) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
}

/* ===== 阅读量递增 ===== */
function incrementReads(reads) {
  if (!reads) return "1";
  var str = String(reads).replace(/[^\d.]/g, "");
  var num = parseFloat(str);
  if (isNaN(num)) return reads;
  num += 1;
  /* 保留原始格式（k 后缀） */
  if (String(reads).indexOf("k") !== -1) {
    return (num / 1000).toFixed(1) + "k";
  }
  return String(num);
}

/* ===== 主处理器 ===== */
export async function onRequest(context) {
  const { request, env } = context;

  /* CORS 预检 */
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  /* 检查 KV 绑定 */
  if (!env.CONTENT_KV) {
    return json(
      { error: "KV 未绑定。请在 Cloudflare Pages 设置中绑定 CONTENT_KV。", code: "KV_NOT_BOUND" },
      503
    );
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = request.method;

  /* ===== 认证路由 ===== */

  /* POST /api/auth/login — 登录 */
  if (path === "auth/login" && method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "请求格式错误" }, 400);
    }

    const adminPassword = env.ADMIN_PASSWORD || (await env.CONTENT_KV.get("auth:password"));

    if (!adminPassword) {
      return json(
        {
          error: "管理员密码未设置。请在 Cloudflare Pages 环境变量中设置 ADMIN_PASSWORD。",
          code: "PASSWORD_NOT_SET",
        },
        500
      );
    }

    if (body.password !== adminPassword) {
      return json({ error: "密码错误" }, 401);
    }

    const token = generateToken();
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 小时
    await env.CONTENT_KV.put("auth:token:" + token, JSON.stringify({ expires }));
    return json({ token, expires });
  }

  /* GET /api/auth/verify — 验证 token */
  if (path === "auth/verify" && method === "GET") {
    const isAuth = await verifyAuth(request, env);
    return json({ authenticated: isAuth });
  }

  /* POST /api/auth/logout — 退出 */
  if (path === "auth/logout" && method === "POST") {
    const auth = request.headers.get("Authorization");
    if (auth && auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      await env.CONTENT_KV.delete("auth:token:" + token);
    }
    return json({ success: true });
  }

  /* ===== 内容读取（公开） ===== */

  /* GET /api/content?type=all|articles|skills|videos|discussions|contributors|site_config */
  if (path === "content" && method === "GET") {
    const type = url.searchParams.get("type") || "all";

    if (type === "all") {
      const [articles, skills, videos, discussions, contributors, site_config] =
        await Promise.all([
          kvGetJSON(env, "articles", []),
          kvGetJSON(env, "skills", []),
          kvGetJSON(env, "videos", []),
          kvGetJSON(env, "discussions", []),
          kvGetJSON(env, "contributors", []),
          kvGetJSON(env, "site_config", {}),
        ]);
      return json({ articles, skills, videos, discussions, contributors, site_config });
    }

    if (ARRAY_TYPES.includes(type)) {
      const data = await kvGetJSON(env, type, []);
      return json({ data });
    }

    if (type === "site_config") {
      const data = await kvGetJSON(env, "site_config", {});
      return json({ data });
    }

    return json({ error: "未知类型: " + type }, 400);
  }

  /* ===== 单篇文章详情（公开） ===== */

  /* GET /api/article?id=xxx[&type=skill] — 获取单篇内容（含正文 content）
   * type=skill 时读取技能教程，正文从 skill:<id> 读取 */
  if (path === "article" && method === "GET") {
    const id = url.searchParams.get("id");
    const type = url.searchParams.get("type") || "article";
    if (!id) return json({ error: "缺少 id 参数" }, 400);

    /* 技能教程详情 */
    if (type === "skill") {
      const skills = await kvGetJSON(env, "skills", []);
      const skill = skills.find(function (s) { return s.id === id; });
      if (!skill) return json({ error: "技能不存在" }, 404);
      const content = await env.CONTENT_KV.get("skill:" + id) || "";
      return json({ ...skill, content: content });
    }

    const articles = await kvGetJSON(env, "articles", []);
    const article = articles.find(function (a) { return a.id === id; });
    if (!article) return json({ error: "文章不存在" }, 404);

    /* 从 article:<id> 读取正文 */
    const content = await env.CONTENT_KV.get("article:" + id) || "";

    /* 增加阅读量 */
    article.reads = incrementReads(article.reads);
    await env.CONTENT_KV.put("articles", JSON.stringify(articles));

    return json({ ...article, content: content });
  }

  /* ===== 社区互动（公开，无需登录） ===== */

  /* POST /api/community/join — 加入社区 */
  if (path === "community/join" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "请求格式错误" }, 400); }

    const nickname = (body.nickname || "").trim();
    const email = (body.email || "").trim();
    if (!isValidName(nickname)) return json({ error: "昵称需为 2-20 个字符" }, 400);
    if (!isValidEmail(email)) return json({ error: "邮箱格式不正确" }, 400);

    const members = await kvGetJSON(env, "members", []);
    /* 同邮箱 60 秒内重复注册拦截 */
    const recent = members.find(function (m) {
      return m.email === email && Date.now() - (m._ts || 0) < 60000;
    });
    if (recent) return json({ error: "该邮箱刚注册过，请稍后再试" }, 429);

    const newMember = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nickname: nickname,
      email: email,
      date: nowString(),
      _ts: Date.now(),
    };
    members.unshift(newMember);
    await env.CONTENT_KV.put("members", JSON.stringify(members));

    /* 移除内部时间戳再返回 */
    const { _ts, ...safe } = newMember;
    return json({ success: true, message: "加入成功，欢迎！", data: safe });
  }

  /* POST /api/community/like — 讨论点赞（IP 去重） */
  if (path === "community/like" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "请求格式错误" }, 400); }
    const id = (body.id || "").trim();
    if (!id) return json({ error: "缺少 id" }, 400);

    const discussions = await kvGetJSON(env, "discussions", []);
    const d = discussions.find(function (x) { return x.id === id; });
    if (!d) return json({ error: "讨论不存在" }, 404);

    const ip = clientIP(request);
    const liked = await kvGetJSON(env, "liked:" + id, { ips: [] });
    if ((liked.ips || []).includes(ip)) {
      return json({ success: true, likes: d.likes, already: true });
    }
    liked.ips.push(ip);
    /* 限制单 key 大小，只保留最近 500 个 IP */
    if (liked.ips.length > 500) liked.ips = liked.ips.slice(-500);
    await env.CONTENT_KV.put("liked:" + id, JSON.stringify(liked));

    d.likes = (parseInt(d.likes, 10) || 0) + 1;
    await env.CONTENT_KV.put("discussions", JSON.stringify(discussions));
    return json({ success: true, likes: d.likes });
  }

  /* POST /api/community/comment — 提交评论（进入待审核） */
  if (path === "community/comment" && method === "POST") {
    let body;
    try { body = await request.json(); } catch { return json({ error: "请求格式错误" }, 400); }

    const discussionId = (body.discussionId || "").trim();
    const nickname = (body.nickname || "").trim();
    const content = (body.content || "").trim();
    if (!isValidName(nickname)) return json({ error: "昵称需为 2-20 个字符" }, 400);
    if (content.length < 5 || content.length > 500) return json({ error: "评论内容需为 5-500 字" }, 400);

    const discussions = await kvGetJSON(env, "discussions", []);
    const d = discussions.find(function (x) { return x.id === discussionId; });
    if (!d) return json({ error: "讨论不存在" }, 404);

    /* 同 IP 60 秒内限 1 条（KV 120 秒自动过期） */
    const ip = clientIP(request);
    const guard = await env.CONTENT_KV.get("comment_guard:" + ip);
    if (guard && Date.now() - parseInt(guard, 10) < 60000) {
      return json({ error: "评论太频繁，请稍后再试" }, 429);
    }
    await env.CONTENT_KV.put("comment_guard:" + ip, String(Date.now()), { expirationTtl: 120 });

    const pending = await kvGetJSON(env, "pending_comments", []);
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      discussionId: discussionId,
      discussionTitle: d.title,
      nickname: nickname,
      content: content,
      date: nowString(),
    };
    pending.unshift(item);
    await env.CONTENT_KV.put("pending_comments", JSON.stringify(pending));
    return json({ success: true, message: "评论已提交，审核通过后展示", data: item });
  }

  /* GET /api/community/comments — 已审核评论（公开） */
  if (path === "community/comments" && method === "GET") {
    const comments = await kvGetJSON(env, "comments", []);
    return json({ data: comments });
  }

  /* ===== 管理操作（需认证） ===== */

  if (path === "content" && ["POST", "PUT", "DELETE"].includes(method)) {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "请求格式错误" }, 400);
    }

    /* POST /api/content — 新增 */
    if (method === "POST") {
      const { type, data } = body;
      if (!type || !data) return json({ error: "缺少 type 或 data" }, 400);

      /* articles / skills：正文分离存储（article:<id> / skill:<id>） */
      if (type === "articles" || type === "skills") {
        const items = await kvGetJSON(env, type, []);
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        /* 分离 content 字段 */
        const { content, ...meta } = data;
        const newItem = { id: newId, ...meta };
        items.unshift(newItem);
        await env.CONTENT_KV.put(type, JSON.stringify(items));
        /* 正文单独存储 */
        const prefix = type === "articles" ? "article:" : "skill:";
        if (content) {
          await env.CONTENT_KV.put(prefix + newId, content);
        }
        return json({ success: true, data: newItem });
      }

      if (ARRAY_TYPES.includes(type)) {
        const items = await kvGetJSON(env, type, []);
        const newItem = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data };
        items.unshift(newItem); // 新内容放最前面
        await env.CONTENT_KV.put(type, JSON.stringify(items));
        return json({ success: true, data: newItem });
      }

      return json({ error: "该类型不支持新增: " + type }, 400);
    }

    /* PUT /api/content — 更新 */
    if (method === "PUT") {
      const { type, id, data } = body;
      if (!type || !data) return json({ error: "缺少 type 或 data" }, 400);

      /* site_config 是对象，直接合并更新 */
      if (type === "site_config") {
        const config = await kvGetJSON(env, "site_config", {});
        const updated = { ...config, ...data };
        await env.CONTENT_KV.put("site_config", JSON.stringify(updated));
        return json({ success: true, data: updated });
      }

      /* articles / skills：正文分离更新 */
      if (type === "articles" || type === "skills") {
        if (!id) return json({ error: "缺少 id" }, 400);
        const items = await kvGetJSON(env, type, []);
        const index = items.findIndex(function (item) { return item.id === id; });
        if (index === -1) return json({ error: "未找到 id: " + id }, 404);
        /* 分离 content 字段 */
        const { content, ...meta } = data;
        items[index] = { ...items[index], ...meta, id: items[index].id };
        await env.CONTENT_KV.put(type, JSON.stringify(items));
        /* 正文单独更新 */
        const prefix = type === "articles" ? "article:" : "skill:";
        if (content !== undefined) {
          await env.CONTENT_KV.put(prefix + id, content);
        }
        return json({ success: true, data: items[index] });
      }

      if (ARRAY_TYPES.includes(type)) {
        if (!id) return json({ error: "缺少 id" }, 400);
        const items = await kvGetJSON(env, type, []);
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return json({ error: "未找到 id: " + id }, 404);
        items[index] = { ...items[index], ...data, id: items[index].id };
        await env.CONTENT_KV.put(type, JSON.stringify(items));
        return json({ success: true, data: items[index] });
      }

      return json({ error: "该类型不支持更新: " + type }, 400);
    }

    /* DELETE /api/content — 删除 */
    if (method === "DELETE") {
      const { type, id } = body;
      if (!type || !id) return json({ error: "缺少 type 或 id" }, 400);

      if (type === "articles" || type === "skills") {
        const items = await kvGetJSON(env, type, []);
        const filtered = items.filter((item) => item.id !== id);
        await env.CONTENT_KV.put(type, JSON.stringify(filtered));
        /* 同时删除正文 */
        const prefix = type === "articles" ? "article:" : "skill:";
        await env.CONTENT_KV.delete(prefix + id);
        return json({ success: true, remaining: filtered.length });
      }

      if (ARRAY_TYPES.includes(type)) {
        const items = await kvGetJSON(env, type, []);
        const filtered = items.filter((item) => item.id !== id);
        await env.CONTENT_KV.put(type, JSON.stringify(filtered));
        return json({ success: true, remaining: filtered.length });
      }

      return json({ error: "该类型不支持删除: " + type }, 400);
    }
  }

  /* ===== 社区管理（需认证） ===== */

  /* GET /api/community/admin?scope=members|pending|comments */
  if (path === "community/admin" && method === "GET") {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }
    const scope = url.searchParams.get("scope") || "members";
    if (scope === "members") {
      const members = await kvGetJSON(env, "members", []);
      /* 剥离内部 _ts */
      const safe = members.map(function (m) {
        const { _ts, ...rest } = m;
        return rest;
      });
      return json({ data: safe });
    }
    if (scope === "pending") {
      return json({ data: await kvGetJSON(env, "pending_comments", []) });
    }
    if (scope === "comments") {
      return json({ data: await kvGetJSON(env, "comments", []) });
    }
    return json({ error: "未知 scope: " + scope }, 400);
  }

  /* POST /api/community/approve — 审核通过评论（待审 → 已审） */
  if (path === "community/approve" && method === "POST") {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "请求格式错误" }, 400); }
    const id = (body.id || "").trim();
    if (!id) return json({ error: "缺少 id" }, 400);

    const pending = await kvGetJSON(env, "pending_comments", []);
    const idx = pending.findIndex(function (c) { return c.id === id; });
    if (idx === -1) return json({ error: "待审评论不存在" }, 404);
    const approved = pending.splice(idx, 1)[0];
    await env.CONTENT_KV.put("pending_comments", JSON.stringify(pending));

    const comments = await kvGetJSON(env, "comments", []);
    comments.unshift(approved);
    await env.CONTENT_KV.put("comments", JSON.stringify(comments));
    return json({ success: true, data: approved });
  }

  /* DELETE /api/community/member — 删除成员 */
  if (path === "community/member" && method === "DELETE") {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "请求格式错误" }, 400); }
    const id = (body.id || "").trim();
    if (!id) return json({ error: "缺少 id" }, 400);
    const members = await kvGetJSON(env, "members", []);
    const filtered = members.filter(function (m) { return m.id !== id; });
    await env.CONTENT_KV.put("members", JSON.stringify(filtered));
    return json({ success: true, remaining: filtered.length });
  }

  /* DELETE /api/community/comment — 删除评论（from=pending 或 comments） */
  if (path === "community/comment" && method === "DELETE") {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: "请求格式错误" }, 400); }
    const id = (body.id || "").trim();
    const from = body.from === "pending" ? "pending_comments" : "comments";
    if (!id) return json({ error: "缺少 id" }, 400);
    const items = await kvGetJSON(env, from, []);
    const filtered = items.filter(function (c) { return c.id !== id; });
    await env.CONTENT_KV.put(from, JSON.stringify(filtered));
    return json({ success: true, remaining: filtered.length });
  }

  /* ===== 初始化种子数据 ===== */

  /* POST /api/init — 初始化（需认证） */
  if (path === "init" && method === "POST") {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }

    const results = {};
    for (const [key, value] of Object.entries(SEED)) {
      if (key === "articles" || key === "skills") {
        /* 文章/技能：分离存储元数据和正文 */
        const prefix = key === "articles" ? "article:" : "skill:";
        const metaData = value.map(function (a) {
          const { content, ...meta } = a;
          return meta;
        });
        await env.CONTENT_KV.put(key, JSON.stringify(metaData));
        /* 每篇正文单独写入 */
        for (const a of value) {
          if (a.content) {
            await env.CONTENT_KV.put(prefix + a.id, a.content);
          }
        }
        results[key] = value.length;
      } else {
        await env.CONTENT_KV.put(key, JSON.stringify(value));
        results[key] = Array.isArray(value) ? value.length : Object.keys(value).length;
      }
    }
    return json({ success: true, message: "数据初始化完成", counts: results });
  }

  /* GET /api/init/status — 检查初始化状态 */
  if (path === "init/status" && method === "GET") {
    const check = await env.CONTENT_KV.get("articles");
    return json({ initialized: !!check });
  }

  /* ===== 404 ===== */
  return json({ error: "路由不存在: /api/" + path }, 404);
}
