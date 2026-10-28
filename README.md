# F1 2026 单页赛况网站

课堂作业项目：F1 2026 赛季单页赛况站。视觉采用官方深色科技风，数据来自公开 API 与 RSS，自动更新后部署在 GitHub Pages。

- 线上地址：https://mimitangtang.github.io/F1/
- 仓库地址：https://github.com/mimitangtang/F1

## 功能

- 首屏：下一站、倒计时、周末赛程（练习赛 / 排位赛 / 正赛，北京时间）、赛道概况、遥测赛道动效
- 赛季进程：23 站时间轴、点击切换分站战报、完整战报折叠、名场面、围场快讯
- 积分榜：车手与车队积分、冠军形势、展开完整榜单
- 数据来源：Jolpica F1 API + Formula 1 / Motorsport RSS
- 网友观点：来自 `quotes.json`，按下一站自动切换，每条带平台、日期与原帖链接

## 数据更新

`data.json` 由 GitHub Action 每 30 分钟生成一次：

1. 拉取 Jolpica 的赛程、全部比赛结果、车手/车队积分；
2. 抓取 F1 官方与 Motorsport 的 RSS，保留最新 6 条新闻（标题 + 来源 + 原文链接）；
3. 校验后写入 `data.json`，提交回仓库，GitHub Pages 自动重新发布。

如果抓取失败，脚本会退出且不覆盖旧文件，线上继续使用最近一次成功的数据。页面也内置了一份快照：即使 `data.json` 加载失败，页面仍有内容可看。

## 本地预览

```bash
cd F1
python3 -m http.server 8000
# 打开 http://localhost:8000
```

不要直接双击 `index.html`，浏览器对本地 `fetch` 有限制。

## 手动同步

```bash
node scripts/sync.mjs
```

需要 Node.js 22+，无第三方依赖。

## 部署

1. 仓库 Settings → Pages → Deploy from a branch → `main` / `(root)`；
2. Actions 页面手动运行一次 `sync-f1-data`；
3. 访问 https://mimitangtang.github.io/F1/。

## 文件

```
index.html                  单页（设计、交互、数据加载）
data.json                   Action 生成的比赛数据（自动提交）
quotes.json                 网友观点库，按分站编号维护
scripts/sync.mjs            数据抓取与转换脚本
.github/workflows/sync.yml  每 30 分钟运行的数据同步工作流
```

## 说明与限制

- 网友观点按下一站从 `quotes.json` 自动选取；每条观点带平台、日期与平台原帖/搜索页链接，后续可替换为具体帖子地址。
- 名场面、往届看点为人工撰写的编辑内容，目前按墨西哥站整理；后续分站需要人工替换。
- 首屏赛道图目前为墨西哥城站的示意图；当下一站不是墨西哥城时，页面会显示「赛道图待补充」占位，但赛道数据仍会更新。
- 新闻保留英文标题与来源，点击跳转原文，不复制全文与图片。
- 本项目为课堂作业、非商业用途；F1 及相关商标归 Formula One Licensing 所有，本项目与 Formula 1 无隶属关系。
- 比赛数据来自 Jolpica，许可为 CC BY-NC-SA 4.0（署名、非商业、相同方式共享）。
