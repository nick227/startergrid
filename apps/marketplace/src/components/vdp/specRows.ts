export type SpecRow = { label: string; value: string };

export function specRows(entries: Array<[string, string | number | null | undefined]>): SpecRow[] {
  return entries
    .filter(([, value]) => value != null && value !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}

export function hasSpecRows(rows: SpecRow[]): boolean {
  return rows.length > 0;
}
