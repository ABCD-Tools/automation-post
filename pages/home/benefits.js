import ScrollReveal from "@components/ScrollReveal";

const Benefits = () => {
  const benefits = [
    {
      title: "Save Time",
      description:
        "Post to multiple platforms in seconds instead of manually posting to each one. Reclaim hours every week.",
    },
    {
      title: "Stay Consistent",
      description:
        "Maintain a consistent posting schedule across all your social media accounts without the hassle.",
    },
    {
      title: "Privacy First",
      description:
        "Your agent runs locally on your machine. Your credentials and data never leave your control.",
    },
    {
      title: "Free to Start",
      description:
        "Start with our free tier: 3 accounts and 10 posts per day. Upgrade anytime for unlimited access.",
    },
  ];

  return (
    <section className="w-full py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-gray-900">Why Choose Our Platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex gap-6 items-start p-6 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-blue-600 rounded"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
