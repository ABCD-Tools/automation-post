import { useState, useRef } from "react";

/**
 * Custom Button Component for Login Page
 * Features: Gradient, ripple effect, loading state, hover animations
 */
export default function LoginButton({
  children,
  type = "button",
  onClick,
  disabled = false,
  loading = false,
  className = "",
  variant = "primary", // primary, secondary
  ...props
}) {
  const [ripples, setRipples] = useState([]);
  const buttonRef = useRef(null);

  const handleClick = (e) => {
    if (disabled || loading) return;

    // Create ripple effect
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const ripple = {
        id: Date.now(),
        x,
        y,
        size,
      };

      setRipples((prev) => [...prev, ripple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
      }, 600);
    }

    onClick?.(e);
  };

  const baseClasses = `
    relative overflow-hidden
    w-full py-3 sm:py-4 px-4 sm:px-6
    rounded-2xl font-semibold text-sm sm:text-base
    transition-all duration-300
    focus:outline-none focus:ring-4 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    transform active:scale-[0.98]
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-accent-400 via-accent-500 to-accent-600
      text-white
      hover:from-accent-500 hover:via-accent-600 hover:to-accent-700
      hover:shadow-glow-accent hover:scale-[1.02]
      focus:ring-accent-300
    `,
    secondary: `
      bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600
      text-white
      hover:from-primary-500 hover:via-primary-600 hover:to-primary-700
      hover:shadow-glow-primary hover:scale-[1.02]
      focus:ring-primary-300
    `,
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      aria-busy={loading}
      {...props}
    >
      {/* Ripple Effects */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: `${ripple.size}px`,
            height: `${ripple.size}px`,
            transform: "scale(0)",
            animation: "ripple 600ms ease-out",
          }}
        />
      ))}

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Logging in...</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}

