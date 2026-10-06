import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import type { ReportChartSpec } from '../lib/summarize';

type Props = {
  spec: ReportChartSpec;
};

export function ReportChart({ spec }: Props) {
  const useLine = spec.points.length > 15;

  return (
    <section className="rounded-lg border border-sky-800/40 bg-sky-950/10 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-300">
        Answer data — {spec.yLabel} by {spec.xLabel}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {useLine ? (
            <LineChart data={spec.points} margin={{ bottom: 60, left: 8, right: 8 }}>
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={9}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Line type="monotone" dataKey="value" stroke="#38bdf8" dot={false} strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={spec.points} margin={{ bottom: 60, left: 8, right: 8 }}>
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={9}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
