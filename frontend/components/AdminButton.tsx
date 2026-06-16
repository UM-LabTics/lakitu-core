'use client';
import { ReactNode } from "react";
import { useAuth } from "@/app/auth-provider";

interface AdminButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  width?: string;
  height?: string;
  selected?: boolean;
}

export default function AdminButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  width = "320px",
  height = "auto",
  selected = false
}: AdminButtonProps) {
  const {isAdmin} = useAuth();

  return (
    <button
      type={type}
      onClick={selected ? undefined : onClick}
      disabled={disabled}
      className={!isAdmin ? 'hidden' : `${selected ? 'bg-secondary-dark text-secondary rounded-[15px] ease-in-out transition-all duration-200 inline-flex items-center justify-center gap-2 px-5 py-2 text-lg xl:text-2xl font-medium' : 'admin-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'} ${className}`}
      style={{ width, height }}
    >
      {children}
    </button>
  );
}
