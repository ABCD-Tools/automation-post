import { useState } from "react";
import { useId } from "react";

/**
 * Custom Input Component for Login Page
 * Features: Floating labels, icons, focus states, error states
 */
export default function LoginInput({
  type = "text",
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  showPasswordToggle = false,
  className = "",
  ...props
}) {
  const id = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);

  const handleChange = (e) => {
    setHasValue(!!e.target.value);
    onChange?.(e);
  };

  const inputType = showPasswordToggle && type === "password" 
    ? (showPassword ? "text" : "password")
    : type;

  const isFloating = isFocused || hasValue;
  const hasError = !!error;

  return (
    <div className={`relative ${className}`}>
      {/* Input Container */}
      <div
        className={`
          relative flex items-center overflow-hidden
          rounded-2xl border-2 transition-all duration-300
          bg-white/95 backdrop-blur-sm
          ${hasError 
            ? "border-error-500 shadow-[0_0_0_3px_rgba(245,34,45,0.1)]" 
            : isFocused
            ? "border-primary-400 shadow-glow-primary scale-[1.02]"
            : "border-primary-200 hover:border-primary-300"
          }
        `}
      >
        {/* Icon */}
        {Icon && (
          <div className="absolute left-3 sm:left-4 text-primary-400 z-10">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}

        {/* Input Field */}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          placeholder={isFloating ? placeholder : ""}
          required={required}
          className={`
            w-full px-3 sm:px-4 py-3 sm:py-4 pt-5 sm:pt-6
            ${Icon ? "pl-10 sm:pl-12" : "pl-3 sm:pl-4"}
            ${showPasswordToggle ? "pr-10 sm:pr-12" : "pr-3 sm:pr-4"}
            bg-none outline-none
            text-text-primary placeholder:text-text-secondary/80
            text-sm sm:text-base
            transition-all duration-300
            opacity-100
          `}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          {...props}
        />

        {/* Password Toggle */}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 sm:right-4 text-primary-400 hover:text-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 rounded-lg p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Floating Label */}
        <label
          htmlFor={id}
          className={`
            absolute left-3 sm:left-4 transition-all duration-300 pointer-events-none opacity-100
            ${Icon ? "left-10 sm:left-12" : "left-3 sm:left-4"}
            ${isFloating
              ? "top-2 text-xs text-primary-500 font-medium"
              : "top-4 text-base text-text-secondary"
            }
            ${hasError ? "text-error-500" : ""}
          `}
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      </div>

      {/* Error Message */}
      {hasError && (
        <p
          id={`${id}-error`}
          className="mt-2 text-sm text-error-500 flex items-center gap-1 animate-shake"
          role="alert"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

