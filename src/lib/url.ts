// 统一处理部署基路径：
// - 正式站（gzrobotics.org）→ base = '/'，内部链接为 /about
// - GitHub Pages 项目页 → base = '/gzrobotics'，内部链接为 /gzrobotics/about
// 页面里一律用 url('/about') 生成 href，避免硬编码绝对路径在子路径部署下 404。
const rawBase = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');

export function url(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${rawBase}${p}`;
}

export const basePath = rawBase;
