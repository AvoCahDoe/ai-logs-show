export type ToolQueryFilter = {
  field: string;
  operator: string;
  value: string;
  raw: Record<string, unknown>;
};

export type ToolQueryDisplay = {
  tool: string;
  entity: string;
  limit?: number;
  mode?: string;
  filters: ToolQueryFilter[];
  having: ToolQueryFilter[];
  paramLines: string[];
  filtersSummary: string;
};

function filterFromObject(o: Record<string, unknown>): ToolQueryFilter | null {
  const field = String(o.field ?? o.name ?? o.key ?? '').trim();
  if (!field) {
    return null;
  }
  const operator = String(o.operator ?? o.op ?? '=').trim();
  const val = o.value ?? o.values;
  let value = '';
  if (val != null) {
    value =
      typeof val === 'object' ? JSON.stringify(val) : String(val);
  }
  return {
    field,
    operator,
    value: value.slice(0, 120),
    raw: o,
  };
}

function mapFilters(raw: unknown): ToolQueryFilter[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: ToolQueryFilter[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object') {
      const f = filterFromObject(item as Record<string, unknown>);
      if (f) {
        out.push(f);
      }
    }
  }
  return out;
}

export function isToolQueryPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const p = payload as Record<string, unknown>;
  if (p.type === 'tool_query' || p.kind === 'tool_query') {
    return true;
  }
  return Boolean(p.tool && (p.entity != null || p.filters_applied != null));
}

/** Parse Gamma `tool_query` audit payload (network[] or SSE meta). */
export function parseToolQueryPayload(payload: unknown): ToolQueryDisplay | null {
  if (!isToolQueryPayload(payload)) {
    return null;
  }
  const p = payload as Record<string, unknown>;
  const tool = String(p.tool ?? p.name ?? 'query').trim();
  const entity = String(p.entity ?? '').trim();
  const limit = typeof p.limit === 'number' ? p.limit : undefined;
  const mode = p.mode != null ? String(p.mode).trim() : undefined;
  const filters = mapFilters(p.filters_applied);
  const having = mapFilters(p.having_applied);

  const paramLines: string[] = [];
  paramLines.push(`entity = ${entity || '—'}`);
  if (limit != null) {
    paramLines.push(`limit = ${limit}`);
  }
  if (mode) {
    paramLines.push(`mode = ${mode}`);
  }
  for (const f of filters.slice(0, 6)) {
    paramLines.push(`${f.field} ${f.operator} ${f.value || '∅'}`);
  }
  if (filters.length > 6) {
    paramLines.push(`… +${filters.length - 6} filter(s)`);
  }
  for (const f of having.slice(0, 3)) {
    paramLines.push(`having: ${f.field} ${f.operator} ${f.value || '∅'}`);
  }

  const filtersSummary =
    filters.length === 0
      ? 'no filters'
      : filters
          .slice(0, 4)
          .map((f) => `${f.field} ${f.operator} ${f.value || '∅'}`)
          .join(' · ') + (filters.length > 4 ? ` · +${filters.length - 4}` : '');

  return {
    tool,
    entity,
    limit,
    mode,
    filters,
    having,
    paramLines,
    filtersSummary,
  };
}

export function toolQueryFromStreamEvent(ev: Record<string, unknown>): ToolQueryDisplay | null {
  return parseToolQueryPayload(ev);
}
