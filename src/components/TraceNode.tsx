import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TraceNodeData } from '../lib/traceGraph';
import { styleForKind } from '../lib/traceGraph';

function TraceNodeComponent({ data, selected }: NodeProps) {
  const d = data as TraceNodeData;
  const style = styleForKind(d.kind);
  const isHttp = d.kind === 'http';
  const isToolQuery = d.kind === 'tool_query';
  const width = isHttp ? 288 : isToolQuery ? 260 : 228;
  const statusOk =
    d.status != null && d.status >= 200 && d.status < 300
      ? 'text-emerald-400'
      : d.status != null && d.status >= 400
        ? 'text-red-400'
        : 'text-slate-400';

  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 shadow-lg transition-shadow ${selected ? 'ring-2 ring-sky-400' : ''}`}
      style={{
        borderColor: style.border,
        background: style.bg,
        width,
        minHeight: isHttp ? 112 : isToolQuery ? 88 : 72,
      }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="l" className="!h-2 !w-2 !bg-slate-500" />
      <Handle type="source" position={Position.Right} id="r" className="!h-2 !w-2 !bg-slate-500" />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{d.kind}</p>
      {isHttp && d.hitReason ? (
        <p
          className="mt-0.5 line-clamp-2 text-[10px] font-medium leading-snug text-violet-200"
          title={d.hitDetail ?? d.hitReason}
        >
          Why: {d.hitReason}
        </p>
      ) : null}
      <p className="text-sm font-semibold text-slate-100" title={d.title}>
        {d.title}
      </p>
      {isToolQuery && d.queryParams?.length ? (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-cyan-400/90">
            Paramètres
          </p>
          {d.queryParams.slice(0, 5).map((line, i) => (
            <p
              key={i}
              className="font-mono text-[9px] leading-tight text-slate-300"
              title={line}
            >
              {line}
            </p>
          ))}
          {d.queryParams.length > 5 ? (
            <p className="text-[9px] text-slate-500">+{d.queryParams.length - 5} more</p>
          ) : null}
        </div>
      ) : null}
      {d.kind === 'tool' ? (
        <p className="mt-0.5 text-[11px] font-medium text-amber-200/90" title={d.subtitle}>
          {d.toolName ? `tool: ${d.toolName}` : d.subtitle}
        </p>
      ) : isToolQuery && !d.queryParams?.length && d.subtitle ? (
        <p className="mt-0.5 text-[10px] text-slate-400" title={d.subtitle}>
          {d.subtitle}
        </p>
      ) : !isToolQuery && d.subtitle ? (
        <p className="text-[11px] font-medium text-emerald-200/90" title={d.subtitle}>
          {d.subtitle}
        </p>
      ) : null}
      {isHttp ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {d.dataType ? (
            <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-emerald-300">
              {d.dataType}
            </span>
          ) : null}
          {d.project ? (
            <span className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[9px] text-sky-300">
              {d.project}
            </span>
          ) : null}
          {d.toolName ? (
            <span className="rounded bg-amber-950/80 px-1.5 py-0.5 font-mono text-[9px] text-amber-200">
              {d.toolName}
            </span>
          ) : null}
        </div>
      ) : null}
      {isHttp && d.argsSummary ? (
        <p className="mt-1 line-clamp-2 text-[9px] leading-tight text-slate-400" title={d.argsSummary}>
          {d.argsSummary}
        </p>
      ) : null}
      {isHttp && d.endpointPath ? (
        <p
          className="mt-1 line-clamp-2 font-mono text-[9px] leading-tight text-slate-500"
          title={d.url ?? d.endpointPath}
        >
          {d.endpointPath}
        </p>
      ) : null}
      {isHttp ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
          {d.status != null ? (
            <span className={`rounded px-1 font-mono font-bold ${statusOk}`}>{d.status}</span>
          ) : null}
          {d.latency_ms != null ? (
            <span className="text-slate-400">{d.latency_ms} ms</span>
          ) : null}
          {d.entity && d.entity !== d.project ? (
            <span className="text-slate-500">entity: {d.entity}</span>
          ) : null}
          {d.filtersCount ? (
            <span className="text-slate-500">{d.filtersCount} filter(s)</span>
          ) : null}
        </div>
      ) : null}
      {d.badge ? (
        <span className="mt-1 inline-block rounded bg-slate-900/80 px-1.5 text-[9px] text-slate-300">
          {d.badge}
        </span>
      ) : null}
    </div>
  );
}

export const TraceNode = memo(TraceNodeComponent);
