export const TARGET_YEAR = 2026;

// 0 代表 2025年12月（预热月）
export const MONTHLY_TARGETS: Record<number, number> = {
  0: 1,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 4,
  6: 4,
  7: 4,
  8: 4,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
};

export type Book = {
  id: string;
  title: string;
  author: string;
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

function makeId() {
  return Math.random().toString(36).substring(7);
}

export function createEmptyDB(): DB {
  const db: DB = {
    player1: { name: "我", months: {} },
    player2: { name: "朋友", months: {} },
  };
  normalizeDBInPlace(db);
  return db;
}

export function normalizeDBInPlace(db: DB) {
  const normalizeBook = (raw: unknown): Book => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const id = typeof b.id === "string" && b.id ? b.id : makeId();
    const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : "";
    const author = typeof b.author === "string" && b.author.trim() ? b.author.trim() : "";
    const completed = !!b.completed;
    return { id, title, author, completed };
  };

  for (const player of ["player1", "player2"] as const) {
    if (!db[player]) {
      db[player] = { name: player === "player1" ? "我" : "朋友", months: {} };
    }
    if (!db[player].months) db[player].months = {};

    for (let m = 0; m <= 12; m++) {
      const monthKey = String(m);
      if (!db[player].months[monthKey]) {
        db[player].months[monthKey] = {
          books: Array.from({ length: MONTHLY_TARGETS[m] }).map(() => ({
            id: makeId(),
            title: "",
            author: "",
            completed: false,
          })),
          switches: 0,
        };
        continue;
      }

      // 修复旧数据字段缺失/纯空白问题
      const monthData = db[player].months[monthKey];
      if (!Array.isArray(monthData.books)) monthData.books = [];
      monthData.books = (monthData.books as unknown[]).map(normalizeBook);

      // 如果 books 数量不够，补齐；如果多了，截断（保持规则一致）
      const need = MONTHLY_TARGETS[m];
      if (monthData.books.length < need) {
        monthData.books.push(
          ...Array.from({ length: need - monthData.books.length }).map(() => ({
            id: makeId(),
            title: "",
            author: "",
            completed: false,
          }))
        );
      }
      if (monthData.books.length > need) {
        monthData.books = monthData.books.slice(0, need);
      }

      if (typeof monthData.switches !== "number") monthData.switches = 0;
    }
  }
}


