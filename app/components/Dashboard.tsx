"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import Link from "next/link";
import { EditableText } from "./EditableText";
import { updateBookAuthor, updateBookTitle, updateName, toggleBookStatus, addPlayer, removePlayer, updateBookTotalPages, updateBookCurrentPage } from "../actions";
import type { DB, PlayerData } from "../lib/model";

const PENALTY_PER_BOOK = 50;
const TARGET_YEAR = 2026;

interface DashboardProps {
  initialData: DB;
}

export default function Dashboard({ initialData }: DashboardProps) {
  // 获取上海时间
  const getShanghaiDate = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 8));
  };

  const [now, setNow] = useState(getShanghaiDate());

  useEffect(() => {
    const timer = setInterval(() => setNow(getShanghaiDate()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();
  const currentDay = now.getDate();
  
  // Logic to determine "active" month for penalty calculation
  // If year is 2025 and month is 12, it's month 0 (pre-heat)
  // If year is 2026, it's the actual month.
  let currentSimulatedMonth = 1;
  if (currentYear === 2025 && currentMonth === 12) {
    currentSimulatedMonth = 0;
  } else if (currentYear === 2026) {
    currentSimulatedMonth = currentMonth;
  } else if (currentYear > 2026) {
    currentSimulatedMonth = 12; // Challenge over
  } else {
    currentSimulatedMonth = 0; // Before start
  }

  const [activeMonth, setActiveMonth] = useState<number>(() => {
     // Default to current month if valid, else 1
     return currentSimulatedMonth >= 0 && currentSimulatedMonth <= 12 ? currentSimulatedMonth : 1;
  });
  
  // 使用 useOptimistic 来处理乐观更新
  const [optimisticData, addOptimisticUpdate] = useOptimistic(
    initialData,
    (state: DB, update: { type: "TOGGLE_BOOK"; playerId: string; month: number; index: number }) => {
      if (update.type === "TOGGLE_BOOK") {
        const newState = { ...state, players: state.players.map(p => {
          if (p.id !== update.playerId) return p;
          const monthKey = update.month.toString();
          return {
            ...p,
            months: {
              ...p.months,
              [monthKey]: {
                ...p.months[monthKey],
                books: p.months[monthKey].books.map((b, i) => 
                  i === update.index ? { 
                    ...b, 
                    completed: !b.completed,
                    currentPage: !b.completed ? b.totalPages : b.currentPage 
                  } : b
                )
              }
            }
          };
        })};
        return newState;
      }
      return state;
    }
  );

  const handleToggleBook = async (playerId: string, month: number, index: number) => {
    startTransition(() => {
      addOptimisticUpdate({ type: "TOGGLE_BOOK", playerId, month, index });
    });
    await toggleBookStatus(playerId, month, index);
  };

  const data = optimisticData;

  // 计算逻辑
  const calculateStats = (player: PlayerData) => {
    let penalty = 0;
    let completedCount = 0;
    let targetCount = 0;

    Object.entries(player.months).forEach(([m, monthData]) => {
      const monthInt = parseInt(m);
      if (monthInt === 0) return; 

      const shouldCalculatePenalty = currentSimulatedMonth > 0 && monthInt <= currentSimulatedMonth;
      const target = monthData.books.length;
      const completed = monthData.books.filter(b => b.completed).length;
      
      if (shouldCalculatePenalty) {
        const missed = Math.max(0, target - completed);
        penalty += missed * PENALTY_PER_BOOK;
      }
      
      targetCount += target;
      completedCount += completed;
    });

    // Daily Progress Calculation
    let totalDailyTarget = 0;
    let expectedProgress = 0;
    let actualProgress = 0;
    
    // Calculate for current active month (if it matches current time)
    // Or just calculate generally? Request says "daily page count should be sum of all books / days"
    // And "Lead/Lag progress on far right"
    
    // Let's calculate for the *current real time* month to show relevant stats
    const currentMonthData = player.months[currentSimulatedMonth.toString()];
    if (currentMonthData) {
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const totalPagesInMonth = currentMonthData.books.reduce((sum, b) => sum + (b.totalPages || 0), 0);
        
        // Daily target for this month
        const dailyTarget = totalPagesInMonth / daysInMonth;
        
        // Expected progress up to today
        const expected = dailyTarget * currentDay;
        
        // Actual progress
        const actual = currentMonthData.books.reduce((sum, b) => sum + (b.currentPage || 0), 0);
        
        totalDailyTarget = dailyTarget;
        expectedProgress = expected;
        actualProgress = actual;
    }

    return { penalty, completedCount, targetCount, totalDailyTarget, expectedProgress, actualProgress };
  };

  const allStats = data.players.map(p => ({ player: p, stats: calculateStats(p) }));
  const totalPenalty = allStats.reduce((sum, { stats }) => sum + stats.penalty, 0);

  // 渲染书本列表
  const renderBookList = (player: PlayerData) => {
    const monthData = player.months[activeMonth.toString()];
    if (!monthData) return null;

    const showPenalty = activeMonth > 0 && currentSimulatedMonth > 0 && activeMonth <= currentSimulatedMonth;
    const missedBooks = monthData.books.length - monthData.books.filter(b => b.completed).length;

    return (
      <div className="space-y-6">
        {monthData.books.map((book, index) => {
           const progress = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
           
           return (
          <div key={book.id || index} className="group relative">
            {/* Background Progress Bar */}
            <div 
                className="absolute inset-0 bg-gray-50 rounded-lg transition-all duration-500 pointer-events-none"
                style={{ width: `${Math.min(100, progress)}%` }}
            />
            
            <div className="relative p-3 flex items-start gap-4">
                {/* Checkbox */}
                <input
                type="checkbox"
                checked={book.completed}
                onChange={() => handleToggleBook(player.id, activeMonth, index)}
                className="mt-1.5 w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer flex-shrink-0 bg-transparent z-10"
                style={{ accentColor: 'black' }}
                />
                
                <div className="flex-grow space-y-1">
                    <div className="flex items-start justify-between gap-4">
                        <div className={`flex-grow ${book.completed ? 'opacity-50' : ''}`}>
                            <div className={`${book.completed ? 'line-through' : ''}`}>
                                {book.title ? (
                                    <Link href={`/book/${player.id}/${activeMonth}/${index}`} className="font-medium text-base hover:underline decoration-gray-400 underline-offset-2">
                                        {book.title}
                                    </Link>
                                ) : (
                                    <EditableText
                                        initialValue=""
                                        onSave={(val) => updateBookTitle(player.id, activeMonth, index, val)}
                                        placeholder="添加书名..."
                                        className="font-medium text-base bg-transparent"
                                    />
                                )}
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                                <EditableText
                                initialValue={book.author || ""}
                                onSave={(val) => updateBookAuthor(player.id, activeMonth, index, val)}
                                placeholder="作者"
                                className="text-gray-400 text-xs bg-transparent"
                                />
                                
                                {/* Compact Inputs: [Curr] / [Total] */}
                                <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                                    <input 
                                        type="number"
                                        value={book.currentPage || ""}
                                        onChange={(e) => updateBookCurrentPage(player.id, activeMonth, index, parseFloat(e.target.value))}
                                        placeholder="0"
                                        className="w-10 text-center bg-gray-50 rounded px-1 py-0.5 border-none focus:ring-1 focus:ring-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-black"
                                    />
                                    <span>/</span>
                                    <input 
                                        type="number"
                                        value={book.totalPages || ""}
                                        onChange={(e) => updateBookTotalPages(player.id, activeMonth, index, parseFloat(e.target.value))}
                                        placeholder="0"
                                        className="w-10 text-center bg-gray-50 rounded px-1 py-0.5 border-none focus:ring-1 focus:ring-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-black"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )})}
        
        <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
            <span>
              {activeMonth === 0 ? "本月为测试月，无罚款" : 
                showPenalty && missedBooks > 0 
                  ? `本月罚款: ¥${missedBooks * PENALTY_PER_BOOK}`
                  : "尚未结算"
              }
            </span>
        </div>
      </div>
    );
  };

  const monthList = [0, ...Array.from({length: 12}, (_, i) => i + 1)];

  const handleAddPlayer = async () => {
    const name = prompt("输入新玩家名字：");
    if (name && name.trim()) {
      await addPlayer(name.trim());
    }
  };

  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    if (data.players.length <= 1) {
      alert("至少需要保留一名玩家");
      return;
    }
    if (confirm(`确定要删除 ${playerName} 吗？`)) {
      await removePlayer(playerId);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Header */}
        <header className="mb-16 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Read Off</h1>
            <p className="text-sm text-gray-500">{TARGET_YEAR} Reading Challenge</p>
          </div>
          <div className="flex flex-col items-end gap-1">
             <div className="text-xs font-medium text-gray-900">
                {now.getFullYear()}年 {now.getMonth() + 1}月 {now.getDate()}日
             </div>
            <div className="text-right text-xs text-gray-400 mt-2">
              <div>Penalty Pool</div>
              <div className="text-lg font-medium text-black">¥{totalPenalty}</div>
            </div>
          </div>
        </header>

        {/* Overview Cards - Dynamic grid based on player count */}
        <div className={`grid gap-8 mb-16 ${data.players.length <= 2 ? 'grid-cols-2' : data.players.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
          {allStats.map(({ player, stats }) => (
            <div key={player.id} className="space-y-4">
              <div className="flex justify-between items-baseline">
                <Link href={`/player/${player.id}`} className="text-lg font-medium hover:underline decoration-gray-400 underline-offset-2">
                  {player.name}
                </Link>
                <span className="text-xs font-mono text-gray-400">{stats.completedCount}/{stats.targetCount}</span>
              </div>
              
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-black rounded-full transition-all duration-500"
                  style={{ width: `${(stats.completedCount / Math.max(1, stats.targetCount)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                  <span className="text-gray-400">待缴罚款</span>
                  <span className={stats.penalty > 0 ? "text-red-500 font-medium" : "text-gray-300"}>
                      ¥{stats.penalty}
                  </span>
              </div>
            </div>
          ))}
          
          {/* Add Player Button - subtle */}
          <button 
            onClick={handleAddPlayer}
            className="text-xs text-gray-300 hover:text-gray-500 transition-colors self-start"
          >
            + Add Player
          </button>
        </div>

        {/* Month Navigation */}
        <div className="mb-10 overflow-x-auto no-scrollbar">
          <div className="flex gap-6 min-w-max pb-2">
            {monthList.map((m) => {
              const month = m;
              const isActive = activeMonth === month;
              
              const isPast = month < currentSimulatedMonth;
              const isCurrent = month === currentSimulatedMonth;
              
              const displayMonth = month === 0 ? "25年12月" : `${month}月`;
              
              return (
                <button
                  key={m}
                  onClick={() => setActiveMonth(month)}
                  className={`text-sm transition-colors relative py-1 px-2 whitespace-nowrap
                    ${isActive ? 'text-black font-medium' : isPast ? 'text-gray-600' : isCurrent ? 'text-black' : 'text-gray-400 hover:text-gray-600'}
                  `}
                >
                  {displayMonth}
                  {isCurrent && !isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black" />
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-black" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Books Grid - Dynamic based on player count */}
        <div className={`grid gap-12 ${data.players.length <= 2 ? 'md:grid-cols-2' : data.players.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
          {data.players.map((player) => (
            <div key={player.id}>
              <div className="flex items-center justify-between mb-6">
                {(() => {
                  const monthData = player.months[activeMonth.toString()];
                  const totalPages = monthData?.books.reduce((sum, b) => sum + (b.totalPages || 0), 0) || 0;
                  // Calculate days in month. Month 0 is Dec 2025.
                  const year = activeMonth === 0 ? 2025 : TARGET_YEAR;
                  const m = activeMonth === 0 ? 12 : activeMonth;
                  const daysInMonth = new Date(year, m, 0).getDate();
                  const daily = totalPages / daysInMonth;
                  
                  // Calculate Ahead/Behind for this player
                  // We need to recalculate here or pass it down. 
                  // Since we have `allStats` calculated above, we can find this player's stats.
                  const playerStats = allStats.find(s => s.player.id === player.id)?.stats;
                  const diff = playerStats ? playerStats.actualProgress - playerStats.expectedProgress : 0;
                  const isAhead = diff >= 0;

                  return (
                    <div className="flex items-center justify-between w-full text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">
                      <div className="flex items-center gap-1">
                        <span className="text-black">{totalPages}</span>
                        <span>/</span>
                        <span className="text-black">{daysInMonth}</span>
                        <span>=</span>
                        <span className="text-black">{Math.ceil(daily)}</span>
                      </div>
                      
                      {/* Ahead/Behind - Only show for current month */}
                      {activeMonth === currentSimulatedMonth && (
                        <div className={`font-mono font-medium ${isAhead ? 'text-green-600' : 'text-red-500'}`}>
                            {isAhead ? '+' : ''}{diff.toFixed(0)}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              {renderBookList(player)}
            </div>
          ))}
        </div>

        {/* Rules Footer */}
        <footer className="mt-32 pt-12 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
          <p>规则：1月1本，2月2本，3月3本，4-12月每月4本。</p>
          <p>少读一本罚款 ¥50。</p>
          <p>完成任务的赢家平分罚款池，都没完成则累计至年底。</p>
        </footer>

      </div>
    </div>
  );
}
