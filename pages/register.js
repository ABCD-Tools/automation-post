import { useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { registerWithEmailPassword } from "../src/modules-view/utils/api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registerWithEmailPassword({ email, password });
      toast.success(
        "Registration successful. Please check your email to verify your account."
      );
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
      <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
        <h1 className="text-2xl">Register</h1>
        <form
          className="space-y-3"
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          <label className="w-full flex items-start justify-between">
            Email
            <input
              className="rounded outline-none px-2 py-1 bg-transparent border border-light"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="w-full flex items-start justify-between">
            Password
            <input
              className="rounded outline-none px-2 py-1 bg-transparent border border-light"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </label>
          <button
            className="bg-dark text-light font-semibold rounded p-3"
            type="submit"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
          <div className="w-full flex items-center justify-between px-3">
            <label className="text-xs flex items-center justify-start gap-2">
              <input type="checkbox" name="" id="" />
              Accept{" "}
              <span className="text-blue-500 hover:text-blue-700 underline cursor-pointer">
                Terms and Policy
              </span>
            </label>
            <p className="text-xs flex items-center justify-start gap-2">
              Heave account?{" "}
              <Link
                href="/login"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Login
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
