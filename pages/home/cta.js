import Link from "next/link";

const CTA = () => {
  return (
    <section className="w-full py-20 bg-dark">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to Automate Your Social Media?
        </h2>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
          Join thousands of users saving time and growing their social media
          presence with our automation platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-white text-dark font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105"
          >
            Start Free Trial
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTA;
