/**
 * AI科技前沿 — 交互逻辑 & 数据可视化
 * ============================================ */

(function () {
  "use strict";

  /* ===== PWA: Service Worker 注册 ===== */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {});
    });
  }

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

  /* ===== 视频播放列表（支持 mp4 直链与 B站等嵌入链接） ===== */
  var mainPlayerBox = document.querySelector("#mainPlayer");
  var mainVideo = mainPlayerBox ? mainPlayerBox.querySelector("video") : null;
  var mainTitle = document.querySelector(".video-main__overlay h3");
  var videoItems = document.querySelectorAll(".video-item");
  var embedFrame = null;

  /* 确保嵌入 iframe 容器存在 */
  function ensureEmbedFrame() {
    if (!mainPlayerBox) return null;
    if (!embedFrame) {
      embedFrame = document.createElement("iframe");
      embedFrame.className = "video-main__embed";
      embedFrame.setAttribute("allowfullscreen", "true");
      embedFrame.setAttribute("allow", "autoplay; fullscreen; encrypted-media; picture-in-picture");
      embedFrame.setAttribute("frameborder", "0");
      embedFrame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      embedFrame.style.display = "none";
      mainPlayerBox.insertBefore(embedFrame, mainPlayerBox.firstChild);
    }
    return embedFrame;
  }

  /* 统一播放入口：item = { src, poster, embed, title, duration, date, views } */
  function playMainVideo(item) {
    if (!item) return;
    var frame = ensureEmbedFrame();

    if (item.embed) {
      /* 嵌入模式（B站/腾讯视频等） */
      if (mainVideo) {
        try { mainVideo.pause(); } catch (e) {}
        mainVideo.removeAttribute("src");
        mainVideo.style.display = "none";
      }
      if (frame) {
        var src = item.embed;
        /* 自动播放参数 */
        if (/autoplay=0/.test(src)) {
          src = src.replace(/autoplay=0/, "autoplay=1");
        } else if (/[?&]autoplay=/.test(src) === false && src.indexOf("?") !== -1) {
          src += "&autoplay=1";
        }
        frame.src = src;
        frame.style.display = "";
      }
    } else {
      /* mp4 直链模式 */
      if (frame) {
        frame.src = "";
        frame.style.display = "none";
      }
      if (mainVideo) {
        mainVideo.style.display = "";
        mainVideo.src = item.src || "";
        mainVideo.poster = item.poster || "";
        mainVideo.load();
        mainVideo.play().catch(function () {});
      }
    }

    /* 更新覆盖层信息 */
    if (mainTitle && item.title) mainTitle.textContent = item.title;
    var meta = document.querySelector(".video-main__meta");
    if (meta) {
      meta.innerHTML = "<span>▶ " + esc(item.duration || "") + "</span>" +
        (item.date ? "<span>📅 " + esc(item.date) + "</span>" : "") +
        "<span>👁 " + esc(item.views || "0") + " 观看</span>";
    }
  }

  /* 点击列表项切换主播放器 */
  function bindVideoItems() {
    videoItems = document.querySelectorAll(".video-item");
    videoItems.forEach(function (item) {
      if (item.getAttribute("data-bound")) return; /* 防止分页重渲染后重复绑定 */
      item.setAttribute("data-bound", "1");
      item.addEventListener("click", function () {
        playMainVideo({
          src: item.getAttribute("data-src"),
          poster: item.getAttribute("data-poster"),
          embed: item.getAttribute("data-embed") || "",
          title: item.querySelector("h4") ? item.querySelector("h4").textContent : "",
        });
        if (mainVideo || embedFrame) {
          var target = embedFrame && embedFrame.style.display !== "none" ? embedFrame : mainVideo;
          if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  bindVideoItems();

  /* ===== Chart.js 数据可视化 ===== */
  var chartsReady = false;
  var charts = {};
  /* 后台配置的图表数据（来自 site_config.charts），为空时用默认数据 */
  var siteCharts = null;

  /* 更新图表卡片标题 */
  function applyChartTitle(canvasId, title) {
    if (!title) return;
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var head = canvas.closest(".chart-card");
    if (!head) return;
    var h3 = head.querySelector("h3");
    if (h3) h3.textContent = title;
  }

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
      var cfgTrend = (siteCharts && siteCharts.trend) || {};
      applyChartTitle("chartTrend", cfgTrend.title);
      var gradient = ctxTrend.getContext("2d").createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, "rgba(0, 212, 255, 0.3)");
      gradient.addColorStop(1, "rgba(0, 212, 255, 0)");

      charts.trend = new Chart(ctxTrend, {
        type: "line",
        data: {
          labels: cfgTrend.labels || ["2020", "2021", "2022", "2023", "2024", "2025", "2026"],
          datasets: [
            {
              label: "最大参数量 (B)",
              data: cfgTrend.data || [175, 280, 540, 1760, 2400, 3600, 5200],
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
      var cfgRadar = (siteCharts && siteCharts.radar) || {};
      applyChartTitle("chartRadar", cfgRadar.title);
      charts.radar = new Chart(ctxRadar, {
        type: "radar",
        data: {
          labels: cfgRadar.labels || ["大模型", "RAG/Agent", "计算机视觉", "语音处理", "多模态", "AI安全"],
          datasets: [
            {
              label: "热度指数",
              data: cfgRadar.data || [95, 88, 72, 65, 82, 58],
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
      var cfgDoughnut = (siteCharts && siteCharts.doughnut) || {};
      applyChartTitle("chartDoughnut", cfgDoughnut.title);
      charts.doughnut = new Chart(ctxDoughnut, {
        type: "doughnut",
        data: {
          labels: cfgDoughnut.labels || ["大模型微调", "RAG 系统", "计算机视觉", "数据分析", "AI Agent"],
          datasets: [
            {
              data: cfgDoughnut.data || [32, 24, 18, 15, 11],
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
      var cfgBar = (siteCharts && siteCharts.bar) || {};
      applyChartTitle("chartBar", cfgBar.title);
      var barSets = cfgBar.sets && cfgBar.sets.length >= 2 ? cfgBar.sets : [
        { label: "文章数", data: [45, 62, 78, 85, 102, 96] },
        { label: "阅读量 (千)", data: [120, 185, 240, 310, 380, 350] },
      ];
      charts.bar = new Chart(ctxBar, {
        type: "bar",
        data: {
          labels: cfgBar.labels || ["3月", "4月", "5月", "6月", "7月", "8月"],
          datasets: [
            {
              label: barSets[0].label,
              data: barSets[0].data,
              backgroundColor: "rgba(0, 212, 255, 0.7)",
              borderRadius: 6,
              barPercentage: 0.6
            },
            {
              label: barSets[1].label,
              data: barSets[1].data,
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

  /* ===== 加入社区表单（真实注册 → 写入 KV） ===== */
  var joinForm = document.querySelector(".join-form");
  if (joinForm) {
    joinForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameInput = joinForm.querySelector('input[aria-label="昵称"]');
      var emailInput = joinForm.querySelector('input[aria-label="邮箱"]');
      var btn = joinForm.querySelector('button[type="submit"]');
      var note = joinForm.querySelector(".join-card__note");
      var originalNote = note ? note.innerHTML : "";
      var name = nameInput.value.trim();
      var email = emailInput.value.trim();

      if (!name || !email) return;
      btn.disabled = true;
      btn.textContent = "提交中...";

      fetch("/api/community/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: name, email: email }),
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success) {
            btn.textContent = "✓ 加入成功！";
            btn.style.background = "var(--accent-green)";
            if (note) note.innerHTML = "✅ 已登记，欢迎加入！";
            joinForm.reset();
          } else {
            alert(res.error || "加入失败，请稍后再试");
          }
          setTimeout(function () {
            btn.disabled = false;
            btn.textContent = "立即加入";
            btn.style.background = "";
            if (note) note.innerHTML = originalNote;
          }, 2500);
        })
        .catch(function () {
          alert("网络错误，请稍后再试");
          btn.disabled = false;
          btn.textContent = "立即加入";
        });
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

  /* --- 图片懒加载（CSS 背景图） --- */
  function initLazyImages() {
    if (!("IntersectionObserver" in window)) {
      /* 不支持 IntersectionObserver 的浏览器直接加载 */
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

  /* --- 渲染：要闻卡片 --- */
  function renderNewsCards(items) {
    var html = items.map(function (a) {
      var feat = a.featured ? " news-card--featured" : "";
      var bc = a.badgeType === "hot" ? " news-card__badge--hot" : a.badgeType === "new" ? " news-card__badge--new" : "";
      return '<article class="news-card' + feat + ' reveal reveal--visible" data-category="' + esc(a.category) + '" data-id="' + esc(a.id) + '" style="cursor:pointer">' +
        '<div class="news-card__img lazy-img" data-bg="' + esc(a.image) + '">' +
        (a.badge ? '<span class="news-card__badge' + bc + '">' + esc(a.badge) + '</span>' : '') +
        '</div><div class="news-card__body">' +
        '<span class="news-card__cat">' + esc(catLabels[a.category] || a.category) + '</span>' +
        '<h3 class="news-card__title">' + esc(a.title) + '</h3>' +
        '<p class="news-card__excerpt">' + esc(a.excerpt) + '</p>' +
        '<div class="news-card__meta"><span class="news-card__date">' + esc(a.date) + '</span>' +
        '<span class="news-card__reads">' + esc(a.reads) + ' 阅读</span></div>' +
        '<span class="news-card__readmore">阅读全文 →</span>' +
        '</div></article>';
    }).join("");
    var grid = document.querySelector(".news__grid");
    if (grid) grid.innerHTML = html;
  }

  /* --- 渲染：技能卡片（可点击进入教程详情页） --- */
  function renderSkillCards(items) {
    var html = items.map(function (s) {
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
  /* 首页布局：第 1 个为主视频，第 2-6 个进右侧列表（共 6 个）；
     从第 7 个起折叠到下方"更多视频"网格，分页展示（每页 4 个，两列两行） */
  var VIDEO_MAIN_COUNT = 1;   /* 主视频数量 */
  var VIDEO_LIST_COUNT = 5;   /* 右侧列表数量 */
  var VIDEO_MORE_PER_PAGE = 4;/* 下方网格每页数量 */
  var videoMoreItems = [];    /* 第 7 个起的视频 */
  var videoMorePage = 1;      /* 当前页码 */

  function videoCardHTML(v) {
    return '<div class="video-item" data-src="' + esc(v.src || "") + '" data-poster="' + esc(v.poster || "") + '" data-embed="' + esc(v.embed || "") + '">' +
      '<div class="video-item__thumb" style="--img-url: url(\'' + esc(v.poster) + '\')">' +
      '<span class="video-item__duration">' + esc(v.duration) + '</span>' +
      '<span class="video-item__play">▶</span></div>' +
      '<div class="video-item__info"><h4>' + esc(v.title) + '</h4><span>' + esc(v.views) + ' 观看</span></div></div>';
  }

  /* 渲染"更多视频"分页 */
  function renderVideoMorePage() {
    var gridEl = document.querySelector("#videoMoreGrid");
    var pagerEl = document.querySelector("#videoMorePager");
    var countEl = document.querySelector("#videoMoreCount");
    var boxEl = document.querySelector("#videoMore");
    if (!gridEl || !pagerEl || !boxEl) return;

    if (!videoMoreItems.length) {
      boxEl.hidden = true;
      gridEl.innerHTML = "";
      pagerEl.innerHTML = "";
      return;
    }
    boxEl.hidden = false;

    var totalPages = Math.ceil(videoMoreItems.length / VIDEO_MORE_PER_PAGE);
    if (videoMorePage > totalPages) videoMorePage = totalPages;
    if (videoMorePage < 1) videoMorePage = 1;

    var start = (videoMorePage - 1) * VIDEO_MORE_PER_PAGE;
    var pageItems = videoMoreItems.slice(start, start + VIDEO_MORE_PER_PAGE);
    gridEl.innerHTML = pageItems.map(function (v) {
      return videoCardHTML(v).replace('class="video-item"', 'class="video-item video-item--grid"');
    }).join("");

    if (countEl) countEl.textContent = "共 " + videoMoreItems.length + " 个视频";

    /* 分页按钮 */
    var pagerHTML = "";
    if (totalPages > 1) {
      pagerHTML = '<button type="button" class="video-pager__btn" data-page="' + (videoMorePage - 1) + '"' +
        (videoMorePage <= 1 ? " disabled" : "") + '>← 上一页</button>' +
        '<span class="video-pager__info">第 ' + videoMorePage + " / " + totalPages + ' 页</span>' +
        '<button type="button" class="video-pager__btn" data-page="' + (videoMorePage + 1) + '"' +
        (videoMorePage >= totalPages ? " disabled" : "") + '>下一页 →</button>';
    }
    pagerEl.innerHTML = pagerHTML;

    /* 绑定分页按钮 */
    pagerEl.querySelectorAll(".video-pager__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var p = parseInt(btn.getAttribute("data-page"), 10);
        if (isNaN(p)) return;
        videoMorePage = p;
        renderVideoMorePage();
        /* 翻页后回到"更多视频"区域顶部 */
        var head = document.querySelector("#videoMore");
        if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    /* 重新绑定视频卡片点击（复用播放列表逻辑） */
    bindVideoItems();
  }

  function renderVideos(items) {
    if (!items || !items.length) return;
    var main = items.find(function (v) { return v.isMain; }) || items[0];
    var rest = items.filter(function (v) { return v !== main; });
    if (main) {
      playMainVideo({
        src: main.src,
        poster: main.poster,
        embed: main.embed || "",
        title: main.title,
        duration: main.duration,
        date: main.date,
        views: main.views,
      });
    }
    /* 第 2-6 个进右侧列表，最多 5 个，避免无限向下拉伸主视频 */
    var sideList = rest.slice(0, VIDEO_LIST_COUNT);
    var listHTML = sideList.map(videoCardHTML).join("");
    var listEl = document.querySelector(".video-list");
    if (listEl) listEl.innerHTML = listHTML;

    /* 第 7 个起折叠到分页网格 */
    videoMoreItems = rest.slice(VIDEO_LIST_COUNT);
    videoMorePage = 1;
    renderVideoMorePage();
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
  /* 已审核评论（从 /api/community/comments 拉取） */
  var communityComments = [];

  function likedMap() {
    try {
      return JSON.parse(localStorage.getItem("ai_tech_liked") || "{}");
    } catch (e) {
      return {};
    }
  }

  /* --- 留言折叠分页：主页仅展示最新 1 条，其余进分页界面 --- */
  var COMMENT_PAGE_SIZE = 10;       /* 展开区每页留言数 */
  var discussionCommentsMap = {};   /* discussionId -> 该话题全部留言（按时间升序） */
  var commentPageMap = {};          /* discussionId -> 当前页码 */

  function commentItemHTML(c) {
    return '<div class="discussion-comment">' +
      '<div class="discussion-comment__head"><span class="discussion-comment__author">' + esc(c.nickname) + '</span>' +
      '<span class="discussion-comment__time">' + esc(c.date) + '</span></div>' +
      '<p class="discussion-comment__text">' + esc(c.content) + '</p></div>';
  }

  /* 按时间升序排列（旧 → 新），最新的一条在末尾 */
  function sortCommentsAsc(list) {
    return list.slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }

  /* 构建留言区块：最新 1 条 + "查看全部"折叠区（分页，最新在前） */
  function buildCommentsBlock(discussionId, comments) {
    if (!comments.length) return "";
    discussionCommentsMap[discussionId] = sortCommentsAsc(comments);
    commentPageMap[discussionId] = 1;
    var latest = discussionCommentsMap[discussionId][discussionCommentsMap[discussionId].length - 1];
    var latestHTML = '<div class="discussion-comments__latest">' +
      '<span class="discussion-comments__badge">最新留言</span>' +
      commentItemHTML(latest) + '</div>';
    var more = "";
    if (comments.length > 1) {
      more = '<button type="button" class="comments-toggle" data-id="' + esc(discussionId) + '">📦 查看全部 ' + comments.length + ' 条留言 ▾</button>' +
        '<div class="discussion-comments__all" data-id="' + esc(discussionId) + '" hidden>' +
        '<div class="discussion-comments__list"></div>' +
        '<div class="comments-pager"></div></div>';
    }
    return '<div class="discussion-comments">' + latestHTML + more + '</div>';
  }

  /* 渲染某个话题折叠区的指定页（留言最新在前） */
  function renderCommentsPage(discussionId) {
    var all = discussionCommentsMap[discussionId] || [];
    var box = document.querySelector('.discussion-comments__all[data-id="' + discussionId + '"]');
    if (!box || !all.length) return;
    var totalPages = Math.ceil(all.length / COMMENT_PAGE_SIZE);
    var page = commentPageMap[discussionId] || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    commentPageMap[discussionId] = page;

    /* 折叠区按最新在前展示：反转时间顺序 */
    var desc = all.slice().reverse();
    var start = (page - 1) * COMMENT_PAGE_SIZE;
    var listEl = box.querySelector(".discussion-comments__list");
    var pagerEl = box.querySelector(".comments-pager");
    if (listEl) {
      listEl.innerHTML = desc.slice(start, start + COMMENT_PAGE_SIZE).map(commentItemHTML).join("");
    }
    if (pagerEl) {
      pagerEl.innerHTML = totalPages > 1
        ? '<button type="button" class="video-pager__btn" data-disc="' + esc(discussionId) + '" data-page="' + (page - 1) + '"' +
          (page <= 1 ? " disabled" : "") + '>← 上一页</button>' +
          '<span class="video-pager__info">第 ' + page + " / " + totalPages + ' 页</span>' +
          '<button type="button" class="video-pager__btn" data-disc="' + esc(discussionId) + '" data-page="' + (page + 1) + '"' +
          (page >= totalPages ? " disabled" : "") + '>下一页 →</button>'
        : "";
      pagerEl.querySelectorAll(".video-pager__btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (btn.disabled) return;
          var p = parseInt(btn.getAttribute("data-page"), 10);
          var did = btn.getAttribute("data-disc");
          if (isNaN(p) || !did) return;
          commentPageMap[did] = p;
          renderCommentsPage(did);
        });
      });
    }
  }

  function renderDiscussions(items) {
    var liked = likedMap();
    var html = items.map(function (d) {
      var tags = (d.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("");
      var alt = d.avatarAlt ? " discussion__avatar--alt" : "";
      var isLiked = !!liked[d.id];
      var comments = communityComments.filter(function (c) { return c.discussionId === d.id; });
      /* 主页只展示最新 1 条留言，其余折叠到分页界面 */
      var commentsHTML = buildCommentsBlock(d.id, comments);
      return '<div class="discussion">' +
        '<div class="discussion__avatar' + alt + '">' + esc(d.avatar) + '</div>' +
        '<div class="discussion__content"><div class="discussion__head">' +
        '<span class="discussion__author">' + esc(d.author) + '</span>' +
        '<span class="discussion__time">' + esc(d.time) + '</span></div>' +
        '<h4 class="discussion__title">' + esc(d.title) + '</h4>' +
        '<p class="discussion__text">' + esc(d.text) + '</p>' +
        '<div class="discussion__tags">' + tags + '</div>' +
        '<div class="discussion__stats">' +
        '<span>💬 ' + esc(d.replies) + ' 回复</span>' +
        '<button type="button" class="like-btn' + (isLiked ? " is-liked" : "") + '" data-id="' + esc(d.id) + '" title="点赞">' +
        '<span class="like-btn__icon">' + (isLiked ? "👍" : "👍") + '</span>' +
        '<span class="like-btn__count">' + esc(d.likes) + '</span></button>' +
        '<span>👁 ' + esc(d.views) + '</span></div>' +
        commentsHTML +
        '<div class="discussion-reply">' +
        '<button type="button" class="discussion-reply__toggle" data-id="' + esc(d.id) + '">💬 我也说两句</button>' +
        '<form class="reply-form" data-id="' + esc(d.id) + '" style="display:none">' +
        '<div class="reply-form__row"><input type="text" class="reply-form__name" placeholder="你的昵称（2-20字）" maxlength="20" required>' +
        '<button type="submit" class="btn btn--primary btn--sm">提交评论</button></div>' +
        '<textarea class="reply-form__content" placeholder="写下你的见解...（5-500字），审核通过后展示" maxlength="500" required></textarea>' +
        '</form></div>' +
        '</div></div>';
    }).join("");
    var main = document.querySelector(".community__main");
    if (main) {
      var moreBtn = main.querySelector(".community__more");
      var title = main.querySelector(".community__sub-title");
      main.innerHTML = (title ? title.outerHTML : '<h3 class="community__sub-title">🔥 热门讨论</h3>') + html +
        '<a href="#" class="btn btn--outline community__more">查看更多讨论</a>';
    }
    bindCommunityEvents();
  }

  /* --- 绑定社区互动事件（点赞 / 评论） --- */
  function bindCommunityEvents() {
    /* 点赞 */
    document.querySelectorAll(".like-btn").forEach(function (btn) {
      if (btn.getAttribute("data-bound")) return;
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        if (btn.classList.contains("is-liked")) return;
        var id = btn.getAttribute("data-id");
        fetch("/api/community/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: id }),
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (!res.success) {
              if (res.already) {
                var map = likedMap();
                map[id] = true;
                localStorage.setItem("ai_tech_liked", JSON.stringify(map));
                btn.classList.add("is-liked");
              }
              return;
            }
            var map = likedMap();
            map[id] = true;
            localStorage.setItem("ai_tech_liked", JSON.stringify(map));
            btn.classList.add("is-liked");
            var count = btn.querySelector(".like-btn__count");
            if (count) count.textContent = res.likes;
          })
          .catch(function () {});
      });
    });

    /* 评论框展开/收起 */
    document.querySelectorAll(".discussion-reply__toggle").forEach(function (toggle) {
      if (toggle.getAttribute("data-bound")) return;
      toggle.setAttribute("data-bound", "1");
      toggle.addEventListener("click", function () {
        var form = toggle.parentElement.querySelector(".reply-form");
        if (!form) return;
        form.style.display = form.style.display === "none" ? "block" : "none";
      });
    });

    /* "查看全部留言" 展开/收起（首次展开时渲染第 1 页） */
    document.querySelectorAll(".comments-toggle").forEach(function (btn) {
      if (btn.getAttribute("data-bound")) return;
      btn.setAttribute("data-bound", "1");
      btn.addEventListener("click", function () {
        var did = btn.getAttribute("data-id");
        var box = document.querySelector('.discussion-comments__all[data-id="' + did + '"]');
        if (!box) return;
        var willShow = box.hidden;
        box.hidden = !willShow;
        if (willShow) {
          renderCommentsPage(did);
          btn.innerHTML = btn.innerHTML.replace("▾", "▴");
        } else {
          btn.innerHTML = btn.innerHTML.replace("▴", "▾");
        }
      });
    });

    /* 提交评论 */
    document.querySelectorAll(".reply-form").forEach(function (form) {
      if (form.getAttribute("data-bound")) return;
      form.setAttribute("data-bound", "1");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var id = form.getAttribute("data-id");
        var nameInput = form.querySelector(".reply-form__name");
        var contentInput = form.querySelector(".reply-form__content");
        var submitBtn = form.querySelector('button[type="submit"]');
        var name = nameInput.value.trim();
        var content = contentInput.value.trim();
        if (name.length < 2 || name.length > 20) {
          alert("昵称需为 2-20 个字符");
          return;
        }
        if (content.length < 5 || content.length > 500) {
          alert("评论内容需为 5-500 字");
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = "提交中...";
        fetch("/api/community/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ discussionId: id, nickname: name, content: content }),
        })
          .then(function (r) { return r.json(); })
          .then(function (res) {
            if (res.success) {
              form.reset();
              form.style.display = "none";
              alert("评论已提交，审核通过后会展示在讨论区");
            } else {
              alert(res.error || "提交失败，请稍后再试");
            }
            submitBtn.disabled = false;
            submitBtn.textContent = "提交评论";
          })
          .catch(function () {
            alert("网络错误，请稍后再试");
            submitBtn.disabled = false;
            submitBtn.textContent = "提交评论";
          });
      });
    });
  }

  /* --- 加载已审核评论 --- */
  function loadCommunityComments() {
    fetch("/api/community/comments")
      .then(function (r) { return r.json(); })
      .then(function (res) {
        communityComments = res.data || [];
        /* 若已有审核通过的评论，重新渲染讨论区展示出来 */
        if (communityComments.length > 0) {
          fetch("/api/content?type=discussions")
            .then(function (r) { return r.json(); })
            .then(function (dr) {
              var list = dr.data || [];
              if (list.length > 0) renderDiscussions(list);
            })
            .catch(function () {});
        }
      })
      .catch(function () {});
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

  /* --- 应用站点品牌与外观配置（后台可改） --- */
  var FONT_SIZE_MAP = {
    small: "13.5px",
    default: "",
    large: "17.5px",
    xlarge: "19px",
  };

  /* --- SVG 图标库（社交媒体） --- */
  var SOCIAL_ICONS = {
    github: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
    wechat: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.902-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.111.24-.247 0-.06-.024-.12-.04-.177l-.326-1.232a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-3.04-5.91-6.81-6.084l-.252-.038zm-3.373 3.379c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/></svg>',
    zhihu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5.721 0C2.251 0 0 2.25 0 5.719V18.28C0 21.751 2.252 24 5.721 24h12.56C21.751 24 24 21.75 24 18.281V5.72C24 2.249 21.75 0 18.281 0H5.72zm1.964 4.078c-.271.73-.5 1.434-.686 2.111h4.878v2.092h-1.53v8.548h1.395l.262 2.094-3.49-.014c.375.545.802 1.246 1.283 2.103l-2.246.884a30.7 30.7 0 0 0-1.566-2.83l1.766-.686H4.392v-8.9h2.526c.207-.738.392-1.52.553-2.342l2.214.45zm6.12 2.076h6.077v9.176h-2.39v-1.258h-1.375v1.258h-2.312V6.155zm2.312 2.094v3.726h1.375V8.249h-1.375zM7.956 7.926l-2.146.712c-.178.74-.392 1.453-.644 2.135h2.43v3.764H4.794v-4.375l2.168-.719.994-1.517zm12.055 7.897c.421.547.92 1.222 1.498 2.022l-1.944 1.005c-.399-.684-.828-1.364-1.283-2.04l1.729-.987z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    bilibili: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.573 4.44c.071.071.142.142.213.213h4.267l1.92-1.92c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.4.551.4.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.764-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    email: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    qq: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M21.395 15.035a39.548 39.548 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39.547 39.547 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.831-.435.316-.38.637-.301.765.343.558 5.883.356 7.436.183 1.553.173 7.093.375 7.436-.183.079-.128.134-.449-.301-.765-.482-.352-1.233-.643-1.845-.831 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.583-1.39-.438-4.673z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.095.048.317.084.558.222 1.422.111 3.043-.736 5.899-.953 3.211-1.498 4.823-2.385 5.673-.592.567-1.23.546-1.8.115-.722-.546-1.098-1.484-1.484-2.492-.168-.437-.31-.886-.453-1.335a.52.52 0 0 1 .3-.637c.4-.183.763-.296 1.116-.399.4-.115.7-.183.953-.252.31-.085.55-.252.6-.546.05-.294-.057-.567-.283-.8-.225-.232-.584-.368-.953-.368-.37 0-.739.136-.964.368-.225.233-.334.506-.283.8.05.294.29.461.6.546.253.069.553.137.953.252.353.103.716.216 1.116.399a.52.52 0 0 1 .3.637c-.143.449-.285.898-.453 1.335-.386 1.008-.762 1.946-1.484 2.492-.57.431-1.208.452-1.8-.115-.887-.85-1.432-2.462-2.385-5.673-.847-2.856-.958-4.477-.736-5.899.036-.241.068-.463.084-.558a.506.506 0 0 1 .171-.325c.144-.117.365-.142.465-.14l5.962.014z"/></svg>',
    weibo: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-7.668 5.439v.004h-.112zM9.05 17.219c-.39.616-1.219.886-1.879.604-.648-.279-.84-.991-.454-1.593.385-.598 1.218-.864 1.87-.601.66.269.864.99.454 1.59h.009zm1.27-1.627c-.144.229-.45.336-.686.234-.234-.105-.304-.36-.165-.585.141-.229.444-.336.686-.234.234.105.315.36.165.585zm.176-2.235c-1.293-.338-2.757.308-3.314 1.477-.571 1.193-.015 2.514 1.293 2.88 1.351.375 2.857-.293 3.404-1.5.535-1.193-.042-2.505-1.383-2.857zm5.293-2.782c-.345-.104-.57-.18-.405-.615.375-.87.42-1.604.014-2.131-.764-.99-2.849-.967-5.193-.075 0 0-.749.314-.555-.255.375-1.291.21-2.37-.27-2.985-1.155-1.479-4.215.075-6.81 3.435-2.305 2.97-3.585 6.045-3.585 8.265 0 4.395 5.625 6.96 11.13 6.96 7.215 0 12.015-4.185 12.015-7.515 0-2.01-1.695-3.155-3.24-3.63l.014-.004.015.06zm-2.115-5.265c.27-.314.66-.435 1.05-.345.391.105.66.391.735.765.03.18.014.36-.045.525-.061.165-.165.3-.3.405-.149.119-.314.179-.494.179-.091 0-.181-.014-.27-.045-.391-.105-.661-.39-.735-.765-.031-.18-.016-.36.045-.525.06-.164.164-.299.299-.399l-.005-.014.005-.004-.001-.014.001-.014zm1.65-2.31c.255-.299.57-.435.945-.42.375.015.69.165.93.435.241.27.353.585.33.945-.015.36-.149.66-.399.9-.255.24-.555.36-.9.345-.36-.014-.66-.165-.9-.435-.241-.27-.353-.585-.33-.945.015-.36.149-.66.399-.9l.025-.06z"/></svg>',
    douyin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19.589 7.725a4.715 4.715 0 0 1-2.737-.897 4.715 4.715 0 0 1-1.715-2.706h-3.05v12.336a2.875 2.875 0 0 1-2.875 2.875 2.875 2.875 0 1 1 .75-5.633V9.948a7.041 7.041 0 0 0-1.575-.179 6.075 6.075 0 1 0 6.075 6.075V9.464a7.041 7.041 0 0 0 4.127.66V7.725z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  };

  /* --- 渲染社交媒体链接 --- */
  function renderSocialLinks(links) {
    var container = document.getElementById("footerSocial");
    if (!container) return;
    if (!links || !links.length) return; /* 无配置则保留默认HTML */
    var html = links.map(function (s) {
      var iconHTML = "";
      if (s.type === "custom" || !SOCIAL_ICONS[s.type]) {
        /* 自定义类型：用 emoji */
        iconHTML = '<span style="font-size:1.15rem">' + esc(s.icon || s.label || "🔗") + '</span>';
      } else {
        iconHTML = SOCIAL_ICONS[s.type] || SOCIAL_ICONS.custom;
      }
      var href = s.url || "#";
      /* email 类型自动加 mailto: */
      if (s.type === "email" && href.indexOf("mailto:") === -1 && href.indexOf("http") === -1) {
        href = "mailto:" + href;
      }
      return '<a href="' + esc(href) + '" aria-label="' + esc(s.label || s.type || "链接") + '" class="footer__social-link" target="_blank" rel="noopener" title="' + esc(s.label || "") + '">' + iconHTML + '</a>';
    }).join("");
    container.innerHTML = html;
  }

  /* 底部链接列表渲染（学习资源 / 关于我们，后台可配置） */
  function renderFooterLinks(containerId, links) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!links || !links.length) return; /* 无配置则保留默认 HTML */
    var html = links.map(function (l) {
      var label = l.label || "链接";
      var url = l.url || "#";
      return '<li><a href="' + esc(url) + '">' + esc(label) + '</a></li>';
    }).join("");
    container.innerHTML = html;
  }

  /* 底部版权文字双击进入管理后台 */
  function setupAdminAccess() {
    var copyEl = document.getElementById("footerCopyText");
    if (!copyEl) return;
    copyEl.style.cursor = "pointer";
    copyEl.title = "";
    copyEl.addEventListener("dblclick", function () {
      window.location.href = "admin.html";
    });
  }

  function applySiteBranding(cfg) {
    if (!cfg) return;

    /* 站点名称：页面标题 + 导航栏/页脚 Logo 文字 */
    if (cfg.siteName) {
      document.title = cfg.siteName + " | 要闻 · 分享 · 交流";
      var logoText = document.getElementById("siteLogoText");
      var footerLogoText = document.getElementById("footerLogoText");
      if (logoText) logoText.textContent = cfg.siteName;
      if (footerLogoText) footerLogoText.textContent = cfg.siteName;
    }

    /* Logo 图片：有地址则显示图片并隐藏默认图标 */
    var logoImg = document.getElementById("siteLogoImg");
    var logoIcon = document.getElementById("siteLogoIcon");
    if (logoImg && logoIcon) {
      if (cfg.logoUrl) {
        logoImg.src = cfg.logoUrl;
        logoImg.style.display = "";
        logoIcon.style.display = "none";
        logoImg.onerror = function () {
          /* 图片加载失败时回退默认图标 */
          logoImg.style.display = "none";
          logoIcon.style.display = "";
        };
      } else {
        logoImg.style.display = "none";
        logoIcon.style.display = "";
      }
    }

    /* 首页 Hero 文案 */
    var heroTitle = document.getElementById("heroTitleText");
    if (heroTitle && cfg.heroTitle) heroTitle.textContent = cfg.heroTitle;
    var heroSubtitle = document.getElementById("heroSubtitleText");
    if (heroSubtitle && cfg.heroSubtitle) heroSubtitle.textContent = cfg.heroSubtitle;
    var heroDesc = document.getElementById("heroDescText");
    if (heroDesc && cfg.heroDesc) {
      heroDesc.innerHTML = esc(cfg.heroDesc).replace(/\n/g, "<br>");
    }

    /* 页脚描述 */
    var footerDesc = document.getElementById("footerDescText");
    if (footerDesc && cfg.footerDesc) {
      footerDesc.innerHTML = esc(cfg.footerDesc).replace(/\n/g, "<br>");
    }

    /* 底部版权文字 */
    var footerCopy = document.getElementById("footerCopyText");
    if (footerCopy && cfg.footerCopy) footerCopy.textContent = cfg.footerCopy;
    var footerBuilt = document.getElementById("footerBuiltText");
    if (footerBuilt && cfg.footerBuilt) footerBuilt.textContent = cfg.footerBuilt;

    /* 底部社交媒体链接（后台可配置） */
    if (cfg.socialLinks) renderSocialLinks(cfg.socialLinks);

    /* 底部链接列表（学习资源 / 关于我们，后台可配置） */
    if (cfg.resourceLinks) renderFooterLinks("footerResourceLinks", cfg.resourceLinks);
    if (cfg.aboutLinks) renderFooterLinks("footerAboutLinks", cfg.aboutLinks);

    /* 底部版权文字双击进入管理后台 */
    setupAdminAccess();

    /* 各专区描述文字 */
    var descMap = {
      descNews: "descNews",
      descSkills: "descSkills",
      descVideos: "descVideos",
      descCharts: "descCharts",
      descCommunity: "descCommunity",
    };
    Object.keys(descMap).forEach(function (key) {
      var el = document.getElementById(descMap[key]);
      if (el && cfg[key]) el.textContent = cfg[key];
    });

    /* 全站字号 */
    if (cfg.fontSize && FONT_SIZE_MAP.hasOwnProperty(cfg.fontSize)) {
      document.documentElement.style.fontSize = FONT_SIZE_MAP[cfg.fontSize];
    } else {
      document.documentElement.style.fontSize = "";
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

    /* 文章卡片点击跳转详情页 */
    newsCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-id");
        if (id) {
          window.location.href = "article.html?id=" + encodeURIComponent(id);
        }
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

    /* 技能卡片点击 → 教程详情页 */
    skillCards = document.querySelectorAll(".skill-card");
    skillCards.forEach(function (card) {
      var link = card.getAttribute("data-link");
      if (!link) return;
      card.addEventListener("click", function (e) {
        /* 点击「查看教程」链接本身时让浏览器原生跳转（支持新标签打开） */
        if (e.target.closest && e.target.closest("a")) return;
        window.location.href = link;
      });
    });

    /* 视频播放列表 */
    bindVideoItems();

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

      /* 站点品牌/外观配置优先应用（不依赖文章数据） */
      applySiteBranding(data.site_config);

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

      /* 启动图片懒加载（含动态内容） */
      initLazyImages();

      /* 更新学习建议 */
      if (data.site_config && data.site_config.learningTip) {
        var tip = document.querySelector(".skills__tip p");
        if (tip) tip.textContent = data.site_config.learningTip;
      }

      /* 应用后台图表配置（若图表已初始化则重绘） */
      if (data.site_config && data.site_config.charts) {
        siteCharts = data.site_config.charts;
        if (chartsReady) updateChartColors();
      }

      /* 构建站内搜索索引 */
      initSearch(data);

      /* 异步加载已审核评论（不阻塞主流程） */
      loadCommunityComments();
    } catch (e) {
      /* 本地开发或 API 未部署，保留静态内容 */
    }
  }

  /* ========================================
     站内搜索（Fuse.js）
     ======================================== */
  var searchOverlay = document.getElementById("searchOverlay");
  var searchInput = document.getElementById("searchInput");
  var searchResults = document.getElementById("searchResults");
  var searchToggle = document.getElementById("searchToggle");
  var searchKbd = document.getElementById("searchKbd");
  var fuse = null;
  var searchItems = [];
  var activeIndex = -1;
  var isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

  function initSearch(data) {
    searchItems = [];
    if (data.articles) {
      data.articles.forEach(function (a) {
        searchItems.push({
          type: "article",
          typeLabel: "文章",
          title: a.title || "",
          summary: a.summary || "",
          category: a.category || "",
          url: "article.html?id=" + encodeURIComponent(a.id)
        });
      });
    }
    if (data.skills) {
      data.skills.forEach(function (s) {
        searchItems.push({
          type: "skill",
          typeLabel: "技能",
          title: s.title || "",
          summary: s.summary || "",
          category: s.category || s.level || "",
          url: "article.html?type=skill&id=" + encodeURIComponent(s.id)
        });
      });
    }
    if (data.videos) {
      data.videos.forEach(function (v, idx) {
        searchItems.push({
          type: "video",
          typeLabel: "视频",
          title: v.title || "",
          summary: v.desc || v.description || "",
          category: "",
          url: "/#videos"
        });
      });
    }
    if (typeof Fuse !== "undefined" && searchItems.length) {
      fuse = new Fuse(searchItems, {
        keys: ["title", "summary", "category"],
        threshold: 0.35,
        includeScore: false,
        minMatchCharLength: 1
      });
    }
  }

  function openSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.add("search-overlay--open");
    searchOverlay.setAttribute("aria-hidden", "false");
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    if (searchResults) searchResults.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
    activeIndex = -1;
    document.body.style.overflow = "hidden";
  }

  function closeSearch() {
    if (!searchOverlay) return;
    searchOverlay.classList.remove("search-overlay--open");
    searchOverlay.setAttribute("aria-hidden", "true");
    if (searchInput) searchInput.blur();
    activeIndex = -1;
    document.body.style.overflow = "";
  }

  function setActiveIndex(next) {
    var items = searchResults ? searchResults.querySelectorAll(".search-result-item") : [];
    if (!items.length) return;
    if (next < 0) next = 0;
    if (next >= items.length) next = items.length - 1;
    activeIndex = next;
    items.forEach(function (item, idx) {
      item.classList.toggle("search-result-item--active", idx === activeIndex);
    });
    if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: "nearest" });
  }

  function renderSearch(query) {
    activeIndex = -1;
    var q = (query || "").trim();
    if (!q) {
      if (searchResults) searchResults.innerHTML = '<div class="search-empty">输入关键词开始搜索</div>';
      return;
    }
    var results = [];
    if (fuse) {
      results = fuse.search(q).map(function (r) { return r.item; });
    } else {
      var low = q.toLowerCase();
      results = searchItems.filter(function (item) {
        return (item.title + item.summary + item.category).toLowerCase().indexOf(low) !== -1;
      });
    }
    if (!results.length) {
      if (searchResults) searchResults.innerHTML = '<div class="search-no-results">未找到相关内容，换个关键词试试</div>';
      return;
    }
    var html = results.slice(0, 8).map(function (item, idx) {
      return '<a class="search-result-item" href="' + esc(item.url) + '" data-idx="' + idx + '">' +
        '<div class="search-result__meta">' +
          '<span class="search-result__badge search-result__badge--' + esc(item.type) + '">' + esc(item.typeLabel) + '</span>' +
          '<span class="search-result__title">' + esc(item.title) + '</span>' +
        '</div>' +
        '<div class="search-result__desc">' + esc(item.summary) + '</div>' +
      '</a>';
    }).join('');
    if (searchResults) searchResults.innerHTML = html;
  }

  if (searchToggle) searchToggle.addEventListener("click", openSearch);
  if (searchKbd) searchKbd.textContent = isMac ? "⌘ K" : "Ctrl K";

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (searchOverlay && searchOverlay.classList.contains("search-overlay--open")) {
        closeSearch();
      } else {
        openSearch();
      }
      return;
    }
    if (e.key === "Escape") {
      closeSearch();
      return;
    }
    if (!searchOverlay || !searchOverlay.classList.contains("search-overlay--open")) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      var items = searchResults ? searchResults.querySelectorAll(".search-result-item") : [];
      var target = items[activeIndex] || items[0];
      if (target) window.location.href = target.getAttribute("href");
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderSearch(searchInput.value);
    });
  }

  if (searchOverlay) {
    searchOverlay.addEventListener("click", function (e) {
      if (e.target === searchOverlay) closeSearch();
    });
  }

  /* 静态卡片也启用懒加载（动态内容会再次刷新） */
  initLazyImages();

  /* 启动动态加载 */
  loadDynamicContent();
})();
