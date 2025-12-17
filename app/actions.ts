"use server";

import { revalidatePath } from "next/cache";
import type { DB } from "./lib/model";
import { loadDB, saveDB } from "./lib/storage";

export async function getData(): Promise<DB> {
  return await loadDB();
}

// Action: 更新书名
export async function updateBookTitle(player: "player1" | "player2", month: number, bookIndex: number, title: string) {
  const db = await loadDB();
  const monthKey = month.toString();
  
  if (db[player].months[monthKey]?.books[bookIndex]) {
    db[player].months[monthKey].books[bookIndex].title = (title ?? "").trim();
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 更新作者
export async function updateBookAuthor(player: "player1" | "player2", month: number, bookIndex: number, author: string) {
  const db = await loadDB();
  const monthKey = month.toString();
  
  if (db[player].months[monthKey]?.books[bookIndex]) {
    db[player].months[monthKey].books[bookIndex].author = (author ?? "").trim();
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 切换完成状态
export async function toggleBookStatus(player: "player1" | "player2", month: number, bookIndex: number) {
  const db = await loadDB();
  const monthKey = month.toString();
  
  if (db[player].months[monthKey]?.books[bookIndex]) {
    const book = db[player].months[monthKey].books[bookIndex];
    // 移除书名检查，允许随时勾选
    book.completed = !book.completed;
    await saveDB(db);
    revalidatePath("/");
  }
}

// Action: 修改名字
export async function updateName(player: "player1" | "player2", name: string) {
    const db = await loadDB();
    db[player].name = name;
    await saveDB(db);
    revalidatePath("/");
}
