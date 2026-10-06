import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ConversationSummary } from '../lib/summarize';

const COLORS = ['#8b5cf6', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'];

type Props = {
  summary: ConversationSummary;
};

export function ConversationStats({ summary }: Props) {
  const hasDomains = summary.domainCounts.length > 0;
  const hasHttp = summary.totalHttpCalls > 0;

  if (!hasDomains && !hasHttp) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-start gap-4 border-t border-slate-700 pt-3">
      {hasDomains ? (
        <div className="flex flex-wrap gap-2">
          {summary.domainCounts.map((d) => (
            <span
              key={d.domain}
              className="rounded-full border border-violet-700/50 bg-violet-950/40 px-2.5 py-0.5 text-xs text-violet-200"
            >
              {d.label} ×{d.count}
            </span>
          ))}
        </div>
      ) : null}
      {hasHttp ? (
        <span className="text-xs text-slate-400">
          {summary.uniqueEndpointUrls} unique endpoints · {summary.totalHttpCalls} HTTP calls ·{' '}
          {Math.round(summary.totalLatencyMs)} ms total latency
        </span>
      ) : null}
      {summary.domainCounts.length > 1 ? (
        <div className="h-24 w-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={summary.domainCounts}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={36}
              >
                {summary.domainCounts.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
