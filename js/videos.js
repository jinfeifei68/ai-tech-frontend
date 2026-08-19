/**
 * AI科技前沿 · 学习交流 — 视频列表独立页逻辑
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

  /* ===== 视频播放逻辑（支持 mp4 直链与 B站等嵌入链接） ===== */
  var mainPlayerBox = document.querySelector("#mainPlayer");
  var mainVideo = mainPlayerBox ? mainPlayerBox.querySelector("video") : null;
  var mainTitle = document.getElementById("mainVideoTitle");
  var mainMeta = document.getElementById("mainVideoMeta");
  var embedFrame = null;

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
    if (mainMeta) {
      mainMeta.innerHTML = "<span>\u25B6 " + esc(item.duration || "") + "</span>" +
        (item.date ? "<span>\u{1F4C5} " + esc(item.date) + "</span>" : "") +
        "<span>\u{1F441} " + esc(item.views || "0") + " 观看</span>";
    }
  }

  /* ===== 视频网格分页 ===== */
  var PER_PAGE = 8;
  var allVideos = [];
  var currentPage = 1;
  var currentMainId = null;

  function videoGridCardHTML(v) {
    var active = v.id === currentMainId ? " is-active" : "";
    return '<div class="video-item video-item--grid' + active + '" ' +
      'data-src="' + esc(v.src || "") + '" ' +
      'data-poster="' + esc(v.poster || "") + '" ' +
      'data-embed="' + esc(v.embed || "") + '" ' +
      'data-id="' + esc(v.id || "") + '">' +
      '<div class="video-item__thumb" style="--img-url: url(\'' + esc(v.poster || "") + '\')">' +
      '<span class="video-item__duration">' + esc(v.duration || "") + '</span>' +
      '<span class="video-item__play">\u25B6</span></div>' +
      '<div class="video-item__info"><h4>' + esc(v.title || "") + '</h4>' +
      '<span>' + esc(v.views || "0") + ' 观看</span></div></div>';
  }

  function renderGridPage() {
    var gridEl = document.getElementById("videoGrid");
    var pagerEl = document.getElementById("videoPager");
    var countEl = document.getElementById("videoCount");
    if (!gridEl) return;

    if (!allVideos.length) {
      gridEl.innerHTML = '<div class="videos-page__empty">暂无视频内容</div>';
      if (pagerEl) pagerEl.innerHTML = "";
      if (countEl) countEl.textContent = "";
      return;
    }

    if (countEl) countEl.textContent = "\u5171 " + allVideos.length + " \u4E2A\u89C6\u9891";

    var totalPages = Math.ceil(allVideos.length / PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = allVideos.slice(start, start + PER_PAGE);
    gridEl.innerHTML = pageItems.map(videoGridCardHTML).join("");

    /* 绑定点击播放 */
    gridEl.querySelectorAll(".video-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var id = item.getAttribute("data-id");
        var v = allVideos.find(function (x) { return x.id === id; });
        if (!v) return;
        currentMainId = v.id;
        playMainVideo(v);
        /* 更新高亮 */
        gridEl.querySelectorAll(".video-item").forEach(function (el) {
          el.classList.remove("is-active");
        });
        item.classList.add("is-active");
        /* 滚动到播放器 */
        var target = embedFrame && embedFrame.style.display !== "none" ? embedFrame : mainVideo;
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    /* 分页按钮 */
    var pagerHTML = "";
    if (totalPages > 1) {
      pagerHTML = '<button type="button" class="video-pager__btn" data-page="' + (currentPage - 1) + '"' +
        (currentPage <= 1 ? " disabled" : "") + '>\u2190 上一页</button>' +
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
          renderGridPage();
          var head = document.querySelector(".videos-page__head");
          if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  }

  /* ===== 站点品牌应用 ===== */
  function applyBranding(cfg) {
    if (!cfg) return;
    if (cfg.siteName) {
      document.title = "视频教程专区 | " + cfg.siteName;
      var logoText = document.getElementById("siteLogoText");
      var footerLogoText = document.getElementById("footerLogoText");
      if (logoText) logoText.textContent = cfg.siteName;
      if (footerLogoText) footerLogoText.textContent = cfg.siteName;
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
    var footerDesc = document.getElementById("footerDescText");
    if (footerDesc && cfg.footerDesc) {
      footerDesc.innerHTML = esc(cfg.footerDesc).replace(/\n/g, "<br>");
    }
    var footerCopy = document.getElementById("footerCopyText");
    if (footerCopy && cfg.footerCopy) footerCopy.textContent = cfg.footerCopy;
    var descVideos = document.getElementById("descVideos");
    if (descVideos && cfg.descVideos) descVideos.textContent = cfg.descVideos;

    /* 页脚品牌同步（与首页保持一致，含社交链接/学习资源/关于我们） */
    if (window.__footerBrand) window.__footerBrand.applyFooterBranding(cfg);
  }

  /* ===== 加载数据 ===== */
  async function loadVideos() {
    try {
      var response = await fetch("/api/content?type=all");
      if (!response.ok) throw new Error("API error");
      var data = await response.json();

      applyBranding(data.site_config);

      var videos = data.videos || [];
      if (!videos.length) {
        renderGridPage();
        return;
      }

      allVideos = videos;
      var main = videos.find(function (v) { return v.isMain; }) || videos[0];
      currentMainId = main.id;
      playMainVideo(main);
      renderGridPage();
    } catch (e) {
      var gridEl = document.getElementById("videoGrid");
      if (gridEl) gridEl.innerHTML = '<div class="videos-page__empty">视频加载失败，请稍后再试</div>';
      var titleEl = document.getElementById("mainVideoTitle");
      if (titleEl) titleEl.textContent = "加载失败";
    }
  }

  loadVideos();
})();
