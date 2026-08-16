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
 * 
 * KV 数据结构：
 *   articles          — 文章元数据数组（不含正文）
 *   article:<id>      — 单篇文章正文（Markdown 字符串）
 *   skills/videos/discussions/contributors/site_config — 其他内容
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
  },
};

/* ===== 数组型内容类型 ===== */
const ARRAY_TYPES = ["articles", "skills", "videos", "discussions", "contributors"];

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

  /* GET /api/article?id=xxx — 获取单篇文章（含正文 content） */
  if (path === "article" && method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "缺少 id 参数" }, 400);

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

      if (type === "articles") {
        const items = await kvGetJSON(env, "articles", []);
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        /* 分离 content 字段 */
        const { content, ...meta } = data;
        const newItem = { id: newId, ...meta };
        items.unshift(newItem);
        await env.CONTENT_KV.put("articles", JSON.stringify(items));
        /* 正文单独存储 */
        if (content) {
          await env.CONTENT_KV.put("article:" + newId, content);
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

      if (type === "articles") {
        if (!id) return json({ error: "缺少 id" }, 400);
        const items = await kvGetJSON(env, "articles", []);
        const index = items.findIndex(function (item) { return item.id === id; });
        if (index === -1) return json({ error: "未找到 id: " + id }, 404);
        /* 分离 content 字段 */
        const { content, ...meta } = data;
        items[index] = { ...items[index], ...meta, id: items[index].id };
        await env.CONTENT_KV.put("articles", JSON.stringify(items));
        /* 正文单独更新 */
        if (content !== undefined) {
          await env.CONTENT_KV.put("article:" + id, content);
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

      if (type === "articles") {
        const items = await kvGetJSON(env, "articles", []);
        const filtered = items.filter((item) => item.id !== id);
        await env.CONTENT_KV.put("articles", JSON.stringify(filtered));
        /* 同时删除正文 */
        await env.CONTENT_KV.delete("article:" + id);
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

  /* ===== 初始化种子数据 ===== */

  /* POST /api/init — 初始化（需认证） */
  if (path === "init" && method === "POST") {
    if (!(await verifyAuth(request, env))) {
      return json({ error: "未授权，请先登录" }, 401);
    }

    const results = {};
    for (const [key, value] of Object.entries(SEED)) {
      if (key === "articles") {
        /* 文章：分离存储元数据和正文 */
        const metaData = value.map(function (a) {
          const { content, ...meta } = a;
          return meta;
        });
        await env.CONTENT_KV.put("articles", JSON.stringify(metaData));
        /* 每篇正文单独写入 */
        for (const a of value) {
          if (a.content) {
            await env.CONTENT_KV.put("article:" + a.id, a.content);
          }
        }
        results.articles = value.length;
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
