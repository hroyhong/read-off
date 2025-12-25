"use server";

import { revalidatePath } from "next/cache";
import type { DB } from "./lib/model";
import { createEmptyPlayer } from "./lib/model";
import { loadDB, saveDB } from "./lib/storage";

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
