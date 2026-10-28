// 双语路由工具：中文（默认，无前缀）与英文（/en 前缀）
// 与 url.ts 的 basePath 组合，兼容 GitHub Pages 子路径预览。
import { basePath } from './url';

export type Lang = 'zh' | 'en';

export const locales: Lang[] = ['zh', 'en'];

/** 去掉部署基路径后的路径，例如 /gzrobotics/en/about → /en/about */
export function stripBase(fullPathname: string): string {
  const noSlash = fullPathname.replace(/\/+$/, '') || '/';
  if (basePath && noSlash.startsWith(basePath)) {
    return noSlash.slice(basePath.length) || '/';
  }
  return noSlash;
}

/** 判断语言：/en 或 /en/** 为英文，其余为中文 */
export function langOf(pathNoBase: string): Lang {
  return pathNoBase === '/en' || pathNoBase.startsWith('/en/') ? 'en' : 'zh';
}

/** 去掉语言前缀，得到与语言无关的页面路径（/en/about → /about） */
export function withoutLocale(pathNoBase: string): string {
  if (pathNoBase === '/en') return '/';
  return pathNoBase.startsWith('/en/') ? pathNoBase.slice(3) : pathNoBase;
}

/** 生成指定语言的路径（不含 base），用于 hreflang 与语言切换 */
export function localePath(lang: Lang, plainPath: string): string {
  const p = plainPath.startsWith('/') ? plainPath : `/${plainPath}`;
  if (lang === 'zh') return p;
  return p === '/' ? '/en' : `/en${p}`;
}
