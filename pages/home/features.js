import ScrollReveal from "@components/ScrollReveal";

const Features = () => {
  const features = [
    {
      icon: "🚀",
      title: "Multi-Platform Posting",
      description:
        "Post to Instagram, Facebook, and Twitter simultaneously from one dashboard. No more switching between apps.",
    },
    {
      icon: "🔒",
      title: "Secure & Encrypted",
      description:
        "Your credentials are encrypted client-side before transmission. Your data stays safe with enterprise-grade security.",
    },
    {
      icon: "⏰",
      title: "Queue & Schedule",
      description:
        "Create posts and queue them for later. Wake up your agent anytime to process all queued posts instantly.",
    },
    {
      icon: "📊",
      title: "Post History",
      description:
        "Track all your posts with detailed job status. See what was posted, when, and to which accounts.",
    },
    {
      icon: "🤖",
      title: "Local Agent",
      description:
        "Run a lightweight agent on your machine. Your posts are processed locally for maximum privacy and control.",
    },
    {
      icon: "📱",
      title: "Easy Account Management",
      description:
        "Add multiple accounts per platform. Verify and manage all your social media accounts in one place.",
    },
  ];

  return (
    <section className="w-full py-20 bg-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p>Powerful Features for Social Media Automation</p>

          <p className="mt-4 text-lg max-w-2xl mx-auto">
            Everything you need to streamline your social media workflow and
            save hours every week.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="border-dark text-dark bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border  hover:border-blue-200"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
