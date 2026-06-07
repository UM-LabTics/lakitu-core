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
}

export default function AdminButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
  width = "320px",
  height = "auto",
}: AdminButtonProps) {
  const {isAdmin} = useAuth();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${isAdmin ? '' : 'hidden'} admin-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
      style={{ width, height }}
    >
      {children}
    </button>
  );
}
