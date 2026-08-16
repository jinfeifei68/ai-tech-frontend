/**
 * AI 科技前沿 - Service Worker
 * 策略：核心资源预缓存 + 静态资源 stale-while-revalidate + API 网络优先
 * 每次发布新版请同步更新 CACHE_VERSION 与 PRECACHE 中的资源版本号
 */
const CACHE_VERSION = "ai-tech-v20260816h";
const PRECACHE = "precache-" + CACHE_VERSION;
const RUNTIME = "runtime-" + CACHE_VERSION;

// 预缓存：离线首页/详情页可完整打开
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/article.html",
  "/css/style.css?v=20260816h",
  "/css/article.css?v=20260816h",
  "/js/main.js?v=20260816h",
  "/js/article.js?v=20260816h",
  "/manifest.json",
  "/favicon.svg",
  "/assets/og-cover.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
  "/icons/maskable-512.png"
];

const IGNORED_URLS = [
  /\/admin\.html/,
  /\/api\//
];

/* ========== Install：预缓存 ========== */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(PRECACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function (err) {
        console.warn("[SW] 部分预缓存资源失败", err);
      });
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ========== Activate：清理旧缓存 ========== */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.startsWith("precache-") || key.startsWith("runtime-");
          })
          .filter(function (key) {
            return key !== PRECACHE && key !== RUNTIME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ========== 工具函数 ========== */
function isSameOrigin(url) {
  return new URL(url, self.location.origin).origin === self.location.origin;
}

function shouldCache(request) {
  const url = request.url;
  if (request.method !== "GET") return false;
  for (let re of IGNORED_URLS) {
    if (re.test(url)) return false;
  }
  return true;
}

// Stale-While-Revalidate：先返回缓存，同时网络更新缓存
function staleWhileRevalidate(request) {
  return caches.open(RUNTIME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      const fetchPromise = fetch(request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(function () {
          return cached; // 网络失败时返回缓存（如果存在）
        });
      return cached || fetchPromise;
    });
  });
}

// Network-first：优先网络，失败返回缓存兜底
function networkFirst(request, fallbackUrl) {
  return caches.open(RUNTIME).then(function (cache) {
    return fetch(request)
      .then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch(function () {
        return cache.match(request).then(function (cached) {
          if (cached) return cached;
          if (fallbackUrl) return cache.match(fallbackUrl);
          return new Response("网络离线，且没有缓存该页面", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        });
      });
  });
}

/* ========== Fetch：请求拦截 ========== */
self.addEventListener("fetch", function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // 非 GET 请求或应忽略请求直接放行
  if (!shouldCache(request)) {
    return;
  }

  // 同源 HTML 页面导航请求：network-first，离线回退首页
  if (request.mode === "navigate" && isSameOrigin(request.url)) {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  // 同源静态资源：stale-while-revalidate
  if (isSameOrigin(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 跨域 CDN 静态资源（chart.js / fuse.js）：stale-while-revalidate
  if (url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 其他跨域资源（Google Fonts 等）直接放行，不缓存
});
