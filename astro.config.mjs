// @ts-check
import { defineConfig } from 'astro/config';

// 站点正式域名（拍板项 1）：https://rosgz.org
// 部署到 Cloudflare Pages / GitHub Pages 时保持 site 一致，
// 用于生成 sitemap、canonical 与 og:url。
export default defineConfig({
  site: 'https://rosgz.org',
  trailingSlash: 'ignore',
  build: {
    format: 'directory',
  },
  devToolbar: {
    enabled: false,
  },
});
