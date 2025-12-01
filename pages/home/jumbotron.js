import Link from "next/link";

const Jumbotron = () => {
  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-light relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-dark text-5xl font-semibold tracking-wider">
          Automate Your Social Media Posts Across Multiple Platforms
        </h1>

        <p className="text-sm mt-6 max-w-3xl mx-auto text-gray-600 leading-relaxed">
          Post to Instagram, Facebook, and Twitter simultaneously with our
          powerful automation platform. Save time, maintain consistency, and
          grow your social media presence effortlessly.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-dark text-white font-semibold rounded-lg shadow-lg hover:bg-dark/75 transition-all duration-300 transform hover:scale-105"
          >
            Get Started Free
          </Link>
          <Link
            href="/docs"
            className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg shadow-md border-2 border-gray-200 hover:border-gray-300 transition-all duration-300"
          >
            Learn More
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Jumbotron;
