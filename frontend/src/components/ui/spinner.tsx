import React from "react";
import { cn } from "../../lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = "md", className }) => {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "relative",
          sizeMap[size]
        )}
      >
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500 animate-spin-slow opacity-40" />
        {/* Mid pulse */}
        <div className="absolute inset-1 rounded-full border-4 border-dashed border-purple-500 animate-spin-medium opacity-70" />
        {/* Inner solid spinner */}
        <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-primary animate-spin-fast" />
      </div>
    </div>
  );
};

export { Spinner };
