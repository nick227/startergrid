const CATEGORY_LABELS: Record<string, string> = {
  app: 'Application',
  connections: 'Connections',
  dealerships: 'Dealerships',
  industry: 'Industry',
  inventory: 'Inventory',
  law: 'Compliance',
  platforms: 'Platforms',
  processes: 'Processes',
  troubleshooting: 'Troubleshooting',
};

export function docCategoryKey(docId: string): string {
  return docId.split('/')[0] ?? 'reference';
}

export function docCategoryLabel(docId: string): string {
  const segment = docCategoryKey(docId);
  return CATEGORY_LABELS[segment] ?? 'Reference';
}

export function listCategoryKeys(): string[] {
  return Object.keys(CATEGORY_LABELS).sort((a, b) =>
    CATEGORY_LABELS[a]!.localeCompare(CATEGORY_LABELS[b]!)
  );
}
