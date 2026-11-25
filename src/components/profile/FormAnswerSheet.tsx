import React, { useState } from 'react';
import {
  ArrowDownLeft,
  Check,
  Copy,
  FileCheck2,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  formatAllAnswersForClipboard,
  type FormQuestionCard,
} from '../../services/profilePromptService.ts';

interface FormAnswerSheetProps {
  cards: FormQuestionCard[];
  onInsertAnswer?: (text: string) => void;
  onRefineQuestion?: (questionIndex: number, refinementPrompt: string) => void;
}

export const FormAnswerSheet: React.FC<FormAnswerSheetProps> = ({
  cards,
  onInsertAnswer,
  onRefineQuestion,
}) => {
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [insertedCardId, setInsertedCardId] = useState<string | null>(null);

  const handleCopyCard = async (card: FormQuestionCard) => {
    try {
      await navigator.clipboard.writeText(card.answer);
      setCopiedCardId(card.id);
      setTimeout(() => setCopiedCardId(null), 1800);
    } catch {
      // Clipboard write failed
    }
  };

  const handleCopyAll = async () => {
    try {
      const fullText = formatAllAnswersForClipboard(cards);
      await navigator.clipboard.writeText(fullText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  const handleInsert = (card: FormQuestionCard) => {
    if (onInsertAnswer) {
      onInsertAnswer(card.answer);
      setInsertedCardId(card.id);
      setTimeout(() => setInsertedCardId(null), 1500);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Answer Sheet Header */}
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-blue-500/10 px-3 py-2 border border-indigo-500/20">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <FileCheck2 className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Form Answer Sheet
              </h3>
              <span className="rounded-full bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                {cards.length} {cards.length === 1 ? 'Question' : 'Questions'} Detected
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Tailored answers grounded in your verified career profile
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          title="Copy all answers to clipboard"
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
            copiedAll
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white/90 text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15'
          }`}
        >
          {copiedAll ? (
            <>
              <Check className="h-3 w-3 stroke-[2.5]" />
              <span>Copied All!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy All</span>
            </>
          )}
        </button>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {cards.map((card) => {
          const isCopied = copiedCardId === card.id;
          const isInserted = insertedCardId === card.id;

          return (
            <div
              key={card.id}
              className="group relative flex flex-col rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-xs transition-all hover:border-indigo-400/40 hover:shadow-sm dark:border-white/10 dark:bg-[#121824]/90 dark:hover:border-indigo-400/30"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded bg-indigo-500/15 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      Q{card.index}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      {card.question}
                    </h4>
                  </div>
                  {card.limit && (
                    <span className="inline-block mt-1 rounded bg-amber-500/15 px-1.5 py-0.2 text-[9px] font-medium text-amber-700 dark:text-amber-300">
                      Limit: {card.limit}
                    </span>
                  )}
                </div>
              </div>

              {/* Answer Box */}
              <div className="rounded-lg bg-slate-50 dark:bg-black/30 p-2.5 border border-slate-200/60 dark:border-white/5">
                <p className="text-[12px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap select-all">
                  {card.answer}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 dark:border-white/5 text-[10px]">
                {/* Telemetry */}
                <span className="font-mono text-slate-400 dark:text-slate-500">
                  {card.chars} chars · {card.words} words
                </span>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {onRefineQuestion && (
                    <button
                      type="button"
                      onClick={() =>
                        onRefineQuestion(
                          card.index,
                          `Rewrite Q${card.index} answer to be more concise (under 100 words), keeping my key metrics.`
                        )
                      }
                      title="Make this specific answer shorter"
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                    >
                      <Zap className="h-2.5 w-2.5 text-amber-500" />
                      <span>Shorter</span>
                    </button>
                  )}

                  {onInsertAnswer && (
                    <button
                      type="button"
                      onClick={() => handleInsert(card)}
                      title="Insert this answer into chat textarea"
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-all ${
                        isInserted
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700 dark:bg-white/8 dark:text-slate-300 dark:hover:bg-sky-900/40 dark:hover:text-sky-300'
                      }`}
                    >
                      {isInserted ? (
                        <>
                          <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                          <span>Inserted!</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownLeft className="h-2.5 w-2.5" />
                          <span>Insert</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyCard(card)}
                    title="Copy this answer to clipboard"
                    className={`flex items-center gap-1 rounded-md px-2.5 py-0.5 font-semibold transition-all ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 active:scale-95 shadow-xs'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-2.5 w-2.5" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
