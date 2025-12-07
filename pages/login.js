import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { toast } from "react-toastify";
import { gsap } from "gsap";
import { loginWithEmailPassword } from "../src/modules-view/utils/api";
import LoginInput from "../src/modules-view/components/LoginInput";
import LoginButton from "../src/modules-view/components/LoginButton";
import LoginCheckbox from "../src/modules-view/components/LoginCheckbox";

// Icons for input fields
const MailIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LockIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();

  // Refs for GSAP animations
  const logoRef = useRef(null);
  const cardRef = useRef(null);
  const formRef = useRef(null);
  const containerRef = useRef(null);

  // Page load animation sequence
  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      // Simple fade-in for reduced motion
      gsap.set([logoRef.current, cardRef.current], { opacity: 0 });
      gsap.to([logoRef.current, cardRef.current], {
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
      });
      return;
    }

    // Full animation sequence
    const tl = gsap.timeline();

    // Initial state
    gsap.set([logoRef.current, cardRef.current], { opacity: 0 });
    gsap.set(logoRef.current, { scale: 0.8, y: -20 });
    gsap.set(cardRef.current, { y: 30, scale: 0.95 });

    // Logo entrance: fade + scale + gentle bounce
    tl.to(logoRef.current, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.8,
      ease: "back.out(1.7)",
    })
      // Card entrance: slide up + fade
      .to(
        cardRef.current,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "power3.out",
        },
        "-=0.3"
      )
      // Stagger form elements
      .from(
        formRef.current?.children || [],
        {
          opacity: 0,
          y: 20,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
        },
        "-=0.2"
      )
      // Ensure form elements are fully visible
      .to(
        formRef.current?.children || [],
        {
          opacity: 1,
          duration: 0.1,
        },
        "-=0.1"
      );
  }, []);

  // Input validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      return "Email is required";
    }
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const validatePassword = (password) => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate inputs
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });

      // Shake animation for errors
      if (emailError || passwordError) {
        gsap.to(cardRef.current, {
          x: [-10, 10, -10, 10, 0],
          duration: 0.5,
          ease: "power2.out",
        });
      }

      setLoading(false);
      return;
    }

    setErrors({});

    try {
      const data = await loginWithEmailPassword({ email, password });
      
      // Success animation
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          scale: 0.95,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
        });
      }

      toast.success("Login successful!");
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      // Redirect based on role
      setTimeout(() => {
        const role = data?.user?.user_metadata?.role;
        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }, 300);
    } catch (err) {
      toast.error(err.message || "Login failed");
      
      // Error shake animation
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          x: [-10, 10, -10, 10, 0],
          duration: 0.5,
          ease: "power2.out",
        });
      }

      setLoading(false);
    }
  };

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="min-h-screen watercolor-bg flex items-center justify-center p-4 sm:p-6 lg:p-8"
      role="main"
      aria-label="Login page"
    >
      <div className="w-full max-w-md mx-auto">
        {/* Logo */}
        <div
          ref={logoRef}
          className="flex justify-center mb-6 sm:mb-8"
          aria-label="ABCD Tools Logo"
        >
          <div className="relative">
            <Image
              src="/icon0.svg"
              alt="ABCD Tools"
              width={64}
              height={64}
              className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg"
              priority
            />
          </div>
        </div>

        {/* Login Card */}
        <div
          ref={cardRef}
          className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 sm:p-8 border border-primary-100"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2 text-center opacity-100">
            Welcome Back
          </h1>
          <p className="text-sm sm:text-base text-text-secondary text-center mb-6 sm:mb-8 opacity-100">
            Sign in to your ABCD Tools account
          </p>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 opacity-100" noValidate>
            {/* Email Input */}
            <LoginInput
              type="email"
              label="Email"
              icon={MailIcon}
              value={email}
              onChange={handleEmailChange}
              error={errors.email}
              placeholder="Enter your email"
              required
              aria-label="Email address"
              aria-required="true"
            />

            {/* Password Input */}
            <LoginInput
              type="password"
              label="Password"
              icon={LockIcon}
              value={password}
              onChange={handlePasswordChange}
              error={errors.password}
              placeholder="Enter your password"
              required
              showPasswordToggle
              aria-label="Password"
              aria-required="true"
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between opacity-100">
              <LoginCheckbox
                label="Remember me"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                aria-label="Remember me checkbox"
              />
              <Link
                href="/forgot-password"
                className="login-link text-sm font-medium opacity-100"
                aria-label="Forgot password link"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <LoginButton
              type="submit"
              loading={loading}
              disabled={loading}
              variant="primary"
              className="mt-6"
              aria-label="Login button"
            >
              Sign In
            </LoginButton>

            {/* Register Link */}
            <div className="text-center pt-4 opacity-100">
              <p className="text-sm text-text-secondary opacity-100">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="login-link font-semibold opacity-100"
                  aria-label="Register link"
                >
                  Register
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Accessibility: Skip to main content link (hidden but accessible) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg"
        >
          Skip to main content
        </a>
      </div>
    </div>
  );
}
