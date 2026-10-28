# GZRobotics — ROS 广州（ROS Guangzhou）社区官网

ROS Guangzhou 的官方网站：静态站点，零后端，内容全部 Git 化。

- 正式域名（已定）：`https://gzrobotics.org`（2026-10-28 注册于 NameCheap，到期 2027-10-28）；`gzrobotics.com` 已被第三方持有（2014 年注册，阿里云），不可注册；如需品牌保护，`.net` / `.io` / `.xyz` 当前 RDAP 显示未注册（注册前复核）
- 站点定位（已定，依据社区介绍原文）：**面向机器人开发者的开放技术社区**——以 ROS / ROS 2 为技术基础，连接广州及周边从事机器人、自动驾驶、AI 感知、具身智能的开发者、研究者与创业者；不做付费培训、招聘中介与广告投放
- 内容来源：公众号 WayToRobots《ROS Guangzhou 社区介绍》（检索日期 2026-10-28，见 `src/data/site.json` 的 `source` 字段）
- 技术栈：Astro（纯静态）、原生 CSS（无 UI 框架依赖）、数据用 JSON
- 语言：**中英双语**——中文为默认（`/about`），英文在 `/en` 下（`/en/about`）；英文为中文原文的译本，两者冲突时以中文为准
- 部署目标：Cloudflare Pages（Git 集成，PR 预览 + 一键回滚）

## 访问地址

| 用途 | 地址 | 说明 |
|---|---|---|
| **正式站** | https://gzrobotics.org | GitHub Pages + 自定义域（CNAME），根路径；域名 2026-10-28 注册于 NameCheap |
| 备用形态 | GitHub Pages 项目页（`/gzrobotics/` 子路径） | 仅在未绑定自定义域时使用，需 `DEPLOY_TARGET=gh-pages` 构建 |

## 两种构建模式

```bash
npm run build                       # 正式站：base=/，canonical=gzrobotics.org
DEPLOY_TARGET=gh-pages npm run build  # 预览站：base=/gzrobotics，canonical 仍指向 gzrobotics.org 且带 noindex
```

内部链接一律通过 `src/lib/url.ts` 的 `url('/path')` 生成，**不要硬编码 `href="/path"`**——
否则子路径部署会 404。新增页面时同样适用。

## 双语维护规则

| 事项 | 规则 |
|---|---|
| 页面 | 中文 `src/pages/*.astro`；英文 `src/pages/en/*.astro`（同结构，复用 `Base.astro`） |
| 数据 | 中文 `src/data/site.json`；英文 `src/data/site.en.json`（同 schema，字段一一对应） |
| 链接 | 中文页 `url('/about')`；英文页 `url('/en/about')`。语言前缀由 `src/lib/i18n.ts` 生成 |
| 语言切换 | `Header.astro` 按当前路径自动生成另一语言链接（`EN` / `中文` 胶囊按钮） |
| SEO | `Base.astro` 输出 `hreflang`（zh-CN / en / x-default）与分语言 canonical；`<html lang>` 随语言切换 |
| 新增页面 | 中英各一份；暂时缺英文版就在 README 待办里记一行，不要英文页留中文内容 |
| 口径 | 英文是**译本**：中文改动后必须同步英文；两者冲突时以中文原文为准（页脚/About 有说明） |
| 活动数据 | `events.json` 的 `titleEn` / `summaryEn` 为可选字段，英文活动页优先取，缺省回退中文 |

## 当前状态（M0 骨架）

已完成：

- [x] 目录与工程骨架（Astro 配置、TS 配置、.gitignore）
- [x] 全局布局：Header / Footer（含 ROS 商标与非官方声明）、深蓝青视觉、移动端适配
- [x] 页面：首页、关于、社区宣言、活动、周报、资源、加入、行为准则、404（共 9 页）
- [x] 数据层：`src/data/site.json`（品牌/渠道/周报源/资源）、`src/data/events.json`（活动，含 schema 注释）
- [x] CI 工作流（`.github/workflows/ci.yml`：安装依赖 + 构建）
- [x] 部署与域名绑定手册（`docs/DEPLOY.md`）

待办（未阻塞开发，阻塞「完整上线」）：

- [x] 拍板项 2：仓库归属 → 已定 `loonglee2025/gzrobotics`（2026-10-28 创建并首推）；
      若日后需迁到 GitHub Organization `rosgz`，用 GitHub 的 Transfer repository 保 issue/star
- [x] 拍板项 4：中英双语已实现（中文 `/`，英文 `/en`；`src/data/site.en.json`；hreflang 与语言切换已接入）
- [x] 「ROS 广州」既有描述出处 → 已定位：公众号 WayToRobots《ROS Guangzhou 社区介绍》
      （检索 2026-10-28，原文归档于 `docs/source/`），站点文案已按其口径重构
- [ ] 真实活动数据（`src/data/events.json` 现为空数组，页面显示占位说明，**不含任何虚构活动**）
- [ ] 微信群二维码 / 域名邮箱（`site.json` 中标注 TO-DO）
- [ ] M2：周报自动聚合（构建时拉取 `ros2-weekly-digest` / `robot-research-weekly` 的 `reports/*.md`）

## 本地开发

要求：Node ≥ 22.12（Astro 6 的 engines 要求；本机 v22.23.3 实测通过）。

> 版本说明：本仓库锁定 `astro ^6.4.8`。Astro 7 要求 Node ≥ 22.23.4，
> 且大版本升级可能涉及 API 变更 —— 升级前先确认 Node 版本与迁移说明，单独开 PR，不要顺手升 `latest`。

```bash
cd ~/Projects/rosgz
npm install            # 首次安装（生成 package-lock.json，请一并提交）
npm run dev            # http://localhost:4321
npm run build          # 产物输出到 dist/
npm run preview        # 预览构建产物
```

依赖策略：`package.json` 锁主版本范围 `^6.x`，实际版本由 `package-lock.json` 固定；
CI 使用 `npm ci`，保证与 lock 一致。

已知环境坑：npm 12 默认拦截第三方 install scripts（`esbuild` / `sharp`）。
本项目实测在脚本被拦截的情况下仍可正常 `npm run build`（纯静态、无图片优化）；
若后续引入需要 `sharp` 的图片处理，需执行 `npm install-scripts approve sharp` 后重装。

## 目录结构

```
rosgz/
├─ astro.config.mjs        # site: https://gzrobotics.org
├─ public/                 # favicon.svg、robots.txt、公众号二维码
├─ src/
│  ├─ components/          # Header / Footer
│  ├─ layouts/Base.astro   # HTML 骨架、SEO/OG、canonical
│  ├─ data/
│  │  ├─ site.json         # 品牌、定位、渠道链接、周报源、资源清单
│  │  └─ events.json       # 活动数据（含字段 schema 注释）
│  ├─ pages/               # 路由：/, /about, /events, /weekly, /resources, /join, /code-of-conduct, 404
│  └─ styles/global.css
├─ docs/DEPLOY.md          # 域名注册、DNS、Cloudflare Pages、验证与回滚
└─ .github/workflows/ci.yml
```

## 内容维护（非技术人员也能改）

| 想改什么 | 改哪里 |
|---|---|
| 活动排期 | `src/data/events.json`（按文件内 `_schema` 注释填字段） |
| 入群渠道 / 二维码 | `src/data/site.json` → `links`，二维码图片放 `public/` |
| 资源清单 | `src/data/site.json` → `resources` |
| 页面文案 | 对应 `src/pages/*.astro` 的 HTML 部分 |

提交方式：GitHub 网页端直接编辑 → 开 PR → CI 通过 → 合并即自动部署。

## 合规红线（改动内容时请自查）

1. 不得出现「官方」「ROS 中国区」「Open Robotics 授权」等表述；页脚非隶属声明不可删除。
2. 不得使用 ROS 官方 logo 或其变体；本站标识为字母标 `GZRobotics`。
3. 站点不引入统计/追踪脚本；不收集个人信息，报名一律跳转第三方表单。
4. 赞助或场地支持必须在页面与现场明确披露，且不得影响选题与讲者选择。
5. 活动截止日期、场地、报名链接必须以主办方最终发布为准，页面不写「预计」诱导报名。

## 许可证

- 代码：**MIT**（见 `LICENSE`）
- 站点文案与图文内容：**CC BY 4.0**，另有标注者除外
- 「ROS」为 Open Robotics 商标；本仓库不使用其官方 logo 或变体

## 相关仓库

| 用途 | 仓库 |
|---|---|
| ROS 2 技术周报（每周一） | https://github.com/loonglee2025/ros2-weekly-digest |
| 机器人研究周报（每周五） | https://github.com/loonglee2025/robot-research-weekly |
| WayToRobots 微信小程序 | https://github.com/loonglee2025/waytorobots-miniprogram |
