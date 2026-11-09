# 周报聚合（M2）设计与运维

> 状态：已实现并上线（2026-11-10）。站内已收录 24 期周报，构建产出 41 个页面。
> 本文说明**为什么这样设计**、**数据怎么流动**、**出问题怎么修**。

## 1. 目标与范围

目标：把两份公开周报（ROS 2 技术周报、机器人研究周报）从"外链"变成"站内可读"，同时保持
内容可回溯、可纠错、可离线构建。

明确不做（避免范围蔓延）：

- 不做站内搜索（当前期数少，浏览器查找足够）；
- 不做评论、不做阅读计数（站点不引入任何统计脚本，见 CI 的合规检查）；
- 不改写周报内容——只做排版必要的转换（见第 6 节）；
- 不在构建期访问网络（见第 2 节第一条）。

## 2. 四个架构决策

### 2.1 抓取与构建解耦

**没有**在构建时实时拉取仓库。原因是构建期联网会带来三个脆弱点：

1. GitHub Pages 的构建环境没有可用 token，API 匿名限速 60 次/小时，源一多就失败；
2. 上游仓库抖动会直接让部署失败，等于"别人的仓库挂了，我们的站也发不出去"；
3. 构建不可复现——同一份代码在不同时间构建出不同产物，无法对着产物排查问题。

所以：**`scripts/sync-weekly.mjs` 负责抓取，`astro build` 只读本地 `src/content/weekly/`**。
构建可以完全离线、结果确定。

### 2.2 单一真相源

源定义只写在 `src/data/site.json` 的 `weeklyDigests`，脚本与页面都读它，不另设配置文件。
字段：

| 字段 | 含义 | 示例 |
|---|---|---|
| `id` | 源标识，决定内容子目录与页面路径 | `ros2` |
| `label` / `labelEn` | 中文名 / 英文名 | `ROS 2 技术周报` |
| `repo` | 仓库地址 | `https://github.com/loonglee2025/ros2-weekly-digest` |
| `dir` | 周报所在目录 | `reports` / `weekly` |
| `branch` | 抓取分支 | `main` |
| `filePattern` | 文件名正则 | `^\d{4}-\d{2}-\d{2}-weekly\.md$` |
| `maxItems` | 站内保留最近几期 | `12` |
| `cadence` / `cadenceEn` | 更新节奏文案 | `每周一更新` |

> **历史坑**：`robot-research-weekly` 的周报在 `weekly/` 而不是 `reports/`（`reports/` 里只有
> 2026-06 的一个旧文件）。原先 `site.json` 把两个源都写成 `reports`，导致该源聚合不到内容。
> 现在按源配置 `dir`，并在同步日志里打印"源共 N 期"，路径配错会立刻暴露（0 期即报错）。

### 2.3 幂等

同步脚本按内容比对：目标文件内容与将要写入的内容一致时不写盘。因此重复运行不会产生
无意义 diff，定时任务在"上游没有新期"时是空操作（CI 里 `git diff --cached --quiet` 直接跳过提交）。

### 2.4 失败降级

- 单个源失败：记录到 `weekly-index.json` 的 `errors`，**保留上一次成功抓取的内容**，脚本以 0 退出；
- 全部失败：内容目录保持原样，构建照常成功（站上显示的是上一批数据，页面顶部有同步时间，用户能看出新旧）；
- `--strict`：任一源失败即退出码 1，仅用于 CI 里"要让问题可见"的场景——但注意 CI 用的是
  `--strict`，失败会红，此时应看日志判断是上游删除目录还是网络问题。

## 3. 数据流

```
src/data/site.json (weeklyDigests)
        │
        ▼
scripts/sync-weekly.mjs
   ├─ GET /repos/{repo}/contents/{dir}?ref={branch}   列出文件名（用 filePattern 过滤）
   ├─ GET raw.githubusercontent.com/{repo}/{branch}/{dir}/{file}   取原文（不耗 API 配额）
   ├─ 转换：剥 H1 → 提取 summary → 参考链接转有序列表
   ├─ 写 src/content/weekly/<id>/<YYYY-MM-DD>.md（幂等）
   ├─ 清理超出 maxItems 的旧文件
   └─ 写 src/data/weekly-index.json（同步时间、每源期数、最新一期、错误）
        │
        ▼
astro build（离线）
   ├─ /weekly/                     列表：按源分组、每源最近 N 期
   └─ /weekly/<source>/<date>/     详情：渲染 Markdown 正文
```

## 4. 生成物

### 4.1 内容集合

- 路径：`src/content/weekly/<sourceId>/<YYYY-MM-DD>.md`
- 集合定义：`src/content.config.ts`（Astro Content Layer，`glob` loader + zod schema）
- **不要手工编辑这些文件**——下次同步会按上游原文覆盖。要改内容请到周报仓库提 PR。

frontmatter 字段：`title` `date` `source` `sourceLabel` `sourceLabelEn` `repo`
`sourcePath` `sourceUrl` `summary`。

### 4.2 索引

`src/data/weekly-index.json`：

```json
{
  "syncedAt": "2026-11-09T21:54:03.797Z",
  "sources": [{ "id": "ros2", "total": 23, "count": 12, "latest": "2026-11-08", "written": 12, "removed": 0 }],
  "errors": []
}
```

页面用它显示"站内收录 N 期 / 最近同步于 …（UTC）"，以及"源仓库共 N 期，本站收录最近 M 期"。

## 5. 页面

| 路径 | 内容 |
|---|---|
| `/weekly/` | 按源分组列出已聚合期次（日期、标题、摘要），附同步状态与内容口径说明 |
| `/weekly/<source>/<date>/` | 单期全文（面包屑 + 元信息 + 正文 + "在 GitHub 查看原文"） |
| `/en/weekly/` | 英文入口：说明聚合已上线、正文为中文，链接到 `/weekly/` |

英文站的处理遵循 README 的双语规则：**不在英文页放中文正文**。所以英文页只报状态与仓库链接，
点进中文列表阅读。

## 6. 正文转换规则（三处，都只做排版）

1. **剥离首个 H1**：页面已有 `<h1>`，正文再出现 `# 标题` 会造成两级标题重复；
2. **提取摘要**：取正文第一段非标题、非参考链接的纯文本，截断到 140 字符，作为卡片摘要与
   `<meta description>`；
3. **参考链接列表化**：把 `## 参考链接` 小节里的 `[N]: 标题 — URL` 转成 `N. [标题](URL)`。
   原因：`[N]: 标题 — URL` 不是合法的 Markdown 链接引用定义（URL 不在引用定义要求的
   `<url>` 位置），渲染时会退化成不换行的一大段纯文本。转成有序列表后每条独立成行、可点击，
   序号与正文里的 `[N]` 标记天然对应。

正文里的 `[N]` 标记保持原样（渲染为纯文本 `[N]`），与周报在 GitHub 上的呈现一致。

排版样式集中在 `src/styles/global.css` 的 `.prose` 段：正文限宽 `46rem`（约 736px，中文单行
38–42 字）、行高 1.85、h2 带下边框、h3 用强调色、表格可横向滚动。

## 7. 定时任务

`.github/workflows/sync-weekly.yml`：

- 触发：每周一、周五 UTC 22:00（北京时间次日 06:00），外加 `workflow_dispatch` 手动触发；
- 步骤：`npm ci` → `node scripts/sync-weekly.mjs --strict` → 有变化才 `git commit` + `git push`
  → `gh workflow run deploy-pages.yml`；
- 权限：`contents: write`、`actions: write`。

> **为什么手动触发部署**：GitHub 规定用 `GITHUB_TOKEN` 推送产生的 commit **不会**再触发
> 其它 workflow（防递归）。所以推送成功后必须显式 `gh workflow run deploy-pages.yml`，
> 否则站点会停在旧内容上——这是这类"定时抓取 + 提交"最容易漏的一步。

## 8. 运维手册

```bash
# 手动同步（本地，需要 token 以避免 API 限速）
GITHUB_TOKEN=xxx npm run sync:weekly

# 严格模式：任一源失败即报错退出（CI 用）
GITHUB_TOKEN=xxx node scripts/sync-weekly.mjs --strict

# 只验证构建（离线，不联网）
npm run build

# 本地预览构建产物
npm run preview
```

**常见问题**

| 现象 | 判断 | 处理 |
|---|---|---|
| 页面显示"这一源暂时没有聚合到内容" | 该源一次都没成功抓取，或期数为 0 | 看 `weekly-index.json` 的 `errors`；核对 `dir` / `branch` / `filePattern` |
| 站内期数比源仓库少 | 正常，受 `maxItems` 限制 | 需要更多历史就把 `maxItems` 调大再同步一次 |
| 某个源长期不再更新 | 上游仓库确实停更（站内会自然显示"最新一期"是哪个日期） | 不要伪造内容；要么恢复上游发布，要么在 `site.json` 里标注停更 |
| CI 同步 job 变红 | `--strict` 下某源失败 | 看日志里的 HTTP 状态码：404 = 目录/分支名写错；403 = token 权限或限速 |
| 内容更新了但线上没变 | 大概率漏了触发部署 | 手动到 Actions 跑一次 `Deploy Pages` |

**回滚**：内容与索引都在 git 里，`git revert` 同步提交即可回到上一批数据；页面代码与样式
也是普通提交，不需要特殊的回滚机制。

## 9. 已验证项（2026-11-10 实测）

- `node --check scripts/sync-weekly.mjs` 通过；
- 同步结果：ROS 2 技术周报 12 期（源共 23 期，最新 2026-11-08）、机器人研究周报 12 期
  （源共 16 期，最新 2026-09-18）；
- `npm run build` 成功，41 页（原 17 页 + 24 期详情页），构建耗时约 3–6 秒；
- 详情页实测：h1 + 7 个 h2、3 个有序列表（含参考链接）、59 个外链，参考链接已列表化；
- 列表页实测：24 张卡片、3 个分组标题、同步状态文案正常；
- 正文样式实测：正文宽度 736px、行高 29.6px、表格可横向滚动。

## 10. 已知限制

1. **无全文搜索**：期数增长到 50+ 之后应补（Astro 生态可用 Pagefind 做构建期索引，仍不依赖后端）；
2. **不做分页**：目前每源最多 12 期，一屏可滚动看完；超过 24 期需要加"加载更多/按年归档"；
3. **中文正文不进英文站**：英文页只做状态说明——这是双语规则的刻意的取舍，不是遗漏；
4. **机器人研究周报上游自 2026-09-18 起无新期**：站内会一直显示 2026-09-18 为最新一期，
   这是事实的镜像，不做任何补白。
