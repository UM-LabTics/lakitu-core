import { ReactNode } from "react";

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
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`admin-btn disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
      style={{ width, height }}
    >
      {children}
    </button>
  );
}
