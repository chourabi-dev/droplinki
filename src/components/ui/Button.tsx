import React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "success" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-lift active:bg-brand-700",
  secondary: "bg-ink-900 text-white hover:bg-ink-950",
  ghost: "bg-transparent text-ink-700 hover:bg-ink-100",
  outline: "bg-white text-ink-900 border border-ink-300 hover:border-ink-500 hover:bg-ink-50",
  success: "bg-go-500 text-white hover:bg-go-600 shadow-[0_8px_24px_-6px_rgba(23,163,74,0.35)]",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
};

const sizeClasses: Record<Size, string> = {
  sm: "text-sm px-3.5 py-2 rounded-xl gap-1.5",
  md: "text-[15px] px-5 py-3 rounded-2xl gap-2",
  lg: "text-base px-7 py-4 rounded-2xl gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", fullWidth, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
