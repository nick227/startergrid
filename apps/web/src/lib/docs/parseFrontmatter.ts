import type { DocFrontmatter } from './types.ts';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const FRONTMATTER_KEYS = new Set(['title', 'summary', 'keywords', 'updated']);

export function parseFrontmatter(raw: string): { frontmatter: DocFrontmatter; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const frontmatter: DocFrontmatter = {};
  for (const line of match[1]!.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    if (!FRONTMATTER_KEYS.has(key)) continue;
    const value = line.slice(idx + 1).trim();
    if (key === 'title') frontmatter.title = value;
    if (key === 'summary') frontmatter.summary = value;
    if (key === 'keywords') frontmatter.keywords = value;
    if (key === 'updated') frontmatter.updated = value;
  }

  return { frontmatter, body: match[2]!.trim() };
}
