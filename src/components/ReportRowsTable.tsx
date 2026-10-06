import { useMemo, useState } from 'react';

const PAGE = 50;

type Props = {
  rows?: Record<string, unknown>[];
};

export function ReportRowsTable({ rows }: Props) {
  const [showAll, setShowAll] = useState(false);

  const { columns, visible, total } = useMemo(() => {
    if (!rows?.length) {
      return { columns: [] as string[], visible: [] as Record<string, unknown>[], total: 0 };
    }
    const keys = new Set<string>();
    for (const r of rows.slice(0, 20)) {
      Object.keys(r).forEach((k) => keys.add(k));
    }
    const columns = [...keys];
    const limit = showAll ? rows.length : Math.min(PAGE, rows.length);
    return { columns, visible: rows.slice(0, limit), total: rows.length };
  }, [rows, showAll]);

  if (!rows?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <h4 className="mb-2 text-xs font-semibold text-slate-300">
        reportRows ({total})
      </h4>
      <div className="max-h-64 overflow-auto">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500">
              {columns.map((c) => (
                <th key={c} className="px-2 py-1 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i} className="border-b border-slate-800/80">
                {columns.map((c) => (
                  <td key={c} className="max-w-[200px] truncate px-2 py-1 text-slate-300">
                    {formatCell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > PAGE && !showAll ? (
        <button
          type="button"
          className="mt-2 text-xs text-sky-400 hover:underline"
          onClick={() => setShowAll(true)}
        >
          Show all {total} rows
        </button>
      ) : null}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) {
    return '';
  }
  if (typeof v === 'object') {
    return JSON.stringify(v);
  }
  return String(v);
}
