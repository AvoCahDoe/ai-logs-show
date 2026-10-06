import { useCallback, useMemo, useState } from 'react';
import { parsePayload } from './lib/parsePayload';
import type { Conversation } from './lib/types';
import { JsonInput } from './components/JsonInput';
import { ConversationPicker } from './components/ConversationPicker';
import { MessageThread } from './components/MessageThread';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ingest = useCallback((text: string) => {
    const result = parsePayload(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setConversations(result.conversations);
    setSelectedId(result.conversations[0]?.id ?? '');
  }, []);

  const selected = useMemo(
    () => conversations?.find((c) => c.id === selectedId) ?? conversations?.[0] ?? null,
    [conversations, selectedId],
  );

  const loadSample = useCallback(async () => {
    try {
      const res = await fetch('/sample-conversations.json');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      ingest(text);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Sample load failed: ${e.message}. Use Load file → data/current.json`
          : 'Sample load failed',
      );
    }
  }, [ingest]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Gamma AI log viewer</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paste a chat document — routing flow, endpoints, latency charts, and answer data update from
          your JSON.
        </p>
        <button
          type="button"
          className="mt-3 text-xs text-sky-400 hover:underline"
          onClick={() => void loadSample()}
        >
          Load bundled sample (1 conversation)
        </button>
      </header>

      <JsonInput onParse={ingest} onFile={ingest} error={error} />

      {conversations?.length ? (
        <div className="mt-6 space-y-4">
          <ConversationPicker
            conversations={conversations}
            selectedId={selected?.id ?? selectedId}
            onSelect={setSelectedId}
            filter={filter}
            onFilterChange={setFilter}
          />
          {selected ? <MessageThread conversation={selected} /> : null}
        </div>
      ) : (
        <p className="mt-8 text-center text-sm text-slate-500">
          No data yet — paste JSON or load{' '}
          <code className="text-slate-400">data/current.json</code> via Load file.
        </p>
      )}
    </div>
  );
}
