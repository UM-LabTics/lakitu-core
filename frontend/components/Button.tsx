import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  variant?: "contained" | "text";
  className?: string;
  width?: string;
  height?: string;
}

export default function Button({
  children,
  variant = "contained",
  onClick,
  disabled = false,
  type = "button",
  className = "",
  width = "320px",
  height = "50px",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-${variant} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
      style={{ width, height }}
    >
      {children}
    </button>
  );
}
