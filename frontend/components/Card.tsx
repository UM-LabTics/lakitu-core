import { ReactNode } from "react";

interface CardProps {
  title?: string;
  variant?: "default" | "light" | "dark";
  children?: ReactNode;
  className?: string;
}

const variantClass: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "card",
  light:   "card-light",
  dark:    "card-dark",
};

export default function Card({
  title,
  variant = "default",
  children,
  className = "",
}: CardProps) {
  const isDark = variant === "dark";

  return (
    <div className={`${variantClass[variant]} ${className} flex flex-col`}>
      {title && (
        <div className="mb-4 flex flex-col justify-center items-center h-full w-full">
          <h1
            className={`text-center font-medium ${
              isDark ? "text-primary-super-light" : "text-primary"
            }`}
          >
            {title}
          </h1>
          <div
            className={`mt-4 h-1 rounded-xl w-full ${
              isDark ? "bg-primary-super-light" : "bg-primary-light"
            }`}
          />
        </div>
      )}
      {children}
    </div>
  );
}
