import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ParsedEndpoint } from '../lib/summarize';

type Props = {
  endpoints: ParsedEndpoint[];
};

function statusClass(status: number | null): string {
  if (status == null) {
    return 'text-slate-400';
  }
  if (status >= 200 && status < 300) {
    return 'text-emerald-400';
  }
  if (status >= 400) {
    return 'text-red-400';
  }
  return 'text-amber-400';
}

export function EndpointTable({ endpoints }: Props) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [copied, setCopied] = useState<string | null>(null);

  const projects = useMemo(
    () => [...new Set(endpoints.map((e) => e.project).filter(Boolean))] as string[],
    [endpoints],
  );
  const actions = useMemo(
    () => [...new Set(endpoints.map((e) => e.action).filter(Boolean))] as string[],
    [endpoints],
  );

  const filtered = useMemo(() => {
    return endpoints.filter((e) => {
      if (projectFilter !== 'all' && e.project !== projectFilter) {
        return false;
      }
      if (actionFilter !== 'all' && e.action !== actionFilter) {
        return false;
      }
      return true;
    });
  }, [endpoints, projectFilter, actionFilter]);

  if (!endpoints.length) {
    return null;
  }

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-950/40 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Endpoints hit ({filtered.length})
      </h3>
      {(projects.length > 1 || actions.length > 1) && (
        <div className="mb-3 flex flex-wrap gap-2">
          {projects.length > 1 ? (
            <select
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : null}
          {actions.length > 1 ? (
            <select
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      )}
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-700 text-slate-500">
              <th className="py-2 pr-2">Why</th>
              <th className="py-2 pr-2">Method</th>
              <th className="py-2 pr-2">Project</th>
              <th className="py-2 pr-2">Action</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Latency</th>
              <th className="py-2">URL</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={i} className="border-b border-slate-800/80 align-top">
                <td className="max-w-[11rem] py-2 pr-2 text-violet-200" title={e.purposeDetail}>
                  {e.purposeShort ?? '—'}
                </td>
                <td className="py-2 pr-2 font-mono text-sky-300">{e.method}</td>
                <td className="py-2 pr-2 text-slate-300">{e.project ?? '—'}</td>
                <td className="py-2 pr-2 text-slate-300">{e.action ?? '—'}</td>
                <td className={`py-2 pr-2 font-mono ${statusClass(e.status)}`}>
                  {e.status ?? '—'}
                  {e.hitCount > 1 ? (
                    <span className="ml-1 text-slate-500">×{e.hitCount}</span>
                  ) : null}
                </td>
                <td className="py-2 pr-2 text-slate-400">
                  {e.latency_ms != null ? `${e.latency_ms} ms` : '—'}
                </td>
                <td className="py-2">
                  <div className="flex items-start gap-1">
                    <code className="block max-w-md break-all font-mono text-[10px] text-slate-400">
                      {e.url}
                    </code>
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                      onClick={() => void copyUrl(e.url)}
                      title="Copy URL"
                    >
                      {copied === e.url ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
