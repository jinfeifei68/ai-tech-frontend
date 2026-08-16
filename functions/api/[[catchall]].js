/**
 * AI科技前沿 — Cloudflare Pages Functions API
 * 统一入口：/api/*
 * 
 * 路由：
 *   POST /api/auth/login    — 管理员登录
 *   GET  /api/auth/verify   — 验证 token
 *   GET  /api/content       — 读取内容（公开）
 *   POST /api/content       — 新增内容（需认证）
 *   PUT  /api/content       — 更新内容（需认证）
 *   DELETE /api/content     — 删除内容（需认证）
 *   POST /api/init          — 初始化种子数据（需认证）
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
      await env.CONTENT_KV.put(key, JSON.stringify(value));
      results[key] = Array.isArray(value) ? value.length : Object.keys(value).length;
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
