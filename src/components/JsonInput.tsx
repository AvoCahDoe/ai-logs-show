import { useCallback, useRef, useState } from 'react';
import { FileUp, ClipboardPaste } from 'lucide-react';

type Props = {
  onParse: (text: string) => void;
  onFile: (text: string) => void;
  error: string | null;
};

export function JsonInput({ onParse, onFile, error }: Props) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    onParse(text);
  }, [text, onParse]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? '');
        setText(content);
        onFile(content);
      };
      reader.readAsText(file);
    },
    [onFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? '');
        setText(content);
        onFile(content);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [onFile],
  );

  return (
    <section
      className="rounded-xl border border-slate-700 bg-slate-900/80 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-200">Paste or load JSON</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-600"
            onClick={() => fileRef.current?.click()}
          >
            <FileUp className="h-3.5 w-3.5" />
            Load file
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-600"
            onClick={submit}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Visualize
          </button>
        </div>
      </div>
      <textarea
        className="h-36 w-full resize-y rounded-lg border border-slate-600 bg-slate-950 p-3 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
        placeholder='Paste a conversation, messages[], or PUT /api/chats body…'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFileChange} />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
