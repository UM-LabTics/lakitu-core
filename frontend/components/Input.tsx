"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, Clock, Calendar } from "lucide-react";

type InputVariant = "text" | "password" | "time" | "date";

interface InputProps {
  name?: string;
  variant?: InputVariant;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  height?: string;
  width?: string;
}

const variantIcon: Record<InputVariant, React.ReactNode | null> = {
  text:     null,
  password: null,
  time:     <Clock size={25} />,
  date:     <Calendar size={25} />,
};


export default function Input({
  name,
  variant = "text",
  placeholder,
  value,
  onChange,
  disabled = false,
  className = "",
  height = "50px",
  width = "100%",
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPassword = variant === "password";
  const isPicker   = variant === "time" || variant === "date";

  const inputType = isPassword
    ? (showPassword ? "text" : "password")
    : variant;

  const icon = isPassword
    ? (showPassword ? <EyeOff size={25} /> : <Eye size={25} />)
    : variantIcon[variant];

  const hasIcon = icon !== null;

  function handleIconClick() {
    if (isPassword) {
      setShowPassword((p) => !p);
    } else if (isPicker && inputRef.current && !disabled) {
      inputRef.current.showPicker?.();
    }
  }

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        name={name}
        ref={inputRef}
        type={inputType}
        value={value}
        placeholder={placeholder ?? variant.charAt(0).toUpperCase() + variant.slice(1)}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`input ${hasIcon ? "pr-10" : ""} ${disabled ? "cursor-not-allowed bg-primary-super-light opacity-50" : ""}`}
        style={{ height, width }}
      />

      {hasIcon && (
        <span
          className="absolute right-3 text-primary flex items-center"
          onClick={handleIconClick}
          style={{ cursor: disabled ? "default" : "pointer" }}
        >
          {icon}
        </span>
      )}
    </div>
  );
}