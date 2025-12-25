"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateName, getData } from "../../actions";
import { EditableText } from "../../components/EditableText";
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

  // First pass: count unfinished books with scores
  Object.values(player.months).forEach(month => {
    month.books.forEach(b => {
      if (b.aiScore && !b.completed) unfinishedCount++;
    });
  });

  // Second pass: calculate all stats
  Object.values(player.months).forEach(month => {
    totalBooks += month.books.length;
    totalCompleted += month.books.filter(b => b.completed).length;
    totalPagesRead += month.books.reduce((sum, b) => sum + (b.completed ? b.totalPages : b.currentPage), 0);
    
    month.books.forEach(b => {
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
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Total Pages</div>
            <div className="text-3xl font-bold">{totalPagesRead}</div>
          </div>
          <div className="p-6 bg-gray-50 rounded-xl">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Reader Score</div>
            <div className="text-3xl font-bold">{Math.round(readerScore)} <span className="text-lg text-gray-400 font-normal">pts</span></div>
          </div>
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
