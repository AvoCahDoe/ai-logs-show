import type { TimelineStep } from '../lib/types';
import { parseToolQueryPayload } from '../lib/toolQueryParams';

type Props = {
  step: TimelineStep;
};

export function ToolQueryStep({ step }: Props) {
  const parsed = parseToolQueryPayload(step.payload);
  const payload = step.payload as Record<string, unknown> | undefined;

  if (!parsed) {
    return (
      <p className="mt-2 text-xs text-slate-500">
        No query parameters in trace — need <code className="text-slate-400">tool_query</code> in{' '}
        <code className="text-slate-400">network[]</code> (Gamma call log).
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-2 text-xs">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border border-cyan-900/50 bg-cyan-950/20 px-2 py-1.5">
        <dt className="text-slate-500">tool</dt>
        <dd className="font-mono text-cyan-100">{parsed.tool}</dd>
        <dt className="text-slate-500">entity</dt>
        <dd className="font-mono text-slate-200">{parsed.entity || '—'}</dd>
        {parsed.limit != null ? (
          <>
            <dt className="text-slate-500">limit</dt>
            <dd className="font-mono text-slate-200">{parsed.limit}</dd>
          </>
        ) : null}
        {parsed.mode ? (
          <>
            <dt className="text-slate-500">mode</dt>
            <dd className="font-mono text-slate-200">{parsed.mode}</dd>
          </>
        ) : null}
      </dl>

      <div>
        <p className="mb-1 font-semibold text-slate-400">Paramètres · filters_applied</p>
        {parsed.filters.length === 0 ? (
          <p className="text-slate-500">(none)</p>
        ) : (
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="text-slate-500">
                <th className="py-0.5 pr-2">field</th>
                <th className="py-0.5 pr-2">op</th>
                <th className="py-0.5">value</th>
              </tr>
            </thead>
            <tbody>
              {parsed.filters.map((f, i) => (
                <tr key={i} className="border-t border-slate-800 font-mono text-slate-300">
                  <td className="py-0.5 pr-2 text-sky-300">{f.field}</td>
                  <td className="py-0.5 pr-2 text-amber-200/90">{f.operator}</td>
                  <td className="py-0.5 break-all text-slate-400">{f.value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {parsed.having.length > 0 ? (
        <div>
          <p className="mb-1 font-semibold text-slate-400">having_applied</p>
          <table className="w-full text-left text-[10px]">
            <tbody>
              {parsed.having.map((f, i) => (
                <tr key={i} className="border-t border-slate-800 font-mono text-slate-300">
                  <td className="py-0.5 pr-2 text-sky-300">{f.field}</td>
                  <td className="py-0.5 pr-2">{f.operator}</td>
                  <td className="py-0.5 break-all">{f.value || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {payload ? (
        <details className="text-slate-500">
          <summary className="cursor-pointer">Raw payload</summary>
          <pre className="mt-1 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[10px] text-slate-400">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
