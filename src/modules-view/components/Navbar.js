import Link from "next/link";
import Image from "next/image";

const Navbar = () => {
  const listNav = [
    { page: "/docs", label: "Docs" },
    { page: "/login", label: "Login/Register" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex bg-dark text-light rounded-b-xl justify-between items-center h-16 px-5">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-xl font-bold text-light transition-colors"
            >
              <Image src="/icon0.svg" alt="ABCD Tools" width={32} height={32} />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {listNav.map((link) => (
              <Link
                key={link.page}
                href={link.page}
                className=" py-2 text-sm font-medium text-light/75 hover:text-light transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
