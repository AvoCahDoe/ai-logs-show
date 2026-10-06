import { useMemo, useState } from 'react';
import type { Conversation } from '../lib/types';
import { formatTimestamp } from '../lib/parsePayload';
import { summarizeConversation } from '../lib/summarize';
import { MessageCard } from './MessageCard';
import { ConversationStats } from './ConversationStats';

type Props = {
  conversation: Conversation;
};

export function MessageThread({ conversation }: Props) {
  const convSummary = useMemo(() => summarizeConversation(conversation), [conversation]);

  const assistantIndices = useMemo(
    () =>
      conversation.messages
        .map((m, i) => (m.role === 'assistant' ? i : -1))
        .filter((i) => i >= 0),
    [conversation.messages],
  );

  const [selectedIndex, setSelectedIndex] = useState<number>(() =>
    assistantIndices.length ? assistantIndices[assistantIndices.length - 1]! : -1,
  );

  return (
    <div className="space-y-3">
      <header className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
        <h1 className="text-lg font-semibold text-slate-100">{conversation.title}</h1>
        <dl className="mt-2 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
          <div>
            <dt className="inline text-slate-500">id </dt>
            <dd className="inline font-mono text-slate-300">{conversation.id}</dd>
          </div>
          {conversation.sessionId ? (
            <div>
              <dt className="inline text-slate-500">session </dt>
              <dd className="inline font-mono text-slate-300">{conversation.sessionId}</dd>
            </div>
          ) : null}
          {conversation.updatedAt ? (
            <div>
              <dt className="inline text-slate-500">updated </dt>
              <dd className="inline text-slate-300">{formatTimestamp(conversation.updatedAt)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline text-slate-500">messages </dt>
            <dd className="inline text-slate-300">{conversation.messages.length}</dd>
          </div>
        </dl>
        <ConversationStats summary={convSummary} />
      </header>

      {conversation.messages.map((m, i) => {
        const prev = conversation.messages[i - 1];
        const userQuestion = prev?.role === 'user' ? prev.text : undefined;
        return (
          <MessageCard
            key={i}
            message={m}
            index={i}
            selected={selectedIndex === i}
            onSelect={() => setSelectedIndex(i)}
            userQuestion={userQuestion}
          />
        );
      })}
    </div>
  );
}
