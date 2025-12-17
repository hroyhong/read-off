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
  // 如果当前年份小于目标年份，默认显示1月，否则显示当前月份
  const defaultMonth = CURRENT_YEAR < TARGET_YEAR ? 1 : new Date().getMonth() + 1;
  const [activeMonth, setActiveMonth] = useState(defaultMonth);
  const data = initialData; 

  // 计算逻辑
  const calculateStats = (player: "player1" | "player2") => {
    let penalty = 0;
    let completedCount = 0;
    let targetCount = 0;
    const currentMonth = new Date().getMonth() + 1;

    Object.entries(data[player].months).forEach(([m, monthData]) => {
      const monthInt = parseInt(m);
      
      // 只有当我们在目标年份，且月份已经过去（或当前月）才计算罚款
      // 或者如果现在年份大于目标年份（说明整年都过完了）
      const shouldCalculatePenalty = 
        (CURRENT_YEAR === TARGET_YEAR && monthInt <= currentMonth) || 
        (CURRENT_YEAR > TARGET_YEAR);

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
    const currentMonth = new Date().getMonth() + 1;
    const showPenalty = (CURRENT_YEAR === TARGET_YEAR && activeMonth <= currentMonth) || (CURRENT_YEAR > TARGET_YEAR);
    const missedBooks = monthData.books.length - monthData.books.filter(b => b.completed).length;

    return (
      <div className="space-y-3">
        {monthData.books.map((book, index) => (
          <div key={book.id || index} className="group flex items-center gap-3 text-sm">
            <button
              onClick={() => toggleBookStatus(player, activeMonth, index)}
              className={`flex-shrink-0 w-5 h-5 rounded-full border transition-colors flex items-center justify-center
                ${book.completed 
                  ? 'bg-black border-black text-white' 
                  : 'border-gray-300 hover:border-black'
                }`}
              disabled={!book.title}
            >
              {book.completed && "✓"}
            </button>
            <div className={`flex-grow ${book.completed ? 'line-through text-gray-400' : ''}`}>
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
              {showPenalty && missedBooks > 0 
                ? `本月罚款: ¥${missedBooks * PENALTY_PER_BOOK}`
                : "尚未结算"}
            </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 py-12">
        
        {/* Header */}
        <header className="mb-16 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Read Off</h1>
            <p className="text-sm text-gray-500">{TARGET_YEAR} Reading Challenge</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <div>Penalty Pool</div>
            <div className="text-lg font-medium text-black">¥{p1Stats.penalty + p2Stats.penalty}</div>
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
            {Object.keys(data.player1.months).map((m) => {
              const month = parseInt(m);
              const isActive = activeMonth === month;
              
              // 在2026计划中，所有月份都是"未来"或"计划中"，所以不置灰
              // 只有当真正过期且未完成时也许可以用颜色区分，但简约风格不建议太花哨
              const isPast = CURRENT_YEAR > TARGET_YEAR || (CURRENT_YEAR === TARGET_YEAR && month < new Date().getMonth() + 1);
              
              return (
                <button
                  key={m}
                  onClick={() => setActiveMonth(month)}
                  className={`text-sm transition-colors relative py-1
                    ${isActive ? 'text-black font-medium' : isPast ? 'text-gray-600' : 'text-gray-400 hover:text-gray-600'}
                  `}
                >
                  {month}月
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
