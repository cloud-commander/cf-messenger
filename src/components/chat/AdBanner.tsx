import { useState, useEffect } from "react";
import { AD_CONFIG } from "../../config/adConfig";

export function AdBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % AD_CONFIG.length);
    }, 10000); // Rotate every 10 seconds

    return () => {
      clearInterval(timer);
    };
  }, []);

  const currentBanner = AD_CONFIG[currentIndex];

  return (
    <div className="w-full h-[38px] bg-black border border-xp-border-silver overflow-hidden relative group">
      <a
        href={currentBanner.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full"
      >
        <img
          src={currentBanner.imageUrl}
          alt={currentBanner.altText}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        {/* Glossy Overlay for Web 2.0 aesthetic */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/25 to-transparent h-[40%] opacity-40"></div>

        {/* Hover effect */}
        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
      </a>
    </div>
  );
}
