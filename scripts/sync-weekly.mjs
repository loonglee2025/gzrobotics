#!/usr/bin/env node
/**
 * 周报聚合同步脚本（M2）
 *
 * 作用：从周报源仓库拉取最近 N 期 Markdown，写入 Astro content collection
 *      （src/content/weekly/<sourceId>/<YYYY-MM-DD>.md），并生成索引
 *      src/data/weekly-index.json。
 *
 * 设计原则（见 docs/WEEKLY-AGGREGATION.md）：
 *   1. 抓取与构建解耦——构建只读本地 content，离线可构建；
 *      抓取失败时保留上一次内容，不阻塞构建。
 *   2. 单一真相源——源定义读 src/data/site.json 的 weeklyDigests。
 *   3. 幂等——内容未变化不重写文件，保持 git diff 干净。
 *
 * 用法：
 *   node scripts/sync-weekly.mjs            # 正常同步（失败降级，退出码 0）
 *   node scripts/sync-weekly.mjs --strict   # 任一源失败即退出码 1（CI 里用）
 *   GITHUB_TOKEN=xxx node scripts/sync-weekly.mjs
 */

import { mkdir, readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_JSON = path.join(ROOT, 'src/data/site.json');
const CONTENT_DIR = path.join(ROOT, 'src/content/weekly');
const INDEX_JSON = path.join(ROOT, 'src/data/weekly-index.json');

const STRICT = process.argv.includes('--strict');
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

function log(...args) {
  console.log(...args);
}

function apiHeaders() {
  const h = { 'User-Agent': 'rosgz-weekly-sync', Accept: 'application/vnd.github+json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

/** 列出仓库某个目录下的文件名（优先 GitHub API；无 token 时用 raw 不可行，只能靠 API） */
async function listDir(repoSlug, dir, branch) {
  const url = `https://api.github.com/repos/${repoSlug}/contents/${dir}?ref=${branch}`;
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) {
    throw new Error(`list ${repoSlug}/${dir}: HTTP ${res.status} ${res.statusText}`);
  }
  const items = await res.json();
  if (!Array.isArray(items)) throw new Error(`list ${repoSlug}/${dir}: unexpected payload`);
  return items.filter((it) => it.type === 'file').map((it) => it.name);
}

/** 取单篇 markdown 原文（走 raw，不消耗 API 配额） */
async function fetchRaw(repoSlug, branch, filePath) {
  const url = `https://raw.githubusercontent.com/${repoSlug}/${branch}/${filePath}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'rosgz-weekly-sync' } });
  if (!res.ok) throw new Error(`raw ${repoSlug}/${filePath}: HTTP ${res.status}`);
  return await res.text();
}

/** 从正文提取标题（首个 H1），并返回去掉该 H1 后的正文 */
function extractTitle(md) {
  const lines = md.split('\n');
  const idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (idx === -1) return { title: '', body: md };
  const title = lines[idx].replace(/^#\s+/, '').trim();
  const body = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join('\n');
  return { title, body };
}

/** 提取首段纯文本作为摘要 */
function extractSummary(md, maxLen = 140) {
  const cleaned = md
    .replace(/^#{1,6}\s+.*$/gm, '')
    .replace(/^\[(\d+)\]:.*$/gm, '')
    .replace(/^>.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 30);
  const first = cleaned[0] || '';
  return first.length > maxLen ? first.slice(0, maxLen).replace(/[，、]$/, '') + '…' : first;
}

/**
 * 把参考链接小节从 markdown 链接引用定义形式
 *   [1]: 标题 — https://example.com
 * 转成有序列表
 *   1. [标题](https://example.com)
 * 原因：`[N]: 标题 — URL` 不是合法的链接引用定义（缺少 `<url>` 位置），
 * 渲染时整段会退化成纯文本且不换行；转列表后每条独立成行、可点击。
 */
function normalizeReferences(md) {
  const lines = md.split('\n');
  const out = [];
  let inRefs = false;
  const re = /^\[(\d+)\]:\s*(.*?)\s+[—–-]\s+(https?:\/\/\S+)\s*$/;
  for (const line of lines) {
    if (/^#{2,6}\s*参考链接\s*$/.test(line.trim())) {
      inRefs = true;
      out.push(line);
      continue;
    }
    if (inRefs && /^#{2,6}\s+/.test(line)) {
      inRefs = false;
    }
    if (inRefs) {
      const m = line.match(re);
      if (m) {
        const [, n, title, url] = m;
        const safeTitle = title.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        out.push(`${n}. [${safeTitle}](${url})`);
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

function yamlString(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

async function readIfExists(p) {
  try {
    return await readFile(p, 'utf8');
  } catch {
    return null;
  }
}

async function syncSource(src) {
  const repoSlug = src.repo.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const branch = src.branch || 'main';
  const dir = src.dir;
  const maxItems = src.maxItems || 12;
  const pattern = new RegExp(src.filePattern || '^\\d{4}-\\d{2}-\\d{2}-weekly\\.md$');

  const names = (await listDir(repoSlug, dir, branch)).filter((n) => pattern.test(n)).sort();
  const picked = names.slice(-maxItems);
  if (picked.length === 0) throw new Error(`${repoSlug}/${dir}: no files matched ${pattern}`);

  const outDir = path.join(CONTENT_DIR, src.id);
  await mkdir(outDir, { recursive: true });

  const kept = new Set();
  const written = [];
  for (const name of picked) {
    const date = name.slice(0, 10);
    const target = path.join(outDir, `${date}.md`);
    kept.add(path.basename(target));

    const raw = await fetchRaw(repoSlug, branch, `${dir}/${name}`);
    const { title, body } = extractTitle(raw);
    const summary = extractSummary(body);
    const normalized = normalizeReferences(body);

    const fm = [
      '---',
      `title: ${yamlString(title || `${src.label} ${date}`)}`,
      `date: ${yamlString(date)}`,
      `source: ${yamlString(src.id)}`,
      `sourceLabel: ${yamlString(src.label)}`,
      `sourceLabelEn: ${yamlString(src.labelEn || src.label)}`,
      `repo: ${yamlString(src.repo)}`,
      `sourcePath: ${yamlString(`${dir}/${name}`)}`,
      `sourceUrl: ${yamlString(`${src.repo}/blob/${branch}/${dir}/${name}`)}`,
      `summary: ${yamlString(summary)}`,
      '---',
      '',
      normalized.trim() + '\n',
    ].join('\n');

    const prev = await readIfExists(target);
    if (prev !== fm) {
      await writeFile(target, fm, 'utf8');
      written.push(date);
    }
  }

  // 清理超出 maxItems 的旧文件
  const existing = await readdir(outDir);
  let removed = 0;
  for (const f of existing) {
    if (f.endsWith('.md') && !kept.has(f)) {
      await rm(path.join(outDir, f));
      removed++;
    }
  }

  const latest = picked[picked.length - 1].slice(0, 10);
  return {
    id: src.id,
    label: src.label,
    labelEn: src.labelEn || src.label,
    repo: src.repo,
    dir,
    branch,
    cadence: src.cadence,
    cadenceEn: src.cadenceEn || '',
    total: names.length,
    count: picked.length,
    latest,
    written: written.length,
    removed,
  };
}

async function main() {
  const site = JSON.parse(await readFile(SITE_JSON, 'utf8'));
  const sources = site.weeklyDigests || [];
  if (sources.length === 0) throw new Error('site.json: weeklyDigests is empty');
  if (!TOKEN) log('提示：未设置 GITHUB_TOKEN，GitHub API 匿名限速 60 次/小时，源较多时可能失败。');

  await mkdir(CONTENT_DIR, { recursive: true });

  const results = [];
  const errors = [];
  for (const src of sources) {
    try {
      const r = await syncSource(src);
      results.push(r);
      log(
        `✓ ${src.label.padEnd(14)} 最新 ${r.latest} | 入库 ${r.count} 期（源共 ${r.total} 期）` +
          ` | 更新 ${r.written} 清理 ${r.removed}`
      );
    } catch (err) {
      errors.push({ id: src.id, label: src.label, message: String(err.message || err) });
      log(`✗ ${src.label.padEnd(14)} 失败：${err.message || err}（保留上一次抓取的内容）`);
    }
  }

  const index = {
    syncedAt: new Date().toISOString(),
    sources: results,
    errors,
  };
  await writeFile(INDEX_JSON, JSON.stringify(index, null, 2) + '\n', 'utf8');
  log(`索引已写入 ${path.relative(ROOT, INDEX_JSON)}`);

  if (errors.length > 0 && STRICT) {
    log(`\n严格模式：${errors.length} 个源失败，退出码 1`);
    process.exit(1);
  }
  log('\n同步完成（失败的源已降级，构建不会中断）');
}

main().catch((err) => {
  console.error('同步脚本异常：', err);
  process.exit(STRICT ? 1 : 0);
});
