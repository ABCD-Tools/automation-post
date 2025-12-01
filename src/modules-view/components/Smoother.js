import { useEffect } from "react";
import { useRouter } from "next/router";
import Lenis from "lenis";

const Smoother = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    // Animation frame function
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Handle route changes
    const handleRouteChange = () => {
      lenis.scrollTo(0, { immediate: true });
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    router.events.on("routeChangeStart", handleRouteChange);

    // Cleanup
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
      router.events.off("routeChangeStart", handleRouteChange);
      lenis.destroy();
    };
  }, [router]);

  return children || null;
};

export default Smoother;
