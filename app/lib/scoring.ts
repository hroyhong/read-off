import type { Book, MonthData, PlayerData } from "./model";
import { MONTHLY_TARGETS } from "./model";

const POINTS_PER_BOOK = 50;

export function bookScore(book: Book): number {
  if (!book.aiScore) return 0;
  const pagesThisMonth = book.currentPage - (book.startingPage || 0);
  const progress = book.totalPages > 0 ? pagesThisMonth / book.totalPages : 0;
  return book.aiScore * progress;
}

export function monthScore(monthData: MonthData): number {
  return monthData.books.reduce((sum, book) => sum + bookScore(book), 0);
}

export interface MonthStatus {
  targetBooks: number;
  targetScore: number;
  completedBooks: number;
  score: number;
  passed: boolean;
  penalty: number;
}

export function monthStatus(monthData: MonthData, monthInt: number, isPast: boolean): MonthStatus {
  const targetBooks = MONTHLY_TARGETS[monthInt] || monthData.books.length;
  const targetScore = targetBooks * POINTS_PER_BOOK;
  const completedBooks = monthData.books.filter(b => b.completed).length;
  const score = monthScore(monthData);

  const passedByBooks = completedBooks >= targetBooks;
  const passedByScore = score >= targetScore;
  const passed = passedByBooks || passedByScore;
  const penalty = isPast && !passed ? Math.max(0, targetScore - score) : 0;

  return { targetBooks, targetScore, completedBooks, score, passed, penalty };
}

export interface PlayerStats {
  penalty: number;
  completedCount: number;
  targetCount: number;
  totalScore: number;
  monthlyScore: number;
  eligible: boolean;
  totalDailyTarget: number;
  expectedProgress: number;
  actualProgress: number;
}

export function playerStats(
  player: PlayerData,
  currentSimulatedMonth: number,
  activeMonth: number,
  currentYear: number,
  currentMonth: number,
  currentDay: number,
): PlayerStats {
  let penalty = 0;
  let completedCount = 0;
  let targetCount = 0;
  let totalScore = 0;
  let eligible = true;

  Object.entries(player.months).forEach(([m, md]) => {
    const monthInt = parseInt(m);
    if (monthInt === 0) return;

    const isPast = currentSimulatedMonth > 0 && monthInt < currentSimulatedMonth;
    const ms = monthStatus(md, monthInt, isPast);

    targetCount += ms.targetBooks;
    completedCount += ms.completedBooks;
    totalScore += ms.score;

    if (isPast) {
      penalty += ms.penalty;
      if (!ms.passed) eligible = false;
    }
  });

  // Daily progress for current month
  let totalDailyTarget = 0;
  let expectedProgress = 0;
  let actualProgress = 0;
  const currentMonthData = player.months[currentSimulatedMonth.toString()];
  if (currentMonthData) {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const totalPages = currentMonthData.books.reduce((sum, b) => sum + (b.totalPages || 0), 0);
    totalDailyTarget = totalPages / daysInMonth;
    expectedProgress = totalDailyTarget * currentDay;
    actualProgress = currentMonthData.books.reduce((sum, b) => sum + (b.currentPage || 0), 0);
  }

  // Monthly score for active month
  const activeMonthData = player.months[activeMonth.toString()];
  const monthlyScore = activeMonthData ? monthScore(activeMonthData) : 0;

  return { penalty, completedCount, targetCount, totalScore, monthlyScore, eligible, totalDailyTarget, expectedProgress, actualProgress };
}
