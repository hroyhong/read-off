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
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Generate calendar grid
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null); // Empty cells before month starts
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
    
    // Don't allow future dates
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
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ←
        </button>
        <h3 className="text-lg font-semibold">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          →
        </button>
      </div>
      
      {/* Day labels */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 uppercase">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }
          
          const selected = isDateSelected(day);
          const today = isToday(day);
          const future = isFuture(day);
          
          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={future}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all
                ${future ? 'text-gray-300 cursor-not-allowed' : 'cursor-pointer'}
                ${selected ? 'bg-black text-white hover:bg-gray-800' : 'hover:bg-gray-100'}
                ${today && !selected ? 'ring-2 ring-black ring-inset' : ''}
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
