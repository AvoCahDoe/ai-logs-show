import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ChatMessage } from '../lib/types';
import { buildTraceGraph, type TraceNodeData } from '../lib/traceGraph';
import { TraceNode } from './TraceNode';

const nodeTypes = { traceNode: TraceNode };

type Props = {
  message: ChatMessage;
  userQuestion?: string;
};

export function TraceGraphMap({ message, userQuestion }: Props) {
  const built = useMemo(
    () => buildTraceGraph(message, userQuestion),
    [message, userQuestion],
  );

  const [selected, setSelected] = useState<TraceNodeData | null>(null);

  const httpCount = built.nodes.filter((n) => n.data.kind === 'http').length;
  const graphKey = `${String(message.createdAt)}-${built.nodes.length}-${httpCount}`;

  if (built.nodes.length <= 1) {
    return (
      <p className="text-sm text-slate-500">
        Not enough trace data to draw a run graph — need routing, tools, or network steps.
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-slate-600 bg-slate-950/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          Run graph
        </h3>
        <span className="text-[10px] text-slate-500">
          {httpCount} endpoint node{httpCount !== 1 ? 's' : ''} · “Why” = inferred Gamma step · click for detail
        </span>
      </div>
      <div className={`w-full ${httpCount > 4 ? 'h-[560px]' : 'h-[480px]'}`}>
        <ReactFlow
          key={graphKey}
          defaultNodes={built.nodes}
          defaultEdges={built.edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelected(node.data as TraceNodeData)}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.08}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background gap={16} color="#334155" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const kind = (n.data as TraceNodeData)?.kind ?? 'meta';
              const map: Record<string, string> = {
                routing: '#a78bfa',
                tool: '#fbbf24',
                tool_query: '#22d3ee',
                http: '#34d399',
                user: '#c4b5fd',
                response: '#38bdf8',
              };
              return map[kind] ?? '#64748b';
            }}
            maskColor="rgb(15 20 25 / 0.85)"
          />
        </ReactFlow>
      </div>
      {selected ? (
        <div className="border-t border-slate-700 px-4 py-3 text-xs">
          <p className="font-semibold text-slate-200">
            {selected.kind}: {selected.title}
          </p>
          {selected.hitReason ? (
            <p className="mt-1 rounded-md border border-violet-900/60 bg-violet-950/40 px-2 py-1.5 text-[11px] text-violet-100">
              <span className="font-semibold text-violet-300">Why: </span>
              {selected.hitReason}
              {selected.hitDetail && selected.hitDetail !== selected.hitReason ? (
                <span className="mt-1 block text-slate-400">{selected.hitDetail}</span>
              ) : null}
            </p>
          ) : null}
          {selected.kind === 'tool_query' && selected.queryFilters?.length ? (
            <div className="mt-2">
              <p className="mb-1 font-semibold text-cyan-300">Paramètres (filters_applied)</p>
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-1 pr-2">field</th>
                    <th className="py-1 pr-2">operator</th>
                    <th className="py-1">value</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.queryFilters.map((f, i) => (
                    <tr key={i} className="border-t border-slate-800 font-mono">
                      <td className="py-1 pr-2 text-sky-300">{f.field}</td>
                      <td className="py-1 pr-2 text-amber-200">{f.operator}</td>
                      <td className="py-1 break-all text-slate-400">{f.value || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {selected.kind === 'tool_query' && selected.queryParams?.length ? (
            <ul className="mt-2 list-inside list-disc text-[10px] text-slate-400">
              {selected.queryParams.map((line, i) => (
                <li key={i} className="font-mono">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}
          {selected.project ||
          selected.dataType ||
          selected.action ||
          selected.toolName ||
          selected.entity ? (
            <dl className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
              {selected.project ? (
                <div>
                  <dt className="text-slate-500">project</dt>
                  <dd className="font-mono text-slate-300">{selected.project}</dd>
                </div>
              ) : null}
              {selected.dataType ? (
                <div>
                  <dt className="text-slate-500">dataType</dt>
                  <dd className="font-mono font-semibold uppercase text-emerald-300">
                    {selected.dataType}
                  </dd>
                </div>
              ) : null}
              {selected.toolName ? (
                <div>
                  <dt className="text-slate-500">tool</dt>
                  <dd className="font-mono text-amber-200">{selected.toolName}</dd>
                </div>
              ) : null}
              {selected.action ? (
                <div>
                  <dt className="text-slate-500">action</dt>
                  <dd className="font-mono text-slate-300">{selected.action}</dd>
                </div>
              ) : null}
              {selected.entity ? (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">entity / query target</dt>
                  <dd className="font-mono text-slate-300">{selected.entity}</dd>
                </div>
              ) : null}
              {selected.argsSummary ? (
                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="text-slate-500">arguments</dt>
                  <dd className="font-mono text-slate-400">{selected.argsSummary}</dd>
                </div>
              ) : null}
              {selected.filtersCount ? (
                <div>
                  <dt className="text-slate-500">filters</dt>
                  <dd className="font-mono text-slate-300">{selected.filtersCount}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {selected.url ? (
            <p className="mt-2 break-all rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-400">
              {selected.url}
            </p>
          ) : null}
          {selected.payload ? (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-500">
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">
          Click a node for project, OBJECT/ADDRESS/… dataType, tool name, and query args
        </p>
      )}
    </section>
  );
}
