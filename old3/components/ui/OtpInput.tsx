import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

/** Six separate boxes that behave like a single numeric code field: typing,
 * backspacing, arrow-key navigation and pasting a full code all just work. */
export function OtpInput({ value, onChange, length = 6, disabled, autoFocus, error }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  function commit(nextDigits: string[]) {
    onChange(nextDigits.join("").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const next = digits.slice();
      next[index] = "";
      commit(next);
      return;
    }
    // Some mobile keyboards / password managers fill more than one digit at once.
    const next = value.split("");
    for (let i = 0; i < clean.length && index + i < length; i++) {
      next[index + i] = clean[i];
    }
    commit(next);
    const target = Math.min(index + clean.length, length - 1);
    inputsRef.current[target]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const target = Math.min(pasted.length, length - 1);
    inputsRef.current[target]?.focus();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Chiffre ${i + 1} du code`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={cn(
            "h-14 w-11 rounded-xl border bg-ink-950 text-center text-xl font-bold text-white",
            "focus:outline-none focus:ring-4 transition-shadow sm:h-16 sm:w-12",
            error
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/10"
              : "border-white/10 focus:border-brand-500 focus:ring-brand-500/10"
          )}
        />
      ))}
    </div>
  );
}