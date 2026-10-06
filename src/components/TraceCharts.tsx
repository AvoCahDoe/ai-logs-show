import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import type { TurnSummary } from '../lib/summarize';

const STATUS_COLORS: Record<string, string> = {
  '2xx': '#34d399',
  '4xx': '#f87171',
  '5xx': '#fb923c',
  other: '#94a3b8',
};

const TOOL_COLOR = '#fbbf24';

type Props = {
  summary: TurnSummary;
};

export function TraceCharts({ summary }: Props) {
  const latencyData = summary.httpSteps.map((h) => ({
    name: h.label.length > 28 ? h.label.slice(0, 26) + '…' : h.label,
    ms: h.latency_ms,
    full: h.label,
  }));

  const statusData = summary.statusMix.filter((s) => s.count > 0);
  const toolData = summary.tools.map((t) => ({ name: t, count: 1 }));

  if (!latencyData.length && !statusData.length && !toolData.length) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Debug charts
      </h3>
      <div className="grid gap-6 lg:grid-cols-2">
        {latencyData.length ? (
          <div className="h-56">
            <p className="mb-2 text-xs text-slate-500">Latency by endpoint (ms)</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} />
                <YAxis type="category" dataKey="name" width={100} stroke="#64748b" fontSize={9} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [`${v} ms`, 'Latency']}
                />
                <Bar dataKey="ms" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {statusData.length ? (
          <div className="h-56">
            <p className="mb-2 text-xs text-slate-500">HTTP status mix</p>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.label} fill={STATUS_COLORS[entry.label] ?? STATUS_COLORS.other} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}

        {toolData.length > 0 && toolData.length <= 8 ? (
          <div className="h-56 lg:col-span-2">
            <p className="mb-2 text-xs text-slate-500">Tools invoked</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toolData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Bar dataKey="count" fill={TOOL_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </section>
  );
}
