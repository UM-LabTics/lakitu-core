"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  height?: string;
  width?: string;
}

export default function Select({
  options,
  value,
  placeholder = "Select",
  onChange,
  disabled = false,
  className = "",
  height = "50px",
  width = "100%",
}: SelectProps) {
  const [selected, setSelected] = useState<SelectOption | null | undefined>(value ? options.find((opt) => opt.value === value) : null);


  return (
    <div className={`relative flex items-center ${className}`} style={{ height, width }}>
      <select
        value={selected?.value ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const option = options.find((opt) => opt.value === e.target.value);
          setSelected(option ?? null);
          onChange?.(e.target.value);
        }}
        className={`input bg-primary-super-light w-full h-full appearance-none pr-10 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <option value="" hidden>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <span className={`absolute right-3 text-primary pointer-events-none flex items-center ${disabled ? "opacity-50" : ""}`}>
        <ChevronDown size={25} />
      </span>
    </div>
  );
}
