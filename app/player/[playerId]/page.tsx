"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateName, getData, toggleReadingDate, removePlayer } from "../../actions";
import { EditableText } from "../../components/EditableText";
import { Calendar } from "../../components/Calendar";
import type { PlayerData } from "../../lib/model";
import { bookScore } from "../../lib/scoring";

interface PageProps {
  params: Promise<{
    playerId: string;
  }>;
}

export default function PlayerPage({ params }: PageProps) {
  const router = useRouter();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    params.then(async (resolvedParams) => {
      setPlayerId(resolvedParams.playerId);
      const db = await getData();
      setPlayerCount(db.players.length);
      const p = db.players.find(p => p.id === resolvedParams.playerId);
      if (p) {
        setPlayer(p);
      }
      setLoading(false);
    });
  }, [params]);

  if (loading) return <div className="min-h-screen bg-parchment p-6 text-ink-3">Loading...</div>;
  if (!player || !playerId) return <div className="min-h-screen bg-parchment p-6 text-ink-3">Player not found</div>;

  let totalBooks = 0;
  let totalCompleted = 0;
  let totalPagesRead = 0;
  let readerScore = 0;

  Object.entries(player.months).forEach(([m, monthData]) => {
    const monthInt = parseInt(m);
    totalBooks += monthData.books.length;
    totalCompleted += monthData.books.filter(b => b.completed).length;
    totalPagesRead += monthData.books.reduce((sum, b) => {
      return sum + ((b.currentPage || 0) - (b.startingPage || 0));
    }, 0);

    if (monthInt === 0) return;
    readerScore += monthData.books.reduce((sum, b) => sum + bookScore(b), 0);
  });

  const sortedDates = [...player.readingDates].sort();
  const totalDaysRead = sortedDates.length;

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i <= 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    if (sortedDates.includes(dateStr)) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  sortedDates.forEach(dateStr => {
    const date = new Date(dateStr);
    if (prevDate) {
      const diffDays = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    prevDate = date;
  });
  longestStreak = Math.max(longestStreak, tempStreak);

  const handleToggleDate = async (date: string) => {
    await toggleReadingDate(playerId, date);
    const db = await getData();
    const p = db.players.find(p => p.id === playerId);
    if (p) {
      setPlayer(p);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <div className="max-w-2xl mx-auto px-6 py-8 md:px-8 md:py-10">
        <Link href="/" className="text-xs text-ink-3 hover:text-ink transition-colors mb-6 md:mb-8 block">
          ← Back
        </Link>

        <div className="space-y-6 md:space-y-8">
          {/* Name */}
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1">
              <EditableText
                initialValue={player.name}
                onSave={async (val) => {
                  setPlayer(prev => prev ? { ...prev, name: val } : null);
                  await updateName(playerId, val);
                }}
                placeholder="Player Name"
                className="w-full"
              />
            </h1>
            <div className="text-sm text-ink-3">Player Profile</div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="p-4 md:p-5 bg-card rounded-xl border border-rule">
              <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Books Read</div>
              <div className="text-2xl md:text-3xl font-display font-bold">{totalCompleted} <span className="text-base text-ink-3 font-normal">/ {totalBooks}</span></div>
            </div>
            <div className="p-4 md:p-5 bg-card rounded-xl border border-rule">
              <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Pages Read</div>
              <div className="text-2xl md:text-3xl font-display font-bold">{totalPagesRead}</div>
            </div>
            <div className="p-4 md:p-5 bg-card rounded-xl border border-rule col-span-2 md:col-span-1">
              <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Reader Score</div>
              <div className="text-2xl md:text-3xl font-display font-bold">{Math.round(readerScore)} <span className="text-base text-ink-3 font-normal">pts</span></div>
            </div>
          </div>

          {/* Reading Calendar */}
          <div className="space-y-4">
            <h2 className="text-base font-display font-semibold">Reading Calendar</h2>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 md:p-4 bg-card rounded-xl border border-rule">
                <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Days Read</div>
                <div className="text-xl md:text-2xl font-display font-bold">{totalDaysRead}</div>
              </div>
              <div className="p-3 md:p-4 bg-card rounded-xl border border-rule">
                <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Streak</div>
                <div className="text-xl md:text-2xl font-display font-bold">{currentStreak}</div>
              </div>
              <div className="p-3 md:p-4 bg-card rounded-xl border border-rule">
                <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Best</div>
                <div className="text-xl md:text-2xl font-display font-bold">{longestStreak}</div>
              </div>
            </div>

            <Calendar
              readingDates={player.readingDates}
              onToggleDate={handleToggleDate}
            />
          </div>

          {/* Book List by Month */}
          <div className="space-y-5">
            <h2 className="text-base font-display font-semibold">All Books</h2>
            {Object.entries(player.months).map(([monthKey, monthData]) => (
              <div key={monthKey}>
                <div className="text-xs text-ink-3 uppercase tracking-wider mb-2">
                  {monthKey === '0' ? 'Dec 2025' : `Month ${monthKey}`}
                </div>
                <div className="space-y-1.5">
                  {monthData.books.map((book, idx) => (
                    <Link
                      key={book.id || idx}
                      href={`/book/${playerId}/${monthKey}/${idx}`}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-rule hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={book.completed ? 'text-pass' : 'text-ink-3'}>✓</span>
                        <span className={`truncate ${book.title ? '' : 'text-ink-3'}`}>{book.title || 'Untitled'}</span>
                      </div>
                      {book.aiScore && (
                        <span className="text-base font-display font-bold text-ink-3 flex-shrink-0 ml-2">{book.aiScore}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Remove Player */}
          <div className="pt-6 border-t border-rule">
            <button
              onClick={async () => {
                if (playerCount <= 1) {
                  alert("Cannot remove the last player");
                  return;
                }
                if (confirm(`Remove ${player.name}? This cannot be undone.`)) {
                  await removePlayer(playerId);
                  router.push("/");
                }
              }}
              className="text-xs text-ink-3 hover:text-penalty transition-colors"
            >
              Remove Player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
