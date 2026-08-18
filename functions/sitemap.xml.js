/**
 * 动态 sitemap.xml（Cloudflare Pages Functions）
 * 路由: /sitemap.xml
 * 功能: 固定页面 + KV 中全部文章/技能/视频的详情页 URL
 * 保证新增内容自动被搜索引擎发现
 */

const BASE = "https://ai.feige68.dpdns.org";

// 固定页面（优先级高的排前面）
const STATIC_PAGES = [
  { url: "/", priority: "1.0", changefreq: "daily" },
  { url: "/news.html", priority: "0.7", changefreq: "daily" },
  { url: "/skills.html", priority: "0.7", changefreq: "weekly" },
  { url: "/videos.html", priority: "0.7", changefreq: "weekly" },
  { url: "/community.html", priority: "0.6", changefreq: "weekly" },
  { url: "/article.html", priority: "0.6", changefreq: "weekly" },
  { url: "/page.html", priority: "0.5", changefreq: "monthly" },
];

async function kvGetJSON(env, key, fallback) {
  try {
    const val = await env.CONTENT_KV.get(key, "json");
    if (val) return val;
  } catch (e) { /* 忽略读取错误 */ }
  const raw = await env.CONTENT_KV.get(key);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* fallthrough */ }
  }
  return fallback;
}

function xmlEscape(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(articles, skills, videos, pages) {
  const urls = [];
  const seen = new Set();

  STATIC_PAGES.forEach((p) => {
    urls.push(
      `  <url><loc>${BASE}${p.url}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    );
    seen.add(BASE + p.url);
  });

  // 文章详情页（AI 要闻）
  (articles || []).forEach((a) => {
    if (!a || !a.id) return;
    const u = BASE + "/article.html?id=" + encodeURIComponent(a.id);
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(`  <url><loc>${u}</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`);
  });

  // 技能教程详情页
  (skills || []).forEach((s) => {
    if (!s || !s.id) return;
    const u = BASE + "/article.html?type=skill&id=" + encodeURIComponent(s.id);
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(`  <url><loc>${u}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
  });

  // 视频专区已有独立页面 /videos.html（在 STATIC_PAGES 中）

  // 内容页面（团队介绍/投稿须知/联系方式/隐私政策等）
  (pages || []).forEach((p) => {
    if (!p || !p.id) return;
    const u = BASE + "/page.html?id=" + encodeURIComponent(p.id);
    if (seen.has(u)) return;
    seen.add(u);
    urls.push(`  <url><loc>${u}</loc><lastmod>${(p.updatedAt || new Date().toISOString().slice(0, 10))}</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>`);
  });

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join("\n") +
    "\n</urlset>\n"
  );
}

export async function onRequest(context) {
  const env = context.env;

  const [articles, skills, videos, pages] = await Promise.all([
    kvGetJSON(env, "articles", []),
    kvGetJSON(env, "skills", []),
    kvGetJSON(env, "videos", []),
    kvGetJSON(env, "pages", []),
  ]);

  const xml = buildSitemap(articles, skills, videos, pages);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
