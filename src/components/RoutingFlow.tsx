import { ArrowRight, User, Route, Wrench, Globe } from 'lucide-react';
import type { TurnSummary } from '../lib/summarize';

type Props = {
  summary: TurnSummary & { userQuestion?: string };
};

export function RoutingFlow({ summary }: Props) {
  const route = summary.routing[0];
  if (!route && !summary.tools.length && summary.endpointCount === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-violet-800/50 bg-violet-950/20 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-300">
        Agent routing
      </h3>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-slate-300">
          <User className="h-3.5 w-3.5" />
          {summary.userQuestion ? summary.userQuestion.slice(0, 60) : 'User message'}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500" />
        {route ? (
          <span className="inline-flex items-center gap-1 rounded-lg border-2 border-violet-500 bg-violet-950/60 px-3 py-1.5 font-medium text-violet-100">
            <Route className="h-4 w-4" />
            {route.label}
            <span className="text-xs font-normal text-violet-300">({route.domain})</span>
          </span>
        ) : (
          <span className="text-slate-500">No routing recorded</span>
        )}
        {summary.tools.length ? (
          <>
            <ArrowRight className="h-4 w-4 text-slate-500" />
            <span className="inline-flex flex-wrap items-center gap-1">
              {summary.tools.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded bg-amber-950/50 px-2 py-0.5 text-xs text-amber-200"
                >
                  <Wrench className="h-3 w-3" />
                  {t}
                </span>
              ))}
            </span>
          </>
        ) : null}
        {summary.endpointCount > 0 ? (
          <>
            <ArrowRight className="h-4 w-4 text-slate-500" />
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-2 py-1 text-emerald-200">
              <Globe className="h-3.5 w-3.5" />
              {summary.endpointCount} ERP call{summary.endpointCount !== 1 ? 's' : ''}
            </span>
          </>
        ) : null}
      </div>
    </section>
  );
}
