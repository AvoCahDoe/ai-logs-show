export interface ChatMessage {
  role: string;
  text?: string;
  thinking?: string;
  mode?: string;
  routedDomain?: string;
  routedLabel?: string;
  requestId?: string;
  network?: NetworkStep[];
  streamDebug?: StreamDebug | null;
  reportRows?: Record<string, unknown>[];
  reportColumns?: { key: string; label: string }[];
  reportDef?: unknown;
  interrupt?: unknown;
  citations?: string[];
  createdAt?: number;
  [key: string]: unknown;
}

export interface StreamDebug {
  events?: StreamEvent[];
  requestId?: string | null;
  threadId?: string | null;
  durationMs?: number | null;
  toolsUsed?: string[];
  usage?: unknown;
}

export interface StreamEvent {
  kind: string;
  ts?: number;
  name?: string;
  domain?: string;
  label?: string;
  method?: string;
  url?: string;
  status?: number | null;
  latency_ms?: number | null;
  error?: string;
  phase?: string;
  [key: string]: unknown;
}

export type NetworkStep =
  | { type: 'routing'; domain: string; label?: string; ts?: number; seq?: number }
  | { type: 'tool'; name: string; ts?: number; seq?: number }
  | {
      type: 'tool_query';
      tool: string;
      entity: string;
      filters_applied?: unknown[];
      limit?: number;
      mode?: string;
      ts?: number;
      seq?: number;
    }
  | {
      type: 'http';
      method?: string;
      url?: string;
      endpoint?: string;
      status?: number | null;
      latency_ms?: number | null;
      error?: string;
      ts?: number;
      seq?: number;
    }
  | {
      type?: undefined;
      method?: string;
      url?: string;
      status?: number | null;
      latency_ms?: number | null;
      error?: string;
      ts?: number;
      seq?: number;
    };

export interface Conversation {
  id: string;
  title: string;
  sessionId?: string;
  agentId?: string;
  yearMonth?: string;
  createdAt?: number;
  updatedAt?: number;
  messages: ChatMessage[];
}

export type TimelineStep = {
  id: string;
  source: 'network' | 'sse';
  sortKey: number;
  kind: string;
  title: string;
  subtitle?: string;
  status?: number | null;
  latency_ms?: number | null;
  method?: string;
  url?: string;
  payload?: unknown;
};
