/**
 * AI科技前沿 · 学习交流 — 技能知识分享独立页逻辑
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

  /* ===== 数据与状态 ===== */
  var PER_PAGE = 6;
  var allSkills = [];
  var allPaths = [];
  var currentPath = "all";
  var currentPage = 1;

  /* ===== 渲染：技能卡片（复用主页 .skill-card 结构） ===== */
  function skillCardHTML(s) {
    var tags = (s.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("");
    var link = "article.html?type=skill&id=" + encodeURIComponent(s.id);
    return '<div class="skill-card skill-card--clickable reveal reveal--visible" data-path="' + esc(s.path) + '" data-id="' + esc(s.id) + '" data-link="' + link + '">' +
      '<div class="skill-card__top"><span class="skill-card__icon">' + esc(s.icon) + '</span>' +
      '<span class="skill-card__level">' + esc(s.level) + '</span></div>' +
      '<h3 class="skill-card__title">' + esc(s.title) + '</h3>' +
      '<p class="skill-card__desc">' + esc(s.desc) + '</p>' +
      '<div class="skill-card__tags">' + tags + '</div>' +
      '<div class="skill-card__footer"><span class="skill-card__duration">' + esc(s.duration) + '</span>' +
      '<a href="' + link + '" class="skill-card__link">查看教程 →</a></div></div>';
  }

  /* ===== 渲染：学习路径侧边栏 ===== */
  function renderPaths() {
    var list = document.getElementById("skillPaths");
    if (!list) return;
    var html = allPaths.map(function (p, i) {
      return '<li class="path-item' + (i === 0 ? " path-item--active" : "") + '" data-path="' + esc(p.id) + '" style="cursor:pointer">' +
        '<span class="path-item__icon">' + esc(p.icon) + '</span>' +
        '<span class="path-item__text">' + esc(p.text) + '</span>' +
        '<span class="path-item__count">' + esc(p.count) + '</span></li>';
    }).join("");
    list.innerHTML = html;

    list.querySelectorAll(".path-item").forEach(function (item) {
      item.addEventListener("click", function () {
        list.querySelectorAll(".path-item").forEach(function (b) { b.classList.remove("path-item--active"); });
        item.classList.add("path-item--active");
        currentPath = item.getAttribute("data-path") || "all";
        currentPage = 1;
        renderSkillsPage();
      });
    });
  }

  /* ===== 渲染：技能列表 + 分页 ===== */
  function renderSkillsPage() {
    var gridEl = document.getElementById("skillsGrid");
    var pagerEl = document.getElementById("skillsPager");
    if (!gridEl) return;

    var filtered = currentPath === "all"
      ? allSkills
      : allSkills.filter(function (s) { return (s.path || "") === currentPath; });

    if (!filtered.length) {
      gridEl.innerHTML = '<div class="skills__empty">暂无技能内容' +
        (currentPath !== "all" ? '，换个学习路径试试' : '') + '</div>';
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    var totalPages = Math.ceil(filtered.length / PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = filtered.slice(start, start + PER_PAGE);
    gridEl.innerHTML = pageItems.map(skillCardHTML).join("");

    /* 卡片点击跳详情 */
    gridEl.querySelectorAll(".skill-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest(".skill-card__link")) return; /* 链接本身可点击 */
        var id = card.getAttribute("data-id");
        var link = card.getAttribute("data-link");
        if (link) window.location.href = link;
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
          renderSkillsPage();
          var section = document.getElementById("skills");
          if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    initLazyImages();
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
      document.title = "技能知识分享 | " + cfg.siteName;
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
    var descSkills = document.getElementById("descSkills");
    if (descSkills && cfg.descSkills) descSkills.textContent = cfg.descSkills;
    if (cfg.learningTip) {
      var tip = document.querySelector(".skills__tip p");
      if (tip) tip.textContent = cfg.learningTip;
    }
    if (window.__footerBrand) window.__footerBrand.applyFooterBranding(cfg);
  }

  /* ===== 加载数据 ===== */
  async function loadSkills() {
    try {
      var response = await fetch("/api/content?type=all");
      if (!response.ok) throw new Error("API error");
      var data = await response.json();

      applyBranding(data.site_config);

      allSkills = data.skills || [];

      /* 学习路径：优先用后台配置，兜底用默认项 */
      if (data.site_config && Array.isArray(data.site_config.paths) && data.site_config.paths.length) {
        allPaths = data.site_config.paths;
      } else {
        allPaths = [{ id: "all", icon: "📚", text: "全部技能", count: allSkills.length }];
      }

      renderPaths();
      renderSkillsPage();
    } catch (e) {
      var gridEl = document.getElementById("skillsGrid");
      if (gridEl) gridEl.innerHTML = '<div class="skills__empty">技能加载失败，请稍后再试</div>';
    }
  }

  loadSkills();
})();
