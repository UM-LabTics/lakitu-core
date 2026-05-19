"use client";

import { ReactNode } from "react";

interface SelectableProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  height?: string;
  width?: string;
}

export default function Selectable({
  children,
  selected = false,
  onClick,
  className = "",
  height = "50px",
  width = "100%",
}: SelectableProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center justify-center
        px-5 py-2 rounded-xl text-xl
        font-medium cursor-pointer select-none
        transition-all duration-200 ease-in-out
        ${
          selected
            ? "bg-secondary-dark text-secondary"
            : "bg-primary-super-light text-primary-light"
        }
        ${className}
      `}
      style={{ height, width }}
    >
      {children}
    </button>
  );
}
