import { useMemo } from 'react';
import {
  Route,
  Wrench,
  Database,
  Globe,
  AlertCircle,
  Activity,
} from 'lucide-react';
import type { ChatMessage } from '../lib/types';
import { buildTimeline, maxLatency } from '../lib/timeline';
import { formatTs } from '../lib/parsePayload';
import { HttpStep } from './HttpStep';
import { ToolQueryStep } from './ToolQueryStep';

type Props = {
  message: ChatMessage;
};

function kindIcon(kind: string) {
  switch (kind) {
    case 'routing':
      return Route;
    case 'tool':
      return Wrench;
    case 'tool_query':
      return Database;
    case 'http':
      return Globe;
    case 'error':
      return AlertCircle;
    default:
      return Activity;
  }
}

function kindColor(kind: string): string {
  switch (kind) {
    case 'routing':
      return 'border-violet-500 bg-violet-950/40';
    case 'tool':
      return 'border-amber-500 bg-amber-950/40';
    case 'tool_query':
      return 'border-cyan-500 bg-cyan-950/40';
    case 'http':
      return 'border-emerald-500 bg-emerald-950/40';
    case 'error':
      return 'border-red-500 bg-red-950/40';
    default:
      return 'border-slate-500 bg-slate-900/40';
  }
}

export function TraceTimeline({ message }: Props) {
  const steps = useMemo(() => buildTimeline(message), [message]);
  const latMax = useMemo(() => maxLatency(steps), [steps]);
  const sd = message.streamDebug;

  if (steps.length === 0 && !sd) {
    return <p className="text-sm text-slate-500">No network or streamDebug timeline for this turn.</p>;
  }

  return (
    <div className="space-y-3">
      {sd ? (
        <div className="flex flex-wrap gap-4 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
          {sd.toolsUsed?.length ? (
            <span>
              tools:{' '}
              <code className="text-slate-200">{sd.toolsUsed.join(', ')}</code>
            </span>
          ) : null}
          {sd.durationMs != null ? <span>duration: {sd.durationMs} ms</span> : null}
          {sd.events?.length ? <span>SSE events: {sd.events.length}</span> : null}
          <span>timeline steps: {steps.length}</span>
        </div>
      ) : null}

      <ol className="relative space-y-0 border-l border-slate-700 pl-6">
        {steps.map((step, i) => {
          const Icon = kindIcon(step.kind);
          const ts =
            step.payload && typeof step.payload === 'object' && 'ts' in step.payload
              ? formatTs(Number((step.payload as { ts?: number }).ts))
              : '';
          return (
            <li key={step.id} className="relative pb-4 last:pb-0">
              <span
                className={`absolute -left-[1.55rem] flex h-7 w-7 items-center justify-center rounded-full border-2 ${kindColor(step.kind)}`}
              >
                <Icon className="h-3.5 w-3.5 text-slate-200" />
              </span>
              <div className={`rounded-lg border p-3 ${kindColor(step.kind)}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {step.kind}
                      {step.source === 'sse' ? ' · SSE' : ''}
                    </span>
                    <p className="font-medium text-slate-100">{step.title}</p>
                    {step.subtitle ? (
                      <p className="text-xs text-slate-400">{step.subtitle}</p>
                    ) : null}
                  </div>
                  {ts ? <time className="font-mono text-[10px] text-slate-500">{ts}</time> : null}
                </div>
                {step.kind === 'http' ? (
                  <HttpStep step={step} latMax={latMax} />
                ) : null}
                {step.kind === 'tool_query' ? <ToolQueryStep step={step} /> : null}
                {step.kind !== 'http' && step.kind !== 'tool_query' && step.payload ? (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer text-slate-500">Details</summary>
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-400">
                      {JSON.stringify(step.payload, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </div>
              {i < steps.length - 1 ? (
                <span className="absolute -left-6 top-7 h-full w-px bg-slate-700" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
