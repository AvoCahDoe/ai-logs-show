import type { Conversation } from '../lib/types';

type Props = {
  conversations: Conversation[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (v: string) => void;
};

export function ConversationPicker({
  conversations,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
}: Props) {
  if (conversations.length <= 1) {
    return null;
  }

  const q = filter.trim().toLowerCase();
  const filtered = q
    ? conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q),
      )
    : conversations;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
      <label className="text-xs font-medium text-slate-400">
        Conversation ({conversations.length})
      </label>
      <input
        type="search"
        className="min-w-[140px] flex-1 rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
        placeholder="Search title or id…"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
      />
      <select
        className="max-w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title.slice(0, 60)} — {c.id.slice(0, 8)}… ({c.messages.length} msgs)
          </option>
        ))}
      </select>
    </div>
  );
}
