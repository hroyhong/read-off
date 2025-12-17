"use client";

import { startTransition, useOptimistic, useState } from "react";
import { EditableText } from "./EditableText";
import { updateBookAuthor, updateBookTitle, updateName, toggleBookStatus } from "../actions";
import type { DB } from "../lib/model";

const PENALTY_PER_BOOK = 500;
const TARGET_YEAR = 2026;

interface DashboardProps {
  initialData: DB;
}

export default function Dashboard({ initialData }: DashboardProps) {
  const [currentSimulatedMonth, setCurrentSimulatedMonth] = useState(1);
  const [activeMonth, setActiveMonth] = useState(1);
  
  // 使用 useOptimistic 来处理乐观更新
  const [optimisticData, addOptimisticUpdate] = useOptimistic(
    initialData,
    (state: DB, update: { type: "TOGGLE_BOOK"; player: "player1" | "player2"; month: number; index: number }) => {
      if (update.type === "TOGGLE_BOOK") {
        const newState = { ...state };
        const monthKey = update.month.toString();
        // 深拷贝一下避免直接修改引用
        newState[update.player] = { ...state[update.player] };
        newState[update.player].months = { ...state[update.player].months };
        newState[update.player].months[monthKey] = { ...state[update.player].months[monthKey] };
        newState[update.player].months[monthKey].books = newState[update.player].months[monthKey].books.map((b, i) => 
            i === update.index ? { ...b, completed: !b.completed } : b
        );
        return newState;
      }
      return state;
    }
  );

  const handleToggleBook = async (player: "player1" | "player2", month: number, index: number) => {
    startTransition(() => {
      addOptimisticUpdate({ type: "TOGGLE_BOOK", player, month, index });
    });
    await toggleBookStatus(player, month, index);
  };

  const data = optimisticData;

  // 计算逻辑
  const calculateStats = (player: "player1" | "player2") => {
    let penalty = 0;
    let completedCount = 0;
    let targetCount = 0;

    Object.entries(data[player].months).forEach(([m, monthData]) => {
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

  const p1Stats = calculateStats("player1");
  const p2Stats = calculateStats("player2");

  // 渲染书本列表
  const renderBookList = (player: "player1" | "player2") => {
    const monthData = data[player].months[activeMonth.toString()];
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
              onChange={() => handleToggleBook(player, activeMonth, index)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer flex-shrink-0"
              style={{ accentColor: 'black' }}
            />
            
            <div className={`flex-grow space-y-1 transition-colors ${book.completed ? 'opacity-50' : ''}`}>
              <div className={`${book.completed ? 'line-through' : ''}`}>
                <EditableText
                  initialValue={book.title}
                  onSave={(val) => updateBookTitle(player, activeMonth, index, val)}
                  placeholder="添加书名..."
                  className="font-medium"
                />
              </div>
              <div>
                <EditableText
                  initialValue={book.author || ""}
                  onSave={(val) => updateBookAuthor(player, activeMonth, index, val)}
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

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        
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
              <div className="text-lg font-medium text-black">¥{p1Stats.penalty + p2Stats.penalty}</div>
            </div>
          </div>
        </header>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-8 mb-16">
          {/* Player 1 */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <EditableText 
                className="text-lg font-medium" 
                initialValue={data.player1.name} 
                onSave={(val) => updateName("player1", val)}
              />
              <span className="text-xs font-mono text-gray-400">{p1Stats.completedCount}/{p1Stats.targetCount}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black rounded-full transition-all duration-500"
                style={{ width: `${(p1Stats.completedCount / Math.max(1, p1Stats.targetCount)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-gray-400">待缴罚款</span>
                <span className={p1Stats.penalty > 0 ? "text-red-500 font-medium" : "text-gray-300"}>
                    ¥{p1Stats.penalty}
                </span>
            </div>
          </div>

          {/* Player 2 */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <EditableText 
                className="text-lg font-medium" 
                initialValue={data.player2.name} 
                onSave={(val) => updateName("player2", val)}
              />
              <span className="text-xs font-mono text-gray-400">{p2Stats.completedCount}/{p2Stats.targetCount}</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black rounded-full transition-all duration-500"
                style={{ width: `${(p2Stats.completedCount / Math.max(1, p2Stats.targetCount)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
                <span className="text-gray-400">待缴罚款</span>
                <span className={p2Stats.penalty > 0 ? "text-red-500 font-medium" : "text-gray-300"}>
                    ¥{p2Stats.penalty}
                </span>
            </div>
          </div>
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

        {/* Books Grid */}
        <div className="grid md:grid-cols-2 gap-12">
          {/* Player 1 List */}
          <div>
             <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">{data.player1.name}</h3>
             {renderBookList("player1")}
          </div>

          {/* Player 2 List */}
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-6">{data.player2.name}</h3>
            {renderBookList("player2")}
          </div>
        </div>

        {/* Rules Footer */}
        <footer className="mt-32 pt-12 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
          <p>规则：1月1本，2月2本，3月3本，4-12月每月4本。</p>
          <p>少读一本罚款 ¥500。</p>
          <p>对方完成任务才能获得罚款，否则累计至年底。</p>
        </footer>

      </div>
    </div>
  );
}
