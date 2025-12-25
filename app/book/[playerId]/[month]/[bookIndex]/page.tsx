"use client";

import { useOptimistic, startTransition, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateBookTitle, updateBookAuthor, updateBookTotalPages, updateBookCurrentPage, updateBookNotes } from "../../../../actions";
import { EditableText } from "../../../../components/EditableText";

interface PageProps {
  params: Promise<{
    playerId: string;
    month: string;
    bookIndex: string;
  }>;
}

// We need to fetch data on the client or pass it down. 
// Since this is a simple app, we can fetch the specific book data or just use the actions.
// However, to show initial data, we need to fetch it.
// Let's use a client component that fetches data via a server action or just passed in props if it was a server component.
// But `getData` is a server action. We can call it here.

import { getData } from "../../../../actions";
import type { Book } from "../../../../lib/model";

export default function BookPage({ params }: PageProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [ids, setIds] = useState<{playerId: string, month: number, bookIndex: number} | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then(async (resolvedParams) => {
      const playerId = resolvedParams.playerId;
      const month = parseInt(resolvedParams.month);
      const bookIndex = parseInt(resolvedParams.bookIndex);
      setIds({ playerId, month, bookIndex });

      const db = await getData();
      const player = db.players.find(p => p.id === playerId);
      const b = player?.months[month.toString()]?.books[bookIndex];
      
      if (b) {
        setBook(b);
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-gray-400 hover:text-black mb-8 block">
        ← Back to Dashboard
      </Link>

      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <EditableText
              initialValue={book.title}
              onSave={async (val) => {
                setBook(prev => prev ? { ...prev, title: val } : null);
                await updateBookTitle(playerId, month, bookIndex, val);
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

        <div className="flex gap-8 p-6 bg-gray-50 rounded-xl">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Current Page</label>
            <input
              type="number"
              value={book.currentPage || ""}
              onChange={async (e) => {
                const val = parseFloat(e.target.value);
                setBook(prev => prev ? { ...prev, currentPage: val } : null);
                await updateBookCurrentPage(playerId, month, bookIndex, val);
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
              onChange={async (e) => {
                const val = parseFloat(e.target.value);
                setBook(prev => prev ? { ...prev, totalPages: val } : null);
                await updateBookTotalPages(playerId, month, bookIndex, val);
              }}
              className="text-2xl font-mono font-medium bg-transparent border-b border-gray-300 focus:border-black outline-none w-24"
              placeholder="0"
            />
          </div>
          <div>
             <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Progress</label>
             <div className="text-2xl font-mono font-medium text-gray-400">
                {book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0}%
             </div>
          </div>
        </div>

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
