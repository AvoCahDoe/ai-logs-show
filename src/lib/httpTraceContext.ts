import type { ChatMessage, NetworkStep, StreamEvent } from './types';
import { buildTimeline } from './timeline';
import { parseToolQueryPayload } from './toolQueryParams';

export type HttpCallContext = {
  toolName?: string;
  entity?: string;
  filtersCount?: number;
  argsSummary?: string;
  limit?: number;
  mode?: string;
};

export type HttpCallWithContext = {
  method: string;
  url: string;
  status: number | null;
  latency_ms: number | null;
  payload?: unknown;
  seq?: number;
  context: HttpCallContext;
};

function summarizeFilters(filters: unknown): { count: number; summary: string } {
  if (!Array.isArray(filters) || filters.length === 0) {
    return { count: 0, summary: '' };
  }
  const parts: string[] = [];
  for (const f of filters.slice(0, 3)) {
    if (f && typeof f === 'object') {
      const o = f as Record<string, unknown>;
      const field = o.field ?? o.name ?? o.key;
      const op = o.op ?? o.operator;
      const val = o.value ?? o.values;
      if (field != null) {
        parts.push(
          [String(field), op != null ? String(op) : '', val != null ? String(val).slice(0, 24) : '']
            .filter(Boolean)
            .join(' '),
        );
      } else {
        parts.push(JSON.stringify(f).slice(0, 40));
      }
    }
  }
  const more = filters.length > 3 ? ` +${filters.length - 3}` : '';
  return {
    count: filters.length,
    summary: parts.join(' · ') + more,
  };
}

function contextFromToolQuery(raw: Record<string, unknown>): HttpCallContext {
  const parsed = parseToolQueryPayload(raw);
  if (parsed) {
    const bits = parsed.paramLines.filter((l) => !l.startsWith('entity ='));
    return {
      toolName: parsed.tool,
      entity: parsed.entity,
      filtersCount: parsed.filters.length || undefined,
      argsSummary: bits.length ? bits.join(' · ') : parsed.filtersSummary,
      limit: parsed.limit,
      mode: parsed.mode,
    };
  }
  const toolName = raw.tool != null ? String(raw.tool) : undefined;
  const entity = raw.entity != null ? String(raw.entity) : undefined;
  const { count, summary } = summarizeFilters(raw.filters_applied);
  const limit = typeof raw.limit === 'number' ? raw.limit : undefined;
  const mode = raw.mode != null ? String(raw.mode) : undefined;
  const bits: string[] = [];
  if (entity) {
    bits.push(`entity: ${entity}`);
  }
  if (count) {
    bits.push(`${count} filter(s)`);
  }
  if (summary) {
    bits.push(summary);
  }
  if (limit != null) {
    bits.push(`limit ${limit}`);
  }
  if (mode) {
    bits.push(`mode ${mode}`);
  }
  return {
    toolName,
    entity,
    filtersCount: count || undefined,
    argsSummary: bits.length ? bits.join(' · ') : undefined,
    limit,
    mode,
  };
}

function isHttpNetworkStep(n: NetworkStep): boolean {
  const t = n.type;
  if (t === 'routing' || t === 'tool' || t === 'tool_query') {
    return false;
  }
  const raw = n as { url?: string; endpoint?: string };
  return Boolean(raw.url || raw.endpoint);
}

function pushHttpFromStep(
  n: NetworkStep,
  ctx: HttpCallContext,
  out: HttpCallWithContext[],
): void {
  const raw = n as {
    url?: string;
    endpoint?: string;
    method?: string;
    status?: number | null;
    latency_ms?: number | null;
    seq?: number;
  };
  const url = raw.url || raw.endpoint;
  if (!url) {
    return;
  }
  out.push({
    method: String(raw.method ?? 'GET'),
    url: String(url),
    status: raw.status ?? null,
    latency_ms: raw.latency_ms ?? null,
    payload: n,
    seq: raw.seq,
    context: { ...ctx },
  });
}

/** Walk typed `network[]` in order; attach last tool / tool_query to each HTTP row. */
function fromTypedNetwork(message: ChatMessage): HttpCallWithContext[] {
  const network = message.network ?? [];
  if (!network.some((n) => n.type === 'routing' || n.type === 'tool' || n.type === 'tool_query')) {
    return [];
  }

  const out: HttpCallWithContext[] = [];
  let ctx: HttpCallContext = {};
  let lastTool = '';

  for (const n of network) {
    if (n.type === 'tool' && 'name' in n) {
      lastTool = String(n.name);
      ctx = { ...ctx, toolName: lastTool };
      continue;
    }
    if (n.type === 'tool_query' && 'tool' in n) {
      ctx = { ...contextFromToolQuery(n as unknown as Record<string, unknown>), toolName: lastTool || String(n.tool) };
      continue;
    }
    if (isHttpNetworkStep(n)) {
      const merged: HttpCallContext = {
        ...ctx,
        toolName: ctx.toolName || lastTool || undefined,
      };
      pushHttpFromStep(n, merged, out);
    }
  }
  return out;
}

function eventKey(method: string, url: string, status: number | null, latency: number | null): string {
  return `${method}|${url}|${status ?? ''}|${latency ?? ''}`;
}

/** Match plain `network[]` HTTP rows to SSE timeline for tool context. */
function fromNetworkWithSse(message: ChatMessage): HttpCallWithContext[] {
  const network = message.network ?? [];
  const httpRows = network.filter(isHttpNetworkStep);
  if (!httpRows.length) {
    return [];
  }

  const events = message.streamDebug?.events ?? [];
  const fallbackTool =
    message.streamDebug?.toolsUsed?.map(String).filter(Boolean)[0] ?? '';

  const networkEvents = events.filter((e) => e.kind === 'network' && e.url);
  const usedEventIdx = new Set<number>();

  const out: HttpCallWithContext[] = [];

  for (const row of httpRows) {
    const raw = row as {
      url?: string;
      endpoint?: string;
      method?: string;
      status?: number | null;
      latency_ms?: number | null;
      seq?: number;
    };
    const url = String(raw.url || raw.endpoint || '');
    const method = String(raw.method ?? 'GET').toUpperCase();
    const status = raw.status ?? null;
    const latency = raw.latency_ms ?? null;
    const key = eventKey(method, url, status, latency);

    let matchIdx = -1;
    for (let i = 0; i < networkEvents.length; i++) {
      if (usedEventIdx.has(i)) {
        continue;
      }
      const ev = networkEvents[i];
      const evMethod = String(ev.method ?? 'GET').toUpperCase();
      const evKey = eventKey(evMethod, String(ev.url), ev.status ?? null, ev.latency_ms ?? null);
      if (evKey === key || (ev.url === url && evMethod === method)) {
        matchIdx = events.indexOf(ev);
        usedEventIdx.add(i);
        break;
      }
    }

    const ctx = contextBeforeEvent(events, matchIdx >= 0 ? matchIdx : events.length, fallbackTool);
    pushHttpFromStep(row, ctx, out);
  }

  return out;
}

function contextBeforeEvent(
  events: StreamEvent[],
  endExclusive: number,
  fallbackTool: string,
): HttpCallContext {
  let ctx: HttpCallContext = {};
  let lastTool = fallbackTool;

  for (let i = 0; i < endExclusive && i < events.length; i++) {
    const ev = events[i];
    if (ev.kind === 'tool' && ev.name) {
      lastTool = String(ev.name);
      ctx = { ...ctx, toolName: lastTool };
    }
    if (ev.kind === 'tool_query') {
      ctx = {
        ...contextFromToolQuery(ev as Record<string, unknown>),
        toolName:
          lastTool ||
          (ev.tool ? String(ev.tool) : ctx.toolName),
      };
    }
  }

  if (!ctx.toolName && lastTool) {
    ctx.toolName = lastTool;
  }
  return ctx;
}

export function orderedHttpCallsWithContext(message: ChatMessage): HttpCallWithContext[] {
  const typed = fromTypedNetwork(message);
  if (typed.length) {
    return typed;
  }

  const fromNet = fromNetworkWithSse(message);
  if (fromNet.length) {
    return fromNet;
  }

  const fallbackTool = message.streamDebug?.toolsUsed?.map(String).filter(Boolean)[0] ?? '';
  const out: HttpCallWithContext[] = [];
  for (const step of buildTimeline(message)) {
    if (step.kind !== 'http' || !step.url) {
      continue;
    }
    out.push({
      method: step.method ?? 'GET',
      url: step.url,
      status: step.status ?? null,
      latency_ms: step.latency_ms ?? null,
      payload: step.payload,
      context: { toolName: fallbackTool || undefined },
    });
  }
  return out;
}

export function toolsUsedForMessage(message: ChatMessage): string[] {
  const fromSd = (message.streamDebug?.toolsUsed ?? []).map(String).filter(Boolean);
  if (fromSd.length) {
    return [...new Set(fromSd)];
  }
  const names: string[] = [];
  for (const n of message.network ?? []) {
    if (n.type === 'tool' && 'name' in n) {
      const name = String(n.name);
      if (!names.includes(name)) {
        names.push(name);
      }
    }
  }
  for (const ev of message.streamDebug?.events ?? []) {
    if (ev.kind === 'tool' && ev.name) {
      const name = String(ev.name);
      if (!names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}

export function uniqueProjectsFromCalls(calls: HttpCallWithContext[], parseProject: (url: string) => string | undefined): string[] {
  const set = new Set<string>();
  for (const c of calls) {
    const p = parseProject(c.url);
    if (p) {
      set.add(p);
    }
  }
  return [...set];
}
