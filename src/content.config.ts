import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 周报聚合内容集合（M2）。
 * 内容由 scripts/sync-weekly.mjs 生成，不要手工编辑 src/content/weekly/ 下的文件
 * ——下次同步会按源仓库原文覆盖。
 */
const weekly = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/weekly' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    source: z.string(),
    sourceLabel: z.string(),
    sourceLabelEn: z.string().optional(),
    repo: z.string(),
    sourcePath: z.string(),
    sourceUrl: z.string(),
    summary: z.string().optional(),
  }),
});

export const collections = { weekly };
