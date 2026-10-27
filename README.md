# ROSGZ — ROS 广州（ROS Guangzhou）社区官网

ROS Guangzhou 的官方网站：静态站点，零后端，内容全部 Git 化。

- 正式域名（已定）：`https://rosgz.org`（保护性注册 `rosgz.com` 并 301 到主域）
- 站点定位（已定，依据社区介绍原文）：**面向机器人开发者的开放技术社区**——以 ROS / ROS 2 为技术基础，连接广州及周边从事机器人、自动驾驶、AI 感知、具身智能的开发者、研究者与创业者；不做付费培训、招聘中介与广告投放
- 内容来源：公众号 WayToRobots《ROS Guangzhou 社区介绍》（检索日期 2026-10-28，见 `src/data/site.json` 的 `source` 字段）
- 技术栈：Astro（纯静态）、原生 CSS（无 UI 框架依赖）、数据用 JSON
- 部署目标：Cloudflare Pages（Git 集成，PR 预览 + 一键回滚）

## 当前状态（M0 骨架）

已完成：

- [x] 目录与工程骨架（Astro 配置、TS 配置、.gitignore）
- [x] 全局布局：Header / Footer（含 ROS 商标与非官方声明）、深蓝青视觉、移动端适配
- [x] 页面：首页、关于、社区宣言、活动、周报、资源、加入、行为准则、404（共 9 页）
- [x] 数据层：`src/data/site.json`（品牌/渠道/周报源/资源）、`src/data/events.json`（活动，含 schema 注释）
- [x] CI 工作流（`.github/workflows/ci.yml`：安装依赖 + 构建）
- [x] 部署与域名绑定手册（`docs/DEPLOY.md`）

待办（未阻塞开发，阻塞「完整上线」）：

- [x] 拍板项 2：仓库归属 → 已定 `loonglee2025/rosgz`（2026-10-28 创建并首推）；
      若日后需迁到 GitHub Organization `rosgz`，用 GitHub 的 Transfer repository 保 issue/star
- [ ] 拍板项 4：是否首版中英双语（当前为中文单语，i18n 结构未引入）
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
├─ astro.config.mjs        # site: https://rosgz.org
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
2. 不得使用 ROS 官方 logo 或其变体；本站标识为字母标 `ROSGZ`。
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
