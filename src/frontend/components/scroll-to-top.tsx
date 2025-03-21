import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when the route changes
    window.scrollTo({
      top: 0,
      behavior: "smooth" // Use smooth scrolling for a better user experience
    });
  }, [pathname]);

  return null; // This component doesn't render anything
} 