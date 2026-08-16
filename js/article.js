/**
 * AI科技前沿 — 文章详情页逻辑
 * ============================================ */

(function () {
  "use strict";

  /* ===== DOM ===== */
  var loadingEl = document.getElementById("articleLoading");
  var errorEl = document.getElementById("articleError");
  var errorMag = document.getElementById("errorMsg");
  var contentEl = document.getElementById("articleContent");
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

  var catLabels = {
    model: "大模型",
    application: "应用落地",
    research: "学术研究",
    industry: "产业动态",
  };

  /* ===== 获取 URL 参数 ===== */
  function getArticleId() {
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

  /* ===== 渲染文章 ===== */
  function renderArticle(article) {
    /* 标题 */
    document.title = article.title + " — AI 科技前沿";

    /* 面包屑 */
    var breadcrumbTitle = document.getElementById("breadcrumbTitle");
    if (breadcrumbTitle) breadcrumbTitle.textContent = article.title.slice(0, 20) + "...";

    /* 分类 */
    var catEl = document.getElementById("articleCat");
    if (catEl) catEl.textContent = catLabels[article.category] || article.category;

    /* 标签 */
    var badgeEl = document.getElementById("articleBadge");
    if (badgeEl) {
      badgeEl.textContent = article.badge || "";
      badgeEl.style.display = article.badge ? "" : "none";
    }

    /* 标题 */
    var titleEl = document.getElementById("articleTitle");
    if (titleEl) titleEl.textContent = article.title;

    /* 摘要 — 只在有正文且摘要是短文本时才显示，避免重复 */
    var excerptEl = document.getElementById("articleExcerpt");
    var hasContent = article.content && article.content.trim().length > 0;
    if (excerptEl) {
      if (hasContent && article.excerpt && article.excerpt.length < 200) {
        /* 有独立正文且摘要是短文本 → 正常显示摘要 */
        excerptEl.textContent = article.excerpt;
        excerptEl.style.display = "";
      } else {
        /* 没有独立正文（摘要即正文）或摘要太长 → 隐藏摘要区域，避免重复显示 */
        excerptEl.style.display = "none";
      }
    }

    /* 元信息 */
    var dateEl = document.getElementById("articleDate");
    if (dateEl) dateEl.textContent = article.date || "";

    var readsEl = document.getElementById("articleReads");
    if (readsEl) readsEl.textContent = (article.reads || "0") + " 阅读";

    /* Hero 图片 */
    var heroEl = document.getElementById("articleHero");
    if (heroEl && article.image) {
      heroEl.style.backgroundImage = "url('" + article.image + "')";
    }

    /* 正文（Markdown 渲染） */
    var bodyEl = document.getElementById("articleBody");
    if (bodyEl) {
      var content = article.content || article.excerpt || "暂无正文内容";
      if (typeof marked !== "undefined") {
        /* 配置 marked */
        marked.setOptions({
          breaks: true,
          gfm: true,
        });
        bodyEl.innerHTML = marked.parse(content);
      } else {
        /* marked 未加载，降级为纯文本 */
        bodyEl.innerHTML = "<p>" + esc(content).replace(/\n/g, "<br>") + "</p>";
      }
    }

    showContent();
  }

  /* ===== 相关文章 ===== */
  async function loadRelated(currentId, category) {
    try {
      var response = await fetch("/api/content?type=articles");
      if (!response.ok) return;
      var data = await response.json();
      var articles = data.data || data.articles || [];

      /* 同分类优先，排除当前文章 */
      var same = articles.filter(function (a) {
        return a.id !== currentId && a.category === category;
      });
      var others = articles.filter(function (a) {
        return a.id !== currentId && a.category !== category;
      });
      var related = same.concat(others).slice(0, 3);

      if (related.length === 0) return;

      var grid = document.getElementById("relatedGrid");
      var relatedSection = document.getElementById("articleRelated");
      if (!grid || !relatedSection) return;

      grid.innerHTML = related.map(function (a) {
        return '<a class="related-card" href="article.html?id=' + esc(a.id) + '">' +
          '<div class="related-card__img" style="background-image:url(\'' + esc(a.image) + '\')"></div>' +
          '<div class="related-card__body">' +
          '<span class="related-card__cat">' + esc(catLabels[a.category] || a.category) + '</span>' +
          '<h4 class="related-card__title">' + esc(a.title) + '</h4>' +
          '<span class="related-card__date">' + esc(a.date) + '</span>' +
          '</div></a>';
      }).join("");

      relatedSection.style.display = "block";
    } catch (e) {
      /* 静默失败 */
    }
  }

  /* ===== 分享 ===== */
  function setupShare() {
    var shareBtn = document.getElementById("shareBtn");
    if (!shareBtn) return;

    shareBtn.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({
          title: document.title,
          url: url,
        }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () {
          shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 已复制';
          setTimeout(function () {
            shareBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> 分享';
          }, 2000);
        });
      }
    });
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
    var id = getArticleId();

    if (!id) {
      showError("未指定文章");
      return;
    }

    showLoading();

    try {
      var response = await fetch("/api/article?id=" + encodeURIComponent(id));

      if (!response.ok) {
        var errData = {};
        try { errData = await response.json(); } catch (e) {}
        showError(errData.error || "文章不存在");
        return;
      }

      var article = await response.json();
      renderArticle(article);
      setupShare();

      /* 加载相关文章 */
      loadRelated(article.id, article.category);
    } catch (e) {
      showError("加载失败，请检查网络连接");
    }
  }

  /* 启动 */
  init();
})();
