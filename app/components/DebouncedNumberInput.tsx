"use client";

import { useState, useEffect, KeyboardEvent, FocusEvent } from "react";

interface DebouncedNumberInputProps {
  value: number;
  onSave: (value: number) => Promise<void> | void;
  className?: string;
  placeholder?: string;
}

export function DebouncedNumberInput({ value, onSave, className, placeholder }: DebouncedNumberInputProps) {
  const [localValue, setLocalValue] = useState<string>(value?.toString() || "");

  useEffect(() => {
    setLocalValue(value?.toString() || "");
  }, [value]);

  const handleBlur = () => {
    const numVal = parseFloat(localValue);
    if (!isNaN(numVal) && numVal !== value) {
      onSave(numVal);
    } else if (localValue === "" && value !== 0) {
        // Handle empty input if needed, or just reset
        // For now, let's assume empty means 0 or ignore
        onSave(0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}
