/**
 * AI科技前沿 — 管理后台逻辑
 * ============================================ */

(function () {
  "use strict";

  var API_BASE = "/api";
  var token = localStorage.getItem("admin_token") || "";
  var contentData = {};
  var currentSection = "dashboard";

  /* ===== DOM ===== */
  var loginPage = document.getElementById("loginPage");
  var adminApp = document.getElementById("adminApp");
  var adminMain = document.getElementById("adminMain");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var loginBtn = document.getElementById("loginBtn");
  var loginHint = document.getElementById("loginHint");
  var modalOverlay = document.getElementById("modalOverlay");
  var modalTitle = document.getElementById("modalTitle");
  var modalBody = document.getElementById("modalBody");
  var modalClose = document.getElementById("modalClose");
  var confirmOverlay = document.getElementById("confirmOverlay");
  var confirmText = document.getElementById("confirmText");
  var confirmTitle = document.getElementById("confirmTitle");
  var confirmOk = document.getElementById("confirmOk");
  var confirmCancel = document.getElementById("confirmCancel");
  var toastContainer = document.getElementById("toastContainer");

  /* ===== API 封装 ===== */
  async function api(path, options) {
    options = options || {};
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    options.headers = Object.assign(headers, options.headers || {});

    try {
      var response = await fetch(API_BASE + path, options);
      var data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "请求失败 (" + response.status + ")");
      }
      return data;
    } catch (e) {
      if (e.message === "Failed to fetch") {
        throw new Error("无法连接服务器，请检查网络或确认 API 是否已部署");
      }
      throw e;
    }
  }

  /* ===== Toast ===== */
  function toast(message, type) {
    type = type || "info";
    var el = document.createElement("div");
    el.className = "toast toast--" + type;
    var icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
    el.innerHTML = '<span>' + icon + '</span><span>' + escapeHtml(message) + '</span>';
    toastContainer.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transform = "translateX(40px)";
      el.style.transition = "all 0.3s ease";
      setTimeout(function () { el.remove(); }, 300);
    }, 3000);
  }

  /* ===== 工具 ===== */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(date) {
    var d = new Date(date);
    if (isNaN(d)) return date;
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  /* ===== 模态框 ===== */
  function openModal(title, bodyHTML) {
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHTML;
    modalOverlay.classList.add("active");
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
    modalBody.innerHTML = "";
  }

  function confirmDialog(title, text, onConfirm) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmOverlay.classList.add("active");
    confirmOk.onclick = function () {
      confirmOverlay.classList.remove("active");
      onConfirm();
    };
  }

  /* ===== 标签输入组件 ===== */
  function tagsInputHTML(name, tags) {
    var chips = (tags || []).map(function (t, i) {
      return '<span class="tag-chip" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '<span data-remove="' + i + '">×</span></span>';
    }).join("");
    return '<div class="form-tags-input" id="tagsInput_' + name + '">' + chips + '<input type="text" placeholder="输入标签后回车" id="tagsInputField_' + name + '"></div>';
  }

  function getTags(name) {
    var container = document.getElementById("tagsInput_" + name);
    if (!container) return [];
    var chips = container.querySelectorAll(".tag-chip");
    return Array.prototype.map.call(chips, function (c) {
      return c.getAttribute("data-tag");
    });
  }

  function initTagsInput(name) {
    var container = document.getElementById("tagsInput_" + name);
    var input = document.getElementById("tagsInputField_" + name);
    if (!container || !input) return;

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && input.value.trim()) {
        e.preventDefault();
        var val = input.value.trim();
        var chip = document.createElement("span");
        chip.className = "tag-chip";
        chip.setAttribute("data-tag", val);
        chip.innerHTML = escapeHtml(val) + '<span data-remove="true">×</span>';
        container.insertBefore(chip, input);
        input.value = "";
      }
    });

    container.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-remove") || e.target.getAttribute("data-remove") === "true") {
        e.target.closest(".tag-chip").remove();
      }
    });
  }

  /* ===== Auth ===== */
  async function login(password) {
    loginError.textContent = "";
    loginBtn.textContent = "登录中...";
    loginBtn.disabled = true;
    try {
      var data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ password: password }),
      });
      token = data.token;
      localStorage.setItem("admin_token", token);
      showAdmin();
      await loadAllContent();
      renderSection("dashboard");
      toast("登录成功", "success");
    } catch (e) {
      loginError.textContent = e.message;
      if (e.message.indexOf("密码未设置") !== -1 || e.message.indexOf("PASSWORD") !== -1) {
        loginHint.style.display = "block";
      }
    } finally {
      loginBtn.textContent = "登 录";
      loginBtn.disabled = false;
    }
  }

  function logout() {
    try { api("/auth/logout", { method: "POST" }); } catch (e) {}
    token = "";
    localStorage.removeItem("admin_token");
    loginPage.style.display = "flex";
    adminApp.style.display = "none";
    loginForm.reset();
  }

  async function checkAuth() {
    if (!token) return false;
    try {
      var data = await api("/auth/verify");
      return data.authenticated;
    } catch {
      return false;
    }
  }

  function showAdmin() {
    loginPage.style.display = "none";
    adminApp.style.display = "flex";
  }

  /* ===== 加载内容 ===== */
  async function loadAllContent() {
    try {
      var data = await api("/content?type=all");
      contentData = data;
      return true;
    } catch (e) {
      toast("加载内容失败: " + e.message, "error");
      return false;
    }
  }

  /* ===== 导航 ===== */
  document.querySelectorAll(".admin-nav__item[data-section]").forEach(function (item) {
    item.addEventListener("click", function () {
      var section = item.getAttribute("data-section");
      document.querySelectorAll(".admin-nav__item").forEach(function (n) {
        n.classList.remove("active");
      });
      item.classList.add("active");
      renderSection(section);
      // 移动端关闭侧边栏
      document.getElementById("adminSidebar").classList.remove("open");
    });
  });

  document.getElementById("sidebarToggle").addEventListener("click", function () {
    document.getElementById("adminSidebar").classList.toggle("open");
  });

  function renderSection(section) {
    currentSection = section;
    switch (section) {
      case "dashboard": renderDashboard(); break;
      case "articles": renderArticles(); break;
      case "skills": renderSkills(); break;
      case "videos": renderVideos(); break;
      case "discussions": renderDiscussions(); break;
      case "contributors": renderContributors(); break;
      case "config": renderConfig(); break;
    }
  }

  /* ===== 仪表盘 ===== */
  function renderDashboard() {
    var d = contentData;
    var counts = {
      articles: (d.articles || []).length,
      skills: (d.skills || []).length,
      videos: (d.videos || []).length,
      discussions: (d.discussions || []).length,
      contributors: (d.contributors || []).length,
    };

    adminMain.innerHTML = `
      <div class="section-admin-header"><h2>仪表盘</h2></div>
      <div class="dashboard-grid">
        ${dashCard("📰 AI 要闻", counts.articles, "篇文章")}
        ${dashCard("🎓 技能分享", counts.skills, "个技能")}
        ${dashCard("🎬 视频教程", counts.videos, "个视频")}
        ${dashCard("💬 社区讨论", counts.discussions, "条讨论")}
        ${dashCard("🏆 贡献者", counts.contributors, "位贡献者")}
      </div>
      <div class="dash-info">
        <h3>快速操作指南</h3>
        <ul>
          <li>点击左侧导航栏进入对应内容管理页面</li>
          <li>每页可新增、编辑、删除内容，修改即时生效</li>
          <li>「网站配置」页可修改首页统计数据、学习路径等</li>
          <li>「初始化数据」按钮可恢复所有内容为初始状态（谨慎使用）</li>
          <li>所有修改直接写入 Cloudflare KV，前台刷新即可看到更新</li>
        </ul>
      </div>
    `;
  }

  function dashCard(label, value, sub) {
    return '<div class="dash-card"><div class="dash-card__label">' + label + '</div><div class="dash-card__value">' + value + '</div><div class="dash-card__sub">' + sub + '</div></div>';
  }

  /* ===== 文章管理 ===== */
  function renderArticles() {
    var items = contentData.articles || [];
    var rows = items.map(function (a) {
      return `<tr>
        <td><div class="cell-img" style="background-image:url('${escapeHtml(a.image)}')"></div></td>
        <td class="cell-title">${escapeHtml(a.title)}</td>
        <td><span class="cell-badge">${escapeHtml(a.badge || categoryLabel(a.category))}</span></td>
        <td>${escapeHtml(a.date)}</td>
        <td>${escapeHtml(a.reads)}</td>
        <td class="row-actions">
          <button class="icon-btn" onclick="window.__admin.editArticle('${a.id}')" title="编辑">✏</button>
          <button class="icon-btn icon-btn--danger" onclick="window.__admin.deleteArticle('${a.id}')" title="删除">🗑</button>
        </td>
      </tr>`;
    }).join("");

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>AI 要闻管理</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.editArticle()">+ 新增文章</button>
      </div>
      <div class="table-wrapper">
        ${items.length ? `<table class="data-table">
          <thead><tr><th>图片</th><th>标题</th><th>分类</th><th>日期</th><th>阅读</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : emptyState("暂无文章", "新增文章")}
      </div>
    `;
  }

  function editArticle(id) {
    var a = id ? (contentData.articles || []).find(function (x) { return x.id === id; }) : null;
    openModal(id ? "编辑文章" : "新增文章", `
      <div class="form-group">
        <label>标题</label>
        <input type="text" id="f_title" value="${a ? escapeHtml(a.title) : ""}" placeholder="文章标题">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>分类</label>
          <select id="f_category">
            <option value="model" ${a && a.category === "model" ? "selected" : ""}>大模型</option>
            <option value="application" ${a && a.category === "application" ? "selected" : ""}>应用落地</option>
            <option value="research" ${a && a.category === "research" ? "selected" : ""}>学术研究</option>
            <option value="industry" ${a && a.category === "industry" ? "selected" : ""}>产业动态</option>
          </select>
        </div>
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="f_date" value="${a ? a.date : formatDate(new Date())}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>阅读量</label>
          <input type="text" id="f_reads" value="${a ? escapeHtml(a.reads) : "0"}" placeholder="如 12.5k">
        </div>
        <div class="form-group">
          <label>标签文字</label>
          <input type="text" id="f_badge" value="${a ? escapeHtml(a.badge) : ""}" placeholder="如：热门 / 新 / 应用">
        </div>
      </div>
      <div class="form-group">
        <label>图片 URL</label>
        <input type="url" id="f_image" value="${a ? escapeHtml(a.image) : ""}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>摘要</label>
        <textarea id="f_excerpt" placeholder="文章摘要...">${a ? escapeHtml(a.excerpt) : ""}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>标签类型</label>
          <select id="f_badgeType">
            <option value="" ${!a || !a.badgeType ? "selected" : ""}>普通</option>
            <option value="hot" ${a && a.badgeType === "hot" ? "selected" : ""}>热门（红色）</option>
            <option value="new" ${a && a.badgeType === "new" ? "selected" : ""}>新（绿色）</option>
          </select>
        </div>
        <div class="form-group">
          <div class="form-checkbox" style="margin-top:24px">
            <input type="checkbox" id="f_featured" ${a && a.featured ? "checked" : ""}>
            <label for="f_featured">设为特色文章（大卡片）</label>
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">
        <button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveArticle('${id || ""}')">保存</button>
      </div>
    `);
  }

  async function saveArticle(id) {
    var data = {
      title: val("f_title"),
      category: val("f_category"),
      date: val("f_date"),
      reads: val("f_reads") || "0",
      badge: val("f_badge"),
      image: val("f_image"),
      excerpt: val("f_excerpt"),
      badgeType: val("f_badgeType"),
      featured: document.getElementById("f_featured").checked,
    };
    if (!data.title) { toast("请输入标题", "error"); return; }
    try {
      if (id) {
        await api("/content", { method: "PUT", body: JSON.stringify({ type: "articles", id: id, data: data }) });
        toast("文章已更新", "success");
      } else {
        await api("/content", { method: "POST", body: JSON.stringify({ type: "articles", data: data }) });
        toast("文章已添加", "success");
      }
      closeModal();
      await loadAllContent();
      renderArticles();
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteArticle(id) {
    var a = (contentData.articles || []).find(function (x) { return x.id === id; });
    confirmDialog("删除文章", "确定删除「" + (a ? a.title : "") + "」？", async function () {
      try {
        await api("/content", { method: "DELETE", body: JSON.stringify({ type: "articles", id: id }) });
        toast("已删除", "success");
        await loadAllContent();
        renderArticles();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 技能管理 ===== */
  function renderSkills() {
    var items = contentData.skills || [];
    var rows = items.map(function (s) {
      return `<tr>
        <td style="font-size:1.3rem;text-align:center">${s.icon}</td>
        <td class="cell-title">${escapeHtml(s.title)}</td>
        <td><span class="cell-badge">${escapeHtml(s.level)}</span></td>
        <td>${escapeHtml(pathLabel(s.path))}</td>
        <td>${escapeHtml(s.duration)}</td>
        <td class="row-actions">
          <button class="icon-btn" onclick="window.__admin.editSkill('${s.id}')" title="编辑">✏</button>
          <button class="icon-btn icon-btn--danger" onclick="window.__admin.deleteSkill('${s.id}')" title="删除">🗑</button>
        </td>
      </tr>`;
    }).join("");

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>技能分享管理</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.editSkill()">+ 新增技能</button>
      </div>
      <div class="table-wrapper">
        ${items.length ? `<table class="data-table">
          <thead><tr><th>图标</th><th>标题</th><th>难度</th><th>路径</th><th>时长</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : emptyState("暂无技能", "新增技能")}
      </div>
    `;
  }

  function editSkill(id) {
    var s = id ? (contentData.skills || []).find(function (x) { return x.id === id; }) : null;
    openModal(id ? "编辑技能" : "新增技能", `
      <div class="form-row">
        <div class="form-group">
          <label>图标（emoji）</label>
          <input type="text" id="f_icon" value="${s ? escapeHtml(s.icon) : "🐍"}" placeholder="如 🐍">
        </div>
        <div class="form-group">
          <label>难度</label>
          <select id="f_level">
            <option value="入门" ${s && s.level === "入门" ? "selected" : ""}>入门</option>
            <option value="进阶" ${s && s.level === "进阶" ? "selected" : ""}>进阶</option>
            <option value="高级" ${s && s.level === "高级" ? "selected" : ""}>高级</option>
            <option value="实战" ${s && s.level === "实战" ? "selected" : ""}>实战</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>标题</label>
        <input type="text" id="f_title" value="${s ? escapeHtml(s.title) : ""}" placeholder="技能标题">
      </div>
      <div class="form-group">
        <label>描述</label>
        <textarea id="f_desc" placeholder="技能描述...">${s ? escapeHtml(s.desc) : ""}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>学习路径</label>
          <select id="f_path">
            <option value="python" ${s && s.path === "python" ? "selected" : ""}>Python 进阶</option>
            <option value="ml" ${s && s.path === "ml" ? "selected" : ""}>机器学习</option>
            <option value="dl" ${s && s.path === "dl" ? "selected" : ""}>深度学习</option>
            <option value="nlp" ${s && s.path === "nlp" ? "selected" : ""}>NLP & LLM</option>
            <option value="deploy" ${s && s.path === "deploy" ? "selected" : ""}>模型部署</option>
          </select>
        </div>
        <div class="form-group">
          <label>时长</label>
          <input type="text" id="f_duration" value="${s ? escapeHtml(s.duration) : "⏱ 30 分钟"}" placeholder="如 ⏱ 45 分钟">
        </div>
      </div>
      <div class="form-group">
        <label>标签</label>
        ${tagsInputHTML("skills", s ? s.tags : [])}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">
        <button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveSkill('${id || ""}')">保存</button>
      </div>
    `);
    initTagsInput("skills");
  }

  async function saveSkill(id) {
    var data = {
      icon: val("f_icon"),
      level: val("f_level"),
      title: val("f_title"),
      desc: val("f_desc"),
      path: val("f_path"),
      duration: val("f_duration"),
      tags: getTags("skills"),
    };
    if (!data.title) { toast("请输入标题", "error"); return; }
    try {
      if (id) {
        await api("/content", { method: "PUT", body: JSON.stringify({ type: "skills", id: id, data: data }) });
        toast("技能已更新", "success");
      } else {
        await api("/content", { method: "POST", body: JSON.stringify({ type: "skills", data: data }) });
        toast("技能已添加", "success");
      }
      closeModal();
      await loadAllContent();
      renderSkills();
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteSkill(id) {
    var s = (contentData.skills || []).find(function (x) { return x.id === id; });
    confirmDialog("删除技能", "确定删除「" + (s ? s.title : "") + "」？", async function () {
      try {
        await api("/content", { method: "DELETE", body: JSON.stringify({ type: "skills", id: id }) });
        toast("已删除", "success");
        await loadAllContent();
        renderSkills();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 视频管理 ===== */
  function renderVideos() {
    var items = contentData.videos || [];
    var rows = items.map(function (v) {
      return `<tr>
        <td><div class="cell-img" style="background-image:url('${escapeHtml(v.poster)}')"></div></td>
        <td class="cell-title">${escapeHtml(v.title)}</td>
        <td>${escapeHtml(v.duration)}</td>
        <td>${escapeHtml(v.views)}</td>
        <td>${v.isMain ? '<span class="cell-badge cell-badge--new">主视频</span>' : '<span class="cell-badge">列表</span>'}</td>
        <td class="row-actions">
          <button class="icon-btn" onclick="window.__admin.editVideo('${v.id}')" title="编辑">✏</button>
          <button class="icon-btn icon-btn--danger" onclick="window.__admin.deleteVideo('${v.id}')" title="删除">🗑</button>
        </td>
      </tr>`;
    }).join("");

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>视频教程管理</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.editVideo()">+ 新增视频</button>
      </div>
      <div class="table-wrapper">
        ${items.length ? `<table class="data-table">
          <thead><tr><th>封面</th><th>标题</th><th>时长</th><th>观看</th><th>类型</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : emptyState("暂无视频", "新增视频")}
      </div>
    `;
  }

  function editVideo(id) {
    var v = id ? (contentData.videos || []).find(function (x) { return x.id === id; }) : null;
    openModal(id ? "编辑视频" : "新增视频", `
      <div class="form-group">
        <label>标题</label>
        <input type="text" id="f_title" value="${v ? escapeHtml(v.title) : ""}" placeholder="视频标题">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>时长</label>
          <input type="text" id="f_duration" value="${v ? escapeHtml(v.duration) : "00:00"}" placeholder="如 28:35">
        </div>
        <div class="form-group">
          <label>观看量</label>
          <input type="text" id="f_views" value="${v ? escapeHtml(v.views) : "0"}" placeholder="如 12.3k">
        </div>
      </div>
      <div class="form-group">
        <label>视频地址 (URL)</label>
        <input type="url" id="f_src" value="${v ? escapeHtml(v.src) : ""}" placeholder="https://...mp4">
      </div>
      <div class="form-group">
        <label>封面图 URL</label>
        <input type="url" id="f_poster" value="${v ? escapeHtml(v.poster) : ""}" placeholder="https://...">
      </div>
      <div class="form-group">
        <div class="form-checkbox">
          <input type="checkbox" id="f_isMain" ${v && v.isMain ? "checked" : ""}>
          <label for="f_isMain">设为主播放器视频</label>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">
        <button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveVideo('${id || ""}')">保存</button>
      </div>
    `);
  }

  async function saveVideo(id) {
    var data = {
      title: val("f_title"),
      duration: val("f_duration"),
      views: val("f_views") || "0",
      src: val("f_src"),
      poster: val("f_poster"),
      isMain: document.getElementById("f_isMain").checked,
    };
    if (!data.title) { toast("请输入标题", "error"); return; }
    try {
      if (id) {
        await api("/content", { method: "PUT", body: JSON.stringify({ type: "videos", id: id, data: data }) });
        toast("视频已更新", "success");
      } else {
        await api("/content", { method: "POST", body: JSON.stringify({ type: "videos", data: data }) });
        toast("视频已添加", "success");
      }
      closeModal();
      await loadAllContent();
      renderVideos();
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteVideo(id) {
    var v = (contentData.videos || []).find(function (x) { return x.id === id; });
    confirmDialog("删除视频", "确定删除「" + (v ? v.title : "") + "」？", async function () {
      try {
        await api("/content", { method: "DELETE", body: JSON.stringify({ type: "videos", id: id }) });
        toast("已删除", "success");
        await loadAllContent();
        renderVideos();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 讨论管理 ===== */
  function renderDiscussions() {
    var items = contentData.discussions || [];
    var rows = items.map(function (d) {
      return `<tr>
        <td><div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#fff;font-weight:600">${escapeHtml(d.avatar)}</div></td>
        <td class="cell-title">${escapeHtml(d.title)}</td>
        <td>${escapeHtml(d.author)}</td>
        <td>💬${d.replies} 👍${d.likes}</td>
        <td>${escapeHtml(d.time)}</td>
        <td class="row-actions">
          <button class="icon-btn" onclick="window.__admin.editDiscussion('${d.id}')" title="编辑">✏</button>
          <button class="icon-btn icon-btn--danger" onclick="window.__admin.deleteDiscussion('${d.id}')" title="删除">🗑</button>
        </td>
      </tr>`;
    }).join("");

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>社区讨论管理</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.editDiscussion()">+ 新增讨论</button>
      </div>
      <div class="table-wrapper">
        ${items.length ? `<table class="data-table">
          <thead><tr><th>头像</th><th>标题</th><th>作者</th><th>互动</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : emptyState("暂无讨论", "新增讨论")}
      </div>
    `;
  }

  function editDiscussion(id) {
    var d = id ? (contentData.discussions || []).find(function (x) { return x.id === id; }) : null;
    openModal(id ? "编辑讨论" : "新增讨论", `
      <div class="form-row">
        <div class="form-group">
          <label>作者</label>
          <input type="text" id="f_author" value="${d ? escapeHtml(d.author) : ""}" placeholder="如 张同学">
        </div>
        <div class="form-group">
          <label>头像（一个字）</label>
          <input type="text" id="f_avatar" value="${d ? escapeHtml(d.avatar) : ""}" maxlength="1" placeholder="如 张">
        </div>
      </div>
      <div class="form-group">
        <label>标题</label>
        <input type="text" id="f_title" value="${d ? escapeHtml(d.title) : ""}" placeholder="讨论标题">
      </div>
      <div class="form-group">
        <label>内容</label>
        <textarea id="f_text" placeholder="讨论内容...">${d ? escapeHtml(d.text) : ""}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>回复数</label>
          <input type="number" id="f_replies" value="${d ? d.replies : 0}">
        </div>
        <div class="form-group">
          <label>点赞数</label>
          <input type="number" id="f_likes" value="${d ? d.likes : 0}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>浏览量</label>
          <input type="text" id="f_views" value="${d ? escapeHtml(d.views) : "0"}" placeholder="如 1.2k">
        </div>
        <div class="form-group">
          <label>时间</label>
          <input type="text" id="f_time" value="${d ? escapeHtml(d.time) : "刚刚"}" placeholder="如 2小时前">
        </div>
      </div>
      <div class="form-group">
        <label>标签</label>
        ${tagsInputHTML("discussions", d ? d.tags : [])}
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">
        <button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveDiscussion('${id || ""}')">保存</button>
      </div>
    `);
    initTagsInput("discussions");
  }

  async function saveDiscussion(id) {
    var data = {
      author: val("f_author"),
      avatar: val("f_avatar") || "匿",
      avatarAlt: false,
      title: val("f_title"),
      text: val("f_text"),
      replies: parseInt(val("f_replies")) || 0,
      likes: parseInt(val("f_likes")) || 0,
      views: val("f_views") || "0",
      time: val("f_time") || "刚刚",
      tags: getTags("discussions"),
    };
    if (!data.title) { toast("请输入标题", "error"); return; }
    try {
      if (id) {
        await api("/content", { method: "PUT", body: JSON.stringify({ type: "discussions", id: id, data: data }) });
        toast("讨论已更新", "success");
      } else {
        await api("/content", { method: "POST", body: JSON.stringify({ type: "discussions", data: data }) });
        toast("讨论已添加", "success");
      }
      closeModal();
      await loadAllContent();
      renderDiscussions();
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteDiscussion(id) {
    var d = (contentData.discussions || []).find(function (x) { return x.id === id; });
    confirmDialog("删除讨论", "确定删除「" + (d ? d.title : "") + "」？", async function () {
      try {
        await api("/content", { method: "DELETE", body: JSON.stringify({ type: "discussions", id: id }) });
        toast("已删除", "success");
        await loadAllContent();
        renderDiscussions();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 贡献者管理 ===== */
  function renderContributors() {
    var items = contentData.contributors || [];
    var rows = items.map(function (c) {
      return `<tr>
        <td style="text-align:center;font-weight:700;color:${c.rank <= 3 ? "var(--accent-orange)" : "var(--text-tertiary)"}">${c.rank}</td>
        <td><div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#fff;font-weight:600">${escapeHtml(c.avatar)}</div></td>
        <td>${escapeHtml(c.name)}</td>
        <td style="font-family:'JetBrains Mono',monospace;color:var(--accent-cyan)">${escapeHtml(c.score)}</td>
        <td class="row-actions">
          <button class="icon-btn" onclick="window.__admin.editContributor('${c.id}')" title="编辑">✏</button>
          <button class="icon-btn icon-btn--danger" onclick="window.__admin.deleteContributor('${c.id}')" title="删除">🗑</button>
        </td>
      </tr>`;
    }).join("");

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>贡献者管理</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.editContributor()">+ 新增贡献者</button>
      </div>
      <div class="table-wrapper">
        ${items.length ? `<table class="data-table">
          <thead><tr><th>排名</th><th>头像</th><th>姓名</th><th>积分</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>` : emptyState("暂无贡献者", "新增贡献者")}
      </div>
    `;
  }

  function editContributor(id) {
    var c = id ? (contentData.contributors || []).find(function (x) { return x.id === id; }) : null;
    openModal(id ? "编辑贡献者" : "新增贡献者", `
      <div class="form-row">
        <div class="form-group">
          <label>姓名</label>
          <input type="text" id="f_name" value="${c ? escapeHtml(c.name) : ""}" placeholder="如 王研究员">
        </div>
        <div class="form-group">
          <label>头像（一个字）</label>
          <input type="text" id="f_avatar" value="${c ? escapeHtml(c.avatar) : ""}" maxlength="1" placeholder="如 王">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>排名</label>
          <input type="number" id="f_rank" value="${c ? c.rank : (contentData.contributors || []).length + 1}">
        </div>
        <div class="form-group">
          <label>积分</label>
          <input type="text" id="f_score" value="${c ? escapeHtml(c.score) : "0"}" placeholder="如 2,840">
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">
        <button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveContributor('${id || ""}')">保存</button>
      </div>
    `);
  }

  async function saveContributor(id) {
    var data = {
      name: val("f_name"),
      avatar: val("f_avatar") || "匿",
      rank: parseInt(val("f_rank")) || 1,
      score: val("f_score") || "0",
    };
    if (!data.name) { toast("请输入姓名", "error"); return; }
    try {
      if (id) {
        await api("/content", { method: "PUT", body: JSON.stringify({ type: "contributors", id: id, data: data }) });
        toast("贡献者已更新", "success");
      } else {
        await api("/content", { method: "POST", body: JSON.stringify({ type: "contributors", data: data }) });
        toast("贡献者已添加", "success");
      }
      closeModal();
      await loadAllContent();
      renderContributors();
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteContributor(id) {
    var c = (contentData.contributors || []).find(function (x) { return x.id === id; });
    confirmDialog("删除贡献者", "确定删除「" + (c ? c.name : "") + "」？", async function () {
      try {
        await api("/content", { method: "DELETE", body: JSON.stringify({ type: "contributors", id: id }) });
        toast("已删除", "success");
        await loadAllContent();
        renderContributors();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 网站配置 ===== */
  function renderConfig() {
    var config = contentData.site_config || {};
    var stats = config.stats || [];
    var paths = config.paths || [];

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>网站配置</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveConfig()">保存配置</button>
      </div>

      <div class="config-section">
        <h3>首页统计数据</h3>
        <div class="config-stats" id="configStats">
          ${stats.map(function (s, i) {
            return `<div class="config-stat-row">
              <input type="number" class="config-stat-count" data-idx="${i}" value="${s.count}" placeholder="数字">
              <input type="text" class="config-stat-label" data-idx="${i}" value="${escapeHtml(s.label)}" placeholder="标签">
              <button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()" title="删除">🗑</button>
            </div>`;
          }).join("")}
        </div>
        <button class="btn btn--outline btn--sm" style="margin-top:12px" onclick="window.__admin.addStatRow()">+ 添加统计项</button>
      </div>

      <div class="config-section">
        <h3>Hero 区域</h3>
        <div class="form-group">
          <label>徽章文字</label>
          <input type="text" id="config_heroBadge" value="${escapeHtml(config.heroBadge || "")}" placeholder="如 每日更新 · 紧跟 AI 前沿">
        </div>
        <div class="form-group">
          <label>学习建议</label>
          <textarea id="config_learningTip" placeholder="学习建议文字">${escapeHtml(config.learningTip || "")}</textarea>
        </div>
      </div>

      <div class="config-section">
        <h3>学习路径</h3>
        <div class="config-paths" id="configPaths">
          ${paths.map(function (p, i) {
            return `<div class="config-path-row">
              <input type="text" class="config-path-icon" data-idx="${i}" value="${escapeHtml(p.icon)}" placeholder="📚" style="text-align:center">
              <input type="text" class="config-path-text" data-idx="${i}" value="${escapeHtml(p.text)}" placeholder="路径名称">
              <input type="number" class="config-path-count" data-idx="${i}" value="${p.count}" placeholder="数量">
              <button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()" title="删除">🗑</button>
            </div>`;
          }).join("")}
        </div>
        <button class="btn btn--outline btn--sm" style="margin-top:12px" onclick="window.__admin.addPathRow()">+ 添加路径</button>
      </div>

      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <button class="btn btn--primary" onclick="window.__admin.saveConfig()">保存配置</button>
      </div>
    `;
  }

  function addStatRow() {
    var container = document.getElementById("configStats");
    var idx = container.children.length;
    var div = document.createElement("div");
    div.className = "config-stat-row";
    div.innerHTML = '<input type="number" class="config-stat-count" data-idx="' + idx + '" value="0" placeholder="数字"><input type="text" class="config-stat-label" data-idx="' + idx + '" value="" placeholder="标签"><button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()">🗑</button>';
    container.appendChild(div);
  }

  function addPathRow() {
    var container = document.getElementById("configPaths");
    var idx = container.children.length;
    var div = document.createElement("div");
    div.className = "config-path-row";
    div.innerHTML = '<input type="text" class="config-path-icon" data-idx="' + idx + '" value="📖" placeholder="📚" style="text-align:center"><input type="text" class="config-path-text" data-idx="' + idx + '" value="" placeholder="路径名称"><input type="number" class="config-path-count" data-idx="' + idx + '" value="0" placeholder="数量"><button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()">🗑</button>';
    container.appendChild(div);
  }

  async function saveConfig() {
    var stats = [];
    document.querySelectorAll("#configStats .config-stat-row").forEach(function (row) {
      var count = parseInt(row.querySelector(".config-stat-count").value) || 0;
      var label = row.querySelector(".config-stat-label").value;
      if (label) stats.push({ count: count, label: label });
    });

    var paths = [];
    document.querySelectorAll("#configPaths .config-path-row").forEach(function (row) {
      var icon = row.querySelector(".config-path-icon").value;
      var text = row.querySelector(".config-path-text").value;
      var count = parseInt(row.querySelector(".config-path-count").value) || 0;
      if (text) paths.push({ id: text.toLowerCase().replace(/\s/g, "-"), icon: icon, text: text, count: count });
    });

    var data = {
      stats: stats,
      heroBadge: val("config_heroBadge"),
      learningTip: val("config_learningTip"),
      paths: paths,
    };

    try {
      await api("/content", { method: "PUT", body: JSON.stringify({ type: "site_config", data: data }) });
      toast("配置已保存", "success");
      await loadAllContent();
    } catch (e) { toast(e.message, "error"); }
  }

  /* ===== 初始化数据 ===== */
  async function initData() {
    confirmDialog("初始化数据", "此操作将覆盖所有现有内容，恢复为初始数据。确定继续？", async function () {
      try {
        var result = await api("/init", { method: "POST" });
        toast("数据初始化完成", "success");
        await loadAllContent();
        renderSection(currentSection);
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 辅助函数 ===== */
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  function emptyState(text, btnText) {
    return '<div class="empty-state"><p>' + text + '</p><button class="btn btn--primary btn--sm" onclick="window.__admin.edit' + btnText + '()">+ ' + btnText + '</button></div>';
  }

  function categoryLabel(cat) {
    var map = { model: "大模型", application: "应用落地", research: "学术研究", industry: "产业动态" };
    return map[cat] || cat;
  }

  function pathLabel(path) {
    var map = { python: "Python", ml: "机器学习", dl: "深度学习", nlp: "NLP", deploy: "部署" };
    return map[path] || path;
  }

  /* ===== 暴露到全局 ===== */
  window.__admin = {
    editArticle: editArticle,
    saveArticle: saveArticle,
    deleteArticle: deleteArticle,
    editSkill: editSkill,
    saveSkill: saveSkill,
    deleteSkill: deleteSkill,
    editVideo: editVideo,
    saveVideo: saveVideo,
    deleteVideo: deleteVideo,
    editDiscussion: editDiscussion,
    saveDiscussion: saveDiscussion,
    deleteDiscussion: deleteDiscussion,
    editContributor: editContributor,
    saveContributor: saveContributor,
    deleteContributor: deleteContributor,
    saveConfig: saveConfig,
    addStatRow: addStatRow,
    addPathRow: addPathRow,
    closeModal: closeModal,
    initData: initData,
  };

  /* ===== 事件绑定 ===== */
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    login(document.getElementById("loginPassword").value);
  });

  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("initBtn").addEventListener("click", initData);
  modalClose.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", function (e) {
    if (e.target === modalOverlay) closeModal();
  });
  confirmCancel.addEventListener("click", function () {
    confirmOverlay.classList.remove("active");
  });
  confirmOverlay.addEventListener("click", function (e) {
    if (e.target === confirmOverlay) confirmOverlay.classList.remove("active");
  });

  /* ===== 初始化 ===== */
  (async function init() {
    if (token) {
      var ok = await checkAuth();
      if (ok) {
        showAdmin();
        await loadAllContent();
        renderSection("dashboard");
      } else {
        localStorage.removeItem("admin_token");
        token = "";
      }
    }
  })();
})();
