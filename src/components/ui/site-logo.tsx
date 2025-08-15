import React from "react";
import { BookOpen } from "lucide-react";

interface SiteLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export const SiteLogo: React.FC<SiteLogoProps> = ({ showText = true, size = "md" }) => {
  const boxSize = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4";
  const textSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className="flex items-center gap-2 select-none mb-3">
      <div className={`${boxSize} bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow`}>
        <BookOpen className={`${iconSize} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`${textSize} font-bold text-foreground leading-none`}>mQuiz</span>
      )}
    </div>
  );
};
