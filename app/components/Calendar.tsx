"use client";

import { useState } from "react";

interface CalendarProps {
  readingDates: string[];
  onToggleDate: (date: string) => void;
}

export function Calendar({ readingDates, onToggleDate }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const clickedDate = new Date(year, month, day);
    if (clickedDate > today) return;
    onToggleDate(dateStr);
  };

  const isDateSelected = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return readingDates.includes(dateStr);
  };

  const isToday = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const isFuture = (day: number) => {
    const date = new Date(year, month, day);
    return date > today;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="bg-card rounded-xl border border-rule p-4 md:p-6">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-surface rounded-lg transition-colors text-ink-2"
        >
          ←
        </button>
        <h3 className="text-base font-display font-semibold">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-surface rounded-lg transition-colors text-ink-2"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-1.5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-ink-3 uppercase">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }

          const selected = isDateSelected(day);
          const todayMark = isToday(day);
          const future = isFuture(day);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={future}
              className={`
                aspect-square rounded-lg text-xs md:text-sm font-medium transition-all
                ${future ? 'text-ink-3 cursor-not-allowed opacity-40' : 'cursor-pointer'}
                ${selected ? 'bg-ink text-card hover:bg-ink-2' : 'hover:bg-surface'}
                ${todayMark && !selected ? 'ring-2 ring-ink ring-inset' : ''}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
