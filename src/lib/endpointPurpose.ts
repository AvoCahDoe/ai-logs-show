import { parseErpUrl } from './summarize';

export type EndpointPurpose = {
  id: string;
  short: string;
  detail: string;
};

export type PurposeOptions = {
  toolName?: string;
  payload?: unknown;
};

function pathnameOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('?')[0] ?? url;
  }
}

/** Infer why Gamma (or the ERP client) likely called this URL — from path + method heuristics. */
export function inferEndpointPurpose(
  method: string,
  url: string,
  options?: PurposeOptions,
): EndpointPurpose {
  const payload = options?.payload as Record<string, unknown> | undefined;
  if (typeof payload?.purpose === 'string' && payload.purpose.trim()) {
    return {
      id: 'logged',
      short: String(payload.purpose).trim(),
      detail:
        typeof payload.purposeDetail === 'string'
          ? payload.purposeDetail
          : String(payload.purpose).trim(),
    };
  }

  const m = (method || 'GET').toUpperCase();
  const path = pathnameOf(url);
  const parsed = parseErpUrl(url);
  const tool = options?.toolName?.trim();

  if (/^\/api\/v1\/protected\/projects\/?$/i.test(path) && m === 'GET') {
    return {
      id: 'list_projects',
      short: 'List projects',
      detail:
        'Discover tenant projects and ASSETS product catalogs (same source as the Products screen).',
    };
  }

  if (/\/permissions\/?$/i.test(path) && m === 'GET') {
    return {
      id: 'permissions',
      short: 'Permissions (RLS)',
      detail:
        'Field catalog step: load which columns this user may read for each dataType, then merge into groupable fields.',
    };
  }

  if (parsed.action === 'schema' || /\/schema\/?$/i.test(path)) {
    return {
      id: 'schema',
      short: 'Field schema',
      detail:
        'Field catalog step: load ERP field definitions (labels, types) before mapping the user question to keys.',
    };
  }

  if (
    (parsed.project === 'settings' || path.includes('/projects/settings/')) &&
    parsed.action === 'search' &&
    m === 'POST'
  ) {
    return {
      id: 'report_settings',
      short: 'Report settings',
      detail:
        'Field catalog step: read reportDefinitions from the settings project to suggest group/sum field examples.',
    };
  }

  if (parsed.action === 'search' && m === 'POST') {
    return {
      id: 'erp_search',
      short: tool ? `Query · ${tool}` : 'ERP search',
      detail: tool
        ? `Run the “${tool}” tool: POST search to fetch or aggregate rows for the assistant reply.`
        : 'Execute POST search to fetch or aggregate ERP documents for the user question.',
    };
  }

  if (m === 'GET' && parsed.project && !parsed.dataType && !parsed.action) {
    return {
      id: 'project_meta',
      short: 'Project metadata',
      detail: 'Load project-level ERP metadata (not a document search).',
    };
  }

  if (m === 'PUT' && parsed.dataType) {
    return {
      id: 'write_object',
      short: 'Write object',
      detail: 'Create or update an ERP document via PUT.',
    };
  }

  if (parsed.action) {
    return {
      id: 'erp_action',
      short: parsed.action,
      detail: `ERP “${parsed.action}” on ${parsed.project ?? 'project'}${parsed.dataType ? ` / ${parsed.dataType}` : ''}.`,
    };
  }

  return {
    id: 'erp_api',
    short: 'ERP HTTP',
    detail: 'Outbound ERP API call recorded in the agent trace.',
  };
}

export function purposeForTimelineStep(
  method: string | undefined,
  url: string | undefined,
  payload?: unknown,
): EndpointPurpose | null {
  if (!url) {
    return null;
  }
  return inferEndpointPurpose(method ?? 'GET', url, { payload });
}
