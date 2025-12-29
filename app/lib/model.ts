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
  totalPages: number;

  currentPage: number;

  notes: string;
  aiScore?: number;
  reasoning?: string;
  intro?: string;
  readingAdvice?: string;
  scoreExplanation?: string;
};

export type MonthData = {
  books: Book[];
  switches: number;
};

export type PlayerData = {
  id: string;
  name: string;
  months: Record<string, MonthData>;
};

// New DB structure: array of players
export type DB = {
  players: PlayerData[];
};

function makeId() {
  return Math.random().toString(36).substring(2, 9);
}

export function createEmptyPlayer(name: string): PlayerData {
  const player: PlayerData = {
    id: makeId(),
    name,
    months: {},
  };
  normalizePlayerMonths(player);
  return player;
}

export function createEmptyDB(): DB {
  return {
    players: [
      createEmptyPlayer("洪浩善"),
      createEmptyPlayer("王昊天"),
    ],
  };
}

function normalizePlayerMonths(player: PlayerData) {
  const normalizeBook = (raw: unknown): Book => {
    const b = (raw ?? {}) as Record<string, unknown>;
    const id = typeof b.id === "string" && b.id ? b.id : makeId();
    const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : "";
    const author = typeof b.author === "string" && b.author.trim() ? b.author.trim() : "";
    const completed = !!b.completed;
    const totalPages = typeof b.totalPages === "number" ? b.totalPages : 0;
    const currentPage = typeof b.currentPage === "number" ? b.currentPage : 0;
    const notes = typeof b.notes === "string" ? b.notes : "";
    const aiScore = typeof b.aiScore === "number" ? b.aiScore : undefined;
    const reasoning = typeof b.reasoning === "string" ? b.reasoning : undefined;
    const intro = typeof b.intro === "string" ? b.intro : undefined;
    const readingAdvice = typeof b.readingAdvice === "string" ? b.readingAdvice : undefined;
    const scoreExplanation = typeof b.scoreExplanation === "string" ? b.scoreExplanation : undefined;
    return { id, title, author, completed, totalPages, currentPage, notes, aiScore, reasoning, intro, readingAdvice, scoreExplanation };
  };

  if (!player.months) player.months = {};

  for (let m = 0; m <= 12; m++) {
    const monthKey = String(m);
    if (!player.months[monthKey]) {
      player.months[monthKey] = {
        books: Array.from({ length: MONTHLY_TARGETS[m] }).map(() => ({
          id: makeId(),
          title: "",
          author: "",
          completed: false,
          totalPages: 0,
          currentPage: 0,
          notes: "",
        })),
        switches: 0,
      };
      continue;
    }

    // 修复旧数据字段缺失/纯空白问题
    const monthData = player.months[monthKey];
    if (!Array.isArray(monthData.books)) monthData.books = [];
    monthData.books = (monthData.books as unknown[]).map(normalizeBook);

    // 如果 books 数量不够，补齐；不再截断多出的书
    const need = MONTHLY_TARGETS[m];
    if (monthData.books.length < need) {
      monthData.books.push(
        ...Array.from({ length: need - monthData.books.length }).map(() => ({
          id: makeId(),
          title: "",
          author: "",
          completed: false,
          totalPages: 0,
          currentPage: 0,
          notes: "",
        }))
      );
    }

    if (typeof monthData.switches !== "number") monthData.switches = 0;
  }
}

export function normalizeDBInPlace(db: DB) {
  // Handle migration from old format { player1, player2 } to new format { players }
  const oldDb = db as unknown as Record<string, unknown>;
  if (!Array.isArray(db.players)) {
    // Migration: convert old format to new
    const players: PlayerData[] = [];
    
    if (oldDb.player1 && typeof oldDb.player1 === "object") {
      const p1 = oldDb.player1 as Record<string, unknown>;
      players.push({
        id: makeId(),
        name: typeof p1.name === "string" ? p1.name : "Player 1",
        months: (p1.months as Record<string, MonthData>) || {},
      });
    }
    
    if (oldDb.player2 && typeof oldDb.player2 === "object") {
      const p2 = oldDb.player2 as Record<string, unknown>;
      players.push({
        id: makeId(),
        name: typeof p2.name === "string" ? p2.name : "Player 2",
        months: (p2.months as Record<string, MonthData>) || {},
      });
    }
    
    if (players.length === 0) {
      players.push(createEmptyPlayer("洪浩善"), createEmptyPlayer("王昊天"));
    }
    
    db.players = players;
    // Clean up old format
    delete oldDb.player1;
    delete oldDb.player2;
  }

  // Normalize each player
  for (const player of db.players) {
    if (!player.id) player.id = makeId();
    if (!player.name) player.name = "Player";
    normalizePlayerMonths(player);
  }
}
