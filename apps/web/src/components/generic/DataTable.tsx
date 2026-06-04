import { useState, Fragment } from 'react';
import type { ReactNode } from 'react';
import { Table } from '../ui/Table.tsx';
import { Skeleton } from '../ui/Skeleton.tsx';

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  headerClass?: string;
  cellClass?: string;
};

type Props<T extends { id: string }> = {
  columns: Column<T>[];
  rows: T[];
  selectable?: boolean;
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleAll?: () => void;
  allSelected?: boolean;
  expandContent?: (row: T) => ReactNode | null;
  rowClassName?: (row: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns, rows, selectable, selected, onToggle, onToggleAll, allSelected,
  expandContent, rowClassName, loading, emptyState,
}: Props<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded(e => {
      const n = new Set(e);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (loading) return <Skeleton rows={6} />;
  if (!rows.length) return <>{emptyState}</>;

  const colSpan = columns.length + (selectable ? 1 : 0) + (expandContent ? 1 : 0);

  return (
    <Table>
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50">
          {selectable && (
            <th className="pl-4 pr-2 py-2.5">
              <input
                type="checkbox"
                checked={allSelected ?? false}
                onChange={onToggleAll}
                className="w-3.5 h-3.5 accent-blue-600"
              />
            </th>
          )}
          {columns.map(col => (
            <th
              key={col.key}
              className={`px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.headerClass ?? ''}`}
            >
              {col.label}
            </th>
          ))}
          {expandContent && <th className="pr-4 py-2.5 w-6" />}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const isExpanded = expanded.has(row.id);
          const expandNode = expandContent ? expandContent(row) : null;
          const rowBg = rowClassName ? rowClassName(row) : '';

          return (
            <Fragment key={row.id}>
              <tr className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${rowBg}`}>
                {selectable && (
                  <td className="pl-4 pr-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected?.has(row.id) ?? false}
                      onChange={() => onToggle?.(row.id)}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className={`px-3 py-2.5 ${col.cellClass ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
                {expandContent && (
                  <td className="pr-4 py-2.5">
                    {expandNode !== null && (
                      <button
                        onClick={() => toggleExpand(row.id)}
                        className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
              {isExpanded && expandNode && (
                <tr className="bg-slate-50 border-b border-slate-100">
                  <td colSpan={colSpan} className="pl-12 pr-4 py-2">
                    {expandNode}
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </Table>
  );
}
