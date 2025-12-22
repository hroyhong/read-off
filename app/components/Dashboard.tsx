"use client";

import { startTransition, useEffect, useOptimistic, useState } from "react";
import { EditableText } from "./EditableText";
import { updateBookAuthor, updateBookTitle, updateName, toggleBookStatus, addPlayer, removePlayer } from "../actions";
import type { DB, PlayerData } from "../lib/model";

const PENALTY_PER_BOOK = 500;
const TARGET_YEAR = 2026;

interface DashboardProps {
  initialData: DB;
}

export default function Dashboard({ initialData }: DashboardProps) {
  const getInitialCurrentTimeMonth = () => {
    if (typeof window === "undefined") return 1;
    const raw = window.localStorage.getItem("read-off:current-time-month");
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 12 ? n : 1;
  };

  const [currentSimulatedMonth, setCurrentSimulatedMonth] = useState<number>(() => getInitialCurrentTimeMonth());
  const [activeMonth, setActiveMonth] = useState<number>(() => getInitialCurrentTimeMonth());

  // 记住"当前时间"选择（仅本地偏好，不进 KV）
  useEffect(() => {
    try {
      window.localStorage.setItem("read-off:current-time-month", String(currentSimulatedMonth));
    } catch {
      // ignore
    }
  }, [currentSimulatedMonth]);
  
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
                  i === update.index ? { ...b, completed: !b.completed } : b
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

    return { penalty, completedCount, targetCount };
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
      <div className="space-y-4">
        {monthData.books.map((book, index) => (
          <div key={book.id || index} className="group flex items-start gap-3 text-sm">
            {/* Checkbox 居中对齐第一行 */}
            <input
              type="checkbox"
              checked={book.completed}
              onChange={() => handleToggleBook(player.id, activeMonth, index)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer flex-shrink-0"
              style={{ accentColor: 'black' }}
            />
            
            <div className={`flex-grow space-y-1 transition-colors ${book.completed ? 'opacity-50' : ''}`}>
              <div className={`${book.completed ? 'line-through' : ''}`}>
                <EditableText
                  initialValue={book.title}
                  onSave={(val) => updateBookTitle(player.id, activeMonth, index, val)}
                  placeholder="添加书名..."
                  className="font-medium"
                />
              </div>
              <div>
                <EditableText
                  initialValue={book.author || ""}
                  onSave={(val) => updateBookAuthor(player.id, activeMonth, index, val)}
                  placeholder="作者"
                  className="text-gray-400 text-xs"
                />
              </div>
            </div>
          </div>
        ))}
        
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
             <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>当前时间:</span>
                <select 
                  value={currentSimulatedMonth}
                  onChange={(e) => setCurrentSimulatedMonth(parseInt(e.target.value))}
                  className="bg-transparent border-b border-gray-200 text-black font-medium focus:outline-none cursor-pointer text-right min-w-[100px]"
                >
                  <option value={0}>25年12月 (预热)</option>
                  <option disabled>──────────</option>
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>26年 {m}月</option>
                  ))}
                </select>
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
                <EditableText 
                  className="text-lg font-medium" 
                  initialValue={player.name} 
                  onSave={(val) => updateName(player.id, val)}
                />
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
          
          {/* Add Player Button - smaller */}
          <button 
            onClick={handleAddPlayer}
            className="text-xs text-gray-400 hover:text-black transition-colors self-start"
          >
            + 添加玩家
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
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">{player.name}</h3>
                {data.players.length > 1 && (
                  <button 
                    onClick={() => handleRemovePlayer(player.id, player.name)}
                    className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                  >
                    删除
                  </button>
                )}
              </div>
              {renderBookList(player)}
            </div>
          ))}
        </div>

        {/* Rules Footer */}
        <footer className="mt-32 pt-12 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
          <p>规则：1月1本，2月2本，3月3本，4-12月每月4本。</p>
          <p>少读一本罚款 ¥500。</p>
          <p>完成任务的赢家平分罚款池，都没完成则累计至年底。</p>
        </footer>

      </div>
    </div>
  );
}
