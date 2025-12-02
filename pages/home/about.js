import ScrollReveal from "@components/ScrollReveal";
import Stack from "./stack";
const About = () => {
  return (
    <section className="w-full px-3 bg-light">
      <div className="flex flex-col md:flex-row items-start justify-center gap-4">
        <p className="w-full md:w-1/2 font-semibold text-xl text-dark text-justify h-full">
          Post Automation Platform is a powerful web-based solution designed to
          streamline your social media management workflow. We understand that
          managing multiple social media accounts can be time-consuming and
          repetitive. Our platform allows you to post content to Instagram,
          Facebook, and Twitter simultaneously with just a few clicks. By
          running a lightweight agent on your local machine, we ensure your
          credentials and data remain private and secure while automating your
          posting workflow.
        </p>
        <Stack />
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-dark">
        <div className="text-center p-6">
          <div className="text-5xl font-bold">100%</div>
          <div className="mt-2">Local Processing</div>
        </div>
        <div className="text-center p-6">
          <div className="text-5xl font-bold">24/7</div>
          <div className="mt-2">Queue Support</div>
        </div>
        <div className="text-center p-6">
          <div className="text-5xl font-bold">Free</div>
          <div className="mt-2">To Get Started</div>
        </div>
      </div>
    </section>
  );
};

export default About;
