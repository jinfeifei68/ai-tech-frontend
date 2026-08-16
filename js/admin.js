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
      case "members": renderMembers(); break;
      case "comments": renderComments("pending"); break;
      case "contributors": renderContributors(); break;
      case "pages": renderPages(); break;
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
      pages: (d.pages || []).length,
    };

    adminMain.innerHTML = `
      <div class="section-admin-header"><h2>仪表盘</h2></div>
      <div class="dashboard-grid">
        ${dashCard("📰 AI 要闻", counts.articles, "篇文章")}
        ${dashCard("🎓 技能分享", counts.skills, "个技能")}
        ${dashCard("🎬 视频教程", counts.videos, "个视频")}
        ${dashCard("💬 社区讨论", counts.discussions, "条讨论")}
        ${dashCard("🏆 贡献者", counts.contributors, "位贡献者")}
        ${dashCard("📄 内容页面", counts.pages, "个页面")}
      </div>
      <div id="dashCommunity" class="dash-community">
        <p>⏳ 加载社区数据...</p>
      </div>
      <div class="dash-info">
        <h3>快速操作指南</h3>
        <ul>
          <li>点击左侧导航栏进入对应内容管理页面</li>
          <li>每页可新增、编辑、删除内容，修改即时生效</li>
          <li>「评论审核」页可审核访客提交的评论，通过后展示在前台</li>
          <li>「成员管理」页可查看前台「加入社区」表单的注册名单</li>
          <li>「网站配置」页可修改首页统计数据、学习路径等</li>
          <li>「初始化数据」按钮可恢复所有内容为初始状态（谨慎使用）</li>
          <li>所有修改直接写入 Cloudflare KV，前台刷新即可看到更新</li>
        </ul>
      </div>
    `;
    /* 异步加载社区数据 */
    loadCommunityAdminData().then(function (cd) {
      var el = document.getElementById("dashCommunity");
      if (!el) return;
      var pending = cd.pending || [];
      var pendingBadge = pending.length > 0
        ? ' <a href="#" class="dash-community__link" onclick="window.__admin.goSection(\'comments\');return false;">去审核 →</a>'
        : "";
      el.innerHTML =
        '<p>👥 社区成员：<strong>' + (cd.members || []).length + '</strong> 人</p>' +
        '<p>🕐 待审核评论：<strong>' + pending.length + '</strong> 条' + pendingBadge + '</p>' +
        '<p>✅ 已审核评论：<strong>' + (cd.comments || []).length + '</strong> 条</p>';
    });
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
    window.__editingCtx = { type: "article", id: id || null };
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
        <textarea id="f_excerpt" placeholder="文章摘要（显示在首页卡片和详情页顶部）...">${a ? escapeHtml(a.excerpt) : ""}</textarea>
      </div>
      <div class="form-group">
        <label>正文内容 <span style="font-size:0.8rem;color:var(--text-tertiary)">(支持 Markdown 格式)</span></label>
        <textarea id="f_content" class="editor-content" placeholder="## 标题&#10;&#10;正文内容...&#10;&#10;- 列表项1&#10;- 列表项2&#10;&#10;**加粗** *斜体* [链接](url)&#10;&#10;![图片](url)" style="min-height:300px;font-family:'JetBrains Mono',Consolas,monospace;font-size:0.9rem">${a ? escapeHtml(a._content || "") : ""}</textarea>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn btn--outline btn--sm" onclick="window.__admin.previewContent()" style="font-size:0.8rem">预览</button>
          <span style="font-size:0.75rem;color:var(--text-tertiary);align-self:center">支持 Markdown：# 标题、**加粗**、- 列表、| 表格 |、\`代码\`</span>
        </div>
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

    /* 如果是编辑已有文章，异步加载正文 */
    if (id) {
      loadArticleContent(id);
    }
  }

  /* 异步加载文章正文 */
  async function loadArticleContent(id) {
    var textarea = document.getElementById("f_content");
    if (!textarea) return;
    textarea.placeholder = "正在加载正文...";
    try {
      var response = await fetch("/api/article?id=" + encodeURIComponent(id));
      if (response.ok) {
        var data = await response.json();
        if (data.content) {
          textarea.value = data.content;
        }
      }
    } catch (e) {
      textarea.placeholder = "正文加载失败，可重新输入";
    }
  }

  /* 预览正文 */
  function previewContent() {
    var textarea = document.getElementById("f_content");
    if (!textarea) return;
    var content = textarea.value;
    if (!content.trim()) { toast("正文为空", "info"); return; }

    var previewHTML;
    if (typeof marked !== "undefined") {
      marked.setOptions({ breaks: true, gfm: true });
      previewHTML = marked.parse(content);
    } else {
      previewHTML = "<pre>" + escapeHtml(content) + "</pre>";
    }

    openModal("正文预览", '<div class="article-preview">' + previewHTML + '</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn--primary btn--sm" onclick="window.__admin.backToEdit()">返回编辑</button></div>');
  }

  /* 返回编辑（从预览返回，支持文章/技能两种编辑器） */
  function backToEdit() {
    closeModal();
    var ctx = window.__editingCtx;
    if (!ctx) return;
    if (ctx.type === "skill") {
      editSkill(ctx.id || null);
    } else if (ctx.type === "page") {
      editPage(ctx.id || null);
    } else {
      editArticle(ctx.id || null);
    }
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
      content: val("f_content"),
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
    window.__editingCtx = { type: "skill", id: id || null };
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
        <label>描述（显示在首页卡片和详情页顶部）</label>
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
      <div class="form-group">
        <label>教程正文 <span style="font-size:0.8rem;color:var(--text-tertiary)">(支持 Markdown，点击卡片即可查看)</span></label>
        <textarea id="f_content" class="editor-content" placeholder="## 教程标题&#10;&#10;图文教程内容...&#10;&#10;- 步骤1&#10;- 步骤2&#10;&#10;\`\`\`python&#10;print('hello')&#10;\`\`\`" style="min-height:260px;font-family:'JetBrains Mono',Consolas,monospace;font-size:0.9rem"></textarea>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button class="btn btn--outline btn--sm" onclick="window.__admin.previewSkillContent()" style="font-size:0.8rem">预览</button>
          <span style="font-size:0.75rem;color:var(--text-tertiary);align-self:center">留空则详情页显示描述文字</span>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">
        <button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveSkill('${id || ""}')">保存</button>
      </div>
    `);
    initTagsInput("skills");

    /* 编辑已有技能时异步加载正文 */
    if (id) loadSkillContent(id);
  }

  /* 异步加载技能正文 */
  async function loadSkillContent(id) {
    var textarea = document.getElementById("f_content");
    if (!textarea) return;
    textarea.placeholder = "正在加载教程正文...";
    try {
      var response = await fetch("/api/article?type=skill&id=" + encodeURIComponent(id));
      if (response.ok) {
        var data = await response.json();
        if (data.content) {
          textarea.value = data.content;
        }
      }
    } catch (e) {
      textarea.placeholder = "正文加载失败，可重新输入";
    }
  }

  /* 预览技能正文 */
  function previewSkillContent() {
    var textarea = document.getElementById("f_content");
    if (!textarea) return;
    var content = textarea.value;
    if (!content.trim()) { toast("正文为空", "info"); return; }

    var previewHTML;
    if (typeof marked !== "undefined") {
      marked.setOptions({ breaks: true, gfm: true });
      previewHTML = marked.parse(content);
    } else {
      previewHTML = "<pre>" + escapeHtml(content) + "</pre>";
    }

    openModal("教程正文预览", '<div class="article-preview">' + previewHTML + '</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button class="btn btn--primary btn--sm" onclick="window.__admin.backToEdit()">返回编辑</button></div>');
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
      content: val("f_content"),
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
        <label>视频地址 (URL) <span style="font-size:0.8rem;color:var(--text-tertiary)">mp4 直链</span></label>
        <input type="url" id="f_src" value="${v ? escapeHtml(v.src) : ""}" placeholder="https://...mp4">
      </div>
      <div class="form-group">
        <label>嵌入播放地址 <span style="font-size:0.8rem;color:var(--text-tertiary)">B站等外站视频，优先于 mp4</span></label>
        <input type="url" id="f_embed" value="${v ? escapeHtml(v.embed || "") : ""}" placeholder="https://player.bilibili.com/player.html?bvid=BVxxxx">
        <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:4px">
          获取方法：B站视频 → 分享 → 嵌入代码 → 复制 iframe 里的 src 地址（以 player.bilibili.com 开头）
        </div>
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
      embed: val("f_embed"),
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

  /* ===== 社区管理（成员 / 评论审核） ===== */
  var communityData = { members: [], pending: [], comments: [] };

  async function loadCommunityAdminData() {
    try {
      var results = await Promise.all([
        api("/community/admin?scope=members"),
        api("/community/admin?scope=pending"),
        api("/community/admin?scope=comments"),
      ]);
      communityData = {
        members: results[0].data || [],
        pending: results[1].data || [],
        comments: results[2].data || [],
      };
    } catch (e) {
      communityData = { members: [], pending: [], comments: [] };
    }
    return communityData;
  }

  /* --- 成员管理 --- */
  async function renderMembers() {
    var data = await loadCommunityAdminData();
    var items = data.members || [];
    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>👥 成员管理 <span class="count-badge">${items.length} 人</span></h2>
        <p class="section-admin-desc">前台「加入社区」表单提交的注册名单（昵称 / 邮箱 / 时间）</p>
      </div>
      ${items.length === 0 ? '<div class="empty-tip">还没有成员注册。前台「加入社区」表单提交后，成员会出现在这里。</div>' : `
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>昵称</th><th>邮箱</th><th>注册时间</th><th>操作</th></tr></thead>
          <tbody>
            ${items.map(function (m) {
              return `<tr>
                <td>${escapeHtml(m.nickname)}</td>
                <td>${escapeHtml(m.email)}</td>
                <td>${escapeHtml(m.date || "")}</td>
                <td><button class="icon-btn icon-btn--danger" onclick="window.__admin.deleteMember('${m.id}')" title="删除">🗑</button></td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`}
    `;
  }

  async function deleteMember(id) {
    confirmDialog("删除成员", "确定删除该成员？此操作不可恢复。", async function () {
      try {
        await api("/community/member", { method: "DELETE", body: JSON.stringify({ id: id }) });
        toast("已删除", "success");
        renderMembers();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* --- 评论审核（待审 / 已通过，页内切换） --- */
  async function renderComments(tab) {
    var data = await loadCommunityAdminData();
    var pending = data.pending || [];
    var approved = data.comments || [];
    var activeTab = tab === "approved" ? "approved" : "pending";
    var items = activeTab === "pending" ? pending : approved;

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>🕐 评论审核 <span class="count-badge">${pending.length} 条待审</span></h2>
        <p class="section-admin-desc">访客提交的评论审核通过后才会展示在前台讨论区</p>
      </div>
      <div class="admin-tabs">
        <button class="admin-tabs__btn ${activeTab === "pending" ? "active" : ""}" onclick="window.__admin.renderComments('pending')">⏳ 待审核 (${pending.length})</button>
        <button class="admin-tabs__btn ${activeTab === "approved" ? "active" : ""}" onclick="window.__admin.renderComments('approved')">✅ 已通过 (${approved.length})</button>
      </div>
      ${items.length === 0 ? '<div class="empty-tip">' + (activeTab === "pending" ? "暂无待审核评论" : "暂无已审核评论") + '</div>' : items.map(function (c) {
        return `
        <div class="comment-card">
          <div class="comment-card__head">
            <span class="comment-card__author">${escapeHtml(c.nickname)}</span>
            <span class="comment-card__meta">${escapeHtml(c.date || "")} · 讨论：${escapeHtml(c.discussionTitle || c.discussionId)}</span>
          </div>
          <p class="comment-card__text">${escapeHtml(c.content)}</p>
          <div class="comment-card__actions">
            ${activeTab === "pending"
              ? `<button class="btn btn--primary btn--sm" onclick="window.__admin.approveComment('${c.id}')">✓ 通过</button>
                 <button class="btn btn--outline btn--sm" onclick="window.__admin.deleteComment('${c.id}', 'pending')">🗑 删除</button>`
              : `<button class="btn btn--outline btn--sm" onclick="window.__admin.deleteComment('${c.id}', 'comments')">🗑 删除</button>`}
          </div>
        </div>`;
      }).join("")}
    `;
  }

  async function approveComment(id) {
    try {
      await api("/community/approve", { method: "POST", body: JSON.stringify({ id: id }) });
      toast("已通过审核，前台可见", "success");
      renderComments("pending");
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteComment(id, from) {
    confirmDialog("删除评论", "确定删除该评论？此操作不可恢复。", async function () {
      try {
        await api("/community/comment", { method: "DELETE", body: JSON.stringify({ id: id, from: from }) });
        toast("已删除", "success");
        renderComments(from === "pending" ? "pending" : "approved");
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* --- 切换后台页面 --- */
  function goSection(section) {
    var item = document.querySelector('.admin-nav__item[data-section="' + section + '"]');
    if (item) {
      document.querySelectorAll(".admin-nav__item").forEach(function (n) { n.classList.remove("active"); });
      item.classList.add("active");
      renderSection(section);
    }
  }

  /* ===== 页面管理（关于我们 / 学习资源等内容页） ===== */
  function renderPages() {
    var items = contentData.pages || [];
    var rows = items.map(function (p) {
      return '<tr>' +
        '<td style="font-family:monospace;color:var(--accent-cyan)">' + escapeHtml(p.id) + '</td>' +
        '<td>' + escapeHtml(p.title) + '</td>' +
        '<td>' + escapeHtml(p.navLabel || p.title) + '</td>' +
        '<td style="color:var(--text-tertiary);font-size:0.85rem">' + escapeHtml(p.updatedAt || "-") + '</td>' +
        '<td class="row-actions">' +
          '<button class="icon-btn" onclick="window.__admin.editPage(\'' + p.id + '\')" title="编辑">✏</button>' +
          '<button class="icon-btn icon-btn--danger" onclick="window.__admin.deletePage(\'' + p.id + '\')" title="删除">🗑</button>' +
        '</td>' +
      '</tr>';
    }).join("");

    adminMain.innerHTML =
      '<div class="section-admin-header">' +
        '<h2>页面管理</h2>' +
        '<button class="btn btn--primary btn--sm" onclick="window.__admin.editPage()">+ 新增页面</button>' +
      '</div>' +
      '<div class="table-wrapper">' +
        (items.length
          ? '<table class="data-table"><thead><tr><th>页面 ID</th><th>标题</th><th>导航名称</th><th>更新时间</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table>'
          : emptyState("暂无页面", "新增页面")) +
      '</div>';
  }

  function editPage(id) {
    window.__editingCtx = { type: "page", id: id || null };
    var p = id ? (contentData.pages || []).find(function (x) { return x.id === id; }) : null;
    openModal(id ? "编辑页面" : "新增页面",
      '<div class="form-row">' +
        '<div class="form-group"><label>页面 ID（英文，如 team / privacy）</label>' +
        '<input type="text" id="f_pageId" value="' + (p ? escapeHtml(p.id) : "") + '" placeholder="如 team"' + (id ? ' readonly style="opacity:0.6"' : '') + '></div>' +
        '<div class="form-group"><label>导航名称（底部链接显示名）</label>' +
        '<input type="text" id="f_navLabel" value="' + (p ? escapeHtml(p.navLabel || p.title) : "") + '" placeholder="如 团队介绍"></div>' +
      '</div>' +
      '<div class="form-group"><label>页面标题</label>' +
      '<input type="text" id="f_pageTitle" value="' + (p ? escapeHtml(p.title) : "") + '" placeholder="如 团队介绍"></div>' +
      '<div class="form-group"><label>正文内容 <span style="font-size:0.8rem;color:var(--text-tertiary)">(支持 Markdown 格式)</span></label>' +
      '<textarea id="f_content" class="editor-content" placeholder="## 标题&#10;&#10;正文内容..." style="min-height:300px;font-family:\'JetBrains Mono\',Consolas,monospace;font-size:0.9rem">' + (p ? escapeHtml(p._content || "") : "") + '</textarea>' +
      '<div style="display:flex;gap:8px;margin-top:6px">' +
        '<button class="btn btn--outline btn--sm" onclick="window.__admin.previewContent()" style="font-size:0.8rem">预览</button>' +
        '<span style="font-size:0.75rem;color:var(--text-tertiary);align-self:center">支持 Markdown：# 标题、**加粗**、- 列表、`代码`</span>' +
      '</div></div>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:24px">' +
        '<button class="btn btn--outline btn--sm" onclick="window.__admin.closeModal()">取消</button>' +
        '<button class="btn btn--primary btn--sm" onclick="window.__admin.savePage(\'' + (id || "") + '\')">保存</button>' +
      '</div>'
    );

    /* 异步加载正文 */
    if (id) {
      loadPageContent(id);
    }
  }

  async function loadPageContent(id) {
    var textarea = document.getElementById("f_content");
    if (!textarea) return;
    textarea.placeholder = "正在加载正文...";
    try {
      var response = await fetch("/api/page?id=" + encodeURIComponent(id));
      if (response.ok) {
        var data = await response.json();
        if (data.content) {
          textarea.value = data.content;
        }
      }
    } catch (e) {
      textarea.placeholder = "正文加载失败，可重新输入";
    }
  }

  async function savePage(id) {
    var pageId = val("f_pageId");
    if (!pageId) { toast("请输入页面 ID", "error"); return; }
    var data = {
      id: pageId,
      title: val("f_pageTitle"),
      navLabel: val("f_navLabel"),
      content: val("f_content"),
      updatedAt: formatDate(new Date()),
    };
    if (!data.title) { toast("请输入页面标题", "error"); return; }
    try {
      if (id) {
        await api("/content", { method: "PUT", body: JSON.stringify({ type: "pages", id: id, data: data }) });
        toast("页面已更新", "success");
      } else {
        await api("/content", { method: "POST", body: JSON.stringify({ type: "pages", data: data }) });
        toast("页面已添加", "success");
      }
      closeModal();
      await loadAllContent();
      renderPages();
    } catch (e) { toast(e.message, "error"); }
  }

  async function deletePage(id) {
    var p = (contentData.pages || []).find(function (x) { return x.id === id; });
    confirmDialog("删除页面", "确定删除「" + (p ? p.title : "") + "」？", async function () {
      try {
        await api("/content", { method: "DELETE", body: JSON.stringify({ type: "pages", id: id }) });
        toast("已删除", "success");
        await loadAllContent();
        renderPages();
      } catch (e) { toast(e.message, "error"); }
    });
  }

  /* ===== 网站配置 ===== */
  function renderConfig() {
    var config = contentData.site_config || {};
    var stats = config.stats || [];
    var paths = config.paths || [];
    var charts = config.charts || {};
    var cTrend = charts.trend || {};
    var cRadar = charts.radar || {};
    var cDoughnut = charts.doughnut || {};
    var cBar = charts.bar || {};
    var cBarSets = (cBar.sets && cBar.sets.length >= 2) ? cBar.sets : [{ label: "", data: [] }, { label: "", data: [] }];

    adminMain.innerHTML = `
      <div class="section-admin-header">
        <h2>网站配置</h2>
        <button class="btn btn--primary btn--sm" onclick="window.__admin.saveConfig()">保存配置</button>
      </div>

      <div class="config-section">
        <h3>站点信息与外观</h3>
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin:0 0 16px">修改站点名称、Logo、首页文案与全站字号，保存后前台立即生效。</p>
        <div class="form-row">
          <div class="form-group">
            <label>站点名称（导航栏 Logo 文字 / 浏览器标题）</label>
            <input type="text" id="config_siteName" value="${escapeHtml(config.siteName || "")}" placeholder="如 AI科技前沿">
          </div>
          <div class="form-group">
            <label>全站字号</label>
            <select id="config_fontSize">
              <option value="default"${config.fontSize === "default" || !config.fontSize ? " selected" : ""}>标准（默认）</option>
              <option value="small"${config.fontSize === "small" ? " selected" : ""}>小字号</option>
              <option value="large"${config.fontSize === "large" ? " selected" : ""}>大字号</option>
              <option value="xlarge"${config.fontSize === "xlarge" ? " selected" : ""}>特大字号</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Logo 图片地址（可选；填图片 URL 后导航栏显示图片 Logo，留空用默认图标）</label>
          <input type="text" id="config_logoUrl" value="${escapeHtml(config.logoUrl || "")}" placeholder="如 /assets/logo.png 或 https://...">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>首页主标题</label>
            <input type="text" id="config_heroTitle" value="${escapeHtml(config.heroTitle || "")}" placeholder="如 AI 科技要闻">
          </div>
          <div class="form-group">
            <label>首页副标题</label>
            <input type="text" id="config_heroSubtitle" value="${escapeHtml(config.heroSubtitle || "")}" placeholder="如 技能知识分享 · 共同学习交流">
          </div>
        </div>
        <div class="form-group">
          <label>首页描述文字（换行即分段）</label>
          <textarea id="config_heroDesc" rows="3" placeholder="聚焦人工智能前沿动态...">${escapeHtml(config.heroDesc || "")}</textarea>
        </div>
        <div class="form-group">
          <label>页脚站点描述（换行即分段）</label>
          <textarea id="config_footerDesc" rows="2" placeholder="聚焦人工智能前沿动态...">${escapeHtml(config.footerDesc || "")}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>底部版权文字</label>
            <input type="text" id="config_footerCopy" value="${escapeHtml(config.footerCopy || "")}" placeholder="如 © 2026 AI科技前沿 · 共同学习，共同成长">
          </div>
          <div class="form-group">
            <label>底部技术署名</label>
            <input type="text" id="config_footerBuilt" value="${escapeHtml(config.footerBuilt || "")}" placeholder="如 Built with ❤️ for AI Learners">
          </div>
        </div>
      </div>

      <div class="config-section">
        <h3>底部社交媒体链接</h3>
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin:0 0 16px">添加、编辑或删除底部社交媒体按钮，支持任意数量。选择「自定义」可填写 emoji 图标和任意链接。</p>
        <div class="config-social" id="configSocial">
          ${(config.socialLinks || []).map(function (s, i) {
            return `<div class="config-social-row">
              <select class="config-social-type" data-idx="${i}">
                <option value="github"${s.type === "github" ? " selected" : ""}>GitHub</option>
                <option value="wechat"${s.type === "wechat" ? " selected" : ""}>微信</option>
                <option value="zhihu"${s.type === "zhihu" ? " selected" : ""}>知乎</option>
                <option value="twitter"${s.type === "twitter" ? " selected" : ""}>Twitter / X</option>
                <option value="bilibili"${s.type === "bilibili" ? " selected" : ""}>哔哩哔哩</option>
                <option value="youtube"${s.type === "youtube" ? " selected" : ""}>YouTube</option>
                <option value="weibo"${s.type === "weibo" ? " selected" : ""}>微博</option>
                <option value="douyin"${s.type === "douyin" ? " selected" : ""}>抖音</option>
                <option value="qq"${s.type === "qq" ? " selected" : ""}>QQ</option>
                <option value="telegram"${s.type === "telegram" ? " selected" : ""}>Telegram</option>
                <option value="linkedin"${s.type === "linkedin" ? " selected" : ""}>LinkedIn</option>
                <option value="email"${s.type === "email" ? " selected" : ""}>邮箱</option>
                <option value="custom"${s.type === "custom" || !s.type ? " selected" : ""}>自定义</option>
              </select>
              <input type="text" class="config-social-label" data-idx="${i}" value="${escapeHtml(s.label || "")}" placeholder="显示名称">
              <input type="text" class="config-social-url" data-idx="${i}" value="${escapeHtml(s.url || "")}" placeholder="链接地址（如 https://github.com/...）">
              <input type="text" class="config-social-icon" data-idx="${i}" value="${escapeHtml(s.icon || "")}" placeholder="emoji图标" style="text-align:center" title="仅「自定义」类型有效">
              <button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()" title="删除">🗑</button>
            </div>`;
          }).join("")}
        </div>
        <button class="btn btn--outline btn--sm" style="margin-top:12px" onclick="window.__admin.addSocialRow()">+ 添加社交链接</button>
      </div>

      <div class="config-section">
        <h3>底部链接列表</h3>
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin:0 0 16px">修改底部「学习资源」和「关于我们」两个板块的链接条目，支持添加/编辑/删除。链接可填站内锚点（如 #skills）或完整 URL。</p>

        <h4 style="margin-bottom:8px">学习资源</h4>
        <div class="config-linklist" id="configResourceLinks">
          ${(config.resourceLinks || []).map(function (l, i) {
            return `<div class="config-linklist-row">
              <input type="text" class="config-linklist-label" data-idx="${i}" value="${escapeHtml(l.label || "")}" placeholder="链接名称（如 入门指南）">
              <input type="text" class="config-linklist-url" data-idx="${i}" value="${escapeHtml(l.url || "")}" placeholder="链接地址（如 #skills 或 https://...）">
              <button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()" title="删除">🗑</button>
            </div>`;
          }).join("")}
        </div>
        <button class="btn btn--outline btn--sm" style="margin:8px 0 20px" onclick="window.__admin.addLinkRow('configResourceLinks')">+ 添加学习资源链接</button>

        <h4 style="margin-bottom:8px">关于我们</h4>
        <div class="config-linklist" id="configAboutLinks">
          ${(config.aboutLinks || []).map(function (l, i) {
            return `<div class="config-linklist-row">
              <input type="text" class="config-linklist-label" data-idx="${i}" value="${escapeHtml(l.label || "")}" placeholder="链接名称（如 团队介绍）">
              <input type="text" class="config-linklist-url" data-idx="${i}" value="${escapeHtml(l.url || "")}" placeholder="链接地址（如 page.html?id=team）">
              <button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()" title="删除">🗑</button>
            </div>`;
          }).join("")}
        </div>
        <button class="btn btn--outline btn--sm" style="margin-top:8px" onclick="window.__admin.addLinkRow('configAboutLinks')">+ 添加关于我们链接</button>
      </div>

      <div class="config-section">
        <h3>各专区描述文字</h3>
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin:0 0 16px">修改首页各板块标题下方的描述文字，保存后前台立即生效。</p>
        <div class="form-group">
          <label>AI 要闻速递 — 描述</label>
          <input type="text" id="config_descNews" value="${escapeHtml(config.descNews || "")}" placeholder="如 第一时间获取人工智能领域的重要新闻与技术突破">
        </div>
        <div class="form-group">
          <label>技能知识分享 — 描述</label>
          <input type="text" id="config_descSkills" value="${escapeHtml(config.descSkills || "")}" placeholder="如 实战教程、技术拆解、经验总结 — 从入门到精通">
        </div>
        <div class="form-group">
          <label>视频教程专区 — 描述</label>
          <input type="text" id="config_descVideos" value="${escapeHtml(config.descVideos || "")}" placeholder="如 高清视频教程，边看边练，轻松掌握 AI 实战技能">
        </div>
        <div class="form-group">
          <label>数据可视化洞察 — 描述</label>
          <input type="text" id="config_descCharts" value="${escapeHtml(config.descCharts || "")}" placeholder="如 用数据说话 — AI 行业趋势、技术热度、学习数据">
        </div>
        <div class="form-group">
          <label>学习交流社区 — 描述</label>
          <input type="text" id="config_descCommunity" value="${escapeHtml(config.descCommunity || "")}" placeholder="如 提出问题、分享见解、结识同行 — 在交流中共同成长">
        </div>
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

      <div class="config-section">
        <h3>数据洞察图表</h3>
        <p style="font-size:0.8rem;color:var(--text-tertiary);margin:0 0 16px">标签与数值均用逗号分隔；数值支持小数。修改后前台图表即时更新。</p>

        <div class="config-section">
          <h4>📈 折线图（趋势）</h4>
          <div class="form-group"><label>标题</label>
            <input type="text" id="chart_trend_title" value="${escapeHtml(cTrend.title || "")}" placeholder="如 AI 模型参数量演进趋势"></div>
          <div class="form-row">
            <div class="form-group"><label>X 轴标签（逗号分隔）</label>
              <input type="text" id="chart_trend_labels" value="${escapeHtml((cTrend.labels || []).join(", "))}"></div>
            <div class="form-group"><label>数值（逗号分隔）</label>
              <input type="text" id="chart_trend_data" value="${(cTrend.data || []).join(", ")}"></div>
          </div>
        </div>

        <div class="config-section">
          <h4>🕸 雷达图（方向热度）</h4>
          <div class="form-group"><label>标题</label>
            <input type="text" id="chart_radar_title" value="${escapeHtml(cRadar.title || "")}" placeholder="如 热门 AI 技术方向"></div>
          <div class="form-row">
            <div class="form-group"><label>维度标签（逗号分隔）</label>
              <input type="text" id="chart_radar_labels" value="${escapeHtml((cRadar.labels || []).join(", "))}"></div>
            <div class="form-group"><label>热度数值 0-100（逗号分隔）</label>
              <input type="text" id="chart_radar_data" value="${(cRadar.data || []).join(", ")}"></div>
          </div>
        </div>

        <div class="config-section">
          <h4>🍩 环形图（占比分布）</h4>
          <div class="form-group"><label>标题</label>
            <input type="text" id="chart_doughnut_title" value="${escapeHtml(cDoughnut.title || "")}" placeholder="如 社区学习偏好分布"></div>
          <div class="form-row">
            <div class="form-group"><label>分类标签（逗号分隔）</label>
              <input type="text" id="chart_doughnut_labels" value="${escapeHtml((cDoughnut.labels || []).join(", "))}"></div>
            <div class="form-group"><label>占比数值（逗号分隔）</label>
              <input type="text" id="chart_doughnut_data" value="${(cDoughnut.data || []).join(", ")}"></div>
          </div>
        </div>

        <div class="config-section">
          <h4>📊 柱状图（双系列对比）</h4>
          <div class="form-group"><label>标题</label>
            <input type="text" id="chart_bar_title" value="${escapeHtml(cBar.title || "")}" placeholder="如 月度技术文章发布量 vs 阅读量"></div>
          <div class="form-group"><label>X 轴标签（逗号分隔）</label>
            <input type="text" id="chart_bar_labels" value="${escapeHtml((cBar.labels || []).join(", "))}"></div>
          <div class="form-row">
            <div class="form-group"><label>系列 1 名称</label>
              <input type="text" id="chart_bar_set1_label" value="${escapeHtml(cBarSets[0].label || "")}" placeholder="如 文章数"></div>
            <div class="form-group"><label>系列 1 数值（逗号分隔）</label>
              <input type="text" id="chart_bar_set1_data" value="${(cBarSets[0].data || []).join(", ")}"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>系列 2 名称</label>
              <input type="text" id="chart_bar_set2_label" value="${escapeHtml(cBarSets[1].label || "")}" placeholder="如 阅读量 (千)"></div>
            <div class="form-group"><label>系列 2 数值（逗号分隔）</label>
              <input type="text" id="chart_bar_set2_data" value="${(cBarSets[1].data || []).join(", ")}"></div>
          </div>
        </div>
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

  function addSocialRow() {
    var container = document.getElementById("configSocial");
    var idx = container.children.length;
    var div = document.createElement("div");
    div.className = "config-social-row";
    div.innerHTML =
      '<select class="config-social-type" data-idx="' + idx + '">' +
      '<option value="github">GitHub</option>' +
      '<option value="wechat">微信</option>' +
      '<option value="zhihu">知乎</option>' +
      '<option value="twitter">Twitter / X</option>' +
      '<option value="bilibili">哔哩哔哩</option>' +
      '<option value="youtube">YouTube</option>' +
      '<option value="weibo">微博</option>' +
      '<option value="douyin">抖音</option>' +
      '<option value="qq">QQ</option>' +
      '<option value="telegram">Telegram</option>' +
      '<option value="linkedin">LinkedIn</option>' +
      '<option value="email">邮箱</option>' +
      '<option value="custom" selected>自定义</option>' +
      '</select>' +
      '<input type="text" class="config-social-label" data-idx="' + idx + '" value="" placeholder="显示名称">' +
      '<input type="text" class="config-social-url" data-idx="' + idx + '" value="" placeholder="链接地址（如 https://github.com/...）">' +
      '<input type="text" class="config-social-icon" data-idx="' + idx + '" value="" placeholder="emoji图标" style="text-align:center" title="仅「自定义」类型有效">' +
      '<button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()">🗑</button>';
    container.appendChild(div);
  }

  function addLinkRow(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var idx = container.children.length;
    var div = document.createElement("div");
    div.className = "config-linklist-row";
    div.innerHTML =
      '<input type="text" class="config-linklist-label" data-idx="' + idx + '" value="" placeholder="链接名称">' +
      '<input type="text" class="config-linklist-url" data-idx="' + idx + '" value="" placeholder="链接地址">' +
      '<button class="icon-btn icon-btn--danger" onclick="this.parentElement.remove()">🗑</button>';
    container.appendChild(div);
  }

  /* 图表输入解析：逗号分隔（兼容中文逗号） */
  function parseList(str) {
    return String(str || "").split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function parseNums(str) {
    return parseList(str).map(Number);
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

    /* 图表配置 */
    var charts = {
      trend: {
        title: val("chart_trend_title"),
        labels: parseList(val("chart_trend_labels")),
        data: parseNums(val("chart_trend_data")),
      },
      radar: {
        title: val("chart_radar_title"),
        labels: parseList(val("chart_radar_labels")),
        data: parseNums(val("chart_radar_data")),
      },
      doughnut: {
        title: val("chart_doughnut_title"),
        labels: parseList(val("chart_doughnut_labels")),
        data: parseNums(val("chart_doughnut_data")),
      },
      bar: {
        title: val("chart_bar_title"),
        labels: parseList(val("chart_bar_labels")),
        sets: [
          { label: val("chart_bar_set1_label"), data: parseNums(val("chart_bar_set1_data")) },
          { label: val("chart_bar_set2_label"), data: parseNums(val("chart_bar_set2_data")) },
        ],
      },
    };

    /* 社交媒体链接 */
    var socialLinks = [];
    document.querySelectorAll("#configSocial .config-social-row").forEach(function (row) {
      var type = row.querySelector(".config-social-type").value;
      var label = row.querySelector(".config-social-label").value.trim();
      var url = row.querySelector(".config-social-url").value.trim();
      var icon = row.querySelector(".config-social-icon").value.trim();
      if (label || url) {
        socialLinks.push({ type: type, label: label, url: url, icon: icon });
      }
    });

    /* 底部链接列表 */
    function collectLinkList(containerId) {
      var links = [];
      document.querySelectorAll("#" + containerId + " .config-linklist-row").forEach(function (row) {
        var label = row.querySelector(".config-linklist-label").value.trim();
        var url = row.querySelector(".config-linklist-url").value.trim();
        if (label || url) {
          links.push({ label: label, url: url });
        }
      });
      return links;
    }
    var resourceLinks = collectLinkList("configResourceLinks");
    var aboutLinks = collectLinkList("configAboutLinks");

    var data = {
      siteName: val("config_siteName"),
      logoUrl: val("config_logoUrl"),
      heroTitle: val("config_heroTitle"),
      heroSubtitle: val("config_heroSubtitle"),
      heroDesc: val("config_heroDesc"),
      footerDesc: val("config_footerDesc"),
      footerCopy: val("config_footerCopy"),
      footerBuilt: val("config_footerBuilt"),
      descNews: val("config_descNews"),
      descSkills: val("config_descSkills"),
      descVideos: val("config_descVideos"),
      descCharts: val("config_descCharts"),
      descCommunity: val("config_descCommunity"),
      fontSize: val("config_fontSize") || "default",
      stats: stats,
      heroBadge: val("config_heroBadge"),
      learningTip: val("config_learningTip"),
      paths: paths,
      charts: charts,
      socialLinks: socialLinks,
      resourceLinks: resourceLinks,
      aboutLinks: aboutLinks,
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
    previewContent: previewContent,
    backToEdit: backToEdit,
    editSkill: editSkill,
    saveSkill: saveSkill,
    deleteSkill: deleteSkill,
    previewSkillContent: previewSkillContent,
    editVideo: editVideo,
    saveVideo: saveVideo,
    deleteVideo: deleteVideo,
    editDiscussion: editDiscussion,
    saveDiscussion: saveDiscussion,
    deleteDiscussion: deleteDiscussion,
    editContributor: editContributor,
    saveContributor: saveContributor,
    deleteContributor: deleteContributor,
    editPage: editPage,
    savePage: savePage,
    deletePage: deletePage,
    renderMembers: renderMembers,
    deleteMember: deleteMember,
    renderComments: renderComments,
    approveComment: approveComment,
    deleteComment: deleteComment,
    goSection: goSection,
    saveConfig: saveConfig,
    addStatRow: addStatRow,
    addPathRow: addPathRow,
    addSocialRow: addSocialRow,
    addLinkRow: addLinkRow,
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
