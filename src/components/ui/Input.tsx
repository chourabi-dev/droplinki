import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-500/70",
            "focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-shadow",
            className
          )}
          {...props}
        />
        {hint && <p className="mt-1.5 text-xs text-ink-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-500/70",
            "focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition-shadow resize-none",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
