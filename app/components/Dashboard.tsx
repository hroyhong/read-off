"use client";

import { useState } from "react";
import { EditableText } from "./EditableText";
import { updateBookTitle, toggleBookStatus, updateName, type DB } from "../actions";

const PENALTY_PER_BOOK = 500;
const CURRENT_YEAR = new Date().getFullYear();
const TARGET_YEAR = 2026;

interface DashboardProps {
  initialData: DB;
}

export default function Dashboard({ initialData }: DashboardProps) {
  // 模拟的"当前时间"状态，默认为1月。0 表示 "2025年12月"
  const [currentSimulatedMonth, setCurrentSimulatedMonth] = useState(1);
  const [activeMonth, setActiveMonth] = useState(1);
  const data = initialData; 

  // 计算逻辑
  const calculateStats = (player: "player1" | "player2") => {
    let penalty = 0;
    let completedCount = 0;
    let targetCount = 0;

    Object.entries(data[player].months).forEach(([m, monthData]) => {
      const monthInt = parseInt(m);
      if (monthInt === 0) return; // 0月是测试月，不计入罚款和总进度统计

      // 这里的逻辑改为：如果当前时间已经包含或超过了该月，则计算罚款
      // 如果 currentSimulatedMonth 是 0 (2025年12月)，则不计算任何罚款
      const shouldCalculatePenalty = currentSimulatedMonth > 0 && monthInt <= currentSimulatedMonth;

      const target = monthData.books.length;
      const completed = monthData.books.filter(b => b.completed).length;
      
      if (shouldCalculatePenalty) {
        const missed = Math.max(0, target - completed);
        penalty += missed * PENALTY_PER_BOOK;
      }
      
      // 统计部分总是显示
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

    // 是否显示本月罚款信息
    // 0月不需要显示罚款
    const showPenalty = activeMonth > 0 && currentSimulatedMonth > 0 && activeMonth <= currentSimulatedMonth;
    const missedBooks = monthData.books.length - monthData.books.filter(b => b.completed).length;

    return (
      <div className="space-y-3">
        {monthData.books.map((book, index) => (
          <div key={book.id || index} className="group flex items-center gap-3 text-sm">
            {/* 使用原生 checkbox 配合样式，保证可靠性 */}
            <label className="flex items-center justify-center w-5 h-5 cursor-pointer relative">
              <input
                type="checkbox"
                checked={book.completed}
                onChange={() => toggleBookStatus(player, activeMonth, index)}
                className="peer appearance-none w-5 h-5 border border-gray-300 rounded-full checked:bg-black checked:border-black transition-colors cursor-pointer"
              />
              <svg 
                className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </label>
            
            <div className={`flex-grow transition-colors ${book.completed ? 'line-through text-gray-400' : ''}`}>
              <EditableText
                initialValue={book.title}
                onSave={(val) => updateBookTitle(player, activeMonth, index, val)}
                placeholder="添加书名..."
              />
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

  // 生成月份列表：0, 1, ..., 12
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
              
              // 0月特殊显示为"12月"或"预热"
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
