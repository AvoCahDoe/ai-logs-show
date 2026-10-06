import { useState } from 'react';
import type { TimelineStep } from '../lib/types';
import { inferEndpointPurpose } from '../lib/endpointPurpose';

type Props = {
  step: TimelineStep;
  latMax: number;
};

export function HttpStep({ step, latMax }: Props) {
  const [expanded, setExpanded] = useState(false);
  const purpose =
    step.url != null
      ? inferEndpointPurpose(step.method ?? 'GET', step.url, { payload: step.payload })
      : null;
  const status = step.status;
  const statusClass =
    status == null
      ? 'text-slate-400'
      : status >= 200 && status < 300
        ? 'text-emerald-400'
        : status >= 400
          ? 'text-red-400'
          : 'text-amber-400';
  const pct =
    typeof step.latency_ms === 'number' ? Math.min(100, (step.latency_ms / latMax) * 100) : 0;

  return (
    <div className="mt-2 space-y-2">
      {purpose ? (
        <p className="text-[11px] text-violet-200" title={purpose.detail}>
          <span className="font-semibold text-violet-400">Why: </span>
          {purpose.short}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {step.method ? (
          <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono font-semibold text-sky-300">
            {step.method}
          </span>
        ) : null}
        {status != null ? (
          <span className={`font-mono font-semibold ${statusClass}`}>{status}</span>
        ) : null}
        {step.latency_ms != null ? (
          <span className="text-slate-400">{step.latency_ms} ms</span>
        ) : null}
      </div>
      {step.url ? (
        <button
          type="button"
          className="block w-full text-left font-mono text-[11px] text-slate-400 hover:text-sky-300"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? step.url : step.title}
        </button>
      ) : null}
      {step.latency_ms != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-600/80"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
