import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  success?: boolean;
  className?: string;
  autoFocus?: boolean;
}

const OTPInput = React.forwardRef<HTMLDivElement, OTPInputProps>(
  (
    {
      value,
      onChange,
      onComplete,
      length = 6,
      disabled = false,
      error = false,
      success = false,
      className,
      autoFocus = false,
    },
    ref
  ) => {
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(
      autoFocus ? 0 : null
    );

    // Initialize refs array
    React.useEffect(() => {
      inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // Auto focus first input on mount if autoFocus is true
    React.useEffect(() => {
      if (autoFocus && inputRefs.current[0] && !disabled) {
        inputRefs.current[0]?.focus();
        setFocusedIndex(0);
      }
    }, [autoFocus, disabled]);

    // Update focused index when value changes
    React.useEffect(() => {
      const currentLength = value.length;
      if (currentLength < length && !disabled) {
        const nextIndex = currentLength;
        if (focusedIndex !== nextIndex) {
          setFocusedIndex(nextIndex);
          inputRefs.current[nextIndex]?.focus();
        }
      }
    }, [value, length, disabled, focusedIndex]);

    // Handle complete
    React.useEffect(() => {
      if (value.length === length && onComplete) {
        onComplete(value);
      }
    }, [value, length, onComplete]);

    const handleChange = (index: number, newValue: string) => {
      if (disabled) return;

      // Only allow numbers
      const sanitized = newValue.replace(/\D/g, "");

      if (sanitized.length > 1) {
        // Handle paste: take first 6 digits
        const digits = sanitized.slice(0, length);
        onChange(digits);
        const nextIndex = Math.min(digits.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
        setFocusedIndex(nextIndex);
      } else if (sanitized.length === 1) {
        // Single digit entered
        const newOtp = value.split("");
        newOtp[index] = sanitized;
        const updatedOtp = newOtp.slice(0, length).join("");
        onChange(updatedOtp);

        // Move to next input
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
          setFocusedIndex(index + 1);
        }
      }
    };

    const handleKeyDown = (
      index: number,
      e: React.KeyboardEvent<HTMLInputElement>
    ) => {
      if (disabled) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        const currentOtp = value.split("");
        
        if (currentOtp[index]) {
          // Delete current digit
          currentOtp[index] = "";
          onChange(currentOtp.join(""));
        } else if (index > 0) {
          // Move to previous and delete
          currentOtp[index - 1] = "";
          onChange(currentOtp.join(""));
          inputRefs.current[index - 1]?.focus();
          setFocusedIndex(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      } else if (e.key === "ArrowRight" && index < length - 1) {
        e.preventDefault();
        inputRefs.current[index + 1]?.focus();
        setFocusedIndex(index + 1);
      } else if (e.key === "Delete") {
        e.preventDefault();
        const currentOtp = value.split("");
        currentOtp[index] = "";
        onChange(currentOtp.join(""));
      }
    };

    const handleFocus = (index: number) => {
      if (!disabled) {
        setFocusedIndex(index);
      }
    };

    const handleBlur = () => {
      // Don't clear focus immediately to allow for paste operations
      setTimeout(() => {
        setFocusedIndex(null);
      }, 200);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault();
      if (disabled) return;

      const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
      if (pastedData.length > 0) {
        const digits = pastedData.slice(0, length);
        onChange(digits);
        const nextIndex = Math.min(digits.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
        setFocusedIndex(nextIndex);
      }
    };

    const getBorderColor = () => {
      if (disabled) return "border-gray-200";
      if (error) return "border-red-500";
      if (success) return "border-green-500";
      return "border-gray-300";
    };

    const getBgColor = () => {
      if (disabled) return "bg-gray-50";
      return "bg-white";
    };

    const getTextColor = () => {
      if (disabled) return "text-gray-400";
      return "text-gray-900";
    };

    const getPlaceholderColor = () => {
      if (disabled) return "text-gray-300";
      return "text-gray-500";
    };

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-2", className)}
        onPaste={handlePaste}
      >
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] || "";
          const isFocused = focusedIndex === index;

          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              disabled={disabled}
              className={cn(
                "h-12 w-12 p-0 text-center text-lg font-semibold",
                "border-2 rounded transition-all",
                "focus:outline-none",
                getBorderColor(),
                getBgColor(),
                getTextColor(),
                "focus:ring-2 focus:ring-offset-1",
                error
                  ? "focus:ring-red-500 focus:border-red-500"
                  : success
                  ? "focus:ring-green-500 focus:border-green-500"
                  : "focus:ring-indigo-500 focus:border-indigo-500",
                isFocused && !disabled && "ring-2 ring-offset-1",
                isFocused && !disabled && error
                  ? "ring-red-500 border-red-500"
                  : isFocused && !disabled && success
                  ? "ring-green-500 border-green-500"
                  : isFocused && !disabled && "ring-indigo-500 border-indigo-500",
                disabled && "cursor-not-allowed opacity-60"
              )}
              placeholder="-"
              style={{
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
              aria-label={`Dígito ${index + 1} del código OTP`}
            />
          );
        })}
      </div>
    );
  }
);

OTPInput.displayName = "OTPInput";

export { OTPInput };

