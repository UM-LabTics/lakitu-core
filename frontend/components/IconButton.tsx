import { ReactNode } from "react";

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: number;
  className?: string;
  "aria-label"?: string;
}

export default function IconButton({
  icon,
  onClick,
  disabled = false,
  size = 100,
  className = "",
  "aria-label": ariaLabel,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center
        rounded-lg bg-secondary text-primary
        transition-all duration-200 ease-in-out
        hover:bg-secondary-light text-primary-light hover:scale-105 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${className}
      `}
      style={{
        width: size,
        height: size,
      }}
    >
      {icon}
    </button>
  );
}
