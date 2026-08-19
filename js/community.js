/**
 * AI科技前沿 · 学习交流 — 学习交流社区独立页逻辑
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

  function likedMap() {
    try {
      return JSON.parse(localStorage.getItem("ai_tech_liked") || "{}");
    } catch (e) {
      return {};
    }
  }

  /* ===== 数据与状态 ===== */
  var PER_PAGE = 5;
  var allDiscussions = [];
  var currentPage = 1;
  var communityComments = [];

  /* 留言折叠分页（与主页保持一致） */
  var COMMENT_PAGE_SIZE = 10;
  var discussionCommentsMap = {};
  var commentPageMap = {};

  /* ===== 留言相关 ===== */
  function commentItemHTML(c) {
    return '<div class="discussion-comment">' +
      '<div class="discussion-comment__head"><span class="discussion-comment__author">' + esc(c.nickname) + '</span>' +
      '<span class="discussion-comment__time">' + esc(c.date) + '</span></div>' +
      '<p class="discussion-comment__text">' + esc(c.content) + '</p></div>';
  }

  function sortCommentsAsc(list) {
    return list.slice().sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });
  }

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

  function renderCommentsPage(discussionId) {
    var all = discussionCommentsMap[discussionId] || [];
    var box = document.querySelector('.discussion-comments__all[data-id="' + discussionId + '"]');
    if (!box || !all.length) return;
    var totalPages = Math.ceil(all.length / COMMENT_PAGE_SIZE);
    var page = commentPageMap[discussionId] || 1;
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    commentPageMap[discussionId] = page;

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

  /* ===== 讨论卡片 ===== */
  function discussionHTML(d) {
    var liked = likedMap();
    var tags = (d.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join("");
    var alt = d.avatarAlt ? " discussion__avatar--alt" : "";
    var isLiked = !!liked[d.id];
    var comments = communityComments.filter(function (c) { return c.discussionId === d.id; });
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
      '<span class="like-btn__icon">👍</span>' +
      '<span class="like-btn__count">' + esc(d.likes) + '</span></button>' +
      '<span>👁 ' + esc(d.views) + '</span></div>' +
      commentsHTML +
      '<div class="discussion-reply">' +
      '<button type="button" class="discussion-reply__toggle" data-id="' + esc(d.id) + '">💬 我也说两句</button>' +
      '<form class="reply-form" data-id="' + esc(d.id) + '" style="display:none">' +
      '<div class="reply-form__row"><input type="text" class="reply-form__name" placeholder="你的昵称（2-20字）" maxlength="20" required>' +
      '<button type="submit" class="btn btn--primary btn--sm">提交留言</button></div>' +
      '<textarea class="reply-form__content" placeholder="写下你的见解...（5-500字），审核通过后展示" maxlength="500" required></textarea>' +
      '</form></div>' +
      '</div></div>';
  }

  function renderDiscussionsPage() {
    var listEl = document.getElementById("discussionList");
    var pagerEl = document.getElementById("communityPager");
    if (!listEl) return;

    if (!allDiscussions.length) {
      listEl.innerHTML = '<div class="community__empty">暂无讨论内容，快来发起第一个话题吧</div>';
      if (pagerEl) pagerEl.innerHTML = "";
      return;
    }

    var totalPages = Math.ceil(allDiscussions.length / PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    var start = (currentPage - 1) * PER_PAGE;
    var pageItems = allDiscussions.slice(start, start + PER_PAGE);
    listEl.innerHTML = pageItems.map(discussionHTML).join("");

    bindCommunityEvents();

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
          renderDiscussionsPage();
          var section = document.getElementById("community");
          if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }
  }

  /* ===== 绑定社区互动事件（点赞 / 评论） ===== */
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

    /* "查看全部留言" 展开/收起 */
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
          alert("留言内容需为 5-500 字");
          return;
        }
        var bad = containsSensitive(name) || containsSensitive(content);
        if (bad) {
          alert("留言包含违规内容（" + bad + "），请修改后提交");
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
              alert("留言已提交，审核通过后会展示在讨论区");
            } else {
              alert(res.error || "提交失败，请稍后再试");
            }
            submitBtn.disabled = false;
            submitBtn.textContent = "提交留言";
          })
          .catch(function () {
            alert("网络错误，请稍后再试");
            submitBtn.disabled = false;
            submitBtn.textContent = "提交留言";
          });
      });
    });
  }

  /* ===== 敏感词过滤（前端提示层，后端仍有强制校验） ===== */
  var SENSITIVE_WORDS = [
    "代开发票", "发票代开", "办证", "贷款", "套现", "刷单", "兼职日结",
    "加微信", "加QQ", "加qq", "v信", "威信号", "扫码进群", "博彩", "赌博",
    "色情", "成人片", "裸聊", "一夜情", "小姐", "枪支", "毒品", "冰毒",
    "赌博网", "六合彩", "时时彩", "赚外快", "躺赚", "日赚",
  ];

  function containsSensitive(text) {
    if (!text) return null;
    for (var i = 0; i < SENSITIVE_WORDS.length; i++) {
      if (text.indexOf(SENSITIVE_WORDS[i]) !== -1) {
        return SENSITIVE_WORDS[i];
      }
    }
    return null;
  }

  /* ===== 贡献者列表 ===== */
  function renderContributors(list) {
    var ul = document.getElementById("contributorList");
    if (!ul || !list || !list.length) return;
    ul.innerHTML = list.map(function (c) {
      return '<li><span class="contributor-list__rank">' + esc(c.rank) + '</span>' +
        '<span class="contributor-list__avatar">' + esc(c.avatar) + '</span>' +
        '<span class="contributor-list__name">' + esc(c.name) + '</span>' +
        '<span class="contributor-list__score">' + esc(c.score) + '</span></li>';
    }).join("");
  }

  /* ===== 站点品牌（页脚部分由 site-footer.js 处理） ===== */
  function applyBranding(cfg) {
    if (!cfg) return;
    if (cfg.siteName) {
      document.title = "学习交流社区 | " + cfg.siteName;
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
    var descCommunity = document.getElementById("descCommunity");
    if (descCommunity && cfg.descCommunity) descCommunity.textContent = cfg.descCommunity;
    if (window.__footerBrand) window.__footerBrand.applyFooterBranding(cfg);
  }

  /* ===== 加载数据 ===== */
  async function loadCommunity() {
    try {
      var response = await fetch("/api/content?type=all");
      if (!response.ok) throw new Error("API error");
      var data = await response.json();

      applyBranding(data.site_config);

      allDiscussions = data.discussions || [];
      renderDiscussionsPage();
      renderContributors(data.contributors);
    } catch (e) {
      var listEl = document.getElementById("discussionList");
      if (listEl) listEl.innerHTML = '<div class="community__empty">讨论加载失败，请稍后再试</div>';
    }

    /* 已审核评论（异步拉取，回来后重新渲染以展示最新留言） */
    try {
      var res = await fetch("/api/community/comments");
      var cdata = await res.json();
      communityComments = cdata.data || [];
      if (communityComments.length > 0) renderDiscussionsPage();
    } catch (e) {
      /* 评论加载失败不影响主列表 */
    }
  }

  loadCommunity();
})();
