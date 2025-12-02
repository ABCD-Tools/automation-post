import Link from "next/link";

const Sidebar = () => {
  const sidelinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Clients", href: "/clients" },
    { label: "Accounts", href: "/accounts" },
    { label: "Posts", href: "/posts" },
  ];
  return (
    <div className="fixed top-0 left-0 z-50 w-full md:w-56 h-screen bg-dark ">
      <p className="text-3xl font-semibold text-light px-2">AutoPost</p>
      <section className="flex flex-col mt-10 justify-end items-end text-light px-2 space-y-5">
        {sidelinks.map((i, index) => {
          return (
            <Link className="" href={i.href} key={index}>
              {i.label}
            </Link>
          );
        })}
      </section>
      <footer className="absolute bottom-0 w-full p-2 flex items-center justify-between">
        <div class="rounded-full bg-light border border-dark size-10"></div>
        <p class="text-blue-500">Logout</p>
      </footer>
    </div>
  );
};

export default Sidebar;
