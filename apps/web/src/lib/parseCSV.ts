export type ParsedCSV = { headers: string[]; rows: Record<string, string>[] };

export function parseCSV(text: string): ParsedCSV {
  const cleaned = text.replace(/^﻿/, '').trim();
  if (!cleaned) return { headers: [], rows: [] };

  const lines = cleaned.split(/\r?\n/);
  if (!lines.length) return { headers: [], rows: [] };

  const firstLine = lines[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delim = tabCount >= commaCount ? '\t' : ',';

  function parseLine(line: string): string[] {
    if (delim === '\t') return line.split('\t').map(s => s.trim());
    const fields: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        i++;
        let val = '';
        while (i < line.length) {
          if (line[i] === '"') {
            i++;
            if (line[i] === '"') { val += '"'; i++; }
            else break;
          } else { val += line[i++]; }
        }
        fields.push(val.trim());
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i).trim()); break; }
        else { fields.push(line.slice(i, end).trim()); i = end + 1; }
      }
    }
    return fields;
  }

  const headers = parseLine(firstLine);
  const rows: Record<string, string>[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line?.trim()) continue;
    const vals = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) row[h] = vals[i] ?? ''; });
    if (Object.values(row).every(v => !v)) continue;
    rows.push(row);
  }
  return { headers, rows };
}
