/**
 * AI科技前沿 · 学习交流 — AI 要闻列表独立页逻辑
 * ============================================ */

(function () {
  "use strict";

  /* ===== 主题切换 ===== */
  var themeToggle = document.getElementById("themeToggle");
  var html = document.documentElement;
  var savedTheme = localStorage.getItem("theme") || "dark";
  html.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", function () {
    var current = html.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });

  /* ===== 移动端菜单 ===== */
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("nav");

  menuBtn.addEventListener("click", function () {
    nav.classList.toggle("nav--open");
    var expanded = nav.classList.contains("nav--open");
    menuBtn.setAttribute("aria-expanded", String(expanded));
  });

  nav.querySelectorAll(".nav__link").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("nav--open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  /* ===== Header 滚动 + 返回顶部 ===== */
  var header = document.getElementById("header");
  var backToTop = document.getElementById("backToTop");

  function onScroll() {
    var y = window.scrollY;
    if (y > 20) header.classList.add("header--scrolled");
    else header.classList.remove("header--scrolled");
    if (y > 400) backToTop.classList.add("back-to-top--visible");
    else backToTop.classList.remove("back-to-top--visible");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ===== 工具函数 ===== */
  function esc(str) {
    if (str == null) return "";
    var div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  var catLabels = { model: "大模型", application: "应用落地", research: "学术研究", industry: "产业动态" };

  /* ===== 数据与状态 ===== */
  var PER_PAGE = 8;
  var allNews = [];
  var currentFilter = "all";
  var currentPage = 1;

  /* ===== 渲染 ===== */
  function newsCardHTML(a) {
    var bc = a.badgeType === "hot" ? " news-card__badge--hot" : a.badgeType === "new" ? " news-card__badge--new" : "";
    return '<article class="news-card reveal reveal--visible" data-category="' + esc(a.category) + '" data-id="' + esc(a.id) + '" style="cursor:pointer">' +
      '<div class="news-card__img lazy-img" data-bg="' + esc(a.image) + '">' +
      '<span class="news-card__ai">AI 生成</span>' +
      (a.badge ? '<span class="news-card__badge' + bc + '">' + esc(a.badge) + '</span>' : '') +
      (a.source ? '<span class="news-card__source">' + esc(a.source) + '</span>' : '') +
      '</div><div class="news-card__body">' +
      '<span class="news-card__cat">' + esc(catLabels[a.category] || a.category) + '</span>' +
      '<h3 class="news-card__title">' + esc(a.title) + '</h3>' +
      '<p class="news-card__excerpt">' + esc(a.excerpt) + '</p>' +
      '<div class="news-card__meta"><span class="news-card__date">' + esc(a.date) + '</span>' +
      '<span class="news-card__reads">' + esc(a.reads) + ' 阅读</span></div>' +
      '<span class="news-card__readmore">阅读全文 →</span>' +
      '</div></article>';
  }

  function renderNewsPage() {
    var gridEl = document.getElementById("newsGrid");
    var pagerEl = document.getElementById("newsPager");
    if (!gridEl) return;

    if (!allNews.length) {
      gridEl.innerHTML = '<div class="news__empty">暂无要闻内容</div>';
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    var filtered = currentFilter === "all"
      ? allNews
      : allNews.filter(function (a) { return a.category === currentFilter; });

    if (!filtered.length) {
      gridEl.innerHTML = '<div class="news__empty">该分类下暂无内容</div>';
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    var totalPages = Math.ceil(filtered.length / PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = filtered.slice(start, start + PER_PAGE);
    gridEl.innerHTML = pageItems.map(newsCardHTML).join("");

    /* 卡片点击跳详情 */
    gridEl.querySelectorAll(".news-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-id");
        if (id) {
          window.location.href = "article.html?id=" + encodeURIComponent(id);
        }
      });
    });

    /* 分页 */
    var pagerHTML = "";
    if (totalPages > 1) {
      pagerHTML = '<button type="button" class="video-pager__btn" data-page="' + (currentPage - 1) + '"' +
        (currentPage <= 1 ? " disabled" : "") + '>← 上一页</button>' +
        '<span class="video-pager__info">第 ' + currentPage + " / " + totalPages + ' 页</span>' +
        '<button type="button" class="video-pager__btn" data-page="' + (currentPage + 1) + '"' +
        (currentPage >= totalPages ? " disabled" : "") + '>下一页 →</button>';
    }
    if (pagerEl) {
      pagerEl.innerHTML = pagerHTML;
      pagerEl.querySelectorAll(".video-pager__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (btn.disabled) return;
          var p = parseInt(btn.getAttribute("data-page"), 10);
          if (isNaN(p)) return;
          currentPage = p;
          renderNewsPage();
          var filters = document.getElementById("newsFilters");
          if (filters) filters.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    initLazyImages();
  }

  /* ===== 分类筛选 ===== */
  function bindFilters() {
    var filterBtns = document.querySelectorAll("#newsFilters .filter-btn");
    filterBtns.forEach(function (btn) {
      if (btn.getAttribute("data-bound")) return;
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("filter-btn--active"); });
        btn.classList.add("filter-btn--active");
        currentFilter = btn.getAttribute("data-filter");
        currentPage = 1;
        renderNewsPage();
      });
    });
  }

  /* ===== 图片懒加载 ===== */
  function initLazyImages() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".lazy-img[data-bg]").forEach(function (el) {
        el.style.setProperty("--img-url", "url('" + el.dataset.bg + "')");
        el.classList.add("is-loaded");
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.dataset.bg) {
          el.style.setProperty("--img-url", "url('" + el.dataset.bg + "')");
          el.classList.add("is-loaded");
          delete el.dataset.bg;
        }
        observer.unobserve(el);
      });
    }, { rootMargin: "200px 0px" });
    document.querySelectorAll(".lazy-img[data-bg]").forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ===== 站点品牌（页脚部分由 site-footer.js 处理） ===== */
  function applyBranding(cfg) {
    if (!cfg) return;
    if (cfg.siteName) {
      document.title = "AI 要闻速递 | " + cfg.siteName;
      var logoText = document.getElementById("siteLogoText");
      if (logoText) logoText.textContent = cfg.siteName;
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
    var descNews = document.getElementById("descNews");
    if (descNews && cfg.descNews) descNews.textContent = cfg.descNews;
    if (window.__footerBrand) window.__footerBrand.applyFooterBranding(cfg);
  }

  /* ===== 加载数据 ===== */
  async function loadNews() {
    try {
      var response = await fetch("/api/content?type=all");
      if (!response.ok) throw new Error("API error");
      var data = await response.json();

      applyBranding(data.site_config);

      var news = data.articles || [];
      allNews = news;
      renderNewsPage();
      bindFilters();
    } catch (e) {
      var gridEl = document.getElementById("newsGrid");
      if (gridEl) gridEl.innerHTML = '<div class="news__empty">要闻加载失败，请稍后再试</div>';
    }
  }

  loadNews();
})();
