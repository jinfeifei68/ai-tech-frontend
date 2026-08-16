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
  function renderVideos(items) {
    var main = items.find(function (v) { return v.isMain; }) || items[0];
    var list = items.filter(function (v) { return !v.isMain; });
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
    var listHTML = list.map(function (v) {
      return '<div class="video-item" data-src="' + esc(v.src || "") + '" data-poster="' + esc(v.poster || "") + '" data-embed="' + esc(v.embed || "") + '">' +
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
  /* 已审核评论（从 /api/community/comments 拉取） */
  var communityComments = [];

  function likedMap() {
    try {
      return JSON.parse(localStorage.getItem("ai_tech_liked") || "{}");
    } catch (e) {
      return {};
    }
  }

  function renderDiscussions(items) {
    var liked = likedMap();
    var html = items.map(function (d) {
      var tags = (d.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("");
      var alt = d.avatarAlt ? " discussion__avatar--alt" : "";
      var isLiked = !!liked[d.id];
      var comments = communityComments.filter(function (c) { return c.discussionId === d.id; });
      var commentsHTML = comments.map(function (c) {
        return '<div class="discussion-comment">' +
          '<div class="discussion-comment__head"><span class="discussion-comment__author">' + esc(c.nickname) + '</span>' +
          '<span class="discussion-comment__time">' + esc(c.date) + '</span></div>' +
          '<p class="discussion-comment__text">' + esc(c.content) + '</p></div>';
      }).join("");
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
        (commentsHTML ? '<div class="discussion-comments">' + commentsHTML + '</div>' : "") +
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
