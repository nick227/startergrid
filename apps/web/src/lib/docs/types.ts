export type DocFrontmatter = {
  title?: string;
  summary?: string;
  keywords?: string;
  updated?: string;
};

export type ParsedDoc = {
  id: string;
  frontmatter: DocFrontmatter;
  body: string;
};

export type DocCatalogEntry = {
  id: string;
  title: string;
  summary: string;
  categoryKey: string;
  category: string;
  keywords: string[];
  updated?: string;
};
