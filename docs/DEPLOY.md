# 部署与域名绑定手册（ROSGZ）

目标域名：`gzrobotics.org`（主域，2026-10-28 注册于 NameCheap）+ `www.gzrobotics.org`（301 到主域）。

保护性域名现状（RDAP 查询于 2026-10-28）：`gzrobotics.com` 已被第三方持有（2014-12-21 注册，阿里云/HiChina），
无法注册；`gzrobotics.net` / `gzrobotics.io` / `gzrobotics.xyz` 未注册（如需品牌保护可另行注册，注册前复核）。
托管：Cloudflare Pages（Git 集成）。以下步骤中标注「你操作」的环节需要账号权限，其余可由我执行或协助核验。

> 状态核实说明：域名可用性由 RDAP 于 2026-10-28 查询确认（404 = 未注册）。
> 平台免费额度、构建限额、功能开关以 Cloudflare / 注册商当日文档为准，不在本文件写死数字。

## 0. 前置条件

- [x] GitHub 仓库已创建：`loonglee2025/rosgz`（2026-10-28；日后可 Transfer 到组织 `rosgz`）
- [ ] 一个 Cloudflare 账号（免费计划即可）
- [ ] 一个域名注册商账号（见下）

## 0. GitHub Pages 预览站（已启用，无需等待域名）

用于在域名注册前先让社群成员在手机上看到成品。

- 地址：`https://loonglee2025.github.io/rosgz/`
- 工作流：`.github/workflows/deploy-pages.yml`（push 到 `main` 自动构建部署，`workflow_dispatch` 可手动触发）
- Pages 源已由 API 设为 **GitHub Actions**（`build_type: workflow`），无需在网页端再选分支
- 构建参数：`DEPLOY_TARGET=gh-pages` → `base=/rosgz`，内部链接自动加前缀（`src/lib/url.ts`）
- SEO 处理：预览站带 `<meta name="robots" content="noindex, nofollow">`，canonical 仍指向 `https://gzrobotics.org`，
  避免被搜索引擎与正式站判为重复内容
- 已知限制：GitHub Pages 在中国大陆访问不稳定（时延/丢包随网络变化），**仅作预览**；
  正式发布仍按下方 Cloudflare Pages + 自定义域执行，届时可把本工作流降级为可选或删除

验证方式（我可随时执行）：

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://loonglee2025.github.io/rosgz/
curl -s -o /dev/null -w "%{http_code}\n" https://loonglee2025.github.io/rosgz/about/
```

## 1. 注册域名（你操作）

推荐组合：主域 `gzrobotics.org`（**已注册**，2026-10-28 / NameCheap）。
`gzrobotics.com` 已被他人持有，无法注册；若需品牌保护，`gzrobotics.net` / `gzrobotics.io` 目前未注册（注册前复核），
注册后在 Cloudflare 建站并 301 到主域即可。

| 项 | 建议 |
|---|---|
| 注册商 | 优先选能自助修改 NS 的注册商；Cloudflare Registrar 可直接注册并省一步 NS 迁移 |
| 年限 | 3 年起，开启**自动续费** |
| 安全 | 开启注册商账号 2FA；开启域名转移锁；WHOIS 隐私（.org 通常默认公开，按注册商能力选择） |
| 若选 `.cn` | 需实名认证；解析到境内服务器需 ICP 备案 —— 本项目走境外静态托管，不建议用 `.cn` 做主域 |

## 2. Cloudflare 托管 DNS

1. 你操作：Cloudflare 控制台 → Add a site → 输入 `gzrobotics.org` → 选 Free 计划。
2. Cloudflare 会给两个 NS 名称（形如 `xxx.ns.cloudflare.com`）。
3. 你操作：到注册商把域名 NS 改为这两个地址。
4. 生效核验（我可执行）：

```bash
dig +short NS gzrobotics.org            # 应返回两条 *.ns.cloudflare.com
dig +short SOA gzrobotics.org
```

> NS 传播通常数分钟到数小时；未生效前 Pages 的自定义域验证会失败，属正常现象。

## 3. 创建 Cloudflare Pages 项目（Git 集成）

1. 你操作：Workers & Pages → Create → Pages → Connect to Git → 选择站点仓库。
2. 构建配置：

| 字段 | 值 |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 仓库根（若站点置于子目录则填 `website`） |
| Node 版本 | 20 或 22（Pages 环境变量 `NODE_VERSION`） |

3. 首次构建完成后会得到 `*.pages.dev` 预览域（可先用它做视觉验收，不必等域名生效）。

## 4. 绑定自定义域名

1. 你操作：Pages 项目 → Custom domains → 添加 `gzrobotics.org`（apex）与 `www.gzrobotics.org`。
   - `gzrobotics.org` 在 Cloudflare DNS 中由 Pages 自动创建 CNAME-flattening 记录；
   - `www` 创建普通 CNAME 指向 `<project>.pages.dev`。
2. HTTPS：Cloudflare 自动签发证书（Universal SSL），无需手动申请。
3. 强制主域：Rules → Redirect Rules 添加一条：`www.gzrobotics.org/*` → `https://gzrobotics.org/$1`，301。
4. 其他后缀的 301（可选）：若日后注册或取得 `gzrobotics.net` / `.io`，在其 Cloudflare 站点内同样建
   Redirect Rule 指向 `https://gzrobotics.org/$1`（或用 Bulk Redirects）。未持有前跳过此步。
5. 生效核验（我可执行）：

```bash
curl -sSI https://gzrobotics.org | head -20            # 期望 200 + server: cloudflare
curl -sSI https://www.gzrobotics.org | head -5         # 期望 301 → https://gzrobotics.org/
dig +short gzrobotics.org                              # Pages 记录已生效
```

## 5. 回滚与故障处理

| 场景 | 处理 |
|---|---|
| 新版本页面异常 | Pages 控制台 → Deployments → 选择上一个可用部署 → Rollback（秒级生效） |
| 代码层面回退 | `git revert <sha>` 合并后自动重新部署 |
| 域名解析异常 | 在 Cloudflare DNS 中核对 CNAME 是否被误改；必要时临时切到 `*.pages.dev` 让社群先用 |
| 构建失败 | 查 Pages 构建日志；本地先跑 `npm install && npm run build` 复现 |

## 6. 大陆访问质量（二期决策，不阻塞上线）

Cloudflare 免费计划在大陆的访问质量不稳定（时延与丢包随网络环境波动）。上线后 2 周观察：

- 若社群反馈打开慢/打不开占比不可忽略，评估两条路径：
  1. **香港/新加坡节点**：无需备案，可用 Cloudflare 或其它海外主机；
  2. **境内 CDN / 对象存储**：需 ICP 备案（域名实名 + 主体资质），且备案期间不要将域名解析到境内服务器。
- 无论选哪条，站点产物是纯静态 `dist/`，迁移只涉及「把 `dist/` 上传到新宿主 + 改 DNS」，不改代码。

## 7. 上线检查清单

- [ ] `https://gzrobotics.org` 返回 200，证书有效
- [ ] `https://www.gzrobotics.org` 301 到主域
- [ ] `https://gzrobotics.org/nonexistent` 返回 404 页（非跳首页）
- [ ] `/robots.txt`、`/favicon.svg` 可访问
- [ ] 移动端（375px 宽）导航不折行错位、二维码可长按识别
- [ ] 页脚非官方/商标声明存在
- [ ] Lighthouse 移动端：性能 / 无障碍 / SEO 均 ≥ 95（Chrome DevTools 或 PageSpeed Insights）
- [ ] 全站无统计/追踪脚本（`grep -r "gtag\|analytics\|umami\|plausible" src public` 应为空）
