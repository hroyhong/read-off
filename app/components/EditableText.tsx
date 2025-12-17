"use client";

import { useEffect, useRef, useState } from "react";

interface EditableTextProps {
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EditableText({ initialValue, onSave, placeholder, className }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue ?? "");
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const next = (value ?? "").trim();
    const prev = (initialValue ?? "").trim();
    // 把“纯空白”当成空值，避免出现 data.json 里 title 是 " " 导致无法编辑/无占位符
    if (next !== prev) onSave(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-transparent border-b border-black/10 w-full ${className}`}
        placeholder={placeholder}
      />
    );
  }

  const display = (value ?? "").trim();
  const isEmpty = display.length === 0;

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 truncate ${isEmpty ? "text-gray-300" : ""} ${className}`}
    >
      {isEmpty ? placeholder : value}
    </div>
  );
}

