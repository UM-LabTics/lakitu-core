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
    <div className={`${variantClass[variant]} ${className}`}>
      {title && (
        <>
          <h3
            className={`text-center font-semibold mb-3 ${
              isDark ? "text-primary-super-light" : "text-primary"
            }`}
          >
            {title}
          </h3>
          <hr
            className={`mb-4 border-t ${
              isDark ? "border-primary-super-light" : "border-primary-light"
            }`}
          />
        </>
      )}
      {children}
    </div>
  );
}
