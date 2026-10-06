import { useMemo, useState } from 'react';

import ReactMarkdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

import type { ChatMessage } from '../lib/types';

import { TraceTimeline } from './TraceTimeline';

import { ReportRowsTable } from './ReportRowsTable';

import { requestIdForMessage } from '../lib/timeline';

import { summarizeTurn } from '../lib/summarize';

import { RoutingFlow } from './RoutingFlow';

import { EndpointTable } from './EndpointTable';

import { TraceCharts } from './TraceCharts';

import { ReportChart } from './ReportChart';

import { TraceGraphMap } from './TraceGraphMap';
import { TurnSummaryChips } from './TurnSummaryChips';



type Props = {

  message: ChatMessage;

  index: number;

  selected: boolean;

  onSelect: () => void;

  userQuestion?: string;

};



export function MessageCard({ message, index, selected, onSelect, userQuestion }: Props) {

  const [rawOpen, setRawOpen] = useState(false);

  const [copied, setCopied] = useState(false);

  const reqId = requestIdForMessage(message);

  const isUser = message.role === 'user';



  const turnSummary = useMemo(

    () => (isUser ? null : summarizeTurn(message, userQuestion)),

    [message, userQuestion, isUser],

  );



  const copyRaw = async () => {

    await navigator.clipboard.writeText(JSON.stringify(message, null, 2));

    setCopied(true);

    setTimeout(() => setCopied(false), 1500);

  };



  const preview = useMemo(() => {

    const t = message.text || '';

    if (t.length > 4000 && !selected) {

      return t.slice(0, 4000) + '\n\n…';

    }

    return t;

  }, [message.text, selected]);



  return (

    <article

      className={`rounded-xl border p-4 transition-colors ${

        selected

          ? 'border-sky-600 bg-sky-950/20'

          : isUser

            ? 'border-slate-700 bg-slate-900/40'

            : 'border-slate-700 bg-slate-900/60 hover:border-slate-600'

      }`}

    >

      <button

        type="button"

        className="flex w-full items-start justify-between gap-2 text-left"

        onClick={onSelect}

      >

        <div className="min-w-0 flex-1">

          <span

            className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase ${

              isUser ? 'bg-violet-900/60 text-violet-200' : 'bg-emerald-900/60 text-emerald-200'

            }`}

          >

            {message.role}

          </span>

          {!isUser && message.routedLabel ? (

            <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">

              {message.routedLabel}

            </span>

          ) : null}

          {message.mode ? (

            <span className="ml-2 text-xs text-slate-500">{message.mode}</span>

          ) : null}

          {!isUser && turnSummary ? <TurnSummaryChips summary={turnSummary} compact /> : null}

        </div>

        {selected ? (

          <ChevronDown className="h-4 w-4 shrink-0 text-sky-400" />

        ) : (

          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />

        )}

      </button>



      {message.text ? (

        <div className="markdown-body mt-3 max-h-96 overflow-auto text-sm text-slate-300">

          <ReactMarkdown remarkPlugins={[remarkGfm]}>{preview}</ReactMarkdown>

        </div>

      ) : null}



      {selected && !isUser && turnSummary ? (

        <div className="mt-4 space-y-4 border-t border-slate-700 pt-4">

          <div className="flex flex-wrap gap-3 text-xs text-slate-400">

            {reqId ? (

              <span>

                requestId:{' '}

                <code className="rounded bg-slate-800 px-1 text-sky-300">{reqId}</code>

              </span>

            ) : null}

            {message.streamDebug?.durationMs != null ? (

              <span>turn duration: {message.streamDebug.durationMs} ms</span>

            ) : null}

          </div>

          <TraceGraphMap message={message} userQuestion={userQuestion} />

          <RoutingFlow summary={turnSummary} />

          <TraceCharts summary={turnSummary} />

          <EndpointTable endpoints={turnSummary.endpoints} />

          {turnSummary.reportChart ? <ReportChart spec={turnSummary.reportChart} /> : null}



          <div>

            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">

              Step timeline

            </h3>

            <TraceTimeline message={message} />

          </div>



          <ReportRowsTable rows={message.reportRows} />

          <div>

            <button

              type="button"

              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"

              onClick={() => setRawOpen((o) => !o)}

            >

              {rawOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}

              Raw message JSON

            </button>

            {rawOpen ? (

              <div className="relative mt-2">

                <button

                  type="button"

                  className="absolute right-2 top-2 rounded bg-slate-800 p-1 text-slate-300 hover:bg-slate-700"

                  onClick={copyRaw}

                  title="Copy JSON"

                >

                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}

                </button>

                <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-400">

                  {JSON.stringify(message, null, 2)}

                </pre>

              </div>

            ) : null}

          </div>

        </div>

      ) : null}



      {!selected && !isUser ? (

        <p className="mt-2 text-xs text-slate-500">Message #{index + 1} — click to expand trace</p>

      ) : null}

    </article>

  );

}


