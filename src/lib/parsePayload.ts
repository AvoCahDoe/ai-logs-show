import type { ChatMessage, Conversation } from './types';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function isMessage(v: unknown): v is ChatMessage {
  return isRecord(v) && typeof v.role === 'string';
}

function isConversation(v: unknown): v is Conversation {
  return isRecord(v) && Array.isArray(v.messages) && v.messages.every(isMessage);
}

function syntheticConversation(messages: ChatMessage[], title = 'Pasted thread'): Conversation {
  return {
    id: 'paste-' + Date.now(),
    title,
    messages,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeConversation(raw: Record<string, unknown>): Conversation {
  const messages = (raw.messages as ChatMessage[]) || [];
  return {
    id: String(raw.id ?? raw.sessionId ?? 'unknown'),
    title: String(raw.title ?? 'Untitled chat'),
    sessionId: raw.sessionId != null ? String(raw.sessionId) : undefined,
    agentId: raw.agentId != null ? String(raw.agentId) : undefined,
    yearMonth: raw.yearMonth != null ? String(raw.yearMonth) : undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
    messages,
  };
}

export type ParseResult =
  | { ok: true; conversations: Conversation[] }
  | { ok: false; error: string };

export function parsePayload(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: 'Empty input' };
  }

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Invalid JSON: ${msg}` };
  }

  if (isConversation(data)) {
    return { ok: true, conversations: [normalizeConversation(data as unknown as Record<string, unknown>)] };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { ok: false, error: 'Empty array' };
    }
    if (data.every(isConversation)) {
      return {
        ok: true,
        conversations: data.map((c) =>
          normalizeConversation(c as unknown as Record<string, unknown>),
        ),
      };
    }
    if (data.every(isMessage)) {
      return { ok: true, conversations: [syntheticConversation(data as ChatMessage[])] };
    }
    return { ok: false, error: 'Array must be conversations or messages' };
  }

  if (isMessage(data)) {
    const msg = data as ChatMessage;
    const title =
      msg.role === 'assistant' ? 'Single assistant turn' : `Single ${msg.role} message`;
    return { ok: true, conversations: [syntheticConversation([msg], title)] };
  }

  if (isRecord(data) && Array.isArray(data.messages)) {
    return { ok: true, conversations: [normalizeConversation(data)] };
  }

  return { ok: false, error: 'Unrecognized shape — expected conversation, message list, or messages[]' };
}

export function formatTimestamp(ms?: number): string {
  if (ms == null || !Number.isFinite(ms)) {
    return '—';
  }
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

export function formatTs(ts?: number): string {
  if (ts == null || !Number.isFinite(ts)) {
    return '';
  }
  const ms = ts > 1e12 ? ts : ts * 1000;
  try {
    return new Date(ms).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts.toFixed(3);
  }
}
