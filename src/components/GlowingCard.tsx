import { type ReactNode } from "react";

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const GlowingCard = ({ children, className = "", style }: GlowingCardProps) => {
  return (
    <div className={`relative group ${className}`} style={style}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative surface-glass rounded-xl p-6">
        {children}
      </div>
    </div>
  );
};

export default GlowingCard;
