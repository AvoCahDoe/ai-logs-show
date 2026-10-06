import dagre from 'dagre';
import type { Edge, Node } from '@xyflow/react';
import type { ChatMessage } from './types';
import { buildTimeline } from './timeline';
import type { TimelineStep } from './types';
import { parseErpUrl } from './summarize';
import { inferEndpointPurpose } from './endpointPurpose';
import { parseToolQueryPayload } from './toolQueryParams';
import {
  orderedHttpCallsWithContext,
  toolsUsedForMessage,
  uniqueProjectsFromCalls,
  type HttpCallWithContext,
} from './httpTraceContext';

export type TraceNodeData = {
  kind: string;
  title: string;
  subtitle?: string;
  status?: number | null;
  latency_ms?: number | null;
  method?: string;
  url?: string;
  payload?: unknown;
  badge?: string;
  project?: string;
  dataType?: string;
  action?: string;
  endpointPath?: string;
  toolName?: string;
  entity?: string;
  argsSummary?: string;
  filtersCount?: number;
  hitReason?: string;
  hitDetail?: string;
  hitReasonId?: string;
  queryParams?: string[];
  queryFilters?: { field: string; operator: string; value: string }[];
  [key: string]: unknown;
};

const NODE_W_DEFAULT = 240;
const NODE_H_DEFAULT = 76;
const NODE_W_HTTP = 300;
const NODE_H_HTTP = 148;

const KIND_STYLES: Record<string, { border: string; bg: string }> = {
  turn: { border: '#64748b', bg: '#1e293b' },
  user: { border: '#a78bfa', bg: '#2e1065' },
  routing: { border: '#c084fc', bg: '#3b0764' },
  tool: { border: '#fbbf24', bg: '#422006' },
  tool_query: { border: '#22d3ee', bg: '#083344' },
  http: { border: '#34d399', bg: '#052e16' },
  error: { border: '#f87171', bg: '#450a0a' },
  response: { border: '#38bdf8', bg: '#0c4a6e' },
  meta: { border: '#94a3b8', bg: '#1e293b' },
};

export function styleForKind(kind: string): { border: string; bg: string } {
  return KIND_STYLES[kind] ?? KIND_STYLES.meta;
}

function enrichHttpCall(call: HttpCallWithContext, index: number): { id: string; data: TraceNodeData } {
  const parsed = parseErpUrl(call.url);
  const method = (call.method || 'GET').toUpperCase();
  const action = parsed.action ?? parsed.path.split('/').filter(Boolean).pop() ?? 'request';
  const title = `${method} ${action}`;
  const ctx = call.context;
  const project = parsed.project;
  const dataType = parsed.dataType;
  const entity = ctx.entity && ctx.entity !== project ? ctx.entity : ctx.entity;
  const argParts: string[] = [];
  if (dataType) {
    argParts.push(dataType);
  }
  if (project) {
    argParts.push(`project: ${project}`);
  }
  if (ctx.toolName) {
    argParts.push(`tool: ${ctx.toolName}`);
  }
  if (ctx.argsSummary) {
    argParts.push(ctx.argsSummary);
  } else if (entity && entity !== project) {
    argParts.push(`entity: ${entity}`);
  }

  const purpose = inferEndpointPurpose(method, call.url, {
    toolName: ctx.toolName,
    payload: call.payload,
  });

  return {
    id: `http-${index}-${method}-${parsed.project ?? 'erp'}-${action}`.replace(/[^a-zA-Z0-9-_]/g, '_'),
    data: {
      kind: 'http',
      title,
      subtitle: argParts.join(' · ') || parsed.path,
      method,
      url: call.url,
      status: call.status,
      latency_ms: call.latency_ms,
      project,
      dataType,
      action: parsed.action ?? action,
      endpointPath: parsed.path,
      payload: call.payload,
      toolName: ctx.toolName,
      entity,
      argsSummary: ctx.argsSummary,
      filtersCount: ctx.filtersCount,
      hitReason: purpose.short,
      hitDetail: purpose.detail,
      hitReasonId: purpose.id,
    },
  };
}

function enrichStepNode(step: TimelineStep, index: number): { id: string; data: TraceNodeData } {
  if (step.kind === 'http' && step.url) {
    return enrichHttpCall(
      {
        method: step.method ?? 'GET',
        url: step.url,
        status: step.status ?? null,
        latency_ms: step.latency_ms ?? null,
        payload: step.payload,
        context: {},
      },
      index,
    );
  }

  if (step.kind === 'tool_query') {
    const parsed = parseToolQueryPayload(step.payload);
    const p = step.payload as Record<string, unknown> | undefined;
    const toolName = parsed?.tool ?? (p?.tool != null ? String(p.tool) : step.title);
    const entity = parsed?.entity ?? (p?.entity != null ? String(p.entity) : step.subtitle);
    const filters = parsed?.filters ?? [];
    return {
      id: step.id || `step-${index}`,
      data: {
        kind: 'tool_query',
        title: toolName,
        subtitle: parsed?.filtersSummary ?? step.subtitle,
        toolName,
        entity,
        filtersCount: filters.length || undefined,
        queryParams: parsed?.paramLines,
        queryFilters: filters.map((f) => ({
          field: f.field,
          operator: f.operator,
          value: f.value,
        })),
        payload: step.payload,
      },
    };
  }

  if (step.kind === 'tool') {
    return {
      id: step.id || `step-${index}`,
      data: {
        kind: 'tool',
        title: step.title,
        subtitle: `tool · ${step.title}`,
        toolName: step.title,
        payload: step.payload,
      },
    };
  }

  return {
    id: step.id || `step-${index}`,
    data: {
      kind: step.kind,
      title: step.title,
      subtitle: step.subtitle,
      status: step.status,
      latency_ms: step.latency_ms,
      method: step.method,
      url: step.url,
      payload: step.payload,
    },
  };
}

function collapseNonHttp(steps: TimelineStep[]): TimelineStep[] {
  const out: TimelineStep[] = [];
  for (const s of steps) {
    if (s.kind === 'http') {
      continue;
    }
    const last = out[out.length - 1];
    if (s.kind === 'tool' && last?.kind === 'tool' && last.title === s.title) {
      continue;
    }
    if (s.kind === 'routing' && last?.kind === 'routing' && last.title === s.title) {
      continue;
    }
    out.push(s);
  }
  return out;
}

export function buildTraceGraph(
  message: ChatMessage,
  userQuestion?: string,
): { nodes: Node<TraceNodeData>[]; edges: Edge[] } {
  const timeline = buildTimeline(message);
  const nonHttp = collapseNonHttp(timeline);
  const httpCalls = orderedHttpCallsWithContext(message);
  const toolsUsed = toolsUsedForMessage(message);

  const chain: { id: string; data: TraceNodeData }[] = [];

  chain.push({
    id: 'start',
    data: {
      kind: 'turn',
      title: 'Agent turn',
      subtitle: message.streamDebug?.durationMs
        ? `${message.streamDebug.durationMs} ms total`
        : undefined,
    },
  });

  if (userQuestion?.trim()) {
    chain.push({
      id: 'user',
      data: {
        kind: 'user',
        title: 'User',
        subtitle: userQuestion.trim().slice(0, 100),
      },
    });
  }

  let stepIdx = 0;
  for (const step of nonHttp) {
    chain.push(enrichStepNode(step, stepIdx++));
  }

  if (chain.length <= 2 && message.routedDomain) {
    chain.push({
      id: 'routing-fallback',
      data: {
        kind: 'routing',
        title: message.routedLabel ?? message.routedDomain,
        subtitle: message.routedDomain,
      },
    });
  }

  if (toolsUsed.length > 0 && !nonHttp.some((s) => s.kind === 'tool')) {
    chain.push({
      id: 'tools-used',
      data: {
        kind: 'tool',
        title: toolsUsed.join(', '),
        subtitle: `tools used · ${toolsUsed.join(', ')}`,
        toolName: toolsUsed[0],
        badge: String(toolsUsed.length),
      },
    });
  }

  if (httpCalls.length > 0) {
    const projects = uniqueProjectsFromCalls(httpCalls, (url) => parseErpUrl(url).project);
    const dataTypes = [
      ...new Set(
        httpCalls.map((c) => parseErpUrl(c.url).dataType).filter(Boolean) as string[],
      ),
    ];
    chain.push({
      id: 'erp-label',
      data: {
        kind: 'meta',
        title: 'ERP endpoints',
        subtitle: [
          `${httpCalls.length} call${httpCalls.length !== 1 ? 's' : ''}`,
          projects.length ? `projects: ${projects.join(', ')}` : '',
          dataTypes.length ? `types: ${dataTypes.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        badge: String(httpCalls.length),
      },
    });
    httpCalls.forEach((call, i) => {
      chain.push(enrichHttpCall(call, i));
    });
  }

  if (message.text?.trim()) {
    chain.push({
      id: 'response',
      data: {
        kind: 'response',
        title: 'Assistant reply',
        subtitle: message.text.trim().slice(0, 80) + (message.text.length > 80 ? '…' : ''),
      },
    });
  }

  const nodes: Node<TraceNodeData>[] = chain.map((c) => ({
    id: c.id,
    type: 'traceNode',
    data: c.data,
    position: { x: 0, y: 0 },
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const target = chain[i + 1].data;
    const isHttp = target.kind === 'http';
    const label =
      isHttp && target.method && target.latency_ms != null
        ? `${target.method} · ${target.latency_ms} ms`
        : isHttp && target.method
          ? target.method
          : undefined;

    edges.push({
      id: `e-${chain[i].id}-${chain[i + 1].id}`,
      source: chain[i].id,
      target: chain[i + 1].id,
      animated: isHttp,
      label,
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      style: { stroke: isHttp ? '#10b981' : '#475569', strokeWidth: isHttp ? 2.5 : 2 },
    });
  }

  return layoutWithDagre(nodes, edges);
}

function nodeSize(data: TraceNodeData): { width: number; height: number } {
  if (data.kind === 'http') {
    return { width: NODE_W_HTTP, height: NODE_H_HTTP };
  }
  if (data.kind === 'tool_query') {
    return { width: NODE_W_DEFAULT, height: Math.min(200, 96 + (data.queryParams?.length ?? 0) * 14) };
  }
  return { width: NODE_W_DEFAULT, height: NODE_H_DEFAULT };
}

function layoutWithDagre(
  nodes: Node<TraceNodeData>[],
  edges: Edge[],
): { nodes: Node<TraceNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  const httpCount = nodes.filter((n) => n.data.kind === 'http').length;
  g.setGraph({
    rankdir: httpCount > 2 || nodes.length > 10 ? 'TB' : 'LR',
    nodesep: 28,
    ranksep: httpCount > 2 ? 56 : 80,
    marginx: 32,
    marginy: 32,
  });

  for (const node of nodes) {
    const { width, height } = nodeSize(node.data);
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const { width, height } = nodeSize(node.data);
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    };
  });

  return { nodes: laidOut, edges };
}

export function graphNodeCount(message: ChatMessage): number {
  return buildTraceGraph(message).nodes.length;
}
