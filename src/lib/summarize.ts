import type { ChatMessage, Conversation } from './types';
import { buildTimeline } from './timeline';
import { inferEndpointPurpose } from './endpointPurpose';

export type RoutingInfo = { domain: string; label: string };

export type ParsedEndpoint = {
  method: string;
  url: string;
  path: string;
  project?: string;
  dataType?: string;
  action?: string;
  status: number | null;
  latency_ms: number | null;
  hitCount: number;
  purposeShort?: string;
  purposeDetail?: string;
  purposeId?: string;
};

export type HttpStepLite = {
  label: string;
  method: string;
  status: number | null;
  latency_ms: number;
};

export type ReportChartSpec = {
  xKey: string;
  yKey: string;
  xLabel: string;
  yLabel: string;
  points: { name: string; value: number }[];
};

export type TurnSummary = {
  routing: RoutingInfo[];
  tools: string[];
  endpoints: ParsedEndpoint[];
  httpSteps: HttpStepLite[];
  reportChart: ReportChartSpec | null;
  endpointCount: number;
  worstLatencyMs: number | null;
  statusMix: { label: string; count: number }[];
};

export type ConversationSummary = {
  domainCounts: { domain: string; label: string; count: number }[];
  uniqueEndpointUrls: number;
  totalHttpCalls: number;
  totalLatencyMs: number;
};

const ERP_PATH =
  /^\/api\/v1\/protected\/projects\/([^/]+)(?:\/data\/([^/]+)\/([^/?]+)|\/([^/?]+))?/i;

export function parseErpUrl(url: string): Pick<ParsedEndpoint, 'path' | 'project' | 'dataType' | 'action'> {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    const m = u.pathname.match(ERP_PATH);
    if (m) {
      const project = decodeURIComponent(m[1] || '');
      if (m[2] && m[3]) {
        return {
          path,
          project,
          dataType: decodeURIComponent(m[2]),
          action: decodeURIComponent(m[3]),
        };
      }
      if (m[4]) {
        return { path, project, action: decodeURIComponent(m[4]) };
      }
      return { path, project };
    }
    return { path: `${u.host}${path}` };
  } catch {
    return { path: url };
  }
}

function pushRouting(out: RoutingInfo[], domain: string, label: string): void {
  const d = domain.trim();
  if (!d || d === 'other') {
    return;
  }
  if (out.some((r) => r.domain === d)) {
    return;
  }
  out.push({ domain: d, label: label.trim() || d });
}

function dedupeToolEvents(events: { kind?: string; name?: string; ts?: number }[]): string[] {
  const out: string[] = [];
  let lastName = '';
  let lastTs = 0;
  for (const ev of events) {
    if (ev.kind !== 'tool' || !ev.name) {
      continue;
    }
    const name = String(ev.name);
    const ts = typeof ev.ts === 'number' ? ev.ts : 0;
    if (name === lastName && ts - lastTs < 0.05) {
      continue;
    }
    if (!out.includes(name)) {
      out.push(name);
    }
    lastName = name;
    lastTs = ts;
  }
  return out;
}

function endpointKey(method: string, url: string, status: number | null, latency: number | null): string {
  return `${method}|${url}|${status}|${latency}`;
}

function groupEndpoints(raw: ParsedEndpoint[]): ParsedEndpoint[] {
  const map = new Map<string, ParsedEndpoint>();
  for (const e of raw) {
    const key = `${e.method}|${e.url}|${e.status ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.hitCount += 1;
      if (e.latency_ms != null) {
        existing.latency_ms =
          existing.latency_ms == null ? e.latency_ms : Math.max(existing.latency_ms, e.latency_ms);
      }
    } else {
      map.set(key, { ...e, hitCount: 1 });
    }
  }
  return [...map.values()];
}

function statusBucket(status: number | null): string {
  if (status == null) {
    return 'other';
  }
  if (status >= 200 && status < 300) {
    return '2xx';
  }
  if (status >= 400 && status < 500) {
    return '4xx';
  }
  if (status >= 500) {
    return '5xx';
  }
  return 'other';
}

function inferReportChart(message: ChatMessage): ReportChartSpec | null {
  const rows = message.reportRows;
  if (!rows?.length) {
    return null;
  }

  let xKey = '';
  let yKey = '';
  const def = message.reportDef as Record<string, unknown> | null | undefined;
  const chartSchema = def?.chartSchema;
  if (chartSchema && typeof chartSchema === 'object') {
    const cs = chartSchema as Record<string, unknown>;
    if (typeof cs.xField === 'string') {
      xKey = cs.xField;
    }
    if (typeof cs.yField === 'string') {
      yKey = cs.yField;
    }
  }
  if (def?.chartSchema && typeof def.chartSchema === 'string') {
    try {
      const cs = JSON.parse(def.chartSchema) as Record<string, unknown>;
      if (typeof cs.xField === 'string') {
        xKey = cs.xField;
      }
      if (typeof cs.yField === 'string') {
        yKey = cs.yField;
      }
    } catch {
      /* ignore */
    }
  }

  const cols = message.reportColumns?.map((c) => c.key) ?? Object.keys(rows[0] ?? {});
  if (!xKey) {
    xKey =
      cols.find((k) => {
        const v = rows[0]?.[k];
        return typeof v === 'string' || (typeof v === 'number' && String(v).length > 3);
      }) ??
      cols.find((k) => typeof rows[0]?.[k] === 'string') ??
      cols[0] ??
      '';
  }
  if (!yKey) {
    yKey =
      cols.find((k) => typeof rows[0]?.[k] === 'number' && k !== xKey) ??
      cols.find((k) => typeof rows[0]?.[k] === 'number') ??
      '';
  }
  if (!xKey || !yKey) {
    return null;
  }

  const points: { name: string; value: number }[] = [];
  for (const row of rows.slice(0, 40)) {
    const rawY = row[yKey];
    const num = typeof rawY === 'number' ? rawY : Number(rawY);
    if (!Number.isFinite(num)) {
      continue;
    }
    const name = String(row[xKey] ?? '').slice(0, 48) || '—';
    points.push({ name, value: num });
  }
  if (!points.length) {
    return null;
  }

  const xCol = message.reportColumns?.find((c) => c.key === xKey);
  const yCol = message.reportColumns?.find((c) => c.key === yKey);
  return {
    xKey,
    yKey,
    xLabel: xCol?.label ?? xKey,
    yLabel: yCol?.label ?? yKey,
    points,
  };
}

export function summarizeTurn(message: ChatMessage, userQuestion?: string): TurnSummary & { userQuestion?: string } {
  const routing: RoutingInfo[] = [];
  if (message.routedDomain) {
    pushRouting(routing, message.routedDomain, message.routedLabel ?? message.routedDomain);
  }
  for (const step of message.network ?? []) {
    if (step.type === 'routing' && 'domain' in step) {
      pushRouting(routing, step.domain, step.label ?? step.domain);
    }
  }
  for (const ev of message.streamDebug?.events ?? []) {
    if (ev.kind === 'routing' && ev.domain) {
      pushRouting(routing, String(ev.domain), String(ev.label ?? ev.domain));
    }
  }

  const timeline = buildTimeline(message);
  let tools = [...(message.streamDebug?.toolsUsed ?? []).map(String).filter(Boolean)];
  for (const s of timeline) {
    if (s.kind === 'tool' && s.title && !tools.includes(s.title)) {
      tools.push(s.title);
    }
  }
  const dedupedFromSse = dedupeToolEvents(message.streamDebug?.events ?? []);
  if (dedupedFromSse.length) {
    tools = [...new Set([...tools, ...dedupedFromSse])];
  }

  const rawEndpoints: ParsedEndpoint[] = [];
  const seenHttp = new Set<string>();

  const addHttp = (method: string, url: string, status: number | null, latency_ms: number | null) => {
    if (!url) {
      return;
    }
    const key = endpointKey(method, url, status, latency_ms);
    if (seenHttp.has(key)) {
      return;
    }
    seenHttp.add(key);
    const parsed = parseErpUrl(url);
    const purpose = inferEndpointPurpose(method, url);
    rawEndpoints.push({
      method: method.toUpperCase() || 'GET',
      url,
      ...parsed,
      status,
      latency_ms,
      hitCount: 1,
      purposeShort: purpose.short,
      purposeDetail: purpose.detail,
      purposeId: purpose.id,
    });
  };

  for (const step of timeline) {
    if (step.kind === 'http' && step.url) {
      addHttp(step.method ?? 'GET', step.url, step.status ?? null, step.latency_ms ?? null);
    }
  }
  for (const n of message.network ?? []) {
    if (n.type === 'routing' || n.type === 'tool' || n.type === 'tool_query') {
      continue;
    }
    const raw = n as {
      url?: string;
      endpoint?: string;
      method?: string;
      status?: number | null;
      latency_ms?: number | null;
    };
    const url = raw.url || raw.endpoint || '';
    if (url) {
      addHttp(String(raw.method ?? 'GET'), url, raw.status ?? null, raw.latency_ms ?? null);
    }
  }

  const endpoints = groupEndpoints(rawEndpoints);
  const httpSteps: HttpStepLite[] = endpoints
    .filter((e) => e.latency_ms != null)
    .map((e) => ({
      label: e.action ? `${e.project ?? '?'}/${e.action}` : e.path.slice(-64),
      method: e.method,
      status: e.status,
      latency_ms: e.latency_ms!,
    }));

  const statusCounts = new Map<string, number>();
  for (const e of endpoints) {
    const b = statusBucket(e.status);
    statusCounts.set(b, (statusCounts.get(b) ?? 0) + e.hitCount);
  }
  const statusMix = [...statusCounts.entries()].map(([label, count]) => ({ label, count }));

  let worstLatencyMs: number | null = null;
  for (const e of endpoints) {
    if (e.latency_ms != null && (worstLatencyMs == null || e.latency_ms > worstLatencyMs)) {
      worstLatencyMs = e.latency_ms;
    }
  }

  return {
    userQuestion,
    routing,
    tools,
    endpoints,
    httpSteps,
    reportChart: inferReportChart(message),
    endpointCount: endpoints.reduce((n, e) => n + e.hitCount, 0),
    worstLatencyMs,
    statusMix,
  };
}

export function summarizeConversation(conversation: Conversation): ConversationSummary {
  const domainMap = new Map<string, { label: string; count: number }>();
  const urlSet = new Set<string>();
  let totalHttpCalls = 0;
  let totalLatencyMs = 0;

  for (let i = 0; i < conversation.messages.length; i++) {
    const m = conversation.messages[i];
    if (m.role !== 'assistant') {
      continue;
    }
    const prev = conversation.messages[i - 1];
    const userQ = prev?.role === 'user' ? prev.text : undefined;
    const turn = summarizeTurn(m, userQ);
    for (const r of turn.routing) {
      const cur = domainMap.get(r.domain) ?? { label: r.label, count: 0 };
      cur.count += 1;
      domainMap.set(r.domain, cur);
    }
    for (const e of turn.endpoints) {
      urlSet.add(`${e.method}|${e.url}`);
      totalHttpCalls += e.hitCount;
      if (e.latency_ms != null) {
        totalLatencyMs += e.latency_ms * e.hitCount;
      }
    }
  }

  const domainCounts = [...domainMap.entries()].map(([domain, v]) => ({
    domain,
    label: v.label,
    count: v.count,
  }));

  return {
    domainCounts,
    uniqueEndpointUrls: urlSet.size,
    totalHttpCalls,
    totalLatencyMs,
  };
}
