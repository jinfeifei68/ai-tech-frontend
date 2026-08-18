/**
 * AI科技前沿 — 内容页面逻辑（团队介绍/投稿须知/联系方式/隐私政策等）
 * ============================================ */

(function () {
  "use strict";

  /* ===== DOM ===== */
  var loadingEl = document.getElementById("pageLoading");
  var errorEl = document.getElementById("pageError");
  var errorMag = document.getElementById("errorMsg");
  var contentEl = document.getElementById("pageContent");
  var header = document.getElementById("header");
  var backToTop = document.getElementById("backToTop");
  var navToggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  /* ===== 工具 ===== */
  function esc(str) {
    if (str == null) return "";
    var div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  /* ===== 站点品牌同步 ===== */
  var FONT_SIZE_MAP = {
    small: "13.5px",
    default: "",
    large: "17.5px",
    xlarge: "19px",
  };

  var siteNameCache = "";

  async function loadSiteBranding() {
    try {
      var response = await fetch("/api/content?type=all");
      if (!response.ok) return;
      var data = await response.json();
      var cfg = data.site_config;
      if (!cfg) return;

      if (cfg.siteName) {
        siteNameCache = cfg.siteName;
        var logoText = document.getElementById("siteLogoText");
        if (logoText) {
          /* 保留 <em> 标签结构 */
          logoText.innerHTML = esc(cfg.siteName);
        }
      }

      var logoImg = document.getElementById("siteLogoImg");
      var logoIcon = document.getElementById("siteLogoIcon");
      if (logoImg && logoIcon && cfg.logoUrl) {
        logoImg.src = cfg.logoUrl;
        logoImg.style.display = "";
        logoIcon.style.display = "none";
        logoImg.onerror = function () {
          logoImg.style.display = "none";
          logoIcon.style.display = "";
        };
      }

      if (cfg.fontSize && FONT_SIZE_MAP.hasOwnProperty(cfg.fontSize)) {
        document.documentElement.style.fontSize = FONT_SIZE_MAP[cfg.fontSize];
      }

      /* 页脚品牌同步（与首页保持一致） */
      if (window.__footerBrand) window.__footerBrand.applyFooterBranding(cfg);
    } catch (e) { /* 静默失败 */ }
  }

  loadSiteBranding();

  /* ===== 底部版权文字双击进入管理后台 ===== */
  (function setupAdminAccess() {
    var copyEl = document.getElementById("footerCopyText");
    if (!copyEl) return;
    copyEl.style.cursor = "pointer";
    copyEl.addEventListener("dblclick", function () {
      window.location.href = "/admin.html";
    });
  })();

  /* ===== SEO 动态更新 ===== */
  function setMetaTag(selector, content) {
    if (content == null) return;
    var el = document.querySelector(selector);
    if (el) el.setAttribute("content", String(content));
  }

  function updatePageMeta(page) {
    var baseUrl = "https://ai.feige68.dpdns.org";
    var pageUrl = baseUrl + "/page.html?id=" + encodeURIComponent(page.id);

    document.title = page.title + " — " + (siteNameCache || "AI 科技前沿");

    var canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", pageUrl);

    setMetaTag('meta[property="og:title"]', page.title + " — " + (siteNameCache || "AI 科技前沿"));
    setMetaTag('meta[property="og:url"]', pageUrl);
    setMetaTag('meta[name="twitter:title"]', page.title + " — " + (siteNameCache || "AI 科技前沿"));
  }

  /* ===== 获取 URL 参数 ===== */
  function getPageId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  /* ===== 显示/隐藏 ===== */
  function showLoading() {
    loadingEl.style.display = "flex";
    errorEl.style.display = "none";
    contentEl.style.display = "none";
  }

  function showError(msg) {
    loadingEl.style.display = "none";
    errorEl.style.display = "flex";
    contentEl.style.display = "none";
    if (msg && errorMag) errorMag.textContent = msg;
  }

  function showContent() {
    loadingEl.style.display = "none";
    errorEl.style.display = "none";
    contentEl.style.display = "block";
  }

  /* ===== 渲染页面 ===== */
  function renderPage(page) {
    /* SEO */
    updatePageMeta(page);

    /* 面包屑 */
    var breadcrumbTitle = document.getElementById("breadcrumbTitle");
    if (breadcrumbTitle) breadcrumbTitle.textContent = page.navLabel || page.title;

    /* 标题 */
    var titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = page.title;

    /* 更新时间 */
    var dateEl = document.getElementById("pageDate");
    if (dateEl) {
      dateEl.textContent = page.updatedAt ? "更新于 " + page.updatedAt : "";
      dateEl.style.display = page.updatedAt ? "" : "none";
    }

    /* 正文（Markdown 渲染） */
    var bodyEl = document.getElementById("pageBody");
    if (bodyEl) {
      var content = page.content || "暂无内容";
      if (typeof marked !== "undefined") {
        marked.setOptions({
          breaks: true,
          gfm: true,
        });
        bodyEl.innerHTML = marked.parse(content);
      } else {
        bodyEl.innerHTML = "<p>" + esc(content).replace(/\n/g, "<br>") + "</p>";
      }
    }

    showContent();
  }

  /* ===== Header 滚动 ===== */
  function onScroll() {
    var y = window.scrollY;
    if (y > 20) {
      header.classList.add("header--scrolled");
    } else {
      header.classList.remove("header--scrolled");
    }
    if (y > 400) {
      backToTop.classList.add("back-to-top--visible");
    } else {
      backToTop.classList.remove("back-to-top--visible");
    }
  }

  /* ===== 移动端导航 ===== */
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      nav.classList.toggle("nav--open");
    });
  }

  /* ===== 回到顶部 ===== */
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ===== 主流程 ===== */
  async function init() {
    var id = getPageId();

    if (!id) {
      showError("未指定页面");
      return;
    }

    showLoading();

    try {
      var response = await fetch("/api/page?id=" + encodeURIComponent(id));

      if (!response.ok) {
        var errData = {};
        try { errData = await response.json(); } catch (e) {}
        showError(errData.error || "页面不存在");
        return;
      }

      var page = await response.json();
      renderPage(page);
    } catch (e) {
      showError("加载失败，请检查网络连接");
    }
  }

  /* 启动 */
  init();
})();
