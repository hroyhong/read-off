"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateName, getData, toggleReadingDate } from "../../actions";
import { EditableText } from "../../components/EditableText";
import { Calendar } from "../../components/Calendar";
import type { PlayerData } from "../../lib/model";

interface PageProps {
  params: Promise<{
    playerId: string;
  }>;
}

export default function PlayerPage({ params }: PageProps) {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    params.then(async (resolvedParams) => {
      setPlayerId(resolvedParams.playerId);
      const db = await getData();
      const p = db.players.find(p => p.id === resolvedParams.playerId);
      if (p) {
        setPlayer(p);
      }
      setLoading(false);
    });
  }, [params]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!player || !playerId) return <div className="p-8">Player not found</div>;

  // Calculate stats
  let totalBooks = 0;
  let totalCompleted = 0;
  let totalPagesRead = 0;
  let readerScore = 0;
  let unfinishedCount = 0;

  // First pass: count unfinished books with scores - Skip month 0
  Object.entries(player.months).forEach(([m, monthData]) => {
    if (parseInt(m) === 0) return;
    monthData.books.forEach(b => {
      if (b.aiScore && !b.completed) unfinishedCount++;
    });
  });

  // Second pass: calculate all stats
  Object.entries(player.months).forEach(([m, monthData]) => {
    const monthInt = parseInt(m);
    totalBooks += monthData.books.length;
    totalCompleted += monthData.books.filter(b => b.completed).length;
    totalPagesRead += monthData.books.reduce((sum, b) => sum + (b.currentPage || 0), 0);
    
    if (monthInt === 0) return; // Skip month 0 for scoring

    monthData.books.forEach(b => {
      if (b.aiScore) {
        if (b.completed) {
          readerScore += b.aiScore;
        } else {
          const progress = b.totalPages > 0 ? b.currentPage / b.totalPages : 0;
          const dilution = 1 / (1 + Math.log(unfinishedCount + 1));
          readerScore += b.aiScore * progress * dilution;
        }
      }
    });
  });

  // Calculate reading stats
  const sortedDates = [...player.readingDates].sort();
  const totalDaysRead = sortedDates.length;
  
  // Calculate current streak
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
  
  // Calculate longest streak
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
    // Refresh data
    const db = await getData();
    const p = db.players.find(p => p.id === playerId);
    if (p) {
      setPlayer(p);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-gray-400 hover:text-black mb-8 block">
        ← Back to Dashboard
      </Link>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
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
          <div className="text-gray-500">Player Profile</div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Books Read</div>
            <div className="text-3xl font-bold">{totalCompleted} <span className="text-lg text-gray-400 font-normal">/ {totalBooks}</span></div>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Total Pages Read</div>
            <div className="text-3xl font-bold">{totalPagesRead}</div>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Reader Score</div>
            <div className="text-3xl font-bold">{Math.round(readerScore)} <span className="text-lg text-gray-400 font-normal">pts</span></div>
          </div>
        </div>

        {/* Reading Calendar */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Reading Calendar</h2>
          
          {/* Reading Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Days Read</div>
              <div className="text-2xl font-bold">{totalDaysRead}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Current Streak</div>
              <div className="text-2xl font-bold">{currentStreak} 🔥</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Longest Streak</div>
              <div className="text-2xl font-bold">{longestStreak}</div>
            </div>
          </div>
          
          <Calendar 
            readingDates={player.readingDates}
            onToggleDate={handleToggleDate}
          />
        </div>

        {/* Book List by Month */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium">All Books</h2>
          {Object.entries(player.months).map(([monthKey, monthData]) => (
            <div key={monthKey}>
              <div className="text-sm text-gray-400 mb-2">
                {monthKey === '0' ? 'Dec 2025' : `Month ${monthKey}`}
              </div>
              <div className="space-y-2">
                {monthData.books.map((book, idx) => (
                  <Link 
                    key={book.id || idx} 
                    href={`/book/${playerId}/${monthKey}/${idx}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={book.completed ? 'text-green-500' : 'text-gray-300'}>✓</span>
                      <span className={book.title ? '' : 'text-gray-400'}>{book.title || 'Untitled'}</span>
                    </div>
                    {book.aiScore && (
                      <span className="text-lg font-bold text-gray-400">{book.aiScore}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
