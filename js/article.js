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

  var pathLabels = {
    python: "Python 进阶",
    ml: "机器学习",
    dl: "深度学习",
    nlp: "NLP & LLM",
    deploy: "模型部署",
    all: "全部技能",
  };

  /* ===== 获取 URL 参数 ===== */
  function getArticleId() {
    var params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  /* 内容类型：article（默认）| skill（技能教程） */
  function getContentType() {
    var params = new URLSearchParams(window.location.search);
    return params.get("type") === "skill" ? "skill" : "article";
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

  /* ===== 渲染文章/技能 ===== */
  function renderArticle(article, type) {
    var isSkill = type === "skill";

    /* 标题 */
    document.title = article.title + " — AI 科技前沿";

    /* 面包屑 */
    var crumbCat = document.getElementById("breadcrumbCat");
    if (crumbCat) {
      crumbCat.textContent = isSkill ? "技能分享" : "AI 要闻";
      crumbCat.href = isSkill ? "/#skills" : "/#news";
    }
    var breadcrumbTitle = document.getElementById("breadcrumbTitle");
    if (breadcrumbTitle) breadcrumbTitle.textContent = article.title.slice(0, 20) + "...";

    /* 分类 */
    var catEl = document.getElementById("articleCat");
    if (catEl) {
      catEl.textContent = isSkill
        ? pathLabels[article.path] || article.path || "技能教程"
        : catLabels[article.category] || article.category;
    }

    /* 标签 */
    var badgeEl = document.getElementById("articleBadge");
    if (badgeEl) {
      var badgeText = isSkill ? article.level || "" : article.badge || "";
      badgeEl.textContent = badgeText;
      badgeEl.style.display = badgeText ? "" : "none";
    }

    /* 标题 */
    var titleEl = document.getElementById("articleTitle");
    if (titleEl) titleEl.textContent = article.title;

    /* 摘要 — 只在有正文且摘要是短文本时才显示，避免重复 */
    var excerptEl = document.getElementById("articleExcerpt");
    var hasContent = article.content && article.content.trim().length > 0;
    if (excerptEl) {
      var excerpt = isSkill ? article.desc : article.excerpt;
      if (hasContent && excerpt && excerpt.length < 200) {
        /* 有独立正文且摘要是短文本 → 正常显示摘要 */
        excerptEl.textContent = excerpt;
        excerptEl.style.display = "";
      } else {
        /* 没有独立正文（摘要即正文）或摘要太长 → 隐藏摘要区域，避免重复显示 */
        excerptEl.style.display = "none";
      }
    }

    /* 元信息 */
    var dateEl = document.getElementById("articleDate");
    if (dateEl) {
      dateEl.textContent = article.date || "";
      dateEl.style.display = article.date ? "" : "none";
    }

    var readsEl = document.getElementById("articleReads");
    if (readsEl) {
      readsEl.textContent = isSkill
        ? article.duration || "技能教程"
        : (article.reads || "0") + " 阅读";
    }

    /* Hero 图片（技能无主图时隐藏） */
    var heroEl = document.getElementById("articleHero");
    if (heroEl) {
      if (article.image) {
        heroEl.style.backgroundImage = "url('" + article.image + "')";
        heroEl.style.display = "";
      } else {
        heroEl.style.display = "none";
      }
    }

    /* 正文（Markdown 渲染） */
    var bodyEl = document.getElementById("articleBody");
    if (bodyEl) {
      var content = article.content || (isSkill ? article.desc : article.excerpt) || "暂无正文内容";
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

    /* 底部按钮与相关内容标题 */
    var moreBtn = document.getElementById("moreBtn");
    if (moreBtn) {
      moreBtn.href = isSkill ? "/#skills" : "/#news";
      moreBtn.textContent = isSkill ? "更多技能 →" : "更多要闻 →";
    }

    showContent();
  }

  /* ===== 相关内容 ===== */
  async function loadRelated(currentId, category, type) {
    var isSkill = type === "skill";
    try {
      var response = await fetch("/api/content?type=" + (isSkill ? "skills" : "articles"));
      if (!response.ok) return;
      var data = await response.json();
      var items = data.data || data.articles || [];

      /* 技能：同路径优先；文章：同分类优先。均排除当前项 */
      var groupKey = isSkill ? "path" : "category";
      var same = items.filter(function (a) {
        return a.id !== currentId && a[groupKey] === category;
      });
      var others = items.filter(function (a) {
        return a.id !== currentId && a[groupKey] !== category;
      });
      var related = same.concat(others).slice(0, 3);

      if (related.length === 0) return;

      var grid = document.getElementById("relatedGrid");
      var relatedSection = document.getElementById("articleRelated");
      if (!grid || !relatedSection) return;

      var linkBase = isSkill ? "article.html?type=skill&id=" : "article.html?id=";

      grid.innerHTML = related.map(function (a) {
        var img = a.image || a.poster || "";
        var imgHTML = img
          ? '<div class="related-card__img" style="background-image:url(\'' + esc(img) + '\')"></div>'
          : '<div class="related-card__img related-card__img--icon">' + esc(a.icon || "📘") + "</div>";
        var catText = isSkill
          ? pathLabels[a.path] || a.path
          : catLabels[a.category] || a.category;
        return '<a class="related-card" href="' + linkBase + esc(a.id) + '">' +
          imgHTML +
          '<div class="related-card__body">' +
          '<span class="related-card__cat">' + esc(catText) + '</span>' +
          '<h4 class="related-card__title">' + esc(a.title) + '</h4>' +
          '<span class="related-card__date">' + esc(isSkill ? a.duration || "" : a.date || "") + '</span>' +
          '</div></a>';
      }).join("");

      /* 标题 */
      var titleEl = relatedSection.querySelector(".article-related__title");
      if (titleEl) titleEl.textContent = isSkill ? "相关技能教程" : "相关文章";

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
    var type = getContentType();

    if (!id) {
      showError(type === "skill" ? "未指定技能" : "未指定文章");
      return;
    }

    showLoading();

    try {
      var url = "/api/article?id=" + encodeURIComponent(id) + (type === "skill" ? "&type=skill" : "");
      var response = await fetch(url);

      if (!response.ok) {
        var errData = {};
        try { errData = await response.json(); } catch (e) {}
        showError(errData.error || "内容不存在");
        return;
      }

      var article = await response.json();
      renderArticle(article, type);
      setupShare();

      /* 加载相关内容（技能按路径分组，文章按分类分组） */
      var groupKey = type === "skill" ? article.path : article.category;
      loadRelated(article.id, groupKey, type);
    } catch (e) {
      showError("加载失败，请检查网络连接");
    }
  }

  /* 启动 */
  init();
})();
