/**
 * AI科技前沿 — 交互逻辑 & 数据可视化
 * ============================================ */

(function () {
  "use strict";

  /* ===== 主题切换 ===== */
  const themeToggle = document.getElementById("themeToggle");
  const html = document.documentElement;

  // 读取本地存储的主题
  const savedTheme = localStorage.getItem("theme") || "dark";
  html.setAttribute("data-theme", savedTheme);

  themeToggle.addEventListener("click", function () {
    const current = html.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    // 主题切换后重绘图表
    if (chartsReady) updateChartColors();
  });

  /* ===== 移动端菜单 ===== */
  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("nav");

  menuBtn.addEventListener("click", function () {
    nav.classList.toggle("nav--open");
    const expanded = nav.classList.contains("nav--open");
    menuBtn.setAttribute("aria-expanded", String(expanded));
  });

  // 点击导航链接后关闭菜单
  nav.querySelectorAll(".nav__link").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("nav--open");
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });

  /* ===== Header 滚动效果 ===== */
  const header = document.getElementById("header");
  const backToTop = document.getElementById("backToTop");

  /* ===== 导航高亮（提前声明，避免 TDZ 错误） ===== */
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav__link");

  function updateActiveNav() {
    var scrollPos = window.scrollY + 100;
    var currentId = "";
    sections.forEach(function (sec) {
      if (scrollPos >= sec.offsetTop) {
        currentId = sec.getAttribute("id");
      }
    });
    navLinks.forEach(function (link) {
      link.classList.remove("nav__link--active");
      if (link.getAttribute("href") === "#" + currentId) {
        link.classList.add("nav__link--active");
      }
    });
  }

  function onScroll() {
    const y = window.scrollY;
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
    updateActiveNav();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ===== 滚动揭示动画 ===== */
  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );

  document.querySelectorAll(".reveal").forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ===== 数字滚动动画 ===== */
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    var duration = 2000;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutExpo
      var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      var value = Math.floor(eased * target);
      el.textContent = value.toLocaleString("zh-CN");
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString("zh-CN");
      }
    }
    requestAnimationFrame(step);
  }

  var countObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll("[data-count]").forEach(function (el) {
    countObserver.observe(el);
  });

  /* ===== 要闻筛选 ===== */
  var filterBtns = document.querySelectorAll(".filter-btn");
  var newsCards = document.querySelectorAll(".news-card");

  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) {
        b.classList.remove("filter-btn--active");
      });
      btn.classList.add("filter-btn--active");

      var filter = btn.getAttribute("data-filter");
      newsCards.forEach(function (card) {
        var cat = card.getAttribute("data-category");
        if (filter === "all" || cat === filter) {
          card.style.display = "";
          card.style.animation = "fadeInUp 0.4s ease";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  /* ===== 技能路径筛选 ===== */
  var pathItems = document.querySelectorAll(".path-item");
  var skillCards = document.querySelectorAll(".skill-card");

  pathItems.forEach(function (item) {
    item.addEventListener("click", function () {
      pathItems.forEach(function (p) {
        p.classList.remove("path-item--active");
      });
      item.classList.add("path-item--active");

      var path = item.getAttribute("data-path");
      skillCards.forEach(function (card) {
        var cardPath = card.getAttribute("data-path");
        if (path === "all" || cardPath === path) {
          card.style.display = "";
          card.style.animation = "fadeInUp 0.4s ease";
        } else {
          card.style.display = "none";
        }
      });
    });
  });

  /* ===== 视频播放列表 ===== */
  var mainVideo = document.querySelector("#mainPlayer video");
  var mainPoster = document.querySelector("#mainPlayer video");
  var mainTitle = document.querySelector(".video-main__overlay h3");
  var videoItems = document.querySelectorAll(".video-item");

  videoItems.forEach(function (item) {
    item.addEventListener("click", function () {
      var src = item.getAttribute("data-src");
      var poster = item.getAttribute("data-poster");
      var title = item.querySelector("h4").textContent;

      mainVideo.src = src;
      mainVideo.poster = poster;
      mainTitle.textContent = title;
      mainVideo.load();
      mainVideo.play().catch(function () {});

      // 滚动到播放器
      mainVideo.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  /* ===== Chart.js 数据可视化 ===== */
  var chartsReady = false;
  var charts = {};

  // 获取当前主题颜色
  function getThemeColors() {
    var isDark = html.getAttribute("data-theme") === "dark";
    return {
      text: isDark ? "#a0aec0" : "#4a5568",
      grid: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      tooltipBg: isDark ? "#1a2332" : "#ffffff",
      tooltipBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"
    };
  }

  function initCharts() {
    if (typeof Chart === "undefined") return;
    var c = getThemeColors();
    Chart.defaults.font.family = "'Noto Sans SC', sans-serif";
    Chart.defaults.color = c.text;

    // 1. 折线图 — 模型参数量趋势
    var ctxTrend = document.getElementById("chartTrend");
    if (ctxTrend) {
      var gradient = ctxTrend.getContext("2d").createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, "rgba(0, 212, 255, 0.3)");
      gradient.addColorStop(1, "rgba(0, 212, 255, 0)");

      charts.trend = new Chart(ctxTrend, {
        type: "line",
        data: {
          labels: ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
          datasets: [
            {
              label: "最大参数量 (B)",
              data: [175, 280, 540, 1760, 2400, 3600, 5200],
              borderColor: "#00d4ff",
              backgroundColor: gradient,
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#00d4ff",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8
            }
          ]
        },
        options: chartOptions("linear")
      });
    }

    // 2. 雷达图 — 热门技术方向
    var ctxRadar = document.getElementById("chartRadar");
    if (ctxRadar) {
      charts.radar = new Chart(ctxRadar, {
        type: "radar",
        data: {
          labels: ["大模型", "RAG/Agent", "计算机视觉", "语音处理", "多模态", "AI安全"],
          datasets: [
            {
              label: "热度指数",
              data: [95, 88, 72, 65, 82, 58],
              borderColor: "#7c4dff",
              backgroundColor: "rgba(124, 77, 255, 0.15)",
              borderWidth: 2,
              pointBackgroundColor: "#7c4dff",
              pointRadius: 4,
              pointHoverRadius: 6
            }
          ]
        },
        options: chartOptions("radar")
      });
    }

    // 3. 环形图 — 学习偏好
    var ctxDoughnut = document.getElementById("chartDoughnut");
    if (ctxDoughnut) {
      charts.doughnut = new Chart(ctxDoughnut, {
        type: "doughnut",
        data: {
          labels: ["大模型微调", "RAG 系统", "计算机视觉", "数据分析", "AI Agent"],
          datasets: [
            {
              data: [32, 24, 18, 15, 11],
              backgroundColor: [
                "#00d4ff",
                "#7c4dff",
                "#ff4081",
                "#00e676",
                "#ff9100"
              ],
              borderWidth: 0,
              hoverOffset: 8
            }
          ]
        },
        options: chartOptions("doughnut")
      });
    }

    // 4. 柱状图 — 文章 vs 阅读
    var ctxBar = document.getElementById("chartBar");
    if (ctxBar) {
      charts.bar = new Chart(ctxBar, {
        type: "bar",
        data: {
          labels: ["3月", "4月", "5月", "6月", "7月", "8月"],
          datasets: [
            {
              label: "文章数",
              data: [45, 62, 78, 85, 102, 96],
              backgroundColor: "rgba(0, 212, 255, 0.7)",
              borderRadius: 6,
              barPercentage: 0.6
            },
            {
              label: "阅读量 (千)",
              data: [120, 185, 240, 310, 380, 350],
              backgroundColor: "rgba(124, 77, 255, 0.7)",
              borderRadius: 6,
              barPercentage: 0.6
            }
          ]
        },
        options: chartOptions("bar")
      });
    }

    chartsReady = true;
  }

  function chartOptions(type) {
    var c = getThemeColors();
    var base = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: c.text, font: { size: 12 } }
        },
        tooltip: {
          backgroundColor: c.tooltipBg,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: c.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      }
    };

    if (type === "linear" || type === "bar") {
      base.scales = {
        x: {
          grid: { color: c.grid },
          ticks: { color: c.text }
        },
        y: {
          grid: { color: c.grid },
          ticks: { color: c.text },
          beginAtZero: true
        }
      };
    }

    if (type === "radar") {
      base.scales = {
        r: {
          angleLines: { color: c.grid },
          grid: { color: c.grid },
          pointLabels: { color: c.text, font: { size: 11 } },
          ticks: { color: c.text, backdropColor: "transparent" },
          min: 0,
          max: 100
        }
      };
    }

    if (type === "doughnut") {
      base.cutout = "65%";
    }

    return base;
  }

  function updateChartColors() {
    Object.keys(charts).forEach(function (key) {
      if (charts[key]) {
        charts[key].destroy();
      }
    });
    charts = {};
    initCharts();
  }

  // 延迟初始化图表（等 Chart.js 加载完成）
  function waitForChart() {
    if (typeof Chart !== "undefined") {
      initCharts();
    } else {
      setTimeout(waitForChart, 100);
    }
  }

  // 当图表区域进入视口时初始化
  var chartSection = document.getElementById("charts");
  if (chartSection) {
    var chartObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            waitForChart();
            chartObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    chartObserver.observe(chartSection);
  }

  /* ===== 加入表单（演示） ===== */
  var joinForm = document.querySelector(".join-form");
  if (joinForm) {
    joinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = joinForm.querySelector('button[type="submit"]');
      var originalText = btn.textContent;
      btn.textContent = "✓ 加入成功！";
      btn.style.background = "var(--accent-green)";
      joinForm.reset();
      setTimeout(function () {
        btn.textContent = originalText;
        btn.style.background = "";
      }, 2500);
    });
  }

  /* ===== fadeInUp 动画关键帧（动态注入） ===== */
  var style = document.createElement("style");
  style.textContent =
    "@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }";
  document.head.appendChild(style);

  /* ============================================
     KV 动态内容加载
     尝试从 /api/content 拉取数据，成功则替换静态内容
     失败则保留 HTML 中的静态内容（本地开发兜底）
     ============================================ */

  var catLabels = { model: "大模型", application: "应用落地", research: "学术研究", industry: "产业动态" };
  var pathLabels = { python: "Python", ml: "机器学习", dl: "深度学习", nlp: "NLP & LLM", deploy: "模型部署" };

  function esc(str) {
    if (str == null) return "";
    var div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  /* --- 渲染：要闻卡片 --- */
  function renderNewsCards(items) {
    var html = items.map(function (a) {
      var feat = a.featured ? " news-card--featured" : "";
      var bc = a.badgeType === "hot" ? " news-card__badge--hot" : a.badgeType === "new" ? " news-card__badge--new" : "";
      return '<article class="news-card' + feat + ' reveal reveal--visible" data-category="' + esc(a.category) + '">' +
        '<div class="news-card__img" style="--img-url: url(\'' + esc(a.image) + '\')">' +
        (a.badge ? '<span class="news-card__badge' + bc + '">' + esc(a.badge) + '</span>' : '') +
        '</div><div class="news-card__body">' +
        '<span class="news-card__cat">' + esc(catLabels[a.category] || a.category) + '</span>' +
        '<h3 class="news-card__title">' + esc(a.title) + '</h3>' +
        '<p class="news-card__excerpt">' + esc(a.excerpt) + '</p>' +
        '<div class="news-card__meta"><span class="news-card__date">' + esc(a.date) + '</span>' +
        '<span class="news-card__reads">' + esc(a.reads) + ' 阅读</span></div></div></article>';
    }).join("");
    var grid = document.querySelector(".news__grid");
    if (grid) grid.innerHTML = html;
  }

  /* --- 渲染：技能卡片 --- */
  function renderSkillCards(items) {
    var html = items.map(function (s) {
      var tags = (s.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("");
      return '<div class="skill-card reveal reveal--visible" data-path="' + esc(s.path) + '">' +
        '<div class="skill-card__top"><span class="skill-card__icon">' + esc(s.icon) + '</span>' +
        '<span class="skill-card__level">' + esc(s.level) + '</span></div>' +
        '<h3 class="skill-card__title">' + esc(s.title) + '</h3>' +
        '<p class="skill-card__desc">' + esc(s.desc) + '</p>' +
        '<div class="skill-card__tags">' + tags + '</div>' +
        '<div class="skill-card__footer"><span class="skill-card__duration">' + esc(s.duration) + '</span>' +
        '<a href="#" class="skill-card__link">开始学习 →</a></div></div>';
    }).join("");
    var content = document.querySelector(".skills__content");
    if (content) content.innerHTML = html;
  }

  /* --- 渲染：技能路径侧边栏 --- */
  function renderSkillPaths(paths) {
    var html = paths.map(function (p, i) {
      return '<li class="path-item' + (i === 0 ? " path-item--active" : "") + '" data-path="' + esc(p.id) + '">' +
        '<span class="path-item__icon">' + esc(p.icon) + '</span>' +
        '<span class="path-item__text">' + esc(p.text) + '</span>' +
        '<span class="path-item__count">' + esc(p.count) + '</span></li>';
    }).join("");
    var list = document.querySelector(".skills__paths");
    if (list) list.innerHTML = html;
  }

  /* --- 渲染：视频专区 --- */
  function renderVideos(items) {
    var main = items.find(function (v) { return v.isMain; }) || items[0];
    var list = items.filter(function (v) { return !v.isMain; });
    if (main) {
      var player = document.querySelector("#mainPlayer");
      if (player) {
        var video = player.querySelector("video");
        var overlay = player.querySelector(".video-main__overlay h3");
        var meta = player.querySelector(".video-main__meta");
        if (video) {
          video.src = main.src;
          video.poster = main.poster;
        }
        if (overlay) overlay.textContent = main.title;
        if (meta) meta.innerHTML = "<span>▶ " + esc(main.duration) + "</span><span>📅 " + esc(main.date) + "</span><span>👁 " + esc(main.views) + " 观看</span>";
      }
    }
    var listHTML = list.map(function (v) {
      return '<div class="video-item" data-src="' + esc(v.src) + '" data-poster="' + esc(v.poster) + '">' +
        '<div class="video-item__thumb" style="--img-url: url(\'' + esc(v.poster) + '\')">' +
        '<span class="video-item__duration">' + esc(v.duration) + '</span>' +
        '<span class="video-item__play">▶</span></div>' +
        '<div class="video-item__info"><h4>' + esc(v.title) + '</h4><span>' + esc(v.views) + ' 观看</span></div></div>';
    }).join("");
    var listEl = document.querySelector(".video-list");
    if (listEl) listEl.innerHTML = listHTML;
  }

  /* --- 渲染：Hero 统计 --- */
  function renderStats(stats) {
    var container = document.querySelector(".hero__stats");
    if (!container) return;
    container.innerHTML = stats.map(function (s) {
      return '<div class="stat"><span class="stat__num" data-count="' + s.count + '">0</span><span class="stat__label">' + esc(s.label) + '</span></div>';
    }).join("");
  }

  /* --- 渲染：讨论 --- */
  function renderDiscussions(items) {
    var html = items.map(function (d) {
      var tags = (d.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("");
      var alt = d.avatarAlt ? " discussion__avatar--alt" : "";
      return '<div class="discussion"><div class="discussion__avatar' + alt + '">' + esc(d.avatar) + '</div>' +
        '<div class="discussion__content"><div class="discussion__head">' +
        '<span class="discussion__author">' + esc(d.author) + '</span>' +
        '<span class="discussion__time">' + esc(d.time) + '</span></div>' +
        '<h4 class="discussion__title">' + esc(d.title) + '</h4>' +
        '<p class="discussion__text">' + esc(d.text) + '</p>' +
        '<div class="discussion__tags">' + tags + '</div>' +
        '<div class="discussion__stats"><span>💬 ' + d.replies + ' 回复</span><span>👍 ' + d.likes + '</span><span>👁 ' + esc(d.views) + '</span></div>' +
        '</div></div>';
    }).join("");
    var main = document.querySelector(".community__main");
    if (main) {
      var moreBtn = main.querySelector(".community__more");
      var title = main.querySelector(".community__sub-title");
      main.innerHTML = (title ? title.outerHTML : '<h3 class="community__sub-title">🔥 热门讨论</h3>') + html +
        '<a href="#" class="btn btn--outline community__more">查看更多讨论</a>';
    }
  }

  /* --- 渲染：贡献者 --- */
  function renderContributors(items) {
    var html = items.map(function (c) {
      return '<li><span class="contributor-list__rank">' + c.rank + '</span>' +
        '<span class="contributor-list__avatar">' + esc(c.avatar) + '</span>' +
        '<span class="contributor-list__name">' + esc(c.name) + '</span>' +
        '<span class="contributor-list__score">' + esc(c.score) + '</span></li>';
    }).join("");
    var list = document.querySelector(".contributor-list");
    if (list) list.innerHTML = html;
  }

  /* --- 渲染：Hero 徽章 --- */
  function renderHeroBadge(text) {
    var badge = document.querySelector(".hero__badge");
    if (badge) {
      badge.innerHTML = '<span class="pulse-dot"></span><span>' + esc(text) + '</span>';
    }
  }

  /* --- 重新绑定内容相关事件 --- */
  function rebindContentEvents() {
    /* 要闻筛选 */
    filterBtns = document.querySelectorAll(".filter-btn");
    newsCards = document.querySelectorAll(".news-card");
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) { b.classList.remove("filter-btn--active"); });
        btn.classList.add("filter-btn--active");
        var filter = btn.getAttribute("data-filter");
        newsCards.forEach(function (card) {
          var cat = card.getAttribute("data-category");
          card.style.display = (filter === "all" || cat === filter) ? "" : "none";
          if (card.style.display !== "none") card.style.animation = "fadeInUp 0.4s ease";
        });
      });
    });

    /* 技能路径筛选 */
    pathItems = document.querySelectorAll(".path-item");
    skillCards = document.querySelectorAll(".skill-card");
    pathItems.forEach(function (item) {
      item.addEventListener("click", function () {
        pathItems.forEach(function (p) { p.classList.remove("path-item--active"); });
        item.classList.add("path-item--active");
        var path = item.getAttribute("data-path");
        skillCards.forEach(function (card) {
          var cp = card.getAttribute("data-path");
          card.style.display = (path === "all" || cp === path) ? "" : "none";
          if (card.style.display !== "none") card.style.animation = "fadeInUp 0.4s ease";
        });
      });
    });

    /* 视频播放列表 */
    videoItems = document.querySelectorAll(".video-item");
    videoItems.forEach(function (item) {
      item.addEventListener("click", function () {
        var src = item.getAttribute("data-src");
        var poster = item.getAttribute("data-poster");
        var title = item.querySelector("h4").textContent;
        mainVideo.src = src;
        mainVideo.poster = poster;
        mainTitle.textContent = title;
        mainVideo.load();
        mainVideo.play().catch(function () {});
        mainVideo.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    /* 数字滚动 */
    document.querySelectorAll("[data-count]").forEach(function (el) {
      countObserver.observe(el);
    });

    /* 滚动揭示 */
    document.querySelectorAll(".reveal:not(.reveal--visible)").forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* --- 加载动态内容 --- */
  async function loadDynamicContent() {
    try {
      var response = await fetch("/api/content?type=all");
      if (!response.ok) return;
      var data = await response.json();

      /* 检查是否有实际数据 */
      if (!data.articles || data.articles.length === 0) return;

      /* 渲染所有内容 */
      if (data.articles) renderNewsCards(data.articles);
      if (data.skills) renderSkillCards(data.skills);
      if (data.site_config && data.site_config.paths) renderSkillPaths(data.site_config.paths);
      if (data.videos) renderVideos(data.videos);
      if (data.site_config && data.site_config.stats) renderStats(data.site_config.stats);
      if (data.site_config && data.site_config.heroBadge) renderHeroBadge(data.site_config.heroBadge);
      if (data.discussions) renderDiscussions(data.discussions);
      if (data.contributors) renderContributors(data.contributors);

      /* 重新绑定事件 */
      rebindContentEvents();

      /* 更新学习建议 */
      if (data.site_config && data.site_config.learningTip) {
        var tip = document.querySelector(".skills__tip p");
        if (tip) tip.textContent = data.site_config.learningTip;
      }
    } catch (e) {
      /* 本地开发或 API 未部署，保留静态内容 */
    }
  }

  /* 启动动态加载 */
  loadDynamicContent();
})();
