import { useId } from "react";

/**
 * Custom Checkbox Component for Login Page
 * Features: Brand styling, check animation, accessible
 */
export default function LoginCheckbox({
  label,
  checked,
  onChange,
  className = "",
  ...props
}) {
  const id = useId();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only peer bg-none"
          style={{
            visibility: "hidden",
            backgroundColor: "transparent",
            border: "none",
            padding: 0,
            margin: 0,
          }}
          {...props}
        />
        <label
          htmlFor={id}
          className={`
            relative flex items-center justify-center
            w-5 h-5 rounded-lg border-2
            cursor-pointer transition-all duration-300
            peer-focus:ring-4 peer-focus:ring-primary-300 peer-focus:ring-offset-2
            ${
              checked
                ? "bg-accent-500 border-accent-500 shadow-glow-accent"
                : "bg-white border-primary-300 hover:border-primary-400"
            }
          `}
          aria-label={label}
        >
          {/* Checkmark */}
          {checked && (
            <svg
              className="w-3.5 h-3.5 text-white animate-checkmark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </label>
      </div>
      {label && (
        <label
          htmlFor={id}
          className="text-sm text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors"
        >
          {label}
        </label>
      )}
    </div>
  );
}

