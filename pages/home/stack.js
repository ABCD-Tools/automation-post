import React from "react";

const Stack = () => {
  const steps = [
    {
      number: "01",
      title: "Sign Up & Install Agent",
      description:
        "Create your free account and download the lightweight agent to run on your local machine. One-time setup takes just minutes.",
    },
    {
      number: "02",
      title: "Add Your Social Accounts",
      description:
        "Connect your Instagram, Facebook, and Twitter accounts. Your credentials are encrypted and stored securely.",
    },
    {
      number: "03",
      title: "Create Your Post",
      description:
        "Upload an image, write your caption, and select which accounts to post to. Queue multiple posts at once.",
    },
    {
      number: "04",
      title: "Let the Agent Work",
      description:
        "Wake up your agent to process all queued posts. It handles everything automatically while you focus on creating content.",
    },
  ];

  return (
    <div className="flex flex-wrap w-1/2 gap-1">
      {steps.map((step, index) => (
        <div key={index} className="relative flex flex-wrap w-[45%]">
          <div className="bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 h-full border border-gray-100">
            <div className="text-2xl font-bold text-blue-100 mb-4">
              {step.number}
            </div>
            <h3 className="text-md font-bold text-gray-900 mb-3">
              {step.title}
            </h3>
            <p className="text-gray-600 text-xs leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Stack;
