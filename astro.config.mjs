// @ts-check
import { defineConfig } from 'astro/config';

// 站点正式域名（拍板项 1）：https://gzrobotics.org
// 部署到 Cloudflare Pages / GitHub Pages 时保持 site 一致，
// 用于生成 sitemap、canonical 与 og:url。
//
// 预览模式：DEPLOY_TARGET=gh-pages 时构建 GitHub Pages 项目页，
// 站点挂在子路径 /gzrobotics 下（正式站仍为根路径）。
const ghPages = process.env.DEPLOY_TARGET === 'gh-pages';

export default defineConfig({
  site: ghPages ? 'https://loonglee2025.github.io' : 'https://gzrobotics.org',
  base: ghPages ? '/gzrobotics' : '/',
  // 中英双语：中文为默认语言且不带前缀（/about），英文在 /en 下（/en/about）
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
});
