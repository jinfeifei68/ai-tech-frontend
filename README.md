# AI 科技前沿

> 聚焦人工智能前沿动态，分享实用技术技能，打造开放学习社区

## 项目简介

响应式静态网站，包含 AI 要闻、技能知识分享、视频教程、数据可视化、学习交流社区等模块。

## 技术栈

- HTML5 语义化结构
- CSS3（Flexbox + Grid + 自定义属性 + 动画）
- 原生 JavaScript（IntersectionObserver + Chart.js）
- Chart.js 4.4 数据可视化

## 文件结构

```
├── index.html          # 主页面
├── css/style.css       # 全局样式 + 响应式 + 明暗主题
├── js/main.js          # 交互逻辑 + 图表
├── .gitignore
└── README.md
```

## 本地预览

```bash
# 方式一：Python
python -m http.server 8080

# 方式二：Node.js
npx serve .
```

浏览器打开 http://localhost:8080 即可预览。

## 部署

本项目为纯静态网站，推荐使用 Cloudflare Pages 部署：

1. 将代码推送到 GitHub 仓库
2. 在 Cloudflare Pages 中连接该仓库
3. 构建命令留空，输出目录为 `/`（根目录）
4. 点击部署即可获得全球 CDN 加速的访问链接

## License

MIT
