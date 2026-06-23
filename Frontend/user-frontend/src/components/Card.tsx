import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

function Card({ children, className = "" }: CardProps) {
  return <section className={`panel p-5 md:p-6 ${className}`}>{children}</section>;
}

export default Card;
