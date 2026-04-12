"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updateBookTitle, updateBookAuthor, updateBookTotalPages, updateBookCurrentPage, updateBookNotes, rateBook, getData, detectBookContinuation } from "../../../../actions";
import { EditableText } from "../../../../components/EditableText";
import type { Book, PlayerData } from "../../../../lib/model";
import { bookScore as calcBookScore } from "../../../../lib/scoring";

interface PageProps {
  params: Promise<{
    playerId: string;
    month: string;
    bookIndex: string;
  }>;
}

export default function BookPage({ params }: PageProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [ids, setIds] = useState<{playerId: string, month: number, bookIndex: number} | null>(null);
  const [readerScore, setReaderScore] = useState(0);

  useEffect(() => {
    params.then(async (resolvedParams) => {
      const playerId = resolvedParams.playerId;
      const month = parseInt(resolvedParams.month);
      const bookIndex = parseInt(resolvedParams.bookIndex);
      setIds({ playerId, month, bookIndex });

      const db = await getData();
      const p = db.players.find(p => p.id === playerId);
      const b = p?.months[month.toString()]?.books[bookIndex];

      if (b && p) {
        setBook(b);
        setPlayer(p);

        let score = 0;
        Object.entries(p.months).forEach(([m, monthData]) => {
          if (parseInt(m) === 0) return;
          score += monthData.books.reduce((sum, bk) => sum + calcBookScore(bk), 0);
        });
        setReaderScore(Math.round(score));
      }
      setLoading(false);
    });
  }, [params]);

  if (loading) return <div className="min-h-screen bg-parchment p-6 text-ink-3">Loading...</div>;
  if (!book || !ids) return <div className="min-h-screen bg-parchment p-6 text-ink-3">Book not found</div>;

  const { playerId, month, bookIndex } = ids;

  const handleNotesChange = async (val: string) => {
    setBook(prev => prev ? { ...prev, notes: val } : null);
    await updateBookNotes(playerId, month, bookIndex, val);
  };

  const handleRead = async () => {
    if (!book.title) {
      alert("Please enter a book title first.");
      return;
    }
    setAnalyzing(true);
    try {
      const { copyBookFromPreviousMonth } = await import("../../../../actions");
      const foundPrevious = await copyBookFromPreviousMonth(playerId, month, bookIndex);

      if (foundPrevious) {
        const db = await getData();
        const p = db.players.find(p => p.id === playerId);
        const b = p?.months[month.toString()]?.books[bookIndex];
        if (b) setBook(b);
      } else {
        const rating = await rateBook(playerId, month, bookIndex);
        if (rating) {
          setBook(prev => prev ? {
            ...prev,
            aiScore: rating.score,
            intro: rating.intro,
            readingAdvice: rating.readingAdvice,
            scoreExplanation: rating.scoreExplanation
          } : null);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to process book. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <div className="max-w-2xl mx-auto px-6 py-8 md:px-8 md:py-10">
        {/* Nav */}
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <Link href="/" className="text-xs text-ink-3 hover:text-ink transition-colors">
            ← Back
          </Link>
          <div className="text-right">
            <div className="text-[10px] text-ink-3 uppercase tracking-wider">Reader Score</div>
            <div className="text-base font-display font-bold">{readerScore} pts</div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          {/* Month Badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 bg-surface text-ink-2 text-xs rounded-full border border-rule">
              {month === 0 ? 'Dec 2025' : `Month ${month}`}
            </span>
            {book.completed && (
              <span className="px-3 py-1 bg-pass text-card text-xs rounded-full">
                Completed
              </span>
            )}
          </div>

          {/* Title & Author */}
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-1.5">
              <EditableText
                initialValue={book.title}
                onSave={async (val) => {
                  setBook(prev => prev ? { ...prev, title: val } : null);
                  await updateBookTitle(playerId, month, bookIndex, val);
                  await detectBookContinuation(playerId, month, bookIndex);
                  const db = await getData();
                  const p = db.players.find(p => p.id === playerId);
                  const b = p?.months[month.toString()]?.books[bookIndex];
                  if (b) setBook(b);
                }}
                placeholder="Book Title"
                className="w-full"
              />
            </h1>
            <div className="text-lg text-ink-2">
              <EditableText
                initialValue={book.author}
                onSave={async (val) => {
                  setBook(prev => prev ? { ...prev, author: val } : null);
                  await updateBookAuthor(playerId, month, bookIndex, val);
                }}
                placeholder="Author"
              />
            </div>
          </div>

          {/* Progress Section — stacks on mobile */}
          <div className="p-4 md:p-6 bg-card rounded-xl border border-rule">
            <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-6">
              <div>
                <label className="block text-[10px] text-ink-3 uppercase tracking-wider mb-1">Current Page</label>
                <input
                  type="number"
                  value={book.currentPage || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBook(prev => prev ? { ...prev, currentPage: val } : null);
                  }}
                  onBlur={async (e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      await updateBookCurrentPage(playerId, month, bookIndex, val);
                    }
                  }}
                  className="text-xl md:text-2xl font-mono font-medium bg-transparent border-b border-rule focus:border-ink w-full md:w-24"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink-3 uppercase tracking-wider mb-1">Total Pages</label>
                <input
                  type="number"
                  value={book.totalPages || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBook(prev => prev ? { ...prev, totalPages: val } : null);
                  }}
                  onBlur={async (e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) {
                      await updateBookTotalPages(playerId, month, bookIndex, val);
                    }
                  }}
                  className="text-xl md:text-2xl font-mono font-medium bg-transparent border-b border-rule focus:border-ink w-full md:w-24"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] text-ink-3 uppercase tracking-wider mb-1">Progress</label>
                <div className="text-xl md:text-2xl font-mono font-medium text-ink-2">{progress}%</div>
              </div>

              {book.startingPage > 0 && (
                <div>
                  <label className="block text-[10px] text-ink-3 uppercase tracking-wider mb-1">This Month</label>
                  <div className="text-sm text-ink-2">
                    p.{book.startingPage + 1}–{book.currentPage} ({book.currentPage - book.startingPage}p)
                  </div>
                </div>
              )}

              <div className="col-span-2 md:col-span-1 md:ml-auto">
                <button
                  onClick={handleRead}
                  disabled={analyzing || !book.title}
                  className="w-full md:w-auto px-6 py-2.5 bg-ink text-card text-sm font-medium rounded-lg hover:bg-ink-2 disabled:opacity-40 transition-colors"
                >
                  {analyzing ? "Reading..." : "Read"}
                </button>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          {book.aiScore && (
            <div className="space-y-4 md:space-y-6">
              <div className="p-4 md:p-6 bg-card rounded-xl border border-rule">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="text-center flex-shrink-0">
                    <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Score</div>
                    <div className="text-3xl md:text-4xl font-display font-bold">{book.aiScore}</div>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="text-[10px] text-ink-3 uppercase tracking-wider mb-1.5">Introduction</div>
                    <p className="text-sm text-ink-2 leading-relaxed">{book.intro}</p>
                  </div>
                </div>
              </div>

              {book.readingAdvice && (
                <div className="p-4 md:p-6 bg-card rounded-xl border border-pass">
                  <div className="text-[10px] text-pass uppercase tracking-wider mb-1.5">Reading Advice</div>
                  <p className="text-sm text-ink-2 leading-relaxed">{book.readingAdvice}</p>
                </div>
              )}

              {book.scoreExplanation && (
                <div className="p-4 md:p-6 bg-card rounded-xl border border-rule">
                  <div className="text-[10px] text-ink-2 uppercase tracking-wider mb-1.5">Why This Score?</div>
                  <p className="text-sm text-ink-2 leading-relaxed">{book.scoreExplanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-display font-semibold mb-2">Notes & Reviews</label>
            <textarea
              value={book.notes || ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full h-48 md:h-64 p-4 bg-card rounded-xl border border-rule resize-none focus:ring-1 focus:ring-ink text-sm leading-relaxed"
              placeholder="Write your thoughts here..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
