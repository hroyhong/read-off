"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updateBookTitle, updateBookAuthor, updateBookTotalPages, updateBookCurrentPage, updateBookNotes, rateBook, getData, detectBookContinuation } from "../../../../actions";
import { EditableText } from "../../../../components/EditableText";
import type { Book, PlayerData } from "../../../../lib/model";

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
        
        // Calculate reader score for this player
        let score = 0;
        let unfinishedCount = 0;
        Object.values(p.months).forEach(monthData => {
          monthData.books.forEach(bk => {
            if (bk.aiScore && !bk.completed) unfinishedCount++;
          });
        });
        Object.values(p.months).forEach(monthData => {
          monthData.books.forEach(bk => {
            if (bk.aiScore) {
              if (bk.completed) {
                score += bk.aiScore;
              } else {
                const progress = bk.totalPages > 0 ? bk.currentPage / bk.totalPages : 0;
                const dilution = 1 / (1 + Math.log(unfinishedCount + 1));
                score += bk.aiScore * progress * dilution;
              }
            }
          });
        });
        setReaderScore(Math.round(score));
      }
      setLoading(false);
    });
  }, [params]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!book || !ids) return <div className="p-8">Book not found</div>;

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
      // Import the new action
      const { copyBookFromPreviousMonth } = await import("../../../../actions");
      
      // Try to copy from previous month
      const foundPrevious = await copyBookFromPreviousMonth(playerId, month, bookIndex);
      
      if (foundPrevious) {
        // Refresh book data
        const db = await getData();
        const p = db.players.find(p => p.id === playerId);
        const b = p?.months[month.toString()]?.books[bookIndex];
        if (b) {
          setBook(b);
        }
      } else {
        // New book - proceed with AI rating
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
    <div className="min-h-screen bg-white text-gray-900 font-sans p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-black">
          ← Back to Dashboard
        </Link>
        <div className="text-right">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Reader Score</div>
          <div className="text-xl font-bold font-mono">{readerScore} pts</div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Month Badge */}
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {month === 0 ? 'Dec 2025' : `Month ${month}`}
          </span>
          {book.completed && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
              ✓ Completed
            </span>
          )}
        </div>

        {/* Title & Author */}
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <EditableText
              initialValue={book.title}
              onSave={async (val) => {
                setBook(prev => prev ? { ...prev, title: val } : null);
                await updateBookTitle(playerId, month, bookIndex, val);
                // Detect if this is a continuation
                await detectBookContinuation(playerId, month, bookIndex);
                // Refresh book data
                const db = await getData();
                const p = db.players.find(p => p.id === playerId);
                const b = p?.months[month.toString()]?.books[bookIndex];
                if (b) setBook(b);
              }}
              placeholder="Book Title"
              className="w-full"
            />
          </h1>
          <div className="text-xl text-gray-500">
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

        {/* Progress Section with Read Button */}
        <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-xl">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Current Page</label>
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
              className="text-2xl font-mono font-medium bg-transparent border-b border-gray-300 focus:border-black outline-none w-24"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Total Pages</label>
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
              className="text-2xl font-mono font-medium bg-transparent border-b border-gray-300 focus:border-black outline-none w-24"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Progress</label>
            <div className="text-2xl font-mono font-medium text-gray-400">{progress}%</div>
          </div>
          
          {/* Show continuation info if startingPage > 0 */}
          {book.startingPage > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">This Month</label>
              <div className="text-sm text-gray-500">
                Pages {book.startingPage + 1}-{book.currentPage} ({book.currentPage - book.startingPage} pages)
              </div>
            </div>
          )}
          
          {/* Read Button */}
          <div className="ml-auto">
            <button
              onClick={handleRead}
              disabled={analyzing || !book.title}
              className="px-6 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {analyzing ? "Reading..." : "Read"}
            </button>
          </div>
        </div>

        {/* AI Analysis Results - Only show after Read */}
        {book.aiScore && (
          <div className="space-y-6">
            {/* Book Score + Intro */}
            <div className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-6">
                <div className="text-center flex-shrink-0">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Book Score</div>
                  <div className="text-4xl font-bold text-black">{book.aiScore}</div>
                </div>
                <div className="flex-grow">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Introduction</div>
                  <p className="text-gray-700 leading-relaxed">{book.intro}</p>
                </div>
              </div>
            </div>

            {/* Reading Advice */}
            {book.readingAdvice && (
              <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                <div className="text-xs text-green-600 uppercase tracking-wider mb-2">Reading Advice</div>
                <p className="text-gray-700 leading-relaxed">{book.readingAdvice}</p>
              </div>
            )}

            {/* Score Explanation */}
            {book.scoreExplanation && (
              <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="text-xs text-yellow-700 uppercase tracking-wider mb-2">Why This Score?</div>
                <p className="text-gray-700 leading-relaxed">{book.scoreExplanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Notes & Reviews</label>
          <textarea
            value={book.notes || ""}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="w-full h-64 p-4 bg-gray-50 rounded-xl border-none resize-none focus:ring-1 focus:ring-black outline-none text-base leading-relaxed"
            placeholder="Write your thoughts here..."
          />
        </div>
      </div>
    </div>
  );
}

