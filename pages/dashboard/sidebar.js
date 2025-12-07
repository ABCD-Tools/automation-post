import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { postJson } from "@utils/api";
import Image from "next/image";

const Sidebar = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const sidelinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Clients", href: "/clients" },
    { label: "Accounts", href: "/accounts" },
    { label: "Posts", href: "/posts" },
  ];

  // Fetch user for avatar
  useEffect(() => {
    async function fetchUser() {
      try {
        const { getJson } = await import("@utils/api");
        const userData = await getJson("/api/auth/me");
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    }
    fetchUser();
  }, []);

  const handleNavigation = (href) => {
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await postJson("/api/auth/logout", {});

      // Clear tokens from storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
      }

      toast.success("Logged out successfully");
      router.push("/login");
    } catch (err) {
      console.error("Logout error:", err);
      // Still clear tokens and redirect even if API call fails
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
      }
      toast.error("Logout failed, but session cleared");
      router.push("/login");
    }
  };

  // Get user initials for avatar
  const getInitials = (email) => {
    if (!email) return "U";
    const parts = email.split("@")[0];
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase();
    }
    return parts.charAt(0).toUpperCase();
  };

  return (
    <div className="fixed top-0 left-0 z-50 w-full md:w-56 h-screen bg-dark">
      <div
        className="flex gap-2 items-center mt-2 ms-5"
      >
        <Image src="/icon0.svg" alt="ABCD Tools" width={50} height={50} />
        <h1 className="text-xl font-bold text-light">ABCD-Tools</h1>
      </div>
      <section className="flex flex-col mt-10 justify-end items-end text-light px-2 space-y-5">
        {sidelinks.map((i, index) => {
          const isActive = router.pathname === i.href;
          return (
            <button
              onClick={() => handleNavigation(i.href)}
              className={`w-full text-right px-4 py-2 rounded transition-colors ${isActive
                  ? "bg-light/20 text-light font-semibold"
                  : "text-light/70 hover:text-light hover:bg-light/10"
                }`}
              key={index}
            >
              {i.label}
            </button>
          );
        })}
      </section>
    </div>
  );
};

export default Sidebar;
