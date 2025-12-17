"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";

const DB_PATH = path.join(process.cwd(), "data.json");

// 默认月份配置
// 0 代表 2025年12月
const MONTHLY_TARGETS: Record<number, number> = {
  0: 1, // 2025年12月，1本
  1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 4, 
  7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4
};

// 数据类型定义
export type Book = {
  id: string;
  title: string;
  author?: string; // 新增作者字段，可选
  completed: boolean;
};

export type MonthData = {
  books: Book[];
  switches: number;
};

export type PlayerData = {
  name: string;
  months: Record<string, MonthData>;
};

export type DB = {
  player1: PlayerData;
  player2: PlayerData;
};

// 初始化月份数据 helper
function ensureMonthData(playerData: PlayerData, month: number) {
  const monthKey = month.toString();
  if (!playerData.months[monthKey]) {
    playerData.months[monthKey] = {
      books: Array.from({ length: MONTHLY_TARGETS[month] }).map(() => ({
        id: Math.random().toString(36).substring(7),
        title: "",
        author: "",
        completed: false
      })),
      switches: 0
    };
  } else {
    // 确保所有书都有 id 和 author
    // 这是为了修复旧数据可能缺少字段的问题
    playerData.months[monthKey].books = playerData.months[monthKey].books.map((book) => ({
      ...book,
      // 兼容旧数据：title 可能是 " "（纯空白），会导致前端占位符不显示且难以点击
      title: typeof book.title === "string" && book.title.trim().length > 0 ? book.title : "",
      author: typeof book.author === "string" && book.author.trim().length > 0 ? book.author : "",
      id: book.id || Math.random().toString(36).substring(7),
    }));
  }
  return playerData;
}

// 读取数据
export async function getData(): Promise<DB> {
  try {
    const data = await fs.readFile(DB_PATH, "utf-8");
    const db = JSON.parse(data) as DB;
    
    let changed = false;

    // 预填充到12月的数据结构，方便查看
    // 注意：现在我们从 0 开始
    for (let m = 0; m <= 12; m++) {
        // 这里需要更严谨：不仅是 month key 不存在，如果数据结构不完整也要修复
        // ensureMonthData 会处理这两种情况
        
        // 我们需要重新赋值给 db 对象，因为 ensureMonthData 可能会修改内部对象但返回的是 playerData 引用
        // 其实引用修改就够了，但为了明确逻辑：
        ensureMonthData(db.player1, m);
        ensureMonthData(db.player2, m);
        
        // 实际上每次都保存可能性能不好，但这里是本地文件，且为了确保数据结构更新
        changed = true;
    }
    
    if (changed) {
      await saveData(db);
    }
    
    return db;
  } catch (error) {
    // 如果文件不存在，返回初始数据
    return {
      player1: { name: "我", months: {} },
      player2: { name: "朋友", months: {} }
    };
  }
}

// 保存数据
async function saveData(data: DB) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Action: 更新书名
export async function updateBookTitle(player: "player1" | "player2", month: number, bookIndex: number, title: string) {
  const db = await getData();
  const monthKey = month.toString();
  
  if (db[player].months[monthKey]?.books[bookIndex]) {
    db[player].months[monthKey].books[bookIndex].title = (title ?? "").trim();
    await saveData(db);
    revalidatePath("/");
  }
}

// Action: 更新作者
export async function updateBookAuthor(player: "player1" | "player2", month: number, bookIndex: number, author: string) {
  const db = await getData();
  const monthKey = month.toString();
  
  if (db[player].months[monthKey]?.books[bookIndex]) {
    db[player].months[monthKey].books[bookIndex].author = (author ?? "").trim();
    await saveData(db);
    revalidatePath("/");
  }
}

// Action: 切换完成状态
export async function toggleBookStatus(player: "player1" | "player2", month: number, bookIndex: number) {
  const db = await getData();
  const monthKey = month.toString();
  
  if (db[player].months[monthKey]?.books[bookIndex]) {
    const book = db[player].months[monthKey].books[bookIndex];
    // 移除书名检查，允许随时勾选
    book.completed = !book.completed;
    await saveData(db);
    revalidatePath("/");
  }
}

// Action: 修改名字
export async function updateName(player: "player1" | "player2", name: string) {
    const db = await getData();
    db[player].name = name;
    await saveData(db);
    revalidatePath("/");
}
