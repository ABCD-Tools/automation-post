import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { loginWithEmailPassword } from "../src/modules-view/utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await loginWithEmailPassword({ email, password });
      toast.success("Login successful.");
      // TODO: Default redirect to admin dashboard (for dashboard, after developer needs solved)
      router.push('/admin');

    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-dark text-light flex items-center justify-center">
      <main className="glass rounded-xl border border-dark/50 space-y-5 p-5 w-1/3">
        <h1 className="text-2xl">Login</h1>
        <form
          onSubmit={handleSubmit}
          className="space-y-3"
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
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="bg-dark text-light font-semibold rounded p-3"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="w-full flex items-center justify-between px-3">
            <label className="text-xs flex items-center justify-start gap-2">
              <input type="checkbox" name="" id="" />
              Remember me
            </label>
            <p className="text-xs flex items-center justify-start gap-2">
              Dont have account?{" "}
              <Link
                href="/register"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Register
              </Link>
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
