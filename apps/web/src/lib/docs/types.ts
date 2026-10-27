export const DOC_TYPES = ['feature', 'task', 'troubleshooting', 'reference'] as const;
export type DocType = typeof DOC_TYPES[number];
export type DocAudience = 'user' | 'staff' | 'developer';

export type DocFrontmatter = {
  visibility?: 'public';
  id?: string;
  feature?: string;
  type?: DocType;
  audience?: string;
  tags?: string;
  synonyms?: string;
  aliases?: string;
  related?: string;
  implementation?: string;
  title?: string;
  summary?: string;
  keywords?: string;
  updated?: string;
  advanced?: boolean;
};

export type ParsedDoc = {
  id: string;
  frontmatter: DocFrontmatter;
  body: string;
};

export type DocCatalogEntry = {
  feature: string;
  type: DocType;
  audience: string[];
  tags: string[];
  synonyms: string[];
  related: string[];
  implementation: string[];
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  updated?: string;
};
