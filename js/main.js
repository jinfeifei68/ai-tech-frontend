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

  /* ===== 导航高亮 ===== */
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
})();
