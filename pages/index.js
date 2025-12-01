import About from "./home/about";
import Jumbotron from "./home/jumbotron";
import Features from "./home/features";
import Benefits from "./home/benefits";
import CTA from "./home/cta";
import Navbar from "@components/Navbar";

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <Jumbotron />
      <About />
      <Features />
      <Benefits />
      <CTA />
    </div>
  );
}
