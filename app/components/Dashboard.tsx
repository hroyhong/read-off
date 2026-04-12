"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import Link from "next/link";
import { EditableText } from "./EditableText";
import { DebouncedNumberInput } from "./DebouncedNumberInput";
import { updateBookTitle, updateName, toggleBookStatus, addPlayer, removePlayer, updateBookTotalPages, updateBookCurrentPage, addExtraBook, removeBook, detectBookContinuation, continueUnfinishedBooks } from "../actions";
import type { DB, PlayerData } from "../lib/model";
import { MONTHLY_TARGETS } from "../lib/model";
import { playerStats, monthStatus } from "../lib/scoring";
import katex from "katex";

const TARGET_YEAR = 2026;

interface DashboardProps {
  initialData: DB;
}

export default function Dashboard({ initialData }: DashboardProps) {
  const getShanghaiDate = () => {
    const s = new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" });
    return new Date(s);
  };

  const [now, setNow] = useState(getShanghaiDate());

  useEffect(() => {
    const timer = setInterval(() => setNow(getShanghaiDate()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();

  let currentSimulatedMonth = 1;
  if (currentYear === 2025 && currentMonth === 12) {
    currentSimulatedMonth = 0;
  } else if (currentYear === 2026) {
    currentSimulatedMonth = currentMonth;
  } else if (currentYear > 2026) {
    currentSimulatedMonth = 12;
  } else {
    currentSimulatedMonth = 0;
  }

  const [activeMonth, setActiveMonth] = useState<number>(() => {
    return currentSimulatedMonth >= 0 && currentSimulatedMonth <= 12 ? currentSimulatedMonth : 1;
  });

  const [optimisticData, addOptimisticUpdate] = useOptimistic(
    initialData,
    (state: DB, update: { type: "TOGGLE_BOOK"; playerId: string; month: number; index: number }) => {
      if (update.type === "TOGGLE_BOOK") {
        return { ...state, players: state.players.map(p => {
          if (p.id !== update.playerId) return p;
          const monthKey = update.month.toString();
          return {
            ...p,
            months: {
              ...p.months,
              [monthKey]: {
                ...p.months[monthKey],
                books: p.months[monthKey].books.map((b, i) =>
                  i === update.index ? {
                    ...b,
                    completed: !b.completed,
                    currentPage: !b.completed ? b.totalPages : b.currentPage
                  } : b
                )
              }
            }
          };
        })};
      }
      return state;
    }
  );

  const handleToggleBook = async (playerId: string, month: number, index: number) => {
    startTransition(() => {
      addOptimisticUpdate({ type: "TOGGLE_BOOK", playerId, month, index });
    });
    await toggleBookStatus(playerId, month, index);
  };

  const data = optimisticData;

  const calcStats = (player: PlayerData) =>
    playerStats(player, currentSimulatedMonth, activeMonth, currentYear, currentMonth, currentDay);

  const allStats = data.players.map(p => ({ player: p, stats: calcStats(p) }));
  const totalPenalty = allStats.reduce((sum, { stats }) => sum + stats.penalty, 0);
  const totalSystemScore = allStats.reduce((sum, { stats }) => sum + stats.totalScore, 0);

  const renderBookList = (player: PlayerData) => {
    const monthData = player.months[activeMonth.toString()];
    if (!monthData) return null;

    const prevMonthData = activeMonth > 0 ? player.months[(activeMonth - 1).toString()] : null;
    const currentTitles = new Set(monthData.books.map(b => b.title.trim().toLowerCase()).filter(Boolean));
    const unfinishedFromPrev = prevMonthData
      ? prevMonthData.books.filter(b => !b.completed && b.title.trim() !== "" && !currentTitles.has(b.title.trim().toLowerCase()))
      : [];

    return (
      <div className="space-y-2.5">
        {monthData.books.map((book, index) => {
          const progress = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
          return (
            <div key={book.id || index} className="group relative rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-card" />
              {progress > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-surface"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              )}

              <div className="relative p-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={book.completed}
                  onChange={() => handleToggleBook(player.id, activeMonth, index)}
                  className="w-4 h-4 rounded border-rule cursor-pointer flex-shrink-0 z-10"
                  style={{ accentColor: 'var(--color-ink)' }}
                />

                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`flex-grow min-w-0 ${book.completed ? 'opacity-40' : ''}`}>
                      <div className={`${book.completed ? 'line-through' : ''} truncate`}>
                        {book.title ? (
                          <Link href={`/book/${player.id}/${activeMonth}/${index}`} className="font-medium text-sm hover:underline decoration-ink-3 underline-offset-2">
                            {book.title}
                          </Link>
                        ) : (
                          <EditableText
                            initialValue=""
                            onSave={(val) => updateBookTitle(player.id, activeMonth, index, val)}
                            placeholder="Book title..."
                            className="font-medium text-sm bg-transparent"
                          />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-3 font-mono">
                        <DebouncedNumberInput
                          value={book.currentPage || 0}
                          onSave={(val) => updateBookCurrentPage(player.id, activeMonth, index, val)}
                          placeholder="0"
                          className="w-9 text-center bg-surface rounded px-1 py-0.5 border-none focus:ring-1 focus:ring-ink text-ink text-[11px] font-mono"
                        />
                        <span>/</span>
                        <DebouncedNumberInput
                          value={book.totalPages || 0}
                          onSave={(val) => updateBookTotalPages(player.id, activeMonth, index, val)}
                          placeholder="0"
                          className="w-9 text-center bg-surface rounded px-1 py-0.5 border-none focus:ring-1 focus:ring-ink text-ink text-[11px] font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {book.aiScore && (
                        <Link href={`/book/${player.id}/${activeMonth}/${index}`}>
                          <div className="text-xl font-display font-bold text-ink hover:text-ink-2 transition-colors">
                            {book.aiScore}
                          </div>
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Remove this book?")) {
                            removeBook(player.id, activeMonth, index);
                          }
                        }}
                        className="w-5 h-5 flex items-center justify-center text-ink-3 hover:text-penalty transition-colors text-sm leading-none opacity-0 group-hover:opacity-100"
                        title="Remove book"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {unfinishedFromPrev.length > 0 && (
          <button
            onClick={() => continueUnfinishedBooks(player.id, activeMonth)}
            className="w-full py-2.5 border border-dashed border-ink-3 rounded-lg text-xs text-ink-2 hover:border-ink hover:text-ink transition-colors"
          >
            Continue {unfinishedFromPrev.length} unfinished {unfinishedFromPrev.length === 1 ? 'book' : 'books'}
          </button>
        )}

        <button
          onClick={() => addExtraBook(player.id, activeMonth)}
          className="w-full py-2 border border-dashed border-rule rounded-lg text-xs text-ink-3 hover:border-ink-2 hover:text-ink-2 transition-colors"
        >
          + Add Book
        </button>

        <div className="pt-3 text-xs text-ink-3">
          {activeMonth === 0 ? "Warmup month — no penalty" :
            (() => {
              const isPast = currentSimulatedMonth > 0 && activeMonth < currentSimulatedMonth;
              const ms = monthStatus(monthData, activeMonth, isPast);
              if (!isPast) {
                return `Target: ${ms.targetBooks} books or ${ms.targetScore} pts`;
              } else if (ms.passed) {
                return <span className="text-pass">Passed</span>;
              } else {
                return <span className="text-penalty">Failed — ¥{Math.round(ms.penalty)} penalty</span>;
              }
            })()
          }
        </div>
      </div>
    );
  };

  const monthList = [0, ...Array.from({length: 12}, (_, i) => i + 1)];
  const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const gridCols = data.players.length <= 1 ? '' : data.players.length <= 2 ? 'md:grid-cols-2' : data.players.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4';

  const handleAddPlayer = async () => {
    const name = prompt("New player name:");
    if (name && name.trim()) {
      await addPlayer(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-ink selection:bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-8 md:px-8 md:py-12">

        {/* Header */}
        <header className="mb-8 md:mb-14 flex justify-between items-end">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Read Off</h1>
            <p className="text-xs text-ink-3 mt-0.5">{TARGET_YEAR} Reading Challenge</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-2">
              {MONTH_LABELS[now.getMonth() + 1]} {now.getDate()}, {now.getFullYear()}
            </div>
            <div className="mt-1.5">
              <div className="text-[10px] text-ink-3 uppercase tracking-wider">Penalty Pool</div>
              <div className="text-lg font-display font-semibold">¥{Math.round(totalPenalty)}</div>
            </div>
          </div>
        </header>

        {/* Player Cards */}
        <div className={`grid gap-4 md:gap-5 mb-4 ${gridCols}`}>
          {allStats.map(({ player, stats }) => (
            <div key={player.id} className="p-4 md:p-5 bg-card rounded-xl border border-rule space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <Link href={`/player/${player.id}`} className="font-medium hover:underline decoration-ink-3 underline-offset-2">
                    {player.name}
                  </Link>
                  <div className="text-[10px] text-ink-3 uppercase tracking-wider mt-0.5">Reader Score</div>
                </div>
                <div className="text-2xl md:text-3xl font-display font-bold leading-none">
                  {Math.round(stats.totalScore)}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-ink-3">
                  <span>Progress</span>
                  <span>{stats.completedCount}/{stats.targetCount}</span>
                </div>
                <div className="h-1 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink rounded-full transition-all duration-500"
                    style={{ width: `${(stats.completedCount / Math.max(1, stats.targetCount)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-1">
                <div className="flex gap-1.5">
                  <span className="text-ink-3">Payout</span>
                  <span className="text-pass font-medium">
                    ¥{stats.eligible && totalSystemScore > 0 ? Math.round(totalPenalty * (stats.totalScore / totalSystemScore)) : 0}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-ink-3">Penalty</span>
                  <span className={stats.penalty > 0 ? "text-penalty font-medium" : "text-ink-3"}>
                    ¥{Math.round(stats.penalty)}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-ink-3">Status</span>
                  <span className={stats.eligible ? "text-pass" : "text-ink-3"}>
                    {stats.eligible ? 'Eligible' : 'Not eligible'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleAddPlayer}
          className="text-xs text-ink-3 hover:text-ink-2 transition-colors mb-8 md:mb-12 block"
        >
          + Add Player
        </button>

        {/* Month Navigation */}
        <div className="mb-6 md:mb-10 overflow-x-auto no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
          <div className="flex gap-1 min-w-max">
            {monthList.map((m) => {
              const isActive = activeMonth === m;
              const isPast = m < currentSimulatedMonth;
              const isCurrent = m === currentSimulatedMonth;
              const label = m === 0 ? "Dec '25" : MONTH_LABELS[m];

              return (
                <button
                  key={m}
                  onClick={() => setActiveMonth(m)}
                  className={`text-xs transition-colors relative py-1.5 px-3 rounded-full whitespace-nowrap
                    ${isActive ? 'bg-ink text-card font-medium' : isPast ? 'text-ink-2 hover:bg-surface' : isCurrent ? 'text-ink font-medium hover:bg-surface' : 'text-ink-3 hover:bg-surface'}
                  `}
                >
                  {label}
                  {isCurrent && !isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ink" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Books Grid */}
        <div className={`grid gap-8 md:gap-12 ${gridCols}`}>
          {data.players.map((player) => {
            const pStats = allStats.find(s => s.player.id === player.id)?.stats;
            const monthData = player.months[activeMonth.toString()];
            const year = activeMonth === 0 ? 2025 : TARGET_YEAR;
            const m = activeMonth === 0 ? 12 : activeMonth;
            const daysInMonth = new Date(year, m, 0).getDate();
            const totalPages = monthData?.books.reduce((sum, b) => sum + (b.totalPages || 0), 0) || 0;
            const pagesRead = monthData?.books.reduce((sum, b) => sum + Math.max(0, (b.currentPage || 0) - (b.startingPage || 0)), 0) || 0;
            const remainingPages = Math.max(0, totalPages - pagesRead);
            const isCurrentMonth = activeMonth === currentSimulatedMonth;
            const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : daysInMonth;
            const daily = isCurrentMonth ? remainingPages / daysLeft : totalPages / daysInMonth;

            return (
              <div key={player.id}>
                <div className="flex items-end justify-between mb-4 pb-3 border-b border-rule">
                  <div>
                    <div className="text-sm font-medium text-ink-2">{player.name}</div>
                    <div className="text-[11px] text-ink-3 mt-0.5">{Math.ceil(daily)} pages / day</div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl md:text-3xl font-display font-bold">{Math.round(pStats?.monthlyScore || 0)}</span>
                    <span className="text-[10px] text-ink-3">pts</span>
                  </div>
                </div>
                {renderBookList(player)}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-16 md:mt-32 pt-8 md:pt-12 border-t border-rule text-xs text-ink-3 leading-relaxed space-y-4">
          <div>
            <p className="font-medium text-ink-2 mb-2">Rules</p>
            <p>Monthly targets: Jan 1, Feb 2, Mar 3, Apr–Dec 4 books</p>
            <p>Pass: complete target books OR reach target score (50 pts/book)</p>
            <p>Penalty: target score - your score</p>
            <p>Winners split the penalty pool</p>
          </div>
          <div className="pt-4 border-t border-rule">
            <p className="mb-2">Score Formula</p>
            <div
              dangerouslySetInnerHTML={{ __html: katex.renderToString(`\\text{Score} = \\sum_{i} B_i \\times P_i`, { throwOnError: false }) }}
            />
            <p className="mt-1">B = Book Score, P = Pages read this month / Total pages</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
