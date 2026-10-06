import type { TurnSummary } from '../lib/summarize';

type Props = {
  summary: TurnSummary;
  compact?: boolean;
};

export function TurnSummaryChips({ summary, compact }: Props) {
  const route = summary.routing[0];
  if (
    !route &&
    !summary.tools.length &&
    summary.endpointCount === 0 &&
    summary.worstLatencyMs == null
  ) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2' : ''}`}>
      {route ? (
        <span className="rounded bg-violet-900/50 px-2 py-0.5 text-[10px] text-violet-200">
          {route.label}
        </span>
      ) : null}
      {summary.tools.slice(0, compact ? 2 : 5).map((t) => (
        <span key={t} className="rounded bg-amber-900/40 px-2 py-0.5 text-[10px] text-amber-200">
          {t}
        </span>
      ))}
      {summary.tools.length > (compact ? 2 : 5) ? (
        <span className="text-[10px] text-slate-500">+{summary.tools.length - (compact ? 2 : 5)}</span>
      ) : null}
      {summary.endpointCount > 0 ? (
        <span className="rounded bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-200">
          {summary.endpointCount} calls
        </span>
      ) : null}
      {summary.worstLatencyMs != null ? (
        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
          max {summary.worstLatencyMs} ms
        </span>
      ) : null}
    </div>
  );
}
