"use server";

import { revalidatePath } from "next/cache";
import type { DB } from "./lib/model";
import { createEmptyPlayer } from "./lib/model";
import { loadDB, saveDB } from "./lib/storage";
import { getAiRating } from "./lib/llm";

export async function getData(): Promise<DB> {
  return await loadDB();
}

// Helper to find player by ID
function findPlayer(db: DB, playerId: string) {
  return db.players.find(p => p.id === playerId);
}

// Action: 添加玩家
export async function addPlayer(name: string) {
  const db = await loadDB();
  const newPlayer = createEmptyPlayer(name || "New Player");
  db.players.push(newPlayer);
  await saveDB(db);
  revalidatePath("/");
  return newPlayer.id;
}

// Action: 删除玩家
export async function removePlayer(playerId: string) {
  const db = await loadDB();
  const idx = db.players.findIndex(p => p.id === playerId);
  if (idx !== -1 && db.players.length > 1) { // 至少保留一个玩家
    db.players.splice(idx, 1);
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 更新书名
export async function updateBookTitle(playerId: string, month: number, bookIndex: number, title: string) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    player.months[monthKey].books[bookIndex].title = (title ?? "").trim();
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 更新作者
export async function updateBookAuthor(playerId: string, month: number, bookIndex: number, author: string) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    player.months[monthKey].books[bookIndex].author = (author ?? "").trim();
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 切换完成状态
export async function toggleBookStatus(playerId: string, month: number, bookIndex: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    const book = player.months[monthKey].books[bookIndex];
    book.completed = !book.completed;
    if (book.completed) {
      book.currentPage = book.totalPages;
    }
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 修改名字
export async function updateName(playerId: string, name: string) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  if (player) {
    player.name = name;
    await saveDB(db);
    revalidatePath("/");
  }
}


// Action: 更新总页数
export async function updateBookTotalPages(playerId: string, month: number, bookIndex: number, totalPages: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    player.months[monthKey].books[bookIndex].totalPages = Math.max(0, Math.floor(totalPages));
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 更新当前页数
export async function updateBookCurrentPage(playerId: string, month: number, bookIndex: number, currentPage: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    player.months[monthKey].books[bookIndex].currentPage = Math.max(0, Math.floor(currentPage));
    await saveDB(db);
    revalidatePath("/");
  }
}


// Action: 更新笔记
export async function updateBookNotes(playerId: string, month: number, bookIndex: number, notes: string) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    player.months[monthKey].books[bookIndex].notes = notes;
    await saveDB(db);
    revalidatePath("/");
    revalidatePath(`/book/${playerId}/${month}/${bookIndex}`);
  }
}

// Action: AI 评分
export async function rateBook(playerId: string, month: number, bookIndex: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    const book = player.months[monthKey].books[bookIndex];
    
    // Collect context: titles of other rated books
    const contextBooks: string[] = [];
    db.players.forEach(p => {
      Object.values(p.months).forEach(m => {
        m.books.forEach(b => {
          if (b.aiScore && b.title) {
            contextBooks.push(`${b.title} (${b.aiScore})`);
          }
        });
      });
    });

    const rating = await getAiRating(book.title, book.author, contextBooks);
    


    book.aiScore = rating.score;
    book.intro = rating.intro;
    book.readingAdvice = rating.readingAdvice;
    book.scoreExplanation = rating.scoreExplanation;
    
    await saveDB(db);
    revalidatePath("/");
    revalidatePath(`/book/${playerId}/${month}/${bookIndex}`);
    return rating;
  }
}

// Action: 添加额外的书
export async function addExtraBook(playerId: string, month: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]) {
    player.months[monthKey].books.push({
      id: Math.random().toString(36).substring(2, 9),
      title: "",
      author: "",
      completed: false,
      totalPages: 0,
      currentPage: 0,
      startingPage: 0,
      notes: "",
    });
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 删除书
export async function removeBook(playerId: string, month: number, bookIndex: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    player.months[monthKey].books.splice(bookIndex, 1);
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: Toggle reading date
export async function toggleReadingDate(playerId: string, date: string) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  
  if (player) {
    const index = player.readingDates.indexOf(date);
    if (index > -1) {
      // Remove date
      player.readingDates.splice(index, 1);
    } else {
      // Add date
      player.readingDates.push(date);
    }
    await saveDB(db);
    revalidatePath(`/player/${playerId}`);
  }
}

// Action: Detect and set book continuation
export async function detectBookContinuation(playerId: string, month: number, bookIndex: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    const book = player.months[monthKey].books[bookIndex];
    
    // Search previous months for same book title
    let previousProgress = 0;
    for (let m = month - 1; m >= 0; m--) {
      const prevMonthData = player.months[m.toString()];
      if (prevMonthData) {
        const matchingBook = prevMonthData.books.find(b => 
          b.title.trim().toLowerCase() === book.title.trim().toLowerCase() && b.title.trim() !== ""
        );
        if (matchingBook) {
          previousProgress = matchingBook.currentPage;
          break;
        }
      }
    }
    
    book.startingPage = previousProgress;
    await saveDB(db);
    revalidatePath("/");
    revalidatePath(`/book/${playerId}/${month}/${bookIndex}`);
  }
}

// Action: Copy book from previous month
export async function copyBookFromPreviousMonth(playerId: string, month: number, bookIndex: number) {
  const db = await loadDB();
  const player = findPlayer(db, playerId);
  const monthKey = month.toString();
  
  if (player?.months[monthKey]?.books[bookIndex]) {
    const book = player.months[monthKey].books[bookIndex];
    
    // Search previous months for same book title
    for (let m = month - 1; m >= 0; m--) {
      const prevMonthData = player.months[m.toString()];
      if (prevMonthData) {
        const matchingBook = prevMonthData.books.find(b => 
          b.title.trim().toLowerCase() === book.title.trim().toLowerCase() && b.title.trim() !== ""
        );
        
        if (matchingBook) {
          // Copy all data from previous month
          book.author = matchingBook.author;
          book.totalPages = matchingBook.totalPages;
          book.startingPage = matchingBook.currentPage;
          book.aiScore = matchingBook.aiScore;
          book.intro = matchingBook.intro;
          book.readingAdvice = matchingBook.readingAdvice;
          book.scoreExplanation = matchingBook.scoreExplanation;
          
          await saveDB(db);
          revalidatePath("/");
          revalidatePath(`/book/${playerId}/${month}/${bookIndex}`);
          return true; // Found and copied
        }
      }
    }
  }
  return false; // Not found
}
