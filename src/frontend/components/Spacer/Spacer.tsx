import React from "react";

interface SpacerProps {
  space?: "2" | "4" | "8" | "16" | "24" | "32" | "48" | "64";
  isWidth?: boolean;
}

export const Spacer: React.FC<SpacerProps> = ({ space = 2, isWidth }) => {
  return (
    <div style={isWidth ? { width: `${space}px` } : { height: `${space}px` }} />
  );
};
