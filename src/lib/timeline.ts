import type { ChatMessage, NetworkStep, StreamEvent, TimelineStep } from './types';
import { parseToolQueryPayload } from './toolQueryParams';

function stepSortKey(step: { seq?: number; ts?: number }, index: number): number {
  if (typeof step.seq === 'number') {
    return step.seq;
  }
  if (typeof step.ts === 'number') {
    return step.ts * 1000 + index * 0.001;
  }
  return index;
}

function normalizeNetworkStep(raw: NetworkStep, index: number): TimelineStep {
  const type = raw.type ?? (raw.url || raw.method ? 'http' : 'unknown');
  const sortKey = stepSortKey(raw, index);

  if (type === 'routing' && 'domain' in raw && raw.type === 'routing') {
    return {
      id: `net-${index}`,
      source: 'network',
      sortKey,
      kind: 'routing',
      title: raw.label || raw.domain,
      subtitle: raw.domain,
      payload: raw,
    };
  }
  if (type === 'tool' && 'name' in raw && raw.type === 'tool') {
    return {
      id: `net-${index}`,
      source: 'network',
      sortKey,
      kind: 'tool',
      title: raw.name,
      payload: raw,
    };
  }
  if (type === 'tool_query' && 'tool' in raw && raw.type === 'tool_query') {
    return {
      id: `net-${index}`,
      source: 'network',
      sortKey,
      kind: 'tool_query',
      title: raw.tool,
      subtitle: raw.entity,
      payload: raw,
    };
  }

  const http = raw as {
    method?: string;
    url?: string;
    endpoint?: string;
    status?: number | null;
    latency_ms?: number | null;
    error?: string;
  };
  const url = http.url || http.endpoint || '';
  return {
    id: `net-${index}`,
    source: 'network',
    sortKey,
    kind: 'http',
    title: url ? shortenUrl(url) : 'HTTP',
    subtitle: http.method?.toUpperCase(),
    status: http.status ?? null,
    latency_ms: http.latency_ms ?? null,
    method: http.method,
    url,
    payload: raw,
  };
}

function sseToTimeline(ev: StreamEvent, index: number): TimelineStep | null {
  const kind = String(ev.kind || 'meta');
  const sortKey =
    typeof ev.ts === 'number' ? ev.ts * 1000 + index * 0.0001 : 100000 + index;

  if (kind === 'routing') {
    return {
      id: `sse-${index}`,
      source: 'sse',
      sortKey,
      kind: 'routing',
      title: String(ev.label || ev.domain || 'routing'),
      subtitle: ev.domain ? String(ev.domain) : undefined,
      payload: ev,
    };
  }
  if (kind === 'tool') {
    return {
      id: `sse-${index}`,
      source: 'sse',
      sortKey,
      kind: 'tool',
      title: String(ev.name || 'tool'),
      payload: ev,
    };
  }
  if (kind === 'network') {
    return {
      id: `sse-${index}`,
      source: 'sse',
      sortKey,
      kind: 'http',
      title: ev.url ? shortenUrl(String(ev.url)) : 'HTTP',
      subtitle: ev.method ? String(ev.method).toUpperCase() : undefined,
      status: ev.status ?? null,
      latency_ms: ev.latency_ms ?? null,
      method: ev.method ? String(ev.method) : undefined,
      url: ev.url ? String(ev.url) : undefined,
      payload: ev,
    };
  }
  if (kind === 'error') {
    return {
      id: `sse-${index}`,
      source: 'sse',
      sortKey,
      kind: 'error',
      title: String(ev.error || 'error'),
      payload: ev,
    };
  }
  if (kind === 'tool_query' || (ev.type === 'tool_query' && ev.tool)) {
    const parsed = parseToolQueryPayload(ev);
    const tool = parsed?.tool ?? String(ev.tool || ev.name || 'query');
    const entity = parsed?.entity ?? (ev.entity != null ? String(ev.entity) : '');
    return {
      id: `sse-${index}`,
      source: 'sse',
      sortKey,
      kind: 'tool_query',
      title: tool,
      subtitle: entity || undefined,
      payload: ev,
    };
  }
  if (kind === 'report_def' || kind === 'interrupt' || kind === 'meta') {
    if (parseToolQueryPayload(ev)) {
      return null;
    }
    return {
      id: `sse-${index}`,
      source: 'sse',
      sortKey,
      kind,
      title: kind,
      payload: ev,
    };
  }
  return null;
}

function hasTypedNetwork(network: NetworkStep[]): boolean {
  return network.some((n) => n.type === 'routing' || n.type === 'tool_query' || n.type === 'tool');
}

function dedupeSteps(steps: TimelineStep[]): TimelineStep[] {
  const seen = new Set<string>();
  const out: TimelineStep[] = [];
  for (const s of steps) {
    const key =
      s.kind === 'http'
        ? `${s.kind}|${s.method}|${s.url}|${s.status}|${s.latency_ms}`
        : `${s.kind}|${s.title}|${s.subtitle}|${s.sortKey}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(s);
  }
  return out;
}

export function buildTimeline(message: ChatMessage): TimelineStep[] {
  const network = message.network ?? [];
  const events = message.streamDebug?.events ?? [];

  const fromNetwork = network.map((n, i) => normalizeNetworkStep(n, i));

  if (fromNetwork.length > 0 && (hasTypedNetwork(network) || events.length === 0)) {
    return [...fromNetwork].sort((a, b) => a.sortKey - b.sortKey);
  }

  if (fromNetwork.length > 0 && events.length === 0) {
    return fromNetwork;
  }

  const fromSse = events
    .map((e, i) => sseToTimeline(e, i))
    .filter((s): s is TimelineStep => s != null);

  if (fromNetwork.length === 0) {
    return dedupeSteps([...fromSse].sort((a, b) => a.sortKey - b.sortKey));
  }

  const merged = dedupeSteps(
    [...fromNetwork, ...fromSse].sort((a, b) => a.sortKey - b.sortKey),
  );
  return merged;
}

export function maxLatency(steps: TimelineStep[]): number {
  let max = 0;
  for (const s of steps) {
    if (typeof s.latency_ms === 'number' && s.latency_ms > max) {
      max = s.latency_ms;
    }
  }
  return max || 1;
}

export function shortenUrl(url: string, max = 72): string {
  if (url.length <= max) {
    return url;
  }
  try {
    const u = new URL(url);
    const tail = u.pathname.split('/').filter(Boolean).slice(-2).join('/');
    const short = `${u.host}/…/${tail}`;
    return short.length <= max ? short : short.slice(0, max - 1) + '…';
  } catch {
    return url.slice(0, max - 1) + '…';
  }
}

export function requestIdForMessage(message: ChatMessage): string | undefined {
  if (message.requestId) {
    return String(message.requestId);
  }
  const sd = message.streamDebug?.requestId;
  return sd ? String(sd) : undefined;
}
