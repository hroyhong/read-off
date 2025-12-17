"use client";

import { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  initialValue: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EditableText({ initialValue, onSave, placeholder, className }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      onSave(value);
    }
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
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-transparent border-b border-black/10 w-full ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)} 
      className={`cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1 truncate ${!value ? 'text-gray-300' : ''} ${className}`}
    >
      {value || placeholder}
    </div>
  );
}

